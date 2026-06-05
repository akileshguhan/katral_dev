# Kattral Academy — Full Project Context

## What This Is

Kattral Academy is a full-stack Learning Management System (LMS) with live video classrooms. Teachers create classrooms, invite students via join codes, run live sessions with video/audio, share a collaborative whiteboard, and communicate through persistent channels. Students join classrooms, attend live sessions, and chat.

The project is actively in development. The backend is branded `EduPlatform.Api` internally but the product is named **Kattral Academy**.

---

## Repository Layout

```
LIVE_KIT/
├── backend/
│   ├── EduPlatform.Api/               # .NET 8 Web API (port 5261)
│   └── EduPlatform.Api.Tests/         # xUnit tests
├── frontend/
│   └── edu-web/                       # Next.js 16 app (port 3000)
└── plugnmeet-docker/
    └── config.yaml                    # PlugNmeet Docker configuration
```

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 16.2.6, React 19, TypeScript | App Router |
| Styling | Tailwind CSS v4, Framer Motion | Cream/emerald color scheme |
| Auth (frontend) | NextAuth v4 | Google OAuth + email/password |
| Backend | .NET 8, ASP.NET Core Web API | Port 5261 in dev |
| Database | MongoDB | Local: `mongodb://localhost:27017`, DB: `kattral_academy` |
| Video | **PlugNmeet** (Docker, port 8080) | Self-hosted; wraps LiveKit Cloud |
| LiveKit Cloud | `wss://katral-zonddr6x.livekit.cloud` | Used by PlugNmeet underneath |
| Icons | Lucide React | |
| UI extras | Radix UI, shadcn/ui | Minimal usage |

---

## Architecture

```
Browser (3000)
  │
  ├── NextAuth routes (/api/auth/*)      → Next.js handles internally
  ├── BFF routes (/api/register,         → Next.js API routes → Backend
  │              /api/auth/set-role,
  │              /api/auth/recover)
  └── Backend proxy (/api/classrooms/*, → next.config.ts rewrites → .NET API (5261)
                     /api/channels/*,
                     /api/sessions/*,
                     /api/notifications/*)
                           │
                           ├── MongoDB
                           └── PlugNmeet (8080)
                                     │
                                     └── LiveKit Cloud (wss)
                                               │
                                         webhooks back to .NET (5261/api/plugnmeet/webhook)
```

