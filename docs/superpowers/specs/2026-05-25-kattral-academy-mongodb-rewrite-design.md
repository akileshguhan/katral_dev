# Kattral Academy — Full Rewrite Design Spec
**Date:** 2026-05-25  
**Status:** Approved  
**Scope:** Clean rewrite from Supabase MVP → MongoDB + .NET 8 + Next.js 14

---

## 1. Goals

Replace the Supabase-backed MVP with a production-grade architecture:
- MongoDB Atlas as the primary database
- .NET 8 Web API as the backend (owns all business logic and auth)
- Next.js 14 (App Router) as the frontend (UI only, calls .NET API)
- LiveKit Cloud for real-time video sessions (unchanged)
- Role-split routing: `/teacher/*` and `/student/*`

---

## 2. Architecture

```
Next.js 14  (port 3000)
    ↕  HTTP + Bearer JWT
.NET 8 Web API  (port 5000)
    ↕
MongoDB Atlas
```

**No Redis.** MongoDB change streams handle real-time session status. In-memory rate limiting in .NET handles join code abuse. Short-TTL JWTs (1hr) handle logout invalidation.

### Auth Flow
- **Email/Password:** Form → POST `.NET /api/auth/register` or `/api/auth/login` → .NET hashes password (BCrypt), issues JWT → Next.js stores in session
- **Google OAuth:** NextAuth handles Google callback → sends Google ID token to `.NET /api/auth/google` → .NET verifies with Google, upserts user in MongoDB, returns JWT → Next.js stores JWT
- **Every API call:** `Authorization: Bearer <JWT>` header → .NET `JwtMiddleware` validates, no DB hit

NextAuth is a Google callback handler and session storage only. .NET is the auth owner.

---

## 3. MongoDB Collections

### `users`
```json
{
  "_id": "ObjectId",
  "email": "string (unique index)",
  "name": "string",
  "role": "teacher | student",
  "auth_method": "credentials | google",
  "password_hash": "string | null",
  "google_id": "string | null",
  "enrolled_classrooms": ["ObjectId"],
  "created_at": "Date"
}
```
- `enrolled_classrooms` populated only for students
- `password_hash` null when `auth_method = google`; `google_id` null when `auth_method = credentials`

### `classrooms`
```json
{
  "_id": "ObjectId",
  "name": "string",
  "teacher_id": "ObjectId → users",
  "join_code": "string (unique index, 6-char alphanumeric)",
  "created_at": "Date"
}
```

### `sessions`
```json
{
  "_id": "ObjectId",
  "classroom_id": "ObjectId → classrooms",
  "title": "string",
  "status": "waiting | live | ended",
  "room_id": "string | null",
  "created_at": "Date"
}
```
- `status` drives the student "Join" button — appears only when `live`
- `room_id` set when teacher starts session (LiveKit room name)

### `channels`
```json
{
  "_id": "ObjectId",
  "classroom_id": "ObjectId → classrooms",
  "name": "string",
  "type": "general | announcement | resource",
  "created_at": "Date"
}
```
Three default channels created automatically when a classroom is created.

### `messages`
```json
{
  "_id": "ObjectId",
  "channel_id": "ObjectId → channels",
  "sender_id": "ObjectId → users",
  "sender_name": "string",
  "content": "string",
  "created_at": "Date"
}
```

### Indexes
| Collection | Index | Type |
|---|---|---|
| `users` | `email` | unique |
| `classrooms` | `join_code` | unique |
| `sessions` | `classroom_id + status` | compound |
| `messages` | `channel_id + created_at` | compound |

---

## 4. .NET 8 Backend

### Folder Structure
```
EduPlatform.Api/
├── Controllers/
│   ├── AuthController.cs
│   ├── ClassroomController.cs
│   ├── ChannelController.cs
│   └── SessionController.cs
├── Services/
│   ├── AuthService.cs
│   ├── ClassroomService.cs
│   ├── ChannelService.cs
│   ├── SessionService.cs
│   └── LiveKitService.cs
├── Models/
│   ├── User.cs
│   ├── Classroom.cs
│   ├── Session.cs
│   ├── Channel.cs
│   └── Message.cs
├── Middleware/
│   └── JwtMiddleware.cs
├── Data/
│   └── MongoDbContext.cs
├── appsettings.json
└── Program.cs
```

### API Endpoints
```
POST   /api/auth/register              → create user (credentials)
POST   /api/auth/login                 → return JWT
POST   /api/auth/google                → verify Google ID token, upsert user, return JWT

GET    /api/classrooms                 → teacher: own classrooms | student: enrolled
POST   /api/classrooms                 → teacher only, auto-creates 3 default channels
POST   /api/classrooms/join            → student joins by join_code, adds to enrolled_classrooms

GET    /api/classrooms/:id/channels    → list channels
POST   /api/classrooms/:id/channels    → teacher only
GET    /api/channels/:id/messages      → paginated, last 100
POST   /api/channels/:id/messages      → any enrolled member

GET    /api/classrooms/:id/sessions    → list sessions
POST   /api/classrooms/:id/sessions    → teacher only, status=waiting
POST   /api/sessions/:id/start         → teacher: status=live, generate room_id, return LiveKit token
POST   /api/sessions/:id/join          → student: verify enrollment, return LiveKit token
POST   /api/sessions/:id/end           → teacher: status=ended
```

