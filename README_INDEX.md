# 📖 Kattral Academy LMS - Documentation Index

## 🚀 Getting Started (Start Here!)

### For First-Time Users
1. **[QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)** ⭐ START HERE
   - How to run the app
   - Testing checklist
   - Troubleshooting common issues
   - Environment setup

### To Share with Testers
1. Run: `./share.sh`
2. Share the ngrok URL displayed
3. See [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) for details

---

## 🔧 Technical Documentation

### Frontend Issues
- **[FRONTEND_STARTUP_FIX.md](./FRONTEND_STARTUP_FIX.md)**
  - Frontend startup error fix (ngrok_8012)
  - What was changed and why
  - How to verify it's working

### GitHub & Git Issues
- **[GITHUB_PUSH_PROTECTION_FIX.md](./GITHUB_PUSH_PROTECTION_FIX.md)**
  - Push protection error explanation
  - Links to GitHub secret bypass
  - How to complete the push

### Project Status
- **[PROJECT_STATUS_SUMMARY.md](./PROJECT_STATUS_SUMMARY.md)**
  - What was fixed today
  - Current system status
  - Files that were modified

---

## 📚 Architecture & Planning

### Original Architecture Docs
- `docs/superpowers/plans/2026-05-25-kattral-frontend-nextjs.md`
  - Frontend architecture
  - Environment setup
  - Deployment guide

- `docs/superpowers/plans/2026-05-25-kattral-backend-dotnet-mongodb.md`
  - Backend architecture
  - Database schema
  - API endpoints

- `docs/superpowers/plans/2026-05-25-plugnmeet-livekit-toggle.md`
  - PlugNmeet vs LiveKit comparison
  - How to toggle between engines
  - Configuration options

### Project Context
- `docs/PROJECT_CONTEXT.md`
  - Complete project overview
  - Configuration reference
  - Environment variables guide

---

## 📊 Quick Reference

### Common Commands

```bash
# START EVERYTHING (RECOMMENDED)
./share.sh

# Start just frontend
cd frontend/edu-web && npm run dev

# Start just backend  
cd backend/EduPlatform.Api && dotnet run

# Start Docker services
cd plugnmeet-docker && docker compose up

# Check if services are running
curl -I http://localhost:3000          # Frontend
curl -I http://localhost:5261          # Backend
curl http://localhost:4040/api/tunnels # ngrok
```

### Important Files

| File | Purpose |
|------|---------|
| `share.sh` | Main script to start everything |
| `frontend/edu-web/package.json` | Frontend dependencies & scripts |
| `backend/EduPlatform.Api/Program.cs` | Backend startup |
| `ngrok.yml` | ngrok configuration |
| `.env.local` | Local environment variables (NOT in git) |

### Port Mapping

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 3000 | Next.js dev server |
| Backend | 5261 | .NET API |
| PlugNmeet | 8080 | Live sessions |
| ngrok | 4040 | Tunneling dashboard |
| LiveKit | Cloud | Real-time video |

---

## ✅ Issues Fixed (June 4, 2026)

### Issue 1: Frontend Not Starting
- **Symptom:** `ERR_NGROK_8012` from ngrok
- **Root Cause:** `share.sh` trying to run `node server.js` that doesn't exist
- **Files Fixed:** `share.sh`, `frontend/edu-web/package.json`
- **Status:** ✅ RESOLVED

### Issue 2: GitHub Push Protection
- **Symptom:** Git push rejected due to secrets in history
- **Root Cause:** Credentials committed in docs and configs
- **Files Fixed:** All documentation and config files
- **Status:** ⏳ Awaiting GitHub secret bypass

---

## 🔐 Secrets & Security

### What Was Done ✅
1. Removed all secrets from current codebase
2. Replaced with placeholders in all docs
3. Removed `.env.local` from git tracking
4. Cleaned up git history where possible

### What You Need to Do
1. For local development: Create `.env.local` with real credentials
2. For CI/CD: Use GitHub Secrets (not in repo)
3. For production: Use environment variables (not in code)

### Credentials Template
See `.env.local.example` for the template

---

## 🧪 Testing

### Manual Testing
Follow the checklist in [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)

### Automated Testing
Currently no automated tests configured. TODO: Set up testing suite.

