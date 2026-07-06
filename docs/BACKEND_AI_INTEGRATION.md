# Backend & AI Integration Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)                      │
│                   http://localhost:3000                       │
│  ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Dashboard │ │ Upload  │ │ Analysis │ │ Acquisition/…   │ │
│  └─────┬─────┘ └────┬────┘ └────┬─────┘ └────────┬─────────┘ │
│        │             │           │                 │           │
│        └─────────────┴─────┬─────┴─────────────────┘           │
│                            │                                   │
│                   src/lib/api.ts                                │
│                  (typed fetch client)                            │
└────────────────────────────┬───────────────────────────────────┘
                             │  HTTP/JSON
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (FastAPI)                            │
│                  http://localhost:8000                        │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────────┐  │
│  │  /upload │  │  /logs   │  │        /analyze           │  │
│  │  POST    │  │  GET     │  │        POST               │  │
│  └────┬─────┘  └────┬─────┘  └───────────┬───────────────┘  │
│       │              │                     │                   │
│       │    ┌─────────┴──────┐    ┌────────┴──────────┐       │
│       │    │   SQLAlchemy   │    │   LangChain Agent │       │
│       │    │     (ORM)      │    │  ┌──────────────┐ │       │
│       │    └───────┬────────┘    │  │ regex_ioc    │ │       │
│       │            │             │  │ timestamp_srt│ │       │
│       │            │             │  └──────┬───────┘ │       │
│       │            │             │         │          │       │
│       │            ▼             │         ▼          │       │
│       │    ┌───────────┐        │  ┌──────────────┐  │       │
│       │    │ PostgreSQL│        │  │   Ollama     │  │       │
│       │    │forensics_db│       │  │  llama3:8b   │  │       │
│       │    └───────────┘        │  └──────┬───────┘  │       │
│       │                          │         │          │       │
│       │                          │  ┌──────┴───────┐  │       │
│       └──────────────────────────┘  │   ChromaDB   │  │       │
│                                     │  (RAG vector) │  │       │
│                                     └──────────────┘  │       │
└───────────────────────────────────────────────────────────────┘
```

## Prerequisites

| Component       | Version / Notes                    |
|-----------------|-------------------------------------|
| Python          | 3.11+                               |
| Node.js         | 20+                                 |
| Ollama          | Latest (local LLM server)          |
| PostgreSQL      | 15+ (or compatible)                |
| npm packages    | See `frontend/package.json`         |
| pip packages    | See `backend/requirements.txt`      |

### 1. Install & Start Ollama

```powershell
# Download from https://ollama.com/download/windows
# After installation, pull required models:
ollama pull llama3:8b
ollama pull nomic-embed-text
```

Verify:
```powershell
ollama list
# Should show: llama3:8b, nomic-embed-text
```

### 2. PostgreSQL Setup

Create the database:
```sql
CREATE DATABASE forensics_db;
```

The backend auto-creates tables on first run via `init_db()` in `schemas.py`.

---

## Environment Variables

### Backend — `backend/.env`

| Variable               | Default                                  | Purpose                          |
|------------------------|------------------------------------------|----------------------------------|
| `DATABASE_URL`         | `postgresql://user:pass@localhost:5432/forensics_db` | PostgreSQL connection            |
| `OLLAMA_MODEL`         | `llama3:8b`                              | LLM for forensic analysis        |
| `OLLAMA_BASE_URL`      | `http://localhost:11434`                  | Ollama API endpoint              |
| `OLLAMA_EMBEDDING_MODEL`| `nomic-embed-text`                      | Embedding model for RAG          |

### Frontend — `frontend/.env.local`

| Variable              | Default                   | Purpose                      |
|-----------------------|---------------------------|------------------------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000`   | Backend API base URL         |

---

## Backend Setup & Run

```powershell
cd backend

# Create virtual environment (first time only)
python -m venv venv

# Activate
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run
uvicorn app.main:app --reload --port 8000
```

Backend will be available at **http://localhost:8000**

API docs: **http://localhost:8000/docs** (Swagger UI)

---

## AI Pipeline Deep Dive

### Step-by-Step Analysis Flow (`/analyze`)

```
1. Client POSTs { "upload_id": 3 } to /analyze
                          │
