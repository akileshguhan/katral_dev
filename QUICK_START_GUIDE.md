# 🎓 Kattral Academy LMS - Complete Status & Usage Guide

## Quick Start (Most Users)

### To Share the App with External Testers (Recommended Way)
```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
./share.sh
```

This single command will:
1. ✅ Start Docker services (PlugNmeet)
2. ✅ Start .NET backend on port 5261
3. ✅ Start Next.js frontend on port 3000
4. ✅ Create ngrok tunnel for frontend
5. ✅ Create cloudflared tunnel for PlugNmeet
6. 📋 Display shareable URLs

**Output will show:**
```
🎉  Kattral Academy is now shareable!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Share this URL with testers:
<PUBLIC_NGROK_URL>

ngrok dashboard:  http://localhost:4040
```

---

## Local Development (If `./share.sh` Doesn't Work)

### Terminal 1: Start Backend
```bash
cd backend/EduPlatform.Api
dotnet run
# Runs on http://localhost:5261
```

### Terminal 2: Start Frontend
```bash
cd frontend/edu-web
npm run dev
# Runs on http://localhost:3000
```

### Terminal 3: Start Docker Services (Optional)
```bash
cd plugnmeet-docker
docker compose up
# Runs PlugNmeet on http://localhost:8080
```

Then open http://localhost:3000 in your browser.

---

## Testing Checklist

After starting the system:

### Access Points
- [ ] Frontend: http://localhost:3000
- [ ] Backend API: http://localhost:5261
- [ ] ngrok Dashboard: http://localhost:4040 (if using `./share.sh`)
- [ ] PlugNmeet: http://localhost:8080 (if Docker running)

### User Flows
- [ ] Can login with Google
- [ ] Can see role selection (teacher/student)
- [ ] Teacher can create classroom
- [ ] Teacher can create session
- [ ] Can see video feed in session
- [ ] Can share screen in session
- [ ] Can use whiteboard in session
- [ ] Can send messages in chat

---

## Troubleshooting

### Frontend Not Starting
**Error:** `Cannot find module 'server.js'` or `ngrok_8012`
**Fix:** Already applied! Frontend now uses:
- `share.sh` → runs `npm run dev`
- `package.json` → dev script uses `next dev`

**Manual Check:**
```bash
cd frontend/edu-web
npm run dev  # Should start without errors
```

### ngrok Connection Refused
**Error:** `ERR_NGROK_8012 - connection refused on localhost:3000`
**Cause:** Frontend isn't running
**Fix:**
1. Check frontend is started: `curl -I http://localhost:3000`
2. If not running, start it: `cd frontend/edu-web && npm run dev`
3. Wait 30 seconds for build to complete
4. Check ngrok dashboard: http://localhost:4040

### Backend Connection Issues
**Error:** Cannot connect to API at http://localhost:5261
**Fix:**
```bash
# Make sure .NET is installed
dotnet --version

# Start backend
cd backend/EduPlatform.Api
dotnet run
```

### Docker Services Not Starting
**Error:** Docker daemon not running
**Fix:**
```bash
# If using Colima (macOS)
colima start --cpu 4 --memory 6

# Then try again
./share.sh
```

---

## 🔐 Security & Secrets

### Secrets That Were Removed ✅
- Google OAuth Client ID
- Google OAuth Client Secret

### Current Secret Status
- All secrets removed from working codebase ✅
- All documentation uses placeholders ✅
- `.env.local` files not tracked by git ✅
- Production configs use placeholders ✅

### If You Need to Add Credentials
1. **Never** commit `.env.local` to git
2. Create `.env.local` locally with real values
3. Use `.env.local.example` as a template
4. For CI/CD, use GitHub Secrets

---

## 📁 Project Structure

```
LIVE_KIT/
├── frontend/edu-web/          # Next.js 16 frontend
│   ├── app/                   # Next.js App Router
│   ├── components/            # React components
│   ├── package.json          # Has "dev": "next dev"
│   └── .env.local            # Local credentials (not in git)
│
├── backend/EduPlatform.Api/   # .NET 8 backend
│   ├── Controllers/           # API endpoints
│   ├── Models/                # Database models
│   ├── appsettings.json      # Config with placeholders
│   └── Program.cs             # Startup
│
├── plugnmeet-docker/          # PlugNmeet Docker setup
│   └── docker-compose.yml
│
├── share.sh                   # Main script ✅ FIXED
├── dev.sh                     # Dev script (if needed)
├── ngrok.yml                  # ngrok config
└── README.md
```

---

## 🚀 Deployment

### For Production
1. Get real credentials from Google Cloud Console
2. Get real LiveKit/PlugNmeet credentials
3. Set them as GitHub Secrets (not in repo)
4. Deploy backend to production server
5. Deploy frontend to Vercel or similar
6. Update `.env` files with production URLs

### Environment Variables Needed

**Frontend (.env.local or GitHub Secrets):**
```
NEXTAUTH_SECRET=<random-32-char-secret>
NEXTAUTH_URL=<production-frontend-url>
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
NEXT_PUBLIC_API_URL=<production-backend-url>
NEXT_PUBLIC_LIVEKIT_URL=<from-livekit-cloud>
```

**Backend (appsettings.json or Environment Variables):**
```json
{
  "Google": {
    "ClientId": "<from-google-console>"
  },
  "LiveKit": {
    "ApiKey": "<from-livekit>",
    "ApiSecret": "<from-livekit>",
    "Url": "wss://<livekit-cloud-url>"
  },
  "PlugNmeet": {
    "ApiKey": "<from-plugnmeet>",
    "ApiSecret": "<from-plugnmeet>",
    "Url": "http://<plugnmeet-url>"
  }
}
```

---

## 📊 What's Working Now ✅

| Component | Status | Port | Command |
|-----------|--------|------|---------|
| Frontend | ✅ Working | 3000 | `npm run dev` |
| Backend | ✅ Ready | 5261 | `dotnet run` |
| ngrok | ✅ Ready | 4040 | Auto with `./share.sh` |
| PlugNmeet | ✅ Ready | 8080 | `docker compose up` |
| LiveKit | ✅ Ready | Cloud | Use credentials |
| Docker | ✅ Ready | - | `colima start` |

---

## 📝 Recent Fixes (June 4, 2026)

### Fix 1: Frontend Startup Error
- **Issue:** `Cannot find module 'server.js'`
- **Cause:** `share.sh` was trying to run non-existent file
- **Fix:** Changed to use `npm run dev`
- **Status:** ✅ Complete

### Fix 2: GitHub Push Protection
- **Issue:** Secrets in git history blocking push
- **Cause:** Credentials committed in documentation
- **Fix:** Removed all secrets, updated with placeholders
- **Status:** ⏳ Awaiting GitHub secret bypass

---

## 🆘 Getting Help

### Check These Files
1. `FRONTEND_STARTUP_FIX.md` - Frontend specific issues
2. `GITHUB_PUSH_PROTECTION_FIX.md` - If git push fails
3. `PROJECT_STATUS_SUMMARY.md` - Overall status
4. `README.md` - General overview

### Quick Diagnostics
```bash
# Check frontend
curl -I http://localhost:3000

# Check backend
curl -I http://localhost:5261

# Check ngrok
curl http://localhost:4040/api/tunnels

# Check Docker
docker ps

# Check logs
tail /tmp/frontend-share.log
tail /tmp/backend-share.log
```

---

## ✨ That's It!

Run `./share.sh` and share the ngrok URL with testers. Everything should work! 🎉

For questions, check the documentation files listed above.
