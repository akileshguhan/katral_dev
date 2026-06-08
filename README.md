# Kattral Academy

A learning management platform with live video classrooms. Teachers create
classrooms and sessions; students join with an invite code and attend live
sessions with real-time video, screen sharing, and chat.

## Tech stack

| Layer      | Technology                                          |
| ---------- | --------------------------------------------------- |
| Frontend   | Next.js 16 (App Router), React 19, Tailwind CSS     |
| Backend    | .NET 8 (ASP.NET Core Web API)                        |
| Database   | MongoDB 8                                            |
| Auth       | NextAuth (Google OAuth) + JWT issued by the backend |
| Live video | LiveKit Cloud                                        |
| Storage    | Supabase (uploaded documents)                        |

## Repository layout

```
.
├── backend/
│   └── EduPlatform.Api/        # .NET 8 Web API (controllers, services, models)
├── frontend/
│   └── edu-web/                # Next.js application
├── docs/                       # Architecture notes and design references
├── docker-compose.yml          # MongoDB service
├── start.sh                    # Run the whole stack locally (macOS/Linux)
├── start.bat                   # Run the whole stack locally (Windows)
├── share.sh                    # Run locally and expose the frontend via ngrok (macOS/Linux)
├── share.bat                   # Run locally and expose the frontend via ngrok (Windows)
├── stop.bat                    # Stop all running services (Windows)
└── ngrok.yml                   # ngrok tunnel config (used by share.sh / share.bat)
```

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download) — `dotnet --version`
- [Node.js 20+](https://nodejs.org) and npm — `node --version`
- [Docker](https://www.docker.com) (for MongoDB). On macOS, [Colima](https://github.com/abiosoft/colima) works too.
- A [LiveKit Cloud](https://cloud.livekit.io) project (API key, secret, and URL)
- Optional: a Google OAuth client and a Supabase project

## Configuration

Secrets are never committed. Copy the templates and fill in your own values.

### Backend

```bash
cp backend/EduPlatform.Api/appsettings.json.example backend/EduPlatform.Api/appsettings.json
```

Then edit `backend/EduPlatform.Api/appsettings.json`:

| Key                        | Description                                     |
| -------------------------- | ----------------------------------------------- |
| `MongoDB:ConnectionString` | `mongodb://localhost:27017` for local Docker    |
| `MongoDB:DatabaseName`     | Database name (e.g. `kattral_academy`)          |
| `Jwt:Secret`               | Random string, at least 32 characters           |
| `LiveKit:ApiKey`           | From your LiveKit Cloud project                 |
| `LiveKit:ApiSecret`        | From your LiveKit Cloud project                 |
| `LiveKit:Url`              | `wss://<your-project>.livekit.cloud`            |
| `Google:ClientId`          | Google OAuth client ID (optional)               |

### Frontend

```bash
cp .env.example frontend/edu-web/.env.local
```

Then edit `frontend/edu-web/.env.local`:

| Variable                          | Description                                       |
| --------------------------------- | ------------------------------------------------- |
| `LIVEKIT_API_KEY`                 | Same key as the backend                           |
| `LIVEKIT_API_SECRET`              | Same secret as the backend                        |
| `NEXT_PUBLIC_LIVEKIT_URL`         | `wss://<your-project>.livekit.cloud`              |
| `NEXTAUTH_SECRET`                 | Random string (e.g. `openssl rand -base64 32`)    |
| `NEXTAUTH_URL`                    | `http://localhost:3000` for local development     |
| `GOOGLE_CLIENT_ID`                | Google OAuth client ID (optional)                 |
| `GOOGLE_CLIENT_SECRET`            | Google OAuth client secret (optional)             |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase project URL (optional, for uploads)      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase anon key (optional, for uploads)         |

The frontend reaches the backend through Next.js rewrites (`/api/*` is proxied
to `http://localhost:5261`), so no separate API URL is required for local runs.

## Running locally

After configuring both files above:

**macOS / Linux:**
```bash
./start.sh
```

**Windows:**
```bat
start.bat
```

This starts MongoDB (via Docker), the .NET backend, and the Next.js dev server,
then prints the URLs. On macOS/Linux, press `Ctrl+C` to stop everything. On
Windows, close the terminal windows that open for the backend and frontend, then
run `stop.bat` to free ports and tear down MongoDB.

| Service  | URL                       |
| -------- | ------------------------- |
| Frontend | http://localhost:3000     |
| Backend  | http://localhost:5261     |
| MongoDB  | mongodb://localhost:27017 |

On macOS/Linux, logs are written to `/tmp/backend-dev.log` and
`/tmp/frontend-dev.log`. On Windows, each service runs in its own terminal
window with live output.

### Running the services manually

If you prefer separate terminals instead of the start scripts:

```bash
# 1. MongoDB
docker compose up -d

# 2. Backend (http://localhost:5261)
cd backend/EduPlatform.Api
dotnet run

# 3. Frontend (http://localhost:3000)
cd frontend/edu-web
npm install
npm run dev
```

## Sharing for external testing

`share.sh` (macOS/Linux) and `share.bat` (Windows) run the stack and expose the
frontend through an ngrok tunnel so others can reach it. Both require
[ngrok](https://ngrok.com) to be installed and authenticated, and the public URL
must be added to your Google OAuth client's authorized origins and redirect URIs.

**macOS / Linux:**
```bash
./share.sh
```

**Windows:**
```bat
share.bat
```

Both scripts will print the public ngrok URL and the exact OAuth entries you need
to add to the Google Cloud Console.

### ngrok config location (Windows)

The Windows script looks for your global ngrok config in the default locations:

- `%USERPROFILE%\AppData\Local\ngrok\ngrok.yml` (ngrok v3)
- `%USERPROFILE%\.ngrok2\ngrok.yml` (ngrok v2)

If your config is elsewhere, update the `NGROK_GLOBAL_CFG` line near the top of
`share.bat`. You can find the correct path by running:

```bat
ngrok config check
```

### Stopping the share session (Windows)

Close the Backend and Frontend terminal windows, then run:

```bat
stop.bat
```

This kills any processes still on ports 3000 and 5261 and brings down the
MongoDB container.

## Running tests

```bash
cd backend/EduPlatform.Api.Tests
dotnet test
```

## Trying the app

1. Open http://localhost:3000 and sign in.
2. Choose the teacher role, create a classroom, and copy its invite code.
3. Create a session and start it to enter the live room.
4. In another browser or profile, sign in as a student and join with the invite code.
