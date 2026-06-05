#!/usr/bin/env bash
# dev.sh — Start everything locally (no ngrok, no tunnel)
# Usage: ./dev.sh
# Stop:  Ctrl+C

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
FRONTEND="$ROOT/frontend/edu-web"
BACKEND="$ROOT/backend/EduPlatform.Api"

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}▶ $*${NC}"; }
success() { echo -e "${GREEN}✓ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠ $*${NC}"; }

cleanup() {
  info "Shutting down…"
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  sed -i '' "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://localhost:3000|" "$FRONTEND/.env.local"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── 0. Kill anything already on the ports ─────────────────────────────────────
free_port() {
  local port=$1 name=$2
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

# ── 1. Ensure NEXTAUTH_URL points to localhost ────────────────────────────────
sed -i '' "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://localhost:3000|" "$FRONTEND/.env.local"
success "NEXTAUTH_URL=http://localhost:3000"

# ── 2. Ensure Docker daemon is running (Colima on macOS) ─────────────────────
if ! docker info &>/dev/null; then
  info "Docker daemon not running — starting Colima…"
  colima start --cpu 1 --memory 1
  success "Colima started"
fi

# ── 3. Start MongoDB ──────────────────────────────────────────────────────────
info "Starting MongoDB…"
docker compose -f "$ROOT/docker-compose.yml" up -d --quiet-pull 2>/dev/null \
  && success "MongoDB up" \
  || warn "Docker compose failed — may already be running"
sleep 2

# ── 4. Start .NET backend ─────────────────────────────────────────────────────
info "Starting .NET backend…"
cd "$BACKEND"
dotnet run > /tmp/backend-dev.log 2>&1 &
BACKEND_PID=$!
success "Backend starting (PID $BACKEND_PID) — logs: /tmp/backend-dev.log"

# ── 5. Install frontend dependencies if missing ───────────────────────────────
cd "$FRONTEND"
if [[ ! -d "node_modules" ]]; then
  info "Installing frontend dependencies (first run — takes ~1 min)…"
  npm ci 2>&1 | tail -5
  success "Dependencies installed"
fi

# ── 6. Start Next.js dev server ───────────────────────────────────────────────
info "Starting Next.js dev server…"
npm run dev > /tmp/frontend-dev.log 2>&1 &
FRONTEND_PID=$!
success "Frontend starting (PID $FRONTEND_PID) — logs: /tmp/frontend-dev.log"

sleep 3
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Kattral Academy is running locally!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  App:          ${CYAN}http://localhost:3000${NC}"
echo -e "  Backend API:  ${CYAN}http://localhost:5261${NC}"
echo ""
echo -e "  Logs:"
echo -e "    Backend:   tail -f /tmp/backend-dev.log"
echo -e "    Frontend:  tail -f /tmp/frontend-dev.log"
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop everything."
echo ""

wait $BACKEND_PID $FRONTEND_PID