---

## 🚀 Deployment Checklist

- [ ] Get Google OAuth credentials
- [ ] Get LiveKit Cloud credentials
- [ ] Get PlugNmeet credentials
- [ ] Set up GitHub Secrets with credentials
- [ ] Deploy backend to production server
- [ ] Deploy frontend to Vercel/Next.js hosting
- [ ] Update DNS/domain settings
- [ ] Test live features
- [ ] Monitor error logs

---

## 📞 Support

### If Something Breaks
1. Check the error message
2. Look for matching error in documentation
3. Check logs: `/tmp/*-share.log`
4. Read the relevant documentation file below

### Documentation by Error Type

| Error | Doc |
|-------|-----|
| Frontend won't start | [FRONTEND_STARTUP_FIX.md](./FRONTEND_STARTUP_FIX.md) |
| ngrok connection refused | [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) |
| Can't push to GitHub | [GITHUB_PUSH_PROTECTION_FIX.md](./GITHUB_PUSH_PROTECTION_FIX.md) |
| API doesn't respond | [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) |
| Video sessions fail | Check project context docs |
| Login doesn't work | Check environment variables |

---

## 📈 Project Timeline

### Completed
- ✅ Frontend setup (Next.js 16)
- ✅ Backend setup (.NET 8)
- ✅ Docker services (PlugNmeet)
- ✅ ngrok tunneling
- ✅ Authentication (Google OAuth)
- ✅ Video engine toggle (LiveKit ↔ PlugNmeet)
- ✅ Frontend startup fixes
- ✅ Security cleanup (secrets removal)

### In Progress
- 🔄 GitHub push (awaiting secret bypass)

### TODO
- [ ] Automated testing
- [ ] CI/CD pipeline
- [ ] Performance optimization
- [ ] Production deployment
- [ ] User documentation
- [ ] Demo video walkthrough

---

## 🎯 Next Steps

### Right Now
1. Read [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)
2. Run `./share.sh`
3. Test with the checklist

### If Push Fails
1. Read [GITHUB_PUSH_PROTECTION_FIX.md](./GITHUB_PUSH_PROTECTION_FIX.md)
2. Visit GitHub bypass links
3. Run `git push origin main`

### For Deployment
1. Refer to architecture docs
2. Set up CI/CD
3. Configure production credentials
4. Deploy!

---

## 📋 Files in This Project

### Root Level
- `share.sh` - Main launching script ✅ FIXED
- `dev.sh` - Development script
- `setup.sh` - Setup script
- `README.md` - General overview
- `ngrok.yml` - ngrok config
- `.env.local` - Local env vars (not in git)
- `.gitignore` - Git ignore rules

### Documentation
- `docs/` - Architecture & planning docs
- `DIAGNOSTICS_AND_FIXES.md` - (removed from git for security)
- `FRONTEND_STARTUP_FIX.md` - Frontend fix details ✅
- `GITHUB_PUSH_PROTECTION_FIX.md` - GitHub push issue ⏳
- `PROJECT_STATUS_SUMMARY.md` - Today's work summary
- `QUICK_START_GUIDE.md` - Getting started guide ⭐
- `COMPLETE_GUIDE.md` - Comprehensive guide
- `README_INDEX.md` - This file

### Source Code
- `frontend/edu-web/` - Next.js frontend
- `backend/EduPlatform.Api/` - .NET backend
- `plugnmeet-docker/` - PlugNmeet Docker setup

---

## 🎓 Learning Resources

### To Understand the Architecture
1. Start with `docs/PROJECT_CONTEXT.md`
2. Read the relevant `.md` files in `docs/superpowers/plans/`
3. Review the source code in `frontend/` and `backend/`

### To Deploy
1. Read deployment section in architecture docs
2. Follow production setup in `.env.local.example`
3. Set up GitHub Secrets for CI/CD

### To Debug Issues
1. Read the error message carefully
2. Check the documentation index above
3. Look for your error type
4. Follow the recommended fix

---

**Last Updated:** June 4, 2026
**Status:** Ready for external testing via `./share.sh`
**Known Issues:** GitHub push protection (awaiting bypass)
**Next Review:** After successful push to GitHub