2. Backend queries PostgreSQL for all ParsedLogEntryDB
   records matching upload_id
                          │
3. Agent Tool: timestamp_sorter
   Sorts entries chronologically
                          │
4. Agent Tool: regex_extract_ioc
   Extracts all unique IP addresses from raw_message fields
   → Returns list of IoC IPs
                          │
5. Severity Classification (rule-based)
   classifies as: CRITICAL / HIGH / MEDIUM / LOW / INFO
   Based on: accepted logins + failed attempt counts
                          │
6. RAG Query (ChromaDB)
   Queries vector store for relevant runbook context:
   "SSH {severity} attack incident response runbook"
   → Returns top-2 matching runbook chunks
                          │
7. LLM Prompt (Ollama — llama3:8b)
   Constructs prompt with:
   - Sorted log entries (chronological)
   - IoC IP list
   - RAG runbook context
   - Structured output format instructions
                          │
8. Parse LLM Output
   Extracts: SEVERITY, ATTACK_TIMELINE, IOC_EXPLANATION, RECOMMENDATION
                          │
9. Return AnalyzeResponse JSON:
   {
     upload_id, total_incidents,
     attack_timeline[], ioc_summary[],
     narrative_report, severity_overall
   }
```

### LangChain Agent Tools

| Tool               | File                   | Purpose                                      |
|--------------------|------------------------|----------------------------------------------|
| `regex_extract_ioc`| `agent_tools.py:12`    | Extract IP addresses from log text via regex |
| `timestamp_sorter` | `agent_tools.py:20`    | Sort log entries by timestamp ascending      |

### RAG (Retrieval-Augmented Generation)

Runbooks are stored in `data/runbooks/` as `.txt` files:
- `brute_force_runbook.txt`
- `ssh_brute_force_runbook.txt`
- `data_exfiltration_runbook.txt`
- `lateral_movement_runbook.txt`
- `privilege_escalation_runbook.txt`
- `incident_response_general.txt`

These must be **pre-loaded into ChromaDB** before analysis. The vector store directory is at `chroma_db/` in the project root. ChromaDB uses `nomic-embed-text` via Ollama to create embeddings, then performs similarity search during analysis to inject relevant runbook context into the LLM prompt.

---

## Frontend ↔ Backend API Mapping

All calls go through `frontend/src/lib/api.ts`:

| Frontend Function        | HTTP    | Backend Route              | Purpose                          |
|--------------------------|---------|----------------------------|----------------------------------|
| `api.getSummary()`       | GET     | `/logs/summary`            | Dashboard stat cards             |
| `api.getUploads()`       | GET     | `/logs/uploads`            | Recent uploads table             |
| `api.getEntries(id)`     | GET     | `/logs/entries?upload_id=` | Log entry list for timeline/analysis |
| `api.getTelemetry(id)`   | GET     | `/logs/telemetry?upload_id=` | Telemetry entries               |
| `api.uploadFile(file)`   | POST    | `/upload/`                 | Upload log file (FormData)      |
| `api.analyze(uploadId)`  | POST    | `/analyze/`                | Run AI forensic analysis        |
| `api.getHealth()`        | GET     | `/health`                  | System status (settings page)   |

### Request/Response Examples

#### Upload File
```http
POST /upload/
Content-Type: multipart/form-data
```
**Response:**
```json
{
  "filename": "sample_auth.log",
  "upload_id": 3,
  "file_type": "auth_log",
  "total_entries_parsed": 42
}
```

#### Get Entries
```http
GET /logs/entries?upload_id=3
```
**Response:**
```json
[
  {
    "id": 101,
    "upload_id": 3,
    "timestamp": "2026-07-04T10:22:13",
    "host": "srv",
    "source": "sshd",
    "event_type": "Failed password",
    "source_ip": "203.0.113.5",
    "user": "admin",
    "port": "51422",
    "auth_method": "password",
    "status": "Failed",
    "raw_message": "Failed password for invalid user admin from 203.0.113.5 port 51422 ssh2"
  }
]
```

#### Analyze
```http
POST /analyze/
Content-Type: application/json

