#!/bin/bash
# =============================================================================
#  DFA — Digital Forensics Assistant | VPS Deployment Script
#  Usage:
#    chmod +x deploy.sh
#    ./deploy.sh           # update/deploy (pull + rebuild + restart)
#    ./deploy.sh --setup   # first-time full setup (clone to PM2)
#    ./deploy.sh --build   # pull + rebuild only (no restart)
# =============================================================================

set -e

# ── Config ──────────────────────────────────────────────────────────────────
REPO_URL="${REPO_URL:-}"                         # git remote URL (fill or pass via env)
PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")" && pwd)}"   # auto-detect (or set via env)
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
NODE_ENV="${NODE_ENV:-production}"

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
err()   { echo -e "${RED}[FAIL]${NC}  $1"; exit 1; }

# ────────────────────────────────────────────────────────────────────────────
#  FIRST-TIME SETUP
# ────────────────────────────────────────────────────────────────────────────
setup() {
    info "========================================="
    info "  DFA First-Time VPS Setup"
    info "========================================="

    # --- System dependencies ---
    info "Checking system dependencies..."

    command -v python3  >/dev/null || err "python3 not installed"
    command -v node     >/dev/null || err "node not installed (install Node 20+)"
    command -v npm      >/dev/null || err "npm not installed"
    command -v git      >/dev/null || err "git not installed"
    command -v psql     >/dev/null || warn "psql not found — install PostgreSQL manually if needed"
    ok "System dependencies OK"

    # --- Clone project ---
    if [ ! -d "$PROJECT_DIR" ]; then
        if [ -z "$REPO_URL" ]; then
            err "REPO_URL not set. Run: REPO_URL=<your-git-url> ./deploy.sh --setup"
        fi
        info "Cloning $REPO_URL → $PROJECT_DIR ..."
        git clone "$REPO_URL" "$PROJECT_DIR"
        ok "Repository cloned"
    else
        ok "Project directory exists: $PROJECT_DIR"
    fi

    cd "$PROJECT_DIR"

    # --- Environment files ---
    info "Setting up environment files..."
    if [ ! -f backend/.env ]; then
        cp backend/.env.example backend/.env
        warn "Created backend/.env from template — EDIT IT NOW: nano backend/.env"
    else
        ok "backend/.env exists"
    fi
    if [ ! -f frontend/.env.local ]; then
        cp frontend/.env.example frontend/.env.local
        warn "Created frontend/.env.local from template — EDIT IF NEEDED"
    else
        ok "frontend/.env.local exists"
    fi

    # --- Backend venv ---
    info "Setting up Python virtual environment..."
    cd "$PROJECT_DIR/backend"
    if [ ! -d venv ]; then
        python3 -m venv venv
        ok "venv created"
    else
        ok "venv exists"
    fi
    source venv/bin/activate
    pip install --upgrade pip -q
    pip install -r requirements.txt
    ok "Python dependencies installed"
    cd "$PROJECT_DIR"

    # --- Frontend deps ---
    info "Installing frontend dependencies..."
    cd "$PROJECT_DIR/frontend"
    npm install
    ok "Node dependencies installed"
    cd "$PROJECT_DIR"

    # --- PostgreSQL database ---
    info "Checking PostgreSQL database..."
    if sudo -u postgres psql -lqt 2>/dev/null | grep -q forensics_db; then
        ok "Database 'forensics_db' exists"
    else
        warn "Creating database 'forensics_db'..."
        sudo -u postgres psql -c "CREATE DATABASE forensics_db;" 2>/dev/null || \
            warn "Could not auto-create DB — create manually: CREATE DATABASE forensics_db;"
    fi

    # --- Ollama ---
    info "Checking Ollama..."
    if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
        ok "Ollama is running"
    else
        warn "Ollama not running — install and start it:"
        warn "  curl -fsSL https://ollama.com/install.sh | sh"
        warn "  ollama pull llama3:8b && ollama pull nomic-embed-text"
        warn "  ollama serve &"
    fi

    # --- Frontend build ---
    info "Building frontend..."
    cd "$PROJECT_DIR/frontend"
    npm run build
    ok "Frontend built"
    cd "$PROJECT_DIR"

    # --- PM2 setup ---
    info "Setting up PM2..."
    if command -v pm2 >/dev/null 2>&1; then
        ok "PM2 installed"
    else
        warn "Installing PM2..."
        npm install -g pm2
        ok "PM2 installed"
    fi

    # Stop existing processes
    pm2 delete dfa-backend 2>/dev/null || true
    pm2 delete dfa-frontend 2>/dev/null || true

    # Start backend
    cd "$PROJECT_DIR/backend"
    source venv/bin/activate
    pm2 start "uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT" \
        --name dfa-backend --interpreter bash
    ok "Backend started (PM2: dfa-backend) on :$BACKEND_PORT"

    # Start frontend
    cd "$PROJECT_DIR/frontend"
    pm2 start "npx next start --port $FRONTEND_PORT" \
        --name dfa-frontend --interpreter bash
    ok "Frontend started (PM2: dfa-frontend) on :$FRONTEND_PORT"

    pm2 save
    pm2 startup 2>/dev/null && ok "PM2 auto-start configured" || warn "Run 'pm2 startup' manually"

    cd "$PROJECT_DIR"

    echo ""
    info "========================================="
    ok  "  SETUP COMPLETE"
    info "========================================="
    info "  Backend  → http://<vps-ip>:$BACKEND_PORT"
    info "  Frontend → http://<vps-ip>:$FRONTEND_PORT"
    info "  PM2 logs → pm2 logs"
    info "  PM2 list → pm2 status"
    info "========================================="
    info "  NEXT STEP: edit backend/.env with your DB credentials"
    info "             nano $PROJECT_DIR/backend/.env"
    info "========================================="
}

