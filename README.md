# 📚 LiveKit Classroom Platform

A full-featured live classroom application built with **Next.js 14**, **.NET 8**, **PostgreSQL**, and **LiveKit** for real-time video streaming.

## ✨ Features

### 👨‍🏫 Teacher Features
- ✅ Create multiple classrooms
- ✅ Generate invite codes for students
- ✅ Create channels (general, announcements, resources)
- ✅ Start live video sessions with real-time video/audio
- ✅ Screen sharing during sessions
- ✅ Interactive whiteboard
- ✅ Class chat
- ✅ Upload documents to channels
- ✅ Manage classroom members

### 👨‍🎓 Student Features
- ✅ Join classrooms with invite code
- ✅ View classroom channels and materials
- ✅ Participate in live sessions
- ✅ Real-time video/audio with peers
- ✅ Chat and messaging
- ✅ Download learning materials

### 🔧 Technical Features
- ✅ Google OAuth authentication
- ✅ Role-based access (teacher/student)
- ✅ JWT token-based API security
- ✅ Real-time video with LiveKit
- ✅ Document storage (Supabase)
- ✅ Responsive Material Design UI
- ✅ Session history and management

---

## 🚀 Quick Start

### Automated Setup (Recommended)
```bash
# Clone and navigate to project
cd /path/to/LIVE_KIT

# Run automatic setup script
./setup.sh

# This will:
# 1. Install .NET SDK (if needed)
# 2. Start PostgreSQL
# 3. Create database
# 4. Apply migrations
# 5. Install npm dependencies
```

### Manual Setup

**Prerequisites:**
- .NET 8 SDK: `brew install dotnet`
- PostgreSQL 14+: `brew install postgresql@16`
- Node.js 18+: Already installed
- npm: Already installed

**Step 1: Start Database**
```bash
brew services start postgresql@16
psql -U harshavardhanan -c "CREATE DATABASE teaching_platform;" 2>/dev/null || true
```

**Step 2: Setup Backend (Terminal 1)**
```bash
cd backend/TeachingPlatform.API
dotnet restore
dotnet ef database update
dotnet run
# Backend runs on http://localhost:5000
```

**Step 3: Setup Frontend (Terminal 2)**
```bash
cd /path/to/LIVE_KIT
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ • Google OAuth Login                                 │  │
│  │ • Role Selection (Teacher/Student)                   │  │
│  │ • Dashboard with Classrooms                          │  │
│  │ • LiveKit Video Sessions                             │  │
│  │ • Document Management                                │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────┬──────────────────────────────────────────┘
                 │ HTTP API
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                Backend (.NET 8 API)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ • Authentication (JWT)                               │  │
│  │ • Classroom Management                               │  │
│  │ • Session Management                                 │  │
│  │ • Channel Management                                 │  │
│  │ • LiveKit Token Generation                           │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────┬──────────────────────────────────────────┘
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
┌──────────────┐    ┌───────────────┐
│ PostgreSQL   │    │ LiveKit Cloud │
│ Database     │    │ Video Rooms   │
└──────────────┘    └───────────────┘
```

---

## 📁 Project Structure

```
LIVE_KIT/
├── app/                                 # Next.js App Router
│   ├── page.tsx                        # Landing page
│   ├── api/auth/                       # NextAuth routes
│   ├── auth/role/                      # Role selection
│   ├── dashboard/                      # Main dashboard
│   ├── classroom/[id]/                 # Classroom view
│   └── layout.tsx
├── components/                          # React components
│   ├── session/                        # LiveKit session components
│   ├── channel/                        # Channel components
│   ├── dashboard/                      # Dashboard components
│   └── layout/                         # Layout components
├── lib/                                 # Utilities
│   ├── api.ts                          # API client
│   ├── authOptions.ts                  # NextAuth config
│   └── supabase.ts                     # Supabase client
├── types/                               # TypeScript types
├── backend/
│   └── TeachingPlatform.API/           # .NET 8 Backend
│       ├── Controllers/                # API endpoints
│       ├── Models/                     # Database models
│       ├── Services/                   # Business logic
│       ├── Data/                       # EF Core
│       └── Migrations/                 # DB migrations
├── DIAGNOSTICS_AND_FIXES.md            # Troubleshooting guide
├── COMPLETE_GUIDE.md                   # Comprehensive guide
├── setup.sh                            # Automated setup script
└── package.json
```

