# VPS Deployment Guide — DFA Digital Forensics Assistant

> **Target VPS:** `dfa-admin@AI-Agentic:~/ai-forensics-assistant`
> **Last verified:** July 5, 2026 — build clean, services running

---

## TOC
1. [First-Time Setup](#first-time-setup)
2. [Daily Deploy (update)](#daily-deploy-update)
3. [Service Management](#service-management)
4. [Environment Files](#environment-files)
5. [Troubleshooting](#troubleshooting)

---

## First-Time Setup

Jalankan sekali saat VPS masih kosong:

```bash
# 1. Clone repo
git clone https://github.com/bieee123/AI-Forensics-Assistant.git ~/ai-forensics-assistant
cd ~/ai-forensics-assistant

# 2. Copy env templates & edit
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
nano backend/.env          # isi DATABASE_URL, dll

# 3. Buat Python venv + install deps
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# 4. Install frontend deps
cd frontend
npm install
cd ..

# 5. Buat script executable & deploy
chmod +x deploy.sh
./deploy.sh
```

> **Note:** `deploy.sh` auto-detects project directory — no need to edit paths.

---

## Daily Deploy (update)

Setiap kali ada perubahan di GitHub, cukup 1 perintah di VPS:

```bash
cd ~/ai-forensics-assistant
./deploy.sh
```

**Apa yang terjadi:**
```
git pull → npm install → pip install → npm run build → restart services
```

Kalau ada conflict (divergent branches), reset dulu:

```bash
cd ~/ai-forensics-assistant
git fetch origin main
git reset --hard origin/main
cp backend/.env /tmp/backend.env.bak 2>/dev/null      # backup .env dulu
cp frontend/.env.local /tmp/frontend.env.bak 2>/dev/null
./deploy.sh
```

---

## Service Management

### Manual (nohup) — dipakai deploy.sh saat PM2 tidak ada

```bash
# Cek proses
ps aux | grep -E "uvicorn|next start"

# Kill & restart
kill $(lsof -t -i:8000) 2>/dev/null
kill $(lsof -t -i:3000) 2>/dev/null
./deploy.sh
```

### PM2 (recommended production)

```bash
# Install (sekali)
npm install -g pm2

# Register services
pm2 start "cd ~/ai-forensics-assistant/backend && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000" --name dfa-backend
pm2 start "cd ~/ai-forensics-assistant/frontend && npx next start --port 3000" --name dfa-frontend

# Save & auto-start on boot
pm2 save
pm2 startup

# Daily commands
pm2 status           # cek semua service
pm2 logs dfa-backend # log backend
pm2 logs dfa-frontend# log frontend
pm2 restart all      # restart semua
```

### Cek service hidup

```bash
curl -s http://localhost:8000/health | python3 -m json.tool
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Harus return 200
```

---

## Environment Files

Semua file sensitif **TIDAK di-commit** ke git:

| File | Lokasi di VPS | Dibuat dari |
|------|--------------|-------------|
| `backend/.env` | `~/ai-forensics-assistant/backend/.env` | `backend/.env.example` |
| `frontend/.env.local` | `~/ai-forensics-assistant/frontend/.env.local` | `frontend/.env.example` |
| `backend/venv/` | `~/ai-forensics-assistant/backend/venv/` | `python3 -m venv venv` |
| `frontend/node_modules/` | `~/ai-forensics-assistant/frontend/node_modules/` | `npm install` |

### `backend/.env` minimal

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/forensics_db
OLLAMA_MODEL=llama3:8b
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
CHROMA_PERSIST_DIR=./chroma_data
```

### `frontend/.env.local` minimal

```bash
NEXT_PUBLIC_API_URL=http://<VPS-IP>:8000
```

> ⚠️ Setelah edit `frontend/.env.local`, **harus rebuild**: `./deploy.sh --build`

---

## Services That Must Run on VPS

| Service | Port | Check | Start |
|---------|------|-------|-------|
| PostgreSQL | 5432 | `sudo systemctl status postgresql` | `sudo systemctl start postgresql` |
| Ollama | 11434 | `curl localhost:11434/api/tags` | `ollama serve &` |
| Backend (FastAPI) | 8000 | `curl localhost:8000/health` | `./deploy.sh` |
| Frontend (Next.js) | 3000 | `curl localhost:3000` | `./deploy.sh` |

---

## Troubleshooting

### ❌ `bash: ./deploy.sh: Permission denied`
```bash
chmod +x deploy.sh
```

### ❌ `No such file or directory: /home/dfa-admin/dfa`
Project path mismatch. **Sudah di-fix** — `deploy.sh` sekarang auto-detect directory via `$(cd "$(dirname "$0")" && pwd)`.
```bash
# Pastikan jalankan dari dalam project directory
cd ~/ai-forensics-assistant && ./deploy.sh
```

### ❌ Git: `Need to specify how to reconcile divergent branches`
VPS punya local changes yang bentrok dengan remote.
```bash
git fetch origin main && git reset --hard origin/main
./deploy.sh
```

### ❌ `[WARN] venv not found — skipping backend deps`
Python venv belum dibuat. Backend jalan pakai Python global (berfungsi tapi tidak direkomendasikan).
```bash
cd ~/ai-forensics-assistant/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### ❌ `ModuleNotFoundError: No module named 'uvicorn'`
```bash
cd ~/ai-forensics-assistant/backend
source venv/bin/activate
pip install -r requirements.txt
```

### ❌ `sqlalchemy.exc.OperationalError: could not connect to server`
```bash
sudo systemctl status postgresql
sudo systemctl start postgresql
sudo -u postgres psql -c "CREATE DATABASE forensics_db;"
nano ~/ai-forensics-assistant/backend/.env  # cek DATABASE_URL
```

### ❌ `ConnectionRefusedError` (Ollama)
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3:8b
ollama pull nomic-embed-text
ollama serve &
```

### ❌ CORS / `Failed to fetch` di browser
```bash
# Edit frontend/.env.local — ganti ke IP VPS
nano ~/ai-forensics-assistant/frontend/.env.local
# NEXT_PUBLIC_API_URL=http://<IP-VPS>:8000

# Rebuild
cd ~/ai-forensics-assistant && ./deploy.sh --build
```

### ❌ `NEXT_PUBLIC_API_URL is not defined`
```bash
cp ~/ai-forensics-assistant/frontend/.env.example ~/ai-forensics-assistant/frontend/.env.local
```

### ⚠️ `The "middleware" file convention is deprecated`
Warning dari Next.js 16 — **bukan error**, build tetap berhasil.

### ⚠️ npm: `allow-scripts` warning
```bash
cd ~/ai-forensics-assistant/frontend
npm approve-scripts sharp unrs-resolver
# atau abaikan — tidak mempengaruhi build
```

---

## Ports & Firewall

Pastikan port berikut terbuka di VPS:

```bash
sudo ufw allow 3000/tcp   # Frontend
sudo ufw allow 8000/tcp   # Backend API
sudo ufw allow 22/tcp     # SSH
sudo ufw enable
sudo ufw status
```

---

## File Structure on VPS

```
~/ai-forensics-assistant/
├── backend/
│   ├── .env                    # ← buat dari .env.example + edit
│   ├── venv/                   # ← python3 -m venv venv
│   └── ...
├── frontend/
│   ├── .env.local              # ← buat dari .env.example + edit
│   ├── node_modules/           # ← npm install
│   ├── .next/                  # ← npm run build (auto)
│   └── ...
├── deploy.sh                   # ← chmod +x deploy.sh
├── run.bat                     # (Windows only)
└── docs/
    └── VPS_DEPLOYMENT.md       # ← file ini
```