# ────────────────────────────────────────────────────────────────────────────
#  BUILD (pull + rebuild, no restart)
# ────────────────────────────────────────────────────────────────────────────
build() {
    cd "$PROJECT_DIR" || err "Project directory not found: $PROJECT_DIR"

    info "Pulling latest changes..."
    git fetch origin main && git reset --hard origin/main
    ok "Git pull done"

    info "Installing frontend dependencies..."
    cd "$PROJECT_DIR/frontend"
    npm install
    ok "Dependencies up to date"

    info "Building frontend..."
    npm run build
    ok "Frontend built"

    cd "$PROJECT_DIR"
    ok "BUILD DONE — run './deploy.sh' to restart services"
}

# ────────────────────────────────────────────────────────────────────────────
#  DEPLOY (pull → install → build → restart)
# ────────────────────────────────────────────────────────────────────────────
deploy() {
    cd "$PROJECT_DIR" || err "Project directory not found: $PROJECT_DIR"

    # ── Pull ──
    info "Pulling latest changes..."
    git fetch origin main && git reset --hard origin/main
    ok "Git pull done"

    # ── Backend deps ──
    info "Checking backend dependencies..."
    cd "$PROJECT_DIR/backend"
    if [ -f venv/bin/activate ]; then
        source venv/bin/activate
        pip install -r requirements.txt -q
        ok "Backend dependencies up to date"
    else
        warn "venv not found — skipping backend deps"
    fi

    # ── Frontend deps ──
    info "Installing frontend dependencies..."
    cd "$PROJECT_DIR/frontend"
    npm install
    ok "Frontend dependencies up to date"

    # ── Build ──
    info "Building frontend..."
    npm run build
    ok "Frontend built"

    cd "$PROJECT_DIR"

    # ── Restart services ──
    if command -v pm2 >/dev/null 2>&1 && pm2 list | grep -q dfa-; then
        info "Restarting PM2 services..."
        pm2 restart dfa-backend 2>/dev/null || warn "dfa-backend not running"
        pm2 restart dfa-frontend 2>/dev/null || warn "dfa-frontend not running"
        ok "Services restarted"
    else
        warn "PM2 not detected — starting services manually..."

        # Kill old processes on ports
        fuser -k $BACKEND_PORT/tcp 2>/dev/null || true
        fuser -k $FRONTEND_PORT/tcp 2>/dev/null || true
        sleep 1

        # Backend
        cd "$PROJECT_DIR/backend"
        source venv/bin/activate 2>/dev/null || true
        nohup uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT > /tmp/dfa-backend.log 2>&1 &
        ok "Backend started on :$BACKEND_PORT"

        # Frontend
        cd "$PROJECT_DIR/frontend"
        nohup npx next start --port $FRONTEND_PORT > /tmp/dfa-frontend.log 2>&1 &
        ok "Frontend started on :$FRONTEND_PORT"
    fi

    echo ""
    info "========================================="
    ok  "  DEPLOY COMPLETE"
    info "========================================="
    info "  Backend  → http://<vps-ip>:$BACKEND_PORT"
    info "  Frontend → http://<vps-ip>:$FRONTEND_PORT"
    info "========================================="
}

# ────────────────────────────────────────────────────────────────────────────
#  MAIN
# ────────────────────────────────────────────────────────────────────────────
case "${1:-}" in
    --setup)  setup  ;;
    --build)  build  ;;
    -h|--help)
        echo "Usage: ./deploy.sh [--setup|--build|-h]"
        echo ""
        echo "  (no flag)   Full deploy: pull → install → build → restart"
        echo "  --setup     First-time setup: clone, env, deps, DB, build, PM2"
        echo "  --build     Pull + rebuild only (no restart)"
        echo "  -h, --help  This help"
        ;;
    *)  deploy  ;;
esac