### Key Implementation Details
- `JwtMiddleware` validates Bearer token on every protected route, attaches user to `HttpContext`
- `AuthService` uses BCrypt for password hashing
- `ClassroomService` generates 6-char alphanumeric join codes with unique index enforcement
- `LiveKitService` generates AccessTokens using `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`
- `SessionService` uses same `room_id` for teacher and student to guarantee they join the same room

---

## 5. Next.js 14 Frontend

### Folder Structure
```
edu-web/
├── app/
│   ├── page.tsx                          ← landing + auth (AuthComponent)
│   ├── api/auth/[...nextauth]/route.ts   ← Google OAuth callback only
│   ├── teacher/
│   │   ├── dashboard/page.tsx            ← schedule + pending tasks
│   │   ├── classroom/[id]/page.tsx       ← channels + sessions list
│   │   └── session/[id]/page.tsx         ← TeacherRoom (LiveKit)
│   └── student/
│       ├── dashboard/page.tsx            ← calendar week view
│       ├── classroom/[id]/page.tsx       ← channels + live session status
│       └── session/[id]/page.tsx         ← StudentRoom (LiveKit)
├── components/
│   ├── ui/
│   │   └── sign-up.tsx                   ← provided AuthComponent (copy-paste)
│   ├── auth/
│   │   └── LoginForm.tsx
│   ├── classroom/
│   │   ├── ClassroomCard.tsx
│   │   ├── CreateClassroomModal.tsx
│   │   └── JoinClassroomModal.tsx
│   ├── channel/
│   │   ├── ChannelList.tsx
│   │   ├── MessageList.tsx
│   │   └── MessageInput.tsx
│   └── session/
│       ├── TeacherRoom.tsx
│       ├── StudentRoom.tsx
│       ├── Whiteboard.tsx
│       └── SessionChat.tsx
├── lib/
│   ├── api.ts                            ← all fetch calls to .NET backend
│   └── auth.ts                           ← JWT storage helpers
└── types/
    └── index.ts
```

### Routing & Middleware
- `middleware.ts` reads JWT role from session → redirects `/teacher/*` for students and vice versa
- Teacher lands on `/teacher/dashboard` after auth
- Student lands on `/student/dashboard` after auth
- `/` shows `AuthComponent` for unauthenticated users

### UI Design
**Auth page (`/`):** The provided `AuthComponent` — multi-step glass morphism form, Google OAuth button, confetti on success. Branded "Kattral Academy".

**Teacher Dashboard:** Dark sidebar with nav icons. Main area split into Today's Schedule (class list with time + status badges) and Pending Tasks (priority-tagged cards). "Create Session" button per classroom.

**Student Dashboard:** Calmendar-inspired calendar week view. Enrolled classrooms shown as colored session blocks. "JOIN" button appears on blocks where `status = live` (polls every 5s). Mini monthly calendar on the left panel.

**Classroom page (both roles):** Channel list sidebar + message feed. Teacher sees session management controls; student sees session status.

**Session room:** LiveKit `VideoConference` component. Teacher gets end session + whiteboard + chat panel. Student gets whiteboard (view) + chat panel.

**Design tokens:** Dark base (`#0f1117`), shadcn/ui components, Tailwind CSS, Framer Motion for transitions. Classroom cards color-coded (blue/green/purple/red).

---

## 6. Dependencies

### .NET 8 packages
- `MongoDB.Driver` — MongoDB client
- `BCrypt.Net-Next` — password hashing
- `System.IdentityModel.Tokens.Jwt` — JWT issuance and validation
- `LiveKit.Client.SDK` (or manual HTTP token generation) — LiveKit tokens

### Next.js packages (additions to current)
- `mongoose` — NOT used (API calls go to .NET, not MongoDB directly)
- `lucide-react` — icons
- `framer-motion` — animations
- `canvas-confetti` — auth success confetti
- `class-variance-authority` — button variants

---

## 7. Environment Variables

### .NET `appsettings.json`
```json
{
  "MongoDB": { "ConnectionString": "", "DatabaseName": "kattral_academy" },
  "Jwt": { "Secret": "", "Issuer": "kattral-api", "ExpiryHours": 1 },
  "LiveKit": { "ApiKey": "", "ApiSecret": "", "Url": "" },
  "Google": { "ClientId": "" }
}
```

### Next.js `.env.local`
```
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_LIVEKIT_URL=wss://katral-zonddr6x.livekit.cloud
```

---

## 8. Out of Scope (MVP)
- Redis caching (add later at scale)
- File/document uploads
- Student analytics
- Push notifications
- Mobile app
