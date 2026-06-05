#!/usr/bin/env bash
# share.sh — Start everything and expose the app via ngrok for external testers
# Usage: ./share.sh
# Stop:  Ctrl+C

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
FRONTEND="$ROOT/frontend/edu-web"
BACKEND="$ROOT/backend/EduPlatform.Api"
ENV_LOCAL="$FRONTEND/.env.local"

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}▶ $*${NC}"; }
success() { echo -e "${GREEN}✓ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠ $*${NC}"; }

cleanup() {
  info "Shutting down…"
  kill "$NGROK_PID" "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  sed -i '' "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://localhost:3000|" "$ENV_LOCAL"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── 0. Guard against duplicate processes ──────────────────────────────────────
free_port() {
  local port=$1; local name=$2
  local pids
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    warn "$name already on :$port (PIDs $pids) — killing"
    kill -9 $pids 2>/dev/null || true
    sleep 1
  fi
}
free_port 3000 "Next.js"
free_port 5261 "Backend"
free_port 4040 "ngrok dashboard"
pkill -f "ngrok start" 2>/dev/null && { warn "Killed stale ngrok"; sleep 1; } || true

# ── 1. Ensure Docker daemon is running (Colima on macOS) ─────────────────────
if ! docker info &>/dev/null; then
  info "Docker daemon not running — starting Colima…"
  colima start --cpu 1 --memory 1
  success "Colima started"
fi

# ── 2. Start MongoDB ──────────────────────────────────────────────────────────
info "Starting MongoDB…"
docker compose -f "$ROOT/docker-compose.yml" up -d --quiet-pull 2>/dev/null \
  && success "MongoDB up" \
  || warn "Docker compose failed — continuing anyway (may already be running)"
sleep 2

# ── 3. Start ngrok tunnel for frontend ───────────────────────────────────────
info "Starting ngrok tunnel for frontend (port 3000)…"
NGROK_GLOBAL_CFG=$(ngrok config check 2>/dev/null | sed 's/Valid configuration file at //')
ngrok start frontend --config "$ROOT/ngrok.yml" --config "$NGROK_GLOBAL_CFG" \
  > /tmp/ngrok-share.log 2>&1 &
NGROK_PID=$!

for i in {1..15}; do
  sleep 1
  TUNNELS=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null)
  [[ "$TUNNELS" == *"public_url"* ]] && break
  [[ $i -eq 15 ]] && { echo "ngrok failed to start. Check /tmp/ngrok-share.log"; exit 1; }
done

FRONTEND_URL=$(python3 -c "
import json, sys
t = json.loads('''$TUNNELS''')['tunnels']
u = next((x['public_url'] for x in t if '3000' in str(x.get('config',{}).get('addr',''))), None)
print(u or '')
" 2>/dev/null)

if [[ -z "$FRONTEND_URL" ]]; then
  warn "Could not get frontend ngrok URL. Check http://localhost:4040"
  FRONTEND_URL="http://localhost:3000"
fi
success "Frontend tunnel: $FRONTEND_URL"

# ── 4. Update NEXTAUTH_URL so Google OAuth redirects to the ngrok URL ─────────
sed -i '' "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=$FRONTEND_URL|" "$ENV_LOCAL"
success "Set NEXTAUTH_URL=$FRONTEND_URL"

# ── 5. Start .NET backend ─────────────────────────────────────────────────────
info "Starting .NET backend…"
cd "$BACKEND"
dotnet run > /tmp/backend-share.log 2>&1 &
BACKEND_PID=$!
success "Backend starting (PID $BACKEND_PID) — logs: /tmp/backend-share.log"

# ── 6. Install frontend dependencies if missing ───────────────────────────────
cd "$FRONTEND"
if [[ ! -d "node_modules" ]]; then
  info "Installing frontend dependencies (first run — takes ~1 min)…"
  npm ci 2>&1 | tail -5
  success "Dependencies installed"
fi

# ── 7. Build Next.js for production and start ────────────────────────────────
info "Building Next.js for production (logs: /tmp/frontend-build.log)…"
if npm run build > /tmp/frontend-build.log 2>&1; then
  success "Production build complete"
  info "Starting Next.js production server…"
  npm run start > /tmp/frontend-share.log 2>&1 &
else
  warn "Build failed — check /tmp/frontend-build.log — falling back to dev server"
  npm run dev > /tmp/frontend-share.log 2>&1 &
fi
FRONTEND_PID=$!

# Wait up to 60 s for Next.js to respond
for i in {1..60}; do
  sleep 1
  if curl -s http://localhost:3000 -o /dev/null 2>/dev/null; then break; fi
  [[ $i -eq 60 ]] && warn "Frontend didn't respond in 60s — check /tmp/frontend-share.log"
done
success "Frontend started (PID $FRONTEND_PID) — logs: /tmp/frontend-share.log"

# ── 8. Print sharing instructions ────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Kattral Academy is now shareable!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Share this URL with testers:"
echo -e "  ${CYAN}${FRONTEND_URL}${NC}"
echo ""
echo -e "  ngrok dashboard:  ${CYAN}http://localhost:4040${NC}"
echo ""
echo -e "${YELLOW}  ⚠  One-time Google OAuth setup (only needed for new domains):${NC}"
echo -e "  1. Go to https://console.cloud.google.com/apis/credentials"
echo -e "  2. Edit your OAuth client"
echo -e "  3. Add to 'Authorised JavaScript origins':  ${FRONTEND_URL}"
echo -e "  4. Add to 'Authorised redirect URIs':       ${FRONTEND_URL}/api/auth/callback/google"
echo ""
echo -e "  Logs:"
echo -e "    Backend:   tail -f /tmp/backend-share.log"
echo -e "    Frontend:  tail -f /tmp/frontend-share.log"
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop everything."
echo ""

wait $BACKEND_PID $FRONTEND_PID