The Next.js `next.config.ts` uses **rewrites** to proxy backend calls:
- `beforeFiles` (runs before NextAuth's catch-all): `/api/auth/register`, `/api/auth/role`, `/api/auth/switch-role`
- `afterFiles`: `/api/classrooms/*`, `/api/channels/*`, `/api/sessions/*`, `/api/notifications/*`

---

## Frontend — Page & Route Structure

```
app/
├── page.tsx                      Landing page (animated hero, scroll-morph auth form)
├── auth/
│   └── role/page.tsx             Role selection (teacher / student) — shown after first login
├── api/
│   ├── auth/[...nextauth]/route.ts   NextAuth handler
│   ├── auth/set-role/route.ts        BFF: calls PATCH /api/auth/role on backend
│   ├── auth/recover/route.ts         BFF: recovers backend token via s2s-token endpoint
│   └── register/route.ts             BFF: proxies POST /api/auth/register to backend
├── teacher/
│   ├── dashboard/page.tsx         Stats, classroom grid, next session, live session banner
│   ├── classroom/[id]/page.tsx    3-pane view: channels sidebar | messages | sessions panel
│   └── session/[id]/page.tsx      Full-screen PlugNmeet iframe with End Session control
└── student/
    ├── dashboard/page.tsx         Stats, classroom grid, join classroom button
    ├── classroom/[id]/page.tsx    Channels sidebar | messages | live session join button
    └── session/[id]/page.tsx      Full-screen PlugNmeet iframe + 15s status polling
```

### Middleware (`middleware.ts`)

Route guards applied to `/`, `/teacher/*`, `/student/*`, `/auth/*`:

1. No token → redirect to `/`
2. Has token, no role → redirect to `/auth/role`
3. Student accessing `/teacher/*` → redirect to `/student/dashboard`
4. Teacher accessing `/student/*` → redirect to `/teacher/dashboard`
5. Logged-in user at `/` → redirect to their dashboard

---

## Frontend — Components

```
components/
├── NotificationBell.tsx          Bell icon; polls /api/notifications every 30s; marks all read on open
├── channel/
│   ├── MessageList.tsx           Renders message array with avatar + timestamp
│   └── MessageInput.tsx          Text input + send button; supports disabled (read-only channels)
├── classroom/
│   ├── CreateClassroomModal.tsx  Modal: name input → POST /api/classrooms
│   └── JoinClassroomModal.tsx    Modal: 6-char code input → POST /api/classrooms/join
├── providers/
│   └── SessionProvider.tsx       Wraps app in NextAuth SessionProvider
└── session/
    ├── PlugNmeetRoom.tsx          Simple iframe wrapper for PlugNmeet URL + access_token
    ├── TeacherRoom.tsx            LiveKit-based room (legacy/unused path) — VideoConference + Whiteboard + Chat
    ├── StudentRoom.tsx            LiveKit-based room (legacy/unused path) — same but canDraw=false
    ├── SessionChat.tsx            LiveKit useChat() hook — in-room chat panel (legacy/unused)
    └── Whiteboard.tsx             Canvas whiteboard synced via LiveKit useDataChannel; pen/eraser/colors/clear
```

> **Important**: `TeacherRoom`, `StudentRoom`, `SessionChat`, and `Whiteboard` were built for the direct-LiveKit integration path. The **active path** uses PlugNmeet's iframe — all whiteboard/chat/video features are provided by PlugNmeet's own UI. These components exist but are not rendered by the current session pages.

---

## Frontend — Key Files

### `lib/api.ts`
Typed fetch client for all backend endpoints. Uses `NEXT_PUBLIC_API_URL` (defaults to `''` = relative, goes through proxy). Throws `AuthError` on 401. All methods require a bearer token.

```
api.auth.register(email, name, password, role)
api.auth.updateRole(token, role)
api.auth.switchRole(token)

api.classrooms.list(token)
api.classrooms.create(token, name)
api.classrooms.get(token, id)
api.classrooms.join(token, joinCode)
api.classrooms.leave(token, classroomId)
api.classrooms.delete(token, classroomId)

api.channels.list(token, classroomId)
api.channels.getMessages(token, channelId)
api.channels.sendMessage(token, channelId, content)

api.sessions.list(token, classroomId)
api.sessions.create(token, classroomId, title, scheduledAt?, durationMinutes?)
api.sessions.start(token, sessionId)       → { token, url }
api.sessions.join(token, sessionId)        → { token, url }
api.sessions.end(token, sessionId)
api.sessions.getStatus(token, sessionId)   → { status }

api.notifications.list(token)
api.notifications.readAll(token)
```

### `lib/authOptions.ts`
NextAuth configuration:
- **Google provider**: exchanges Google `id_token` with backend `POST /api/auth/google` to get backend JWT
- **Credentials provider**: calls `POST /api/auth/login` directly
- **JWT callback**: stores `apiToken`, `role`, `userId` in token; includes recovery logic via `POST /api/auth/s2s-token` if `apiToken` is missing
- **Session callback**: exposes `session.apiToken`, `session.role`, `session.userId`
- Session strategy: `jwt`, maxAge 30 days, rolling every 24h

### `middleware.ts`
Route protection and role-based redirect (see above).

### `next.config.ts`
Proxy rewrites + allowed dev origins (ngrok). `beforeFiles` handles backend auth routes that would otherwise be swallowed by NextAuth's `/api/auth/*` catch-all.

### `types/index.ts`
```typescript
User        { id, email, name, role: 'teacher' | 'student' }
Classroom   { id, name, joinCode, teacherId, createdAt, channels? }
Channel     { id, name, type: 'general' | 'announcement' | 'resource', createdAt }
Message     { id, content, createdAt, sender: { senderId, senderName } }
Session     { id, title, status: 'waiting' | 'live' | 'ended', roomId, scheduledAt, durationMinutes, createdAt }
Notification{ id, title, body, sessionId, classroomId, createdAt }
VideoEngine 'livekit' | 'plugnmeet'
SessionResponse { engine, token, url }
```

---

## Backend — Project Structure

```
EduPlatform.Api/
├── Program.cs                     DI registration + middleware pipeline
├── appsettings.json               Production config skeleton
├── appsettings.Development.json   Local MongoDB + JWT overrides
├── Middleware/
│   └── JwtMiddleware.cs           Validates JWT; sets HttpContext.Items[UserId/UserRole/UserName/UserEmail]
├── Data/
│   └── MongoDbContext.cs          7 collections + index creation at startup
├── Models/
│   ├── User.cs
│   ├── Classroom.cs
│   ├── Channel.cs
│   ├── Message.cs
│   ├── Session.cs
│   ├── Config.cs
│   └── Notification.cs
├── Services/
│   ├── AuthService.cs
│   ├── ClassroomService.cs
│   ├── ChannelService.cs
│   ├── SessionService.cs
│   ├── PlugNmeetService.cs        Active video service
│   ├── LiveKitService.cs          Unused (legacy from direct LiveKit integration)
│   └── ConfigService.cs
└── Controllers/
    ├── AuthController.cs
    ├── ClassroomController.cs
    ├── ChannelController.cs
    ├── SessionController.cs
    ├── NotificationController.cs
    ├── ConfigController.cs
    └── PlugNmeetWebhookController.cs
```

### `Program.cs`

```csharp
// DI registrations
MongoDbContext (singleton), AuthService, ClassroomService, ChannelService,
SessionService, LiveKitService, ConfigService, PlugNmeetService (all scoped)

// Pipeline
UseCors()                  → allows localhost:3000 and localhost:3001
UseMiddleware<JwtMiddleware>()
MapControllers()

// On startup: ConfigService.EnsureDefaultAsync() seeds video_engine = "livekit"
```

---

## Backend — Data Models (MongoDB)

### User
```
_id           ObjectId
email         string (unique index)
name          string
role          string  ("teacher" | "student" | "")
auth_method   string  ("google" | "credentials")
password_hash string? (BCrypt, credentials only)
google_id     string? (OAuth only)
enrolled_classrooms  string[]  (ObjectId strings of joined classrooms)
created_at    DateTime
```

### Classroom
```
_id        ObjectId
name       string
teacher_id ObjectId
join_code  string (unique, 6-char from chars ABCDEFGHJKLMNPQRSTUVWXYZ23456789)
created_at DateTime
```

### Channel
```
_id          ObjectId
classroom_id ObjectId
name         string
type         string  ("general" | "announcement" | "resource")
created_at   DateTime
```

### Message
```
_id        ObjectId
channel_id ObjectId
sender_id  ObjectId
sender_name string
content    string
created_at DateTime
```
Indexed on (channel_id + created_at). Limited to last 100 per fetch.

### Session
```
_id              ObjectId
classroom_id     ObjectId
title            string
status           string  ("waiting" | "live" | "ended")
room_id          string?  ("session-{id}" when started)
scheduled_at     DateTime?
duration_minutes int?
created_at       DateTime
```
Indexed on (classroom_id + status).

### Config
```
_id   ObjectId
key   string (unique)  — currently only "video_engine"
value string           — "livekit" | "plugnmeet"
```

### Notification
```
_id          ObjectId
user_id      ObjectId
title        string
body         string
session_id   string?
classroom_id string?
read         bool (default false)
created_at   DateTime
```
Indexed on (user_id + read). Fetched with limit 30, sorted desc by created_at.

---

## Backend — Services

### `AuthService`
- `GenerateJwt(user)` — HS256, claims: sub/email/name/role, expiry from `Jwt:ExpiryHours` (720h = 30 days)
- `RegisterAsync(email, name, password, role)` — BCrypt password hash, returns null if email taken
- `LoginAsync(email, password)` — BCrypt.Verify
- `UpsertGoogleUserAsync(googleId, email, name)` — upserts by email; sets GoogleId if missing
- `UpdateRoleAsync(userId, role)` — sets role field
- `HasRoleAsync(userId)` — checks if role is non-empty

### `ClassroomService`
- `CreateAsync(name, teacherId)` — generates unique 6-char join code (retry loop); creates 3 default channels (general, announcements, resources)
- `JoinByCodeAsync(code, studentId)` — finds classroom by code; rejects if teacher tries to join own classroom; uses `$addToSet` on `User.enrolledClassrooms`
- `LeaveAsync(classroomId, studentId)` — `$pull` from `User.enrolledClassrooms`
- `DeleteAsync(classroomId)` — cascade: unenroll all students, delete messages → channels → sessions → classroom

### `ChannelService`
- `GetMessagesAsync(channelId)` — sorted by createdAt asc, limit 100
- `SendMessageAsync(...)` — inserts Message document
- `IsValidType(type)` — validates "general" | "announcement" | "resource"

### `SessionService`
- `CreateAsync(...)` — status = "waiting", no roomId yet
- `StartAsync(sessionId)` — sets status = "live", roomId = `session-{sessionId}` (if not already set)
- `EndAsync(sessionId)` — sets status = "ended"

### `PlugNmeetService`
Signs all requests with HMAC-SHA256 (`HASH-SIGNATURE` header). Calls:
- `CreateRoomAsync(roomId, title)` — `POST /auth/room/create` with full feature config
- `GenerateJoinTokenAsync(roomId, userId, name, isAdmin)` — `POST /auth/room/getJoinToken`
- `EndRoomAsync(roomId)` — `POST /auth/room/endRoom`

Room features configured at create time:
- webcams, screen sharing, polls, chat enabled
- `auto_gen_user_id: true` (prevents same user kicking themselves on reconnect)
- whiteboard: teacher draws, students view only
- lock settings: students can toggle own mic/camera; screen sharing and whiteboard locked

### `LiveKitService` (UNUSED)
Generates LiveKit JWT directly. Exists from the original direct-LiveKit integration. Not registered in Program.cs as part of any active flow — the `PlugNmeetService` has replaced it entirely.

### `ConfigService`
- `EnsureDefaultAsync()` — upsert-on-insert `video_engine = "livekit"` (so existing deployments default to LiveKit; new deployments should set plugnmeet)
- `GetVideoEngineAsync()` / `SetVideoEngineAsync(engine)`

---

## Backend — Controllers & API Endpoints

### `AuthController` (`/api/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Email/password registration. Role optional (set later). |
| POST | `/api/auth/login` | None | Email/password login. Returns JWT + user. |
| POST | `/api/auth/google` | None | Validates Google id_token; upserts user; returns JWT. |
| PATCH | `/api/auth/role` | JWT | Set role once during onboarding. Returns 403 if already set. |
| POST | `/api/auth/switch-role` | JWT | Switch teacher↔student with preconditions (no classrooms/no enrollments). |
| POST | `/api/auth/s2s-token` | X-Server-Secret header | Server-to-server: get/create backend token by email. Used by Next.js JWT callback recovery. |

### `ClassroomController` (`/api/classrooms`)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/classrooms` | Any | Teacher: own classrooms. Student: enrolled classrooms. |
| POST | `/api/classrooms` | Teacher | Create classroom + 3 default channels. |
| POST | `/api/classrooms/join` | Any | Join by join code. |
| GET | `/api/classrooms/{id}` | Any | Classroom details + channels + members. |
| DELETE | `/api/classrooms/{id}` | Teacher (owner) | Cascade delete classroom. |
| DELETE | `/api/classrooms/{id}/leave` | Student | Unenroll from classroom. |

### `ChannelController`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/classrooms/{classroomId}/channels` | Any | List channels. |
| POST | `/api/classrooms/{classroomId}/channels` | Teacher | Create channel. |
| GET | `/api/channels/{channelId}/messages` | Any | Last 100 messages (asc). |
| POST | `/api/channels/{channelId}/messages` | Any | Send message. |

### `SessionController`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/classrooms/{classroomId}/sessions` | Any | List sessions, sorted by createdAt desc. |
| POST | `/api/classrooms/{classroomId}/sessions` | Teacher | Create session. Sends notifications to enrolled students if scheduledAt given. |
| GET | `/api/sessions/{sessionId}/status` | Any | Returns `{ status }`. |
| POST | `/api/sessions/{sessionId}/start` | Teacher | Sets status=live; creates PlugNmeet room; returns join token (isAdmin=true). |
| POST | `/api/sessions/{sessionId}/join` | Any | Returns join token (isAdmin=false). Requires status=live. |
| POST | `/api/sessions/{sessionId}/end` | Teacher | Calls PlugNmeet EndRoom (best-effort); sets status=ended. |

### `NotificationController`

| Method | Path | Description |
|---|---|---|
| GET | `/api/notifications` | Last 30 unread notifications for current user. |
| PATCH | `/api/notifications/read-all` | Marks all as read. |

### `ConfigController`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/config` | Any | Returns `{ videoEngine }`. |
| PUT | `/api/config/video-engine` | Teacher | Sets video engine ("livekit" or "plugnmeet"). |

### `PlugNmeetWebhookController`

| Method | Path | Description |
|---|---|---|
| POST | `/api/plugnmeet/webhook` | Receives PlugNmeet events. |

Handles:
- `participant_joined` → creates notification for teacher (non-admin participants only)
- `participant_left` → creates notification for teacher (non-admin participants only)
- `room_finished` → marks session as ended

---

## Auth Flow — Step by Step

### Google OAuth (new user)
1. User clicks "Continue with Google"
2. NextAuth redirects to Google → returns `id_token`
3. NextAuth JWT callback: calls `POST /api/auth/google` with `{ idToken }`
4. Backend validates token with Google; upserts user (role = `""`)
5. NextAuth stores `apiToken`, `role=""`, `userId` in JWT
6. NextAuth session created; middleware sees empty role → redirects to `/auth/role`
7. User picks teacher or student; `/api/auth/set-role` (Next.js route) → `PATCH /api/auth/role` (backend)
8. Role locked. New backend JWT issued with role embedded.
9. `update({ role, apiToken })` called on NextAuth session.
10. Redirect to `/teacher/dashboard` or `/student/dashboard`

### Google OAuth (returning user with role)
Same as above but step 6 — middleware sees role → redirects straight to dashboard.

### Email/Password Login
1. NextAuth credentials provider calls `POST /api/auth/login`
2. Backend validates BCrypt hash; returns JWT
3. Stored in NextAuth session as `apiToken`

### Token Recovery (fallback)
If `apiToken` is missing from session (Google backend call failed silently):
- `authOptions.ts` JWT callback calls `POST /api/auth/s2s-token` with `X-Server-Secret: JWT_SECRET` and user email
- Backend finds or creates user; returns JWT
- This prevents users from being stuck in a broken auth state

### Role Switching
- `POST /api/auth/switch-role`
- Teacher → student: blocked if has any classrooms
- Student → teacher: blocked if enrolled in any classrooms
- On success: new JWT issued; frontend calls `update({ role, apiToken })`

---

## Session (Video) Flow — Step by Step

### Teacher starts a session
1. Teacher clicks "Start →" on a session card → navigates to `/teacher/session/{id}`
2. `TeacherSessionPage` calls `api.sessions.start(token, sessionId)` → `POST /api/sessions/{id}/start`
3. Backend: updates session status to "live", sets `roomId = "session-{id}"`
4. Backend: calls PlugNmeet `POST /auth/room/create` with full feature config
5. Backend: calls PlugNmeet `POST /auth/room/getJoinToken` with `isAdmin: true`
6. Returns `{ token: "<pnm_jwt>", url: "http://localhost:8080" }`
7. Frontend builds: `http://localhost:8080?access_token=<pnm_jwt>`
8. URL cached in `sessionStorage` keyed `pnm_teacher_{sessionId}` (prevents double-start on tab restore)
9. URL loaded in `<iframe>` — PlugNmeet's full web client loads with teacher controls

### Student joins a session
1. Student navigates to `/student/session/{id}`
2. `StudentSessionPage` calls `api.sessions.join(token, sessionId)` → `POST /api/sessions/{id}/join`
3. Backend: returns PlugNmeet join token with `isAdmin: false`
4. Same iframe approach; cached as `pnm_student_{sessionId}`
5. Student page polls `GET /api/sessions/{id}/status` every **15 seconds**
6. When status becomes "ended" → clears cache → shows "Session ended" → redirects to dashboard in 3s

### Session ends
- Teacher clicks "End Session" button → `api.sessions.end()` → backend calls `PlugNmeet.EndRoomAsync()` + marks ended
- PlugNmeet also posts `room_finished` webhook → backend marks ended (idempotent fallback)

---

## PlugNmeet Configuration (`plugnmeet-docker/config.yaml`)

```yaml
client:
  port: 8080
  api_key: "plugnmeet"
  secret: "YOUR_PLUGNMEET_API_SECRET"
  webhook_conf:
    enable: true
    url: "http://host.docker.internal:5261/api/plugnmeet/webhook"

livekit_info:
  host: "https://katral-zonddr6x.livekit.cloud"
  api_key: "YOUR_LIVEKIT_API_KEY"
  secret: "YOUR_LIVEKIT_API_SECRET"

# Uses MySQL + Redis + NATS internally
```

PlugNmeet is a middleware layer that:
- Manages LiveKit rooms with additional features (whiteboard, polls, lock settings, recording)
- Provides its own web client (the iframe content)
- Calls back to our backend via webhooks

---

## Environment Variables

### Backend (`appsettings.json` / `appsettings.Development.json`)

| Key | Dev Value | Description |
|---|---|---|
| `MongoDB:ConnectionString` | `mongodb://localhost:27017` | MongoDB connection |
| `MongoDB:DatabaseName` | `kattral_academy` | Database name |
| `Jwt:Secret` | `YOUR_JWT_SECRET` | JWT signing key (must match `JWT_SECRET` in frontend) |
| `Jwt:Issuer` | `kattral-api` | JWT issuer claim |
| `Jwt:ExpiryHours` | `720` | Token lifetime (30 days) |
| `LiveKit:ApiKey` | `YOUR_LIVEKIT_API_KEY` | LiveKit (used by PlugNmeet) |
| `LiveKit:ApiSecret` | `YOUR_LIVEKIT_API_SECRET` | |
| `LiveKit:Url` | `wss://katral-zonddr6x.livekit.cloud` | |
| `Google:ClientId` | `your-google-client-id-here` | For validating Google id_token |
| `PlugNmeet:ApiKey` | `plugnmeet` | Must match PlugNmeet config.yaml |
| `PlugNmeet:ApiSecret` | `YOUR_PLUGNMEET_API_SECRET` | |
| `PlugNmeet:Url` | `http://localhost:8080` | PlugNmeet client URL |

### Frontend (`.env.local`)

| Key | Description |
|---|---|
| `NEXTAUTH_SECRET` | NextAuth session encryption key |
| `NEXTAUTH_URL` | `http://localhost:3000` (must match Google OAuth callback) |
| `JWT_SECRET` | Must match backend `Jwt:Secret` — used for s2s-token header |
| `BACKEND_URL` | Server-side backend URL, default `http://localhost:5261` |
| `NEXT_PUBLIC_API_URL` | Client-side API base, default `""` (relative, uses proxy) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

---

## MongoDB Indexes

```
users:          email (unique)
classrooms:     join_code (unique)
sessions:       (classroom_id, status)
messages:       (channel_id, created_at)
config:         key (unique)
notifications:  (user_id, read)
```

---

## CORS

Configured in `Program.cs` to allow only:
- `http://localhost:3000`
- `http://localhost:3001`

Production CORS is not yet configured.

---

## Key Design Decisions & Gotchas

### 1. PlugNmeet over direct LiveKit
The project started with direct LiveKit integration (`LiveKitService.cs`, `TeacherRoom.tsx`, `StudentRoom.tsx`, `Whiteboard.tsx`, `SessionChat.tsx`). It was migrated to PlugNmeet, which provides a full-featured web client (whiteboard, polls, recordings, chat, lock controls) via iframe. The old LiveKit components still exist in the codebase but are **not used**.

### 2. Enrollment stored on User, not Classroom
`User.enrolledClassrooms` is an array of classroom IDs. This means:
- "Who is in this classroom?" requires `db.Users.Find(u => u.EnrolledClassrooms.Contains(classroomId))`
- Cascade delete must manually `$pull` from all users
- Join/leave uses `$addToSet` / `$pull` on the User document

### 3. Role locked after onboarding, but switch-role available
`PATCH /api/auth/role` returns HTTP 403 if role is already set. Role switching uses a separate `POST /api/auth/switch-role` endpoint that enforces preconditions (can't switch if you have active classrooms/enrollments). This prevents orphaned data.

### 4. Announcement channels are read-only on the frontend
`MessageInput` accepts a `disabled` prop. The student classroom page passes `disabled={activeChannel?.type === 'announcement'}`. The backend has no server-side enforcement of this — any authenticated user can POST to any channel currently.

### 5. Session URL caching in sessionStorage
When a teacher/student opens a session page, the PlugNmeet URL (with embedded token) is cached in `sessionStorage` as `pnm_teacher_{sessionId}` or `pnm_student_{sessionId}`. This prevents a second `/start` or `/join` call on tab restore, which would generate a new token and kick the existing WebSocket connection. The cache is cleared on "End Session" / "Leave".

### 6. `auto_gen_user_id: true` in PlugNmeet
PlugNmeet generates a fresh UUID for each join instead of using our userId. This allows the same account to be in the room from multiple tabs/devices without collision. The tradeoff is that PlugNmeet participant identity is not directly tied to our user IDs.

### 7. Student session polling
The student session page polls `GET /api/sessions/{id}/status` every 15 seconds. This is a simple polling approach — there is no WebSocket/SSE push from the backend. When the teacher ends the session, the student will notice within 15s.

### 8. ConfigService default is "livekit" but app uses "plugnmeet"
`EnsureDefaultAsync()` seeds `video_engine = "livekit"` on startup (SetOnInsert — never overwrites). The actual session endpoints hardcode PlugNmeet (`PlugNmeetService`). The `ConfigController` allows changing the engine setting but `SessionController` doesn't read it — it always uses PlugNmeet. The config system is wired but not yet connected to session behavior.

### 9. s2s-token endpoint
`POST /api/auth/s2s-token` is a server-to-server endpoint authenticated with `X-Server-Secret: <JWT_SECRET>`. It's used by Next.js (in the JWT callback and the BFF routes) to recover or create a backend token by email. The shared secret is the JWT signing key itself — both sides must have the same value set.

### 10. JwtMiddleware vs standard ASP.NET Core auth
The project uses a custom `JwtMiddleware` instead of `[Authorize]` / `UseAuthentication`. Claims are extracted manually and put in `HttpContext.Items`. Controllers check `HttpContext.Items["UserId"] == null` for auth, and `HttpContext.Items["UserRole"]` for role checks. No `[Authorize]` attributes are used.

---

## Notification System

**Created by:**
- `SessionController.Create` — when a session has a `scheduledAt`, all enrolled students get a notification
- `PlugNmeetWebhookController` — teacher gets a notification when a student joins or leaves their live session

**Consumed by:**
- `NotificationBell` component — polls every 30s, shows badge count, marks all read on open
- `NotificationController.List` — returns last 30 unread, sorted desc

---

## Test Project (`EduPlatform.Api.Tests`)

Test files present:
- `AuthServiceTests.cs`
- `ChannelServiceTests.cs`
- `ClassroomServiceTests.cs`
- `ConfigServiceTests.cs`
- `PlugNmeetServiceTests.cs`
- `SessionServiceTests.cs`

---

## Running the Project

### Backend
```bash
cd backend/EduPlatform.Api
dotnet restore
dotnet run
# Listens on http://localhost:5261
```
Requires MongoDB running at `mongodb://localhost:27017`.

### Frontend
```bash
cd frontend/edu-web
npm install
npm run dev
# Listens on http://localhost:3000
```
Requires `.env.local` with the variables listed above.

### PlugNmeet (Docker)
```bash
cd plugnmeet-docker
docker compose up -d
# PlugNmeet UI at http://localhost:8080
# Webhook posts to http://host.docker.internal:5261/api/plugnmeet/webhook
```

---

## What's Not Yet Built / Known Gaps

1. **No real-time message push** — channels use fetch-on-load. No WebSocket/polling for new messages; users must reload to see new messages from others.
2. **Announcement channel enforcement** — only enforced client-side; backend allows any user to post to any channel.
3. **ConfigService not wired to session behavior** — video engine setting exists but `SessionController` always uses PlugNmeet regardless.
4. **No production CORS** — only `localhost:3000/3001` allowed.
5. **`/teacher/schedule`, `/teacher/settings`, `/student/schedule`, `/student/settings` pages** — linked in nav but not implemented yet (404).
6. **Message pagination** — capped at last 100 messages; no infinite scroll.
7. **No file/document upload** — README mentions it but there is no implementation in the current codebase.
8. **`LiveKitService` is dead code** — registered in DI but never injected into anything that's actively used.
9. **Session scheduling UI is minimal** — `CreateSessionRequest` accepts `scheduledAt` and `durationMinutes` but the teacher classroom page only creates sessions with a title and no schedule picker.
