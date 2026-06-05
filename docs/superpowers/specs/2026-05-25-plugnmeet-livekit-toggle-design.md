# plugNmeet + LiveKit Global Toggle — Design Spec
**Date:** 2026-05-25
**Status:** Approved
**Scope:** Add plugNmeet as a second video engine alongside LiveKit, switchable via a global runtime toggle in the teacher dashboard

---

## 1. Goals

- Integrate plugNmeet (local Docker, port 8080) as an alternative to LiveKit for live classroom sessions
- Allow the active video engine to be switched globally at runtime (no server restart) via a teacher dashboard toggle
- Keep the existing LiveKit implementation fully intact — switching back to LiveKit must work without code changes
- Demonstrate both integrations side-by-side in a single app

---

## 2. Architecture

```
MongoDB config collection  ←→  .NET ConfigService  ←→  GET /api/config (public)
                                                         PUT /api/config/video-engine (teacher)
                                                              ↕
                                              Frontend reads engine on session start
                                                         /          \
                                               LiveKit flow      plugNmeet flow
                                           (existing, unchanged)  (HTTP token → iframe)
                                                                        ↕
                                                           plugNmeet Docker :8080
                                                           (built from plugNmeet-server-main/)
```

The `config` MongoDB collection holds a single document: `{ key: "video_engine", value: "livekit" | "plugnmeet" }`. Initialized to `"livekit"` on first app start.

Session Start and Join endpoints check the current engine value and delegate to either `LiveKitService` (existing) or `PlugNmeetService` (new). The response always includes an `engine` field so the frontend knows which component to render.

---

## 3. MongoDB

### `config` collection
```json
{
  "_id": "ObjectId",
  "key": "video_engine",
  "value": "livekit | plugnmeet"
}
```
Single document, upserted on first read if missing. Index: unique on `key`.

---

## 4. plugNmeet Integration

### Token Generation Flow
plugNmeet exposes a REST API on port 8080. Requests are authenticated via HMAC-SHA256 signature.

**Room creation** (`POST http://localhost:8080/api/v1/room/create`):
- Called by teacher Start endpoint
- Room ID = `session-{sessionId}` (same as existing LiveKit room_id convention)
- Returns room details

**Join token** (`POST http://localhost:8080/api/v1/room/join`):
- Called by both teacher Start and student Join endpoints
- Returns a JWT access token signed by plugNmeet server
- Teacher: `is_admin: true`, Student: `is_admin: false`

**End room** (`POST http://localhost:8080/api/v1/room/end`):
- Called by teacher End endpoint alongside setting `status=ended` in MongoDB

### Client Handoff
Session Start/Join API response includes:
```json
{
  "engine": "plugnmeet",
  "token": "<plugnmeet-jwt>",
  "url": "http://localhost:8080"
}
```
Frontend renders `<PlugNmeetRoom token={token} url={url} />` which is an `<iframe>` pointing to `http://localhost:8080/?access_token={token}`.

### plugNmeet HMAC Request Signing
All plugNmeet API calls require:
- Header: `API-KEY: plugnmeet`
- Header: `HASH-SIGNATURE: HMAC-SHA256(requestBodyJson, secret)`

---

## 5. .NET Backend Changes

### New files
```
Models/Config.cs                  — { Id, Key, Value }
Services/ConfigService.cs         — GetVideoEngine(), SetVideoEngine(), EnsureDefault()
Services/PlugNmeetService.cs      — CreateRoom(), GenerateJoinToken(), EndRoom()
Controllers/ConfigController.cs  — GET /api/config, PUT /api/config/video-engine
```

### Modified files
```
Data/MongoDbContext.cs            — add IMongoCollection<Config> Configs + unique index on key
Controllers/SessionController.cs  — Start/Join/End branch on engine; response shape updated
Program.cs                        — register ConfigService, PlugNmeetService; call EnsureDefault()
appsettings.json                  — add PlugNmeet section
```

### New API Endpoints
```
GET  /api/config                         → { videoEngine: "livekit" | "plugnmeet" } (no auth)
PUT  /api/config/video-engine            → { videoEngine: "..." } (teacher only)
```

### Modified Session Endpoints (response shape)

`POST /api/sessions/:id/start` and `POST /api/sessions/:id/join` now return:
```json
{
  "engine": "livekit",
  "token": "<jwt>",
  "url": "wss://katral-zonddr6x.livekit.cloud"
}
```
or
```json
{
  "engine": "plugnmeet",
  "token": "<jwt>",
  "url": "http://localhost:8080"
}
```

### appsettings.json additions
```json
{
  "PlugNmeet": {
    "ApiKey": "plugnmeet",
    "ApiSecret": "YOUR_PLUGNMEET_API_SECRET",
    "Url": "http://localhost:8080"
  }
}
```

---

## 6. Frontend Changes

### New files
```
components/session/PlugNmeetRoom.tsx      — iframe rendering plugNmeet client
```

### Modified files
```
app/teacher/dashboard/page.tsx            — add video engine toggle (LiveKit / plugNmeet)
app/teacher/session/[id]/page.tsx         — branch on engine in API response
app/student/session/[id]/page.tsx         — branch on engine in API response
lib/api.ts                                — add api.config.getVideoEngine, setVideoEngine
types/index.ts                            — add VideoEngine type, SessionJoinResponse type
```

### PlugNmeetRoom Component
```tsx
// Full-height iframe, no surrounding chrome needed — plugNmeet provides its own UI
<iframe
  src={`${url}/?access_token=${token}`}
  className="w-full h-full border-none"
  allow="camera; microphone; display-capture; autoplay"
/>
```

### Teacher Dashboard Toggle
A `<Switch>` (shadcn/ui) labeled "Video Engine" with "LiveKit" / "plugNmeet" options. On toggle: calls `PUT /api/config/video-engine`, shows optimistic UI update. Displayed in the dashboard header/sidebar.

### Session Page Engine Branch
```tsx
// Both teacher and student session pages
const { engine, token, url } = sessionData
if (engine === 'plugnmeet') return <PlugNmeetRoom token={token} url={url} />
if (engine === 'livekit') return <TeacherRoom token={token} /> // or StudentRoom
```

---

## 7. plugNmeet Docker Setup

### docker-compose.yml (repo root)
Runs plugNmeet server from `plugNmeet-server-main/` on port 8080. Mounts the config.yaml with the api_key and secret.

### plugNmeet-server-main/config.yaml updates
- `api_key: plugnmeet`
- `api_secret: YOUR_PLUGNMEET_API_SECRET`
- `livekit_url: wss://katral-zonddr6x.livekit.cloud` (plugNmeet uses LiveKit under the hood)
- `livekit_api_key: YOUR_LIVEKIT_API_KEY`
- `livekit_api_secret: YOUR_LIVEKIT_API_SECRET`

---

## 8. Development Startup

```bash
# Terminal 1: plugNmeet
docker-compose up plugnmeet

# Terminal 2: .NET backend
cd backend/EduPlatform.Api && dotnet run

# Terminal 3: Next.js
cd frontend/edu-web && npm run dev
```

---

## 9. Out of Scope
- Per-classroom or per-session engine selection (global only)
- plugNmeet recording features
- plugNmeet breakout rooms
- Switching engine mid-active-session (toggle affects next session start)