{ "upload_id": 3 }
```
**Response:**
```json
{
  "upload_id": 3,
  "total_incidents": 42,
  "attack_timeline": [ /* sorted log entries */ ],
  "ioc_summary": ["203.0.113.5", "198.51.100.7"],
  "narrative_report": "Multiple failed SSH attempts observed...",
  "severity_overall": "HIGH"
}
```

---

## Database Schema

Three tables (auto-created by SQLAlchemy):

### `log_uploads`
| Column         | Type      | Notes              |
|----------------|-----------|--------------------|
| id             | INT (PK)  | Auto-increment     |
| filename       | VARCHAR   | Original filename  |
| uploaded_at    | DATETIME  | UTC timestamp      |
| total_entries  | INT       | Parsed entry count |

### `parsed_log_entries`
| Column       | Type      | Notes                          |
|--------------|-----------|--------------------------------|
| id           | INT (PK)  | Auto-increment                 |
| upload_id    | INT (FK)  | References `log_uploads.id`    |
| timestamp    | DATETIME  | Parsed from log                |
| host         | VARCHAR   | Server hostname                |
| source       | VARCHAR   | Service (e.g. sshd)            |
| event_type   | VARCHAR   | "Failed password", "Accepted"  |
| source_ip    | VARCHAR   | Attacker IP                    |
| user         | VARCHAR   | Username attempted             |
| port         | VARCHAR   | Source port                    |
| auth_method  | VARCHAR   | "password", "publickey"        |
| status       | VARCHAR   | "Failed", "Accepted"           |
| raw_message  | TEXT      | Original log line              |

### `parsed_telemetry_entries`
| Column       | Type      | Notes                          |
|--------------|-----------|--------------------------------|
| id           | INT (PK)  | Auto-increment                 |
| upload_id    | INT (FK)  | References `log_uploads.id`    |
| timestamp    | VARCHAR   | ISO timestamp                  |
| event_type   | VARCHAR   | Telemetry event type           |
| source       | VARCHAR   | Data source                    |
| details      | TEXT      | Event details JSON             |
| raw_line     | TEXT      | Original JSON line             |

---

## Development Workflow

### Start All Services (3 terminals)

**Terminal 1 — Ollama:**
```powershell
ollama serve
```

**Terminal 2 — Backend:**
```powershell
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 3 — Frontend:**
```powershell
cd frontend
npm run dev
```

### Verify Everything Works

1. Open **http://localhost:3000** → Login page appears
2. Login with any username/password (not "wrong" as username)
3. Go to **Upload** → Upload `backend/tests/sample_auth.log`
4. Note the `upload_id` from the response
5. Go to **Dashboard** → Should show stats
6. Go to **Analysis** → Append `?upload_id=1` to URL → See AI results
7. Check **http://localhost:8000/docs** → All endpoints documented

### Load Runbooks into ChromaDB (RAG)

Runbooks must be embedded into ChromaDB before `/analyze` can use RAG. The backend expects ChromaDB at `chroma_db/`. If not pre-loaded, `get_rag_context()` returns empty string and the LLM works without runbook augmentation (degraded quality).

---

## Troubleshooting

| Symptom                              | Likely Cause                        | Fix                                         |
|--------------------------------------|-------------------------------------|---------------------------------------------|
| "ollama_connected: false" in health  | Ollama not running                  | `ollama serve` in separate terminal         |
| 404 on /analyze                      | No entries for that upload_id       | Upload a file first, verify response `upload_id` |
| LLM returns garbage                  | llama3:8b not pulled                | `ollama pull llama3:8b`                     |
| RAG returns no context               | ChromaDB not seeded with runbooks   | Pre-load runbooks into ChromaDB            |
| CORS errors in browser               | Frontend on wrong port              | Ensure `NEXT_PUBLIC_API_URL=http://localhost:8000` |
| PostgreSQL connection refused        | DB not running or wrong credentials | Check `DATABASE_URL` in `backend/.env`      |
| Upload returns 500                   | File not decodable as UTF-8         | Ensure file is valid text/JSON              |
| `useSearchParams()` build error      | Missing Suspense boundary           | Wrap page content in `<Suspense>`           |
