# Software Engineering Report

## Agentic AI Digital Forensics Assistant (DFA)

---

![LOGO PLACEHOLDER]

**Team:** Team Eight

**Course:** Software Engineering

**Institution:** [Institution Name]

**Date:** July 2026

---

## Table of Contents

1. [Cover Page](#cover-page)
2. [Table of Contents](#table-of-contents)
3. [Product Requirements Document (PRD)](#3-product-requirements-document-prd)
   - 3.1 Sprint 1 — Foundation & Infrastructure
   - 3.2 Sprint 2 — Data Ingestion Pipeline
   - 3.3 Sprint 3 — AI Analysis Engine
   - 3.4 Sprint 4 — Frontend, Auth & Deployment
4. [Business Process Document (BPD)](#4-business-process-document-bpd)
   - 4.1 Business Process Overview
   - 4.2 Use Case Diagram
   - 4.3 Activity Diagrams
   - 4.4 Sequence Diagrams
5. [Database & Data Flow Design](#5-database--data-flow-design)
   - 5.1 Entity Relationship Diagram (ERD)
   - 5.2 Data Flow Diagram Level 0 — Context Diagram
   - 5.3 Data Flow Diagram Level 1
   - 5.4 Data Flow Diagram Level 2
6. [UI/UX Design](#6-uiux-design)
   - 6.1 Login Page
   - 6.2 Login OTP Page
   - 6.3 Forgot Password Page
   - 6.4 Dashboard Page
   - 6.5 Upload Log Page
   - 6.6 Artifact Acquisition Page
   - 6.7 AI Analysis Page
   - 6.8 Attack Timeline Page
   - 6.9 Upload History Page
   - 6.10 Report Generator Page
   - 6.11 Settings Page
   - 6.12 Profile Page
   - 6.13 Shared Components
   - 6.14 Navigation Map
   - 6.15 API Endpoint Map

---

## 3. Product Requirements Document (PRD)

### Project Overview

| Item | Description |
|------|-------------|
| **Project Name** | Agentic AI Digital Forensics Assistant (DFA) |
| **Objective** | Build a local, secure, LLM-powered framework for rapid forensic triage during security incidents |
| **Target Users** | Forensic analysts, infrastructure engineers, SOC teams |
| **Tech Stack** | Next.js 16, FastAPI, PostgreSQL, Ollama, LangChain, ChromaDB |
| **Methodology** | Scrum (4 Sprints) |

### Team Roles

| Role | Name |
|------|------|
| **Project Manager** | [Name] |
| **Scrum Master** | [Name] |
| **Backend Developer** | [Name] |
| **Frontend Developer** | [Name] |
| **AI/ML Engineer** | [Name] |
| **UI/UX Designer** | [Name] |
| **DevOps Engineer** | [Name] |

### 3.1 Sprint 1 — Foundation & Infrastructure

**Duration:** [Date] — [Date]

**Goal:** Set up development environment, VPS infrastructure, LLM integration, and vector database.

#### User Stories

| ID | Story | Estimate | Priority |
|----|-------|----------|----------|
| US-001 | As a developer, I want to set up a VPS so the application can be deployed and accessed remotely. | 3 | High |
| US-002 | As a developer, I want to install and configure Ollama so the system can run LLMs locally. | 2 | High |
| US-003 | As a developer, I want to integrate LangChain with Ollama so the system can orchestrate AI agents. | 5 | High |
| US-004 | As a developer, I want to set up ChromaDB so forensic runbooks can be stored and queried via RAG. | 3 | Medium |
| US-005 | As a developer, I want to create the project structure with backend/frontend separation. | 2 | High |
| US-006 | As a developer, I want to create LangChain agent tools (IoC extraction, timestamp sorting) so the analysis pipeline can use them. | 3 | High |

#### Deliverables

- VPS with Ubuntu server configured
- Ollama running with llama3:8b and nomic-embed-text models
- LangChain framework integrated with Ollama
- ChromaDB persistent client with forensic runbooks seeded
- Agent tools: `regex_extract_ioc`, `timestamp_sorter`
- Project structure: `/backend` (FastAPI), `/frontend` (Next.js), `/agent` (LangChain)

---

### 3.2 Sprint 2 — Data Ingestion Pipeline

**Duration:** [Date] — [Date]

**Goal:** Build the log file upload and parsing pipeline with PostgreSQL storage.

#### User Stories

| ID | Story | Estimate | Priority |
|----|-------|----------|----------|
| US-007 | As a forensic analyst, I want to upload auth.log files so the system can parse them. | 5 | High |
| US-008 | As a forensic analyst, I want to upload JSON telemetry files so the system can parse them. | 3 | High |
| US-009 | As a system, I want to auto-detect file types (auth.log vs JSON telemetry) during upload. | 2 | Medium |
| US-010 | As a system, I want to store parsed log entries in PostgreSQL for persistence and querying. | 3 | High |
| US-011 | As a developer, I want to create the PostgreSQL schema for all entities. | 5 | High |
| US-012 | As a forensic analyst, I want to view a list of my uploaded files with metadata. | 2 | Medium |

#### Deliverables

- `POST /upload/` endpoint with auto-detection of auth.log vs JSON telemetry
- Auth log parser supporting SSH auth events (successful_login, failed_login, invalid_user_attempt, privilege_escalation, session_opened)
- JSON telemetry parser
- PostgreSQL schema with 11 tables
- `GET /logs/uploads` endpoint
- Sample log files for testing

---

### 3.3 Sprint 3 — AI Analysis Engine

**Duration:** [Date] — [Date]

**Goal:** Build the core AI analysis pipeline with LangChain agent, RAG, and LLM inference.

#### User Stories

| ID | Story | Estimate | Priority |
|----|-------|----------|----------|
| US-013 | As a forensic analyst, I want to trigger AI analysis on an uploaded log file so I can get incident insights. | 8 | High |
| US-014 | As a system, I want to extract Indicators of Compromise (IPs) from log data using regex. | 2 | Medium |
| US-015 | As a system, I want to query forensic runbooks via RAG to provide context for the analysis. | 5 | High |
| US-016 | As a forensic analyst, I want to see a narrative report generated by the LLM explaining the attack timeline. | 5 | High |
| US-017 | As a forensic analyst, I want to see the severity level of the detected incidents. | 2 | Medium |
| US-018 | As a forensic analyst, I want to view log entries chronologically sorted by timestamp. | 2 | Low |
| US-019 | As a system, I want to persist analysis results to PostgreSQL for future retrieval. | 3 | Medium |
| US-020 | As a forensic analyst, I want to view my analysis history. | 2 | Low |

#### Deliverables

- `POST /analyze/` endpoint with LLM-powered analysis
- `GET /analyze/result/{upload_id}` endpoint
- `GET /analyze/history` endpoint
- IoC extraction and severity classification
- RAG context injection from ChromaDB runbooks
- Auto-save analysis results to PostgreSQL
- `GET /logs/entries` and `GET /logs/telemetry` endpoints
- `GET /logs/summary` dashboard endpoint

---

### 3.4 Sprint 4 — Frontend, Auth & Deployment

**Duration:** [Date] — [Date]

**Goal:** Build the complete frontend application, implement authentication, and prepare for production deployment.

#### User Stories

| ID | Story | Estimate | Priority |
|----|-------|----------|----------|
| US-021 | As a user, I want to log in securely so I can access the system. | 5 | High |
| US-022 | As a user, I want to reset my password via email OTP so I can recover my account. | 5 | Medium |
| US-023 | As a user, I want to see a dashboard with system overview statistics. | 3 | High |
| US-024 | As a forensic analyst, I want to upload log files through a user-friendly interface. | 3 | High |
| US-025 | As a forensic analyst, I want to acquire artifacts from remote servers via SSH. | 5 | Medium |
| US-026 | As a forensic analyst, I want to see AI analysis results with timeline and IoCs. | 5 | High |
| US-027 | As a forensic analyst, I want to view the attack timeline with color-coded events. | 3 | Medium |
| US-028 | As a forensic analyst, I want to generate a PDF report of the analysis. | 5 | Medium |
| US-029 | As a user, I want to manage my profile and change my password. | 3 | Low |
| US-030 | As a user, I want to configure system settings (theme, language). | 2 | Low |
| US-031 | As a developer, I want to deploy the application with PM2 for process management. | 3 | High |
| US-032 | As a developer, I want to set up Nginx/CORS for secure production deployment. | 3 | High |

#### Deliverables

- Full Next.js 16 frontend with 12 pages
- Authentication system (login, OTP, forgot password, profile)
- Login page with language toggle (EN/ID) and theme toggle (Light/Dark)
- Dashboard overhaul with 6 real-time stat cards (Uploads, Analyses, Incidents, Critical Alerts, Artifacts, Log Entries), severity breakdown bar chart, acquisition summary, interactive hover-to-copy and scrollable IoC popover, timeline 7-day activity bar chart, recent analysis results table, cross-navigation analysis job tracking, and Live Latest Incident Triage card dynamically renders the most recent analyzed log incident (parsing event type, source IP, authenticated user, chronological raw log message, and direct analysis linking via `latest_triage` API field).
- Upload page with drag-and-drop file upload
- Acquisition page with SSH form and Chain of Custody
- Analysis page with AI progress bar, severity card, narrative, IoC, timeline
- Timeline page with color-coded event cards
- History page with searchable upload table
- Report page with split-panel preview and PDF generation
- Settings page with health status indicators
- Profile page with edit profile, change password, activity log
- PM2 ecosystem.config.js for deployment
- CORS middleware configuration
- Cross-navigation analysis job tracking
- Real-time `logs/summary` API update returning granular details for the latest triaged security record

---

## 4. Business Process Document (BPD)

### 4.1 Business Process Overview

The Digital Forensics Assistant (DFA) system automates the forensic triage process for security incident response. The core business flow is:

```
Upload Log → Parse Entries → AI Analysis → Generate Report
```

**Business Flow Steps:**

1. **Log Ingestion** — Forensic analyst uploads server log files (auth.log, syslog, JSON telemetry) or acquires them remotely via SSH.
2. **Parsing** — The system automatically detects the file type and parses log entries into structured data, extracting fields like timestamp, source IP, event type, user, and status.
3. **AI Analysis** — The LangChain agent orchestrates:
   - IoC extraction (IP addresses via regex)
   - Runbook context retrieval (RAG query from ChromaDB)
   - LLM inference (Ollama with llama3:8b) to generate narrative report, severity assessment, and recommendations
4. **Report Generation** — Results are saved to PostgreSQL and can be exported as a professional PDF report with executive summary, attack timeline, and IoC summary.
5. **Chain of Custody** — For remotely acquired artifacts, SHA-256 hashes and custody records are maintained for evidentiary integrity.

### 4.2 Use Case Diagram

> **IMAGE:** [Place Use Case Diagram here]

**Actors:**
- **Forensic Analyst** — Primary user who uploads logs, triggers analysis, views results, generates reports
- **System** — The backend services (Ollama LLM, ChromaDB, PostgreSQL)
- **Remote Server** — Target server for SSH artifact acquisition

**Use Cases:**
- UC-01: Login to System
- UC-02: Upload Log File
- UC-03: Acquire Remote Artifact
- UC-04: View Upload History
- UC-05: Trigger AI Analysis
- UC-06: View Analysis Results
- UC-07: View Attack Timeline
- UC-08: Generate PDF Report
- UC-09: Manage Profile
- UC-10: Change Password
- UC-11: View System Status
- UC-12: Reset Forgotten Password

### 4.3 Activity Diagrams

> **IMAGE:** [Place Activity Diagrams here — one for each major use case]

**Activity: Upload & Analyze Log File**

```
[Forensic Analyst]                 [System]
      │                               │
      ├── Login ─────────────────────>│
      │                               ├── Validate credentials
      │<────────────────── Redirect ──┤
      │                               │
      ├── Upload log file ───────────>│
      │                               ├── Detect file type
      │                               ├── Parse entries
      │                               ├── Store in PostgreSQL
      │<────────── Upload success ────┤
      │                               │
      ├── Trigger analysis ──────────>│
      │                               ├── Extract IoCs
      │                               ├── Query RAG runbooks
      │                               ├── Invoke LLM
      │                               ├── Save result
      │<──── Analysis complete ───────┤
      │                               │
      ├── View results ──────────────>│
      │<── Display timeline + IoC ────┤
      │                               │
      ├── Generate report ───────────>│
      │<────── Download PDF ──────────┤
```

### 4.4 Sequence Diagrams

> **IMAGE:** [Place Sequence Diagram for Login flow here]

**Sequence: Login**

```
User          Browser            API Server        PostgreSQL
  │              │                   │                 │
  │── Enter ────>│                   │                 │
  │  credentials │── POST /auth/ ───>│                 │
  │              │   login           │── Query user ──>│
  │              │                   │<── User data ───│
  │              │                   │── Verify hash ──│
  │              │                   │── Create session│
  │              │<── {token, ───────┤                 │
  │              │     user}         │                 │
  │<── Redirect ─┤                   │                 │
  │  to dashboard│                   │                 │
```

> **IMAGE:** [Place Sequence Diagram for AI Analysis flow here]

**Sequence: AI Analysis**

```
User          Frontend           API Server        Ollama LLM      ChromaDB
  │              │                   │                 │              │
  │── Click ────>│                   │                 │              │
  │  Analyze     │── POST /analyze/─>│                 │              │
  │              │                   │── Fetch log ───>│              │
  │              │                   │   entries from  │              │
  │              │                   │   PostgreSQL    │              │
  │              │                   │                 │              │
  │              │                   │── Extract IoCs ─│              │
  │              │                   │   (regex tool)  │              │
  │              │                   │                 │              │
  │              │                   │── Query RAG ────│────────────>│
  │              │                   │   context       │<── Runbooks ─│
  │              │                   │                 │              │
  │              │                   │── Invoke LLM ──>│              │
  │              │                   │   (llama3:8b)   │              │
  │              │                   │<── Narrative ───│              │
  │              │                   │                 │              │
  │              │                   │── Save result ─>│              │
  │              │                   │   to PostgreSQL │              │
  │              │<── Analysis ──────┤                 │              │
  │<── Display ──┤  result           │                 │              │
  │  results     │                   │                 │              │
```

> **IMAGE:** [Place Sequence Diagram for SSH Artifact Acquisition here]

**Sequence: Artifact Acquisition**

```
User          Frontend           API Server         Target Server (SSH)
  │              │                   │                      │
  │── Enter ────>│                   │                      │
  │  SSH details │── POST /acquire/─>│                      │
  │              │                   │── SSH Connect ──────>│
  │              │                   │<── Auth success ─────│
  │              │                   │── SFTP Get File ────>│
  │              │                   │<── File bytes ───────│
  │              │                   │                      │
  │              │                   │── Compute SHA-256 ───│
  │              │                   │── Save local copy ───│
  │              │                   │── Parse & store ─────│
  │              │                   │   in PostgreSQL      │
  │              │<── Acquisition ───┤                      │
  │<── Display ──┤  result + CoC    │                      │
  │  result      │                   │                      │
```

---

## 5. Database & Data Flow Design

### 5.1 Entity Relationship Diagram (ERD)

> **IMAGE:** [Place ERD diagram here]

**Tables:**

| Table | Description |
|-------|-------------|
| `users` | Analyst accounts with bcrypt password hashes |
| `otp_tokens` | OTP codes for login & password reset (6-digit, time-limited) |
| `password_policy` | Global password rules (min length, uppercase, number, symbol) |
| `user_sessions` | Active login sessions with bearer tokens |
| `activity_log` | Audit trail of user actions |
| `log_uploads` | Uploaded log file metadata |
| `parsed_log_entries` | Parsed auth.log entries (timestamp, IP, event type, status) |
| `parsed_telemetry_entries` | Parsed JSON telemetry entries |
| `analysis_results` | AI analysis results per upload (1:1 with log_uploads) |
| `artifact_acquisitions` | (placeholder) SSH acquisition sessions |
| `reports` | (placeholder) Generated PDF reports |

**Entity Relationships:**

```
users (1) ──< (N) otp_tokens
users (1) ──< (N) user_sessions
users (1) ──< (N) activity_log

log_uploads (1) ──< (N) parsed_log_entries
log_uploads (1) ──< (N) parsed_telemetry_entries
log_uploads (1) ──── (1) analysis_results
```

**Key Design Decisions:**

- **Bcrypt password hashing** — Industry standard for password storage
- **6-digit OTP** — Time-limited (300s default) with `is_used` flag to prevent replay
- **JSON columns** — `ioc_summary` and `attack_timeline` stored as JSON strings for flexibility
- **Foreign keys** — Referential integrity between uploads, entries, and analysis results
- **UUID tokens** — Bearer tokens use `secrets.token_urlsafe(48)` for session management

**Full Table Schemas:** See `docs/DATABASE_ERD.md`

---

### 5.2 Data Flow Diagram Level 0 — Context Diagram

> **IMAGE:** [Place DFD Level 0 (Context Diagram) here]

**Description:** The context diagram shows the entire DFA system as a single process with external entities.

**External Entities:**
- **Forensic Analyst** — Primary user interacting with the system via the web interface
- **Ollama LLM** — External AI service for natural language analysis
- **ChromaDB** — Vector database for RAG runbook retrieval
- **Target Server** — Remote server for SSH artifact acquisition
- **SMTP Server** — Email service for OTP delivery

**Main Process:**
- **DFA System** — The complete Digital Forensics Assistant application

**Data Flows:**
- Forensic Analyst → DFA: Login credentials, log files, SSH config, analysis requests
- DFA → Forensic Analyst: Dashboard data, analysis results, PDF reports, system status
- DFA → Ollama LLM: Prompt with log entries and runbook context
- Ollama LLM → DFA: Narrative analysis, severity assessment
- DFA → ChromaDB: RAG similarity queries
- ChromaDB → DFA: Relevant runbook chunks
- DFA → Target Server: SSH connection, file read requests
- Target Server → DFA: Remote log file contents
- DFA → SMTP Server: OTP email requests

---

### 5.3 Data Flow Diagram Level 1

> **IMAGE:** [Place DFD Level 1 diagram here]

**Description:** Level 1 decomposes the DFA system into four major processes.

**Processes:**

1. **1.0 Authentication**
   - Handles login, OTP verification, password reset, session management
   - Data stores: `users`, `otp_tokens`, `user_sessions`, `password_policy`
   - Interacts with SMTP Server for OTP emails

2. **2.0 Log Ingestion**
   - Handles file upload, file type detection, log parsing
   - Data stores: `log_uploads`, `parsed_log_entries`, `parsed_telemetry_entries`
   - Produces structured log entries from raw text

3. **3.0 AI Analysis**
   - Orchestrates IoC extraction, RAG context retrieval, LLM inference
   - Data stores: `analysis_results`
   - Interacts with Ollama LLM and ChromaDB

4. **4.0 Reporting & Presentation**
   - Serves frontend UI data, generates PDF reports
   - Data stores: `analysis_results`, `log_uploads`
   - Interacts with Forensic Analyst via web interface

5. **5.0 SSH Acquisition**
   - Connects to remote servers, pulls log files, computes SHA-256
   - Data stores: `log_uploads`, `parsed_log_entries`
   - Interacts with Target Server

---

### 5.4 Data Flow Diagram Level 2

> **IMAGE:** [Place DFD Level 2 diagram here]

**Description:** Level 2 provides detailed decomposition of the AI Analysis process (3.0).

**Process 3.1 — IoC Extraction**
- Input: Parsed log entries from `parsed_log_entries`
- Process: Run regex pattern matching for IP addresses
- Output: List of unique IP addresses (IoC list)
- Tool: `regex_extract_ioc` LangChain agent tool

**Process 3.2 — RAG Context Retrieval**
- Input: Log entries summary, severity level
- Process: Generate RAG query, perform similarity search in ChromaDB
- Output: Relevant runbook context chunks
- Tool: ChromaDB similarity search with nomic-embed-text embeddings

**Process 3.3 — LLM Analysis**
- Input: Log entries (chronological), IoC list, RAG context
- Process: Construct prompt → invoke Ollama LLM (llama3:8b) → parse output
- Output: Severity, attack timeline narrative, IoC explanation, recommendation
- Tool: LangChain OllamaLLM integration

**Process 3.4 — Result Persistence**
- Input: Analysis output from LLM, upload metadata
- Process: Save/update analysis result in PostgreSQL
- Output: Stored `analysis_results` record
- Data store: `analysis_results`

**Data Flows (Level 2):**

```
parsed_log_entries ──> 3.1 IoC Extraction ──> IoC list
parsed_log_entries ──> 3.3 LLM Analysis <── IoC list
ChromaDB ────────────> 3.2 RAG Retrieval ───> RAG context ──> 3.3 LLM Analysis
3.3 LLM Analysis ────> Severity + Narrative + Recommendation
3.3 LLM Analysis ────> 3.4 Result Persistence ──> analysis_results
```

---

## 6. UI/UX Design

### 6.1 Login Page (`/login`)

**Summary:** Main authentication page. User enters username and password to access the system. Supports language toggle (EN/ID) and theme toggle (Light/Dark).

> **IMAGE:** [Place Login Page Screenshot here]

**UI Components:**

| Component | Description |
|-----------|-------------|
| Login Card | Centered card with shadow, contains login form |
| Logo | Shield icon at the top of the card |
| Username Input | Text input with placeholder "analyst01" |
| Password Input | Password input with show/hide toggle (Eye/EyeOff icons) |
| Submit Button | "Sign In" button with loading state |
| Error Message | Red error text above submit button |
| Forgot Password Link | Link to `/forgot-password` page |
| Language Toggle | EN/ID button at bottom left |
| Theme Toggle | Sun/Moon button at bottom right |

**User Flow:**
```
[User] → Open app → Redirect to /login
  → Enter username & password
  → Click "Sign In"
  → [Client-side validation]
    ├── Empty field → Show per-field error
    └── OK → Call API POST /auth/login
      ├── Failed (401) → Show "Invalid credentials"
      └── Success → Set cookie dfa-token + dfa-authed → Redirect to /dashboard
```

---

### 6.2 Login OTP Page (`/login/otp`)

**Summary:** Two-step authentication with OTP. Step 1: username & password. Step 2: 6-digit code verification.

> **IMAGE:** [Place Login OTP Page Screenshot here]

**UI Components:**

| Component | Description |
|-----------|-------------|
| OTP Card | Centered card with OTP form |
| Step Indicator | 2 indicator dots at top (step 1 and 2) |
| Credential Form | Username & password inputs (step 1) |
| OTP Input Grid | 6 OTP digit input boxes with auto-focus |
| Countdown Timer | 5-minute countdown |
| Resend Button | Resend OTP button (enabled after timer expires) |
| Info Box | Blue info box for instructions |

**User Flow:**
```
[User] → /login/otp
  → Step 1: Enter username & password
  → Step 2: Enter 6-digit OTP
  → [5-minute timer running]
    ├── Correct OTP → Set cookie → Redirect to /dashboard
    ├── Wrong OTP → Show error
    └── Timer expired → Enable "Resend Code" button
```

---

### 6.3 Forgot Password Page (`/forgot-password`)

**Summary:** Three-step password reset. Step 1: email for OTP. Step 2: verify OTP. Step 3: set new password with strength meter.

> **IMAGE:** [Place Forgot Password Page Screenshot here]

**UI Components:**

| Component | Description |
|-----------|-------------|
| Reset Card | Centered card, 3 steps |
| Step Indicator | 3 progress indicator dots |
| Email Input | Email input with Mail icon |
| OTP Input Grid | 6 digit input boxes |
| Password Strength Meter | 4-level bar (Weak/Fair/Strong/Very Strong) |
| Policy Checklist | min 8 chars, uppercase, number, symbol |
| Confirm Password | Input with match indicator |
| Submit Button | Text changes per step |

**User Flow:**
```
[User] → /forgot-password
  → Step 1: Enter email → POST /auth/forgot-password
  → Step 2: Enter OTP → POST /auth/verify-otp
  → Step 3: New password → POST /auth/reset-password → Redirect to /login
```

---

### 6.4 Dashboard Page (`/dashboard`)

**Summary:** Main page after login. System overview with statistics, recent uploads, quick actions, and system status.

> **IMAGE:** [Place Dashboard Page Screenshot here]

**UI Components:**

| Component | Description |
|-----------|-------------|
| AppShell | Main layout: TopBar + Sidebar + content |
| PageHeader | "Dashboard" title with refresh button |
| StatCard (x6) | Total Uploads, Total Analyses, Total Incidents, Critical Alerts, Artifacts Acquired, Total Log Entries |
| Severity Breakdown | 5-color horizontal bar chart (CRITICAL/HIGH/MEDIUM/LOW/INFO) with proportional widths |
| Recent Analysis Results | Table of 5 most recent analyses with severity badge, filename, incident count, date, and "View" button |
| Acquisition Summary | Summary card showing total artifacts count, total data size, recent artifacts list, and "View All Artifacts" link |
| IoC Overview | Top 10 unique IPs as chip tags, with interactive "+N more" popover featuring scrollable full list, hover-timeout protection (250ms), and click-to-copy |
| Activity Timeline | 7-day bar chart showing daily log entry counts |
| Latest Incident Triage Card | Dynamically renders the most recent analyzed log incident: event type, severity badge, source IP, user, total incidents, raw log message, and direct link to that analysis |
| Recent Uploads Table | File, Type, Date, Actions (Analyze/Export PDF) |
| Quick Actions | Upload Log File, Analyze Latest |
| System Status | Ollama, ChromaDB, PostgreSQL, API Backend indicators |

**User Flow:**
```
[After login] → /dashboard → GET /logs/summary (rich payload with 6 stat cards, severity distribution, latest triage record, recent IoCs, timeline counts, acquisition stats)
  → Quick actions or table row actions navigate to respective pages
  → Hovering over Recent IoCs "+more" triggers scrollable click-to-copy popover with 250ms hover-timeout
  → Clicking "View Analysis" on Latest Triage redirects directly to that specific analysis view
  → Severity bars animate proportionally, timeline bars show daily activity
```

---

### 6.5 Upload Log Page (`/upload`)

**Summary:** Upload forensic log files or paste raw log text. Supports System Log and Disk/Memory Artifact types.

> **IMAGE:** [Place Upload Page Screenshot here]

**UI Components:**

| Component | Description |
|-----------|-------------|
| AppShell | Main layout |
| PageHeader | "Upload Log" title |
| Upload Type Selector | System Log / Disk Memory Artifact |
| File Dropzone | Drag-and-drop or click to select |
| Textarea | Paste raw log text |
| Upload Button | Submit with loading state |
| Success/Error Toast | Upload notification |
| Recent Uploads Table | Upload history |

**User Flow:**
```
[User] → /upload → Select type → Pick file → Click "Upload" → POST /upload/
  → View/Analyze/Export from recent uploads table
```

---

### 6.6 Artifact Acquisition Page (`/acquisition`)

**Summary:** SSH into remote server, acquire forensic artifacts, with Chain of Custody tracking.

> **IMAGE:** [Place Acquisition Page Screenshot here]

**UI Components:**

| Component | Description |
|-----------|-------------|
| AppShell | Main layout |
| PageHeader | "Acquisition" title |
| SSH Form | Host, Port, Username, Auth Method, Remote Path |
| Acquire Button | "Acquire Artifact" with loading |
| Result Panel | Terminal-like output |
| Chain of Custody Sidebar | Artifact list with SHA-256 hashes |

**User Flow:**
```
[User] → /acquisition → Fill SSH form → Click "Acquire Artifact"
  → POST /acquire/ → Display result + Chain of Custody
```

---

### 6.7 AI Analysis Page (`/analysis`)

**Summary:** Core AI analysis page. Shows results with severity, narrative, IoCs, and timeline.

> **IMAGE:** [Place Analysis Page Screenshot here]

**UI Components:**

| Component | Description |
|-----------|-------------|
| AppShell | Main layout |
| PageHeader | Title with Re-analyze and Export buttons |
| Severity Card | Large severity label |
| Narrative Report | AI-generated text analysis |
| IoC Summary | IP address chips with copy |
| Attack Timeline | Event table with expandable rows |
| Progress Bar | 4-step animation: Parse → IOC → RAG → Generate |

**User Flow:**
```
[User] → /analysis?upload_id=X&run=true → POST /analyze/
  → 4-step progress → Display severity + narrative + IoC + timeline
```

---

### 6.8 Attack Timeline Page (`/timeline`)

**Summary:** Chronological view of forensic events with color-coded cards and filters.

> **IMAGE:** [Place Timeline Page Screenshot here]

**UI Components:**

| Component | Description |
|-----------|-------------|
| AppShell | Main layout |
| PageHeader | "Timeline" title |
| Upload Selector | Upload selection table |
| Filter Dropdowns | Severity, event type, IP filters |
| Incident Cards | Color-coded by event type |
| Raw Log Expander | Expandable raw message |

**Event Colors:** successful_login → Green, failed_login → Orange, privilege_escalation → Red, session_opened → Teal

**User Flow:**
```
[User] → /timeline → Select upload → View color-coded events → Filter → Expand details
```

---

### 6.9 Upload History Page (`/history`)

**Summary:** Searchable table of all uploaded files with action buttons.

> **IMAGE:** [Place History Page Screenshot here]

**UI Components:**

| Component | Description |
|-----------|-------------|
| AppShell | Main layout |
| PageHeader | "History" title |
| Search Input | Client-side filename search |
| Upload History Table | ID, Filename, Type, Entries, Date, Actions |
| Action Buttons | View, Analyze |

**User Flow:**
```
[User] → /history → Browse/search uploads → Click View or Analyze
```

---

### 6.10 Report Generator Page (`/report`)

**Summary:** Split-panel PDF report generator. Preview + metadata form.

> **IMAGE:** [Place Report Page Screenshot here]

**UI Components:**

| Component | Description |
|-----------|-------------|
| AppShell | Main layout |
| PageHeader | "Report" title |
| Upload Selector (Left) | Analyzed upload list |
| Analysis Status | Availability indicator |
| Metadata Form | Analyst Name, Organization, Classification |
| Generate Button | "Generate & Download PDF" |
| ReportPreview (Right) | Live HTML report preview |

**User Flow:**
```
[User] → /report → Select upload → Fill metadata → Preview → Generate PDF
```

---

### 6.11 Settings Page (`/settings`)

**Summary:** Application settings — appearance, system status, model config, version info.

> **IMAGE:** [Place Settings Page Screenshot here]

**UI Components:**

| Component | Description |
|-----------|-------------|
| AppShell | Main layout |
| PageHeader | "Settings" title |
| Section Cards | Settings grouped by category |
| Theme Toggle | Light/Dark mode |
| Language Toggle | EN/ID |
| StatusDot (x4) | Green/red health indicators |
| Model Info | LLM model details |

**User Flow:**
```
[User] → /settings → Toggle theme/language → View system health → View model info
```

---

### 6.12 Profile Page (`/profile`)

**Summary:** User account management — profile, stats, edit info, change password, activity log.

> **IMAGE:** [Place Profile Page Screenshot here]

**UI Components:**

| Component | Description |
|-----------|-------------|
| AppShell | Main layout |
| Profile Hero | Avatar "A1", username, email, role, last login |
| Stat Cards (x3) | Sessions, Uploads, Reports |
| Account Info Form | Full Name, Email, Username (read-only), Role, Organization |
| Change Password Form | Current, New (with strength meter), Confirm |
| Activity Log List | Timestamped action history |
| Security Settings | Password policy display |

**User Flow:**
```
[User] → /profile → View stats → Edit profile → Change password → Browse activity log
```

---

### 6.13 Shared Components

**Layout Components:**

| Component | File | Description |
|-----------|------|-------------|
| AppShell | `components/layout/AppShell.tsx` | TopBar + Sidebar + content + AnalysisProgressToast |
| TopBar | `components/layout/TopBar.tsx` | Brand, breadcrumb, lang toggle, theme toggle, logout |
| Sidebar | `components/layout/Sidebar.tsx` | Collapsible nav, 240px/64px |
| PageHeader | `components/layout/PageHeader.tsx` | Sticky header with title, subtitle, actions |

**UI Components:**

| Component | File | Description |
|-----------|------|-------------|
| StatCard | `components/ui/StatCard.tsx` | Metric card with icon and trend |
| StatusDot | `components/ui/StatusDot.tsx` | Green/red status indicator |
| SeverityBadge | `components/ui/SeverityBadge.tsx` | Colored severity label |
| AnalysisLoader | `components/ui/AnalysisLoader.tsx` | 4-step loading animation |
| AnalysisProgressToast | `components/ui/AnalysisProgressToast.tsx` | Floating progress toast |

---

### 6.14 Navigation Map

```
/login ─────────────────────────────────────────────┐
  ├── /login/otp                                     │
  └── /forgot-password ──> /login                    │
                                                     │
/dashboard (home page, after login) <────────────────┘
  ├── /upload
  ├── /acquisition
  ├── /analysis?upload_id=X&run=true
  ├── /timeline?upload_id=X
  ├── /history
  ├── /report
  ├── /settings
  └── /profile
```

### 6.15 API Endpoint Map

| Endpoint | Method | Pages |
|----------|--------|-------|
| `/auth/login` | POST | Login |
| `/auth/forgot-password` | POST | Forgot Password |
| `/auth/verify-otp` | POST | Forgot Password |
| `/auth/reset-password` | POST | Forgot Password |
| `/auth/profile` | GET, PUT | Profile |
| `/auth/change-password` | PUT | Profile |
| `/auth/activity-log` | GET | Profile |
| `/logs/summary` | GET | Dashboard |
| `/logs/uploads` | GET | Dashboard, Upload, History, Analysis, Timeline, Report |
| `/logs/entries` | GET | Timeline |
| `/upload/` | POST | Upload |
| `/analyze/` | POST | Analysis, Dashboard, Upload, Report |
| `/analyze/result/{id}` | GET, DELETE | Analysis, Report, Dashboard, Upload |
| `/analyze/history` | GET | Analysis |
| `/acquire/` | POST | Acquisition |
| `/acquire/artifacts` | GET | Acquisition |
| `/report/` | POST | Report, Dashboard, Upload |
| `/health` | GET | Settings |

---

## Development Methodology

### Scrum Framework

This project was developed using **Scrum**, an agile software development methodology. Scrum was chosen because:

1. **Iterative Development** — The project was divided into 4 sprints, each delivering a working increment of the product.
2. **Adaptability** — Requirements could be adjusted between sprints based on progress and feedback.
3. **Continuous Delivery** — Each sprint ended with a potentially shippable product increment.
4. **Clear Roles** — Defined responsibilities (Product Owner, Scrum Master, Development Team) ensured accountability.
5. **Regular Ceremonies** — Sprint planning, daily stand-ups, sprint reviews, and retrospectives kept the team aligned.

### Sprint Cadence

| Sprint | Duration | Focus |
|--------|----------|-------|
| Sprint 1 | [Weeks] | Foundation & Infrastructure |
| Sprint 2 | [Weeks] | Data Ingestion Pipeline |
| Sprint 3 | [Weeks] | AI Analysis Engine |
| Sprint 4 | [Weeks] | Frontend, Auth & Deployment |

### Tools Used

| Tool | Purpose |
|------|---------|
| **GitHub** | Version control and collaboration |
| **PM2** | Process management on VPS |
| **Figma** | UI/UX prototyping (if used) |
| **Postman** | API testing |
| **Discord/WhatsApp** | Team communication |

---

> **Note:** This document serves as the comprehensive Software Engineering Report for the Agentic AI Digital Forensics Assistant project. Placeholders marked with `> **IMAGE:**` and `[Name]` should be filled with actual screenshots, diagrams, and team member names before final submission.