---

## 🔑 API Endpoints

### Authentication
- `POST /auth/google` - Google OAuth login
- `POST /auth/role` - Set user role
- `GET /auth/me` - Get current user

### Classrooms
- `GET /classrooms` - List user's classrooms
- `POST /classrooms` - Create classroom (teacher)
- `GET /classrooms/{id}` - Get classroom details
- `POST /classrooms/join` - Join with invite code
- `POST /classrooms/{id}/members` - Add member

### Sessions
- `GET /classrooms/{id}/sessions` - List sessions
- `POST /classrooms/{id}/sessions` - Create session
- `POST /sessions/{id}/start` - Start session (get LiveKit token)
- `POST /sessions/{id}/join` - Join session (get LiveKit token)
- `POST /sessions/{id}/end` - End session

### Channels
- `GET /classrooms/{id}/channels` - List channels
- `POST /classrooms/{id}/channels` - Create channel

### Messages & Documents
- `GET /channels/{id}/messages` - List messages
- `POST /channels/{id}/messages` - Send message
- `GET /channels/{id}/documents` - List documents

---

## 🔧 Configuration

### Frontend `.env.local`
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:5000

# LiveKit
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-instance
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# Supabase (Optional)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### Backend `appsettings.Development.json`
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=teaching_platform;Username=harshavardhanan;Password="
  },
  "Jwt": {
    "Secret": "your_jwt_secret",
    "Issuer": "TeachingPlatform",
    "Audience": "TeachingPlatformUsers",
    "ExpiryHours": "24"
  },
  "LiveKit": {
    "ApiKey": "your_livekit_api_key",
    "ApiSecret": "your_livekit_api_secret",
    "Url": "wss://your-livekit-instance"
  }
}
```

---

## 🧪 Testing the Application

1. **Start both servers** (backend and frontend)
2. **Go to http://localhost:3000**
3. **Sign in with Google**
4. **Select "Teacher" role**
5. **Create a classroom**
6. **Copy the invite code**
7. **Create a session**
8. **Click "Start" to join the live session**
9. **In another tab, sign in as "Student" role**
10. **Join the classroom with the invite code**
11. **View the live session as a student**

---

## 🐛 Issues & Solutions

### Frontend Build Fails
```bash
rm -rf .next node_modules
npm install
npm run build
```

### Backend Won't Start
```bash
# Check .NET installation
dotnet --version

# Check PostgreSQL
brew services list | grep postgresql

# Apply migrations
dotnet ef database update
```

### Cannot Login
- Verify Google Client ID and Secret in `.env.local`
- Check Google Cloud Console has `http://localhost:3000` in allowed URIs

### LiveKit Connection Failed
- Verify `NEXT_PUBLIC_LIVEKIT_URL` matches your LiveKit instance
- Check LiveKit API keys in backend `appsettings.json`
- Ensure both frontend and backend can reach LiveKit server

---

## 📚 For More Help

- **General Setup Issues:** See `DIAGNOSTICS_AND_FIXES.md`
- **Complete Reference:** See `COMPLETE_GUIDE.md`
- **Automated Setup:** Run `./setup.sh`

---

## 🚀 Production Deployment

Before deploying:
1. Set all environment variables in production
2. Update database connection string
3. Use production LiveKit instance
4. Enable HTTPS
5. Configure CORS properly
6. Update `NEXT_PUBLIC_API_URL` to production backend
7. Build: `npm run build` (frontend) and `dotnet publish` (backend)

---

## 📝 License

This project is part of the Kattral Academy Learning Management System.

---

**Ready to start?** Run `./setup.sh` or follow the manual setup steps above! 🎓
