# Database ERD — AI Forensics Assistant

There are **11 tables** in the PostgreSQL database (`forensics_db`):

---

## Tables & Functions

| Table | Function |
|---|---|
| `users` | Analyst accounts |
| `otp_tokens` | OTP tokens for login & password reset |
| `password_policy` | Password policy configuration (min length, uppercase, number, symbol, OTP TTL) |
| `user_sessions` | Login session history |
| `activity_log` | Audit trail of all user actions (for Profile → Recent Activity) |
| `log_uploads` | Uploaded log files |
| `parsed_log_entries` | Parsed auth log lines |
| `parsed_telemetry_entries` | Parsed telemetry/IDS entries |
| `analysis_results` | AI analysis results per upload |
| `artifact_acquisitions` | (placeholder) SSH artifact acquisition sessions |
| `reports` | (placeholder) Generated reports |

---

## 1. `users` — Analyst accounts

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Auto-increment |
| `username` | String (UNIQUE) | Username for login |
| `email` | String (UNIQUE) | Email for OTP & notifications |
| `password_hash` | String | bcrypt hash of password |
| `full_name` | String | Full name of analyst |
| `role` | String | Job title (default: "Forensic Analyst") |
| `organization` | String | Agency/company name |
| `is_active` | Boolean | Account active/inactive status |
| `created_at` | DateTime | Account creation time |
| `updated_at` | DateTime | Last update time |

**Relations:** One user has many `otp_tokens`, `user_sessions`, and `activity_log` entries.

---

## 2. `otp_tokens` — OTP tokens for login & password reset

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Auto-increment |
| `user_id` | Integer (FK → `users.id`) | User ID who owns the OTP |
| `email` | String | Email where OTP was sent |
| `otp_code` | String (6) | 6-digit OTP code |
| `purpose` | String | Purpose: `login` or `reset_password` |
| `expires_at` | DateTime | OTP expiration time |
| `is_used` | Boolean | Whether the OTP has been used |
| `created_at` | DateTime | OTP creation time |

**Relation:** `user_id` → `users.id`.

---

## 3. `password_policy` — Password policy configuration

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Auto-increment |
| `min_length` | Integer | Minimum password length (default: 8) |
| `require_uppercase` | Boolean | Require uppercase letter |
| `require_number` | Boolean | Require number |
| `require_symbol` | Boolean | Require symbol |
| `otp_ttl_seconds` | Integer | OTP validity in seconds (default: 300) |
| `updated_at` | DateTime | Last update time |

**Relation:** Single global configuration row.

---

## 4. `user_sessions` — Login session history

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Auto-increment |
| `user_id` | Integer (FK → `users.id`) | User ID |
| `token` | String (UNIQUE) | Session token (bearer token) |
| `ip_address` | String | IP address at login |
| `user_agent` | String | Browser User-Agent |
| `is_active` | Boolean | Whether session is still active |
| `created_at` | DateTime | Login time |
| `expires_at` | DateTime | Session expiration time |

**Relation:** `user_id` → `users.id`.

---

## 5. `activity_log` — Audit trail of all user actions

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Auto-increment |
| `user_id` | Integer (FK → `users.id`) | User ID who performed the action |
| `action` | String | Action name (Login successful, Password changed, etc.) |
| `details` | Text | Detailed action description (can include HTML for frontend) |
| `dot_color` | String | Indicator dot color (CSS variable) |
| `created_at` | DateTime | Action timestamp |

**Relation:** `user_id` → `users.id`.

---

## 6. `log_uploads` — Uploaded log files

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Auto-increment |
| `filename` | String | Original file name |
| `uploaded_at` | DateTime | Upload timestamp |
| `total_entries` | Integer | Number of entries successfully parsed |

**Relation:** One upload has many entries in `parsed_log_entries` and `parsed_telemetry_entries`.

---

## 7. `parsed_log_entries` — Parsed auth log lines

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Auto-increment |
| `upload_id` | Integer (FK → `log_uploads.id`) | Source upload ID |
| `timestamp` | DateTime | Event time |
| `host` | String | Server hostname |
| `source` | String | Log source (sshd, sudo, etc.) |
| `event_type` | String | Event type |
| `raw_message` | Text | Original raw log line |
| `source_ip` | String | Source IP address |
| `user` | String | Related username |
| `port` | String | Connection port |
| `auth_method` | String | Authentication method |
| `status` | String | Status (Failed, Accepted, etc.) |

**Relation:** `upload_id` → `log_uploads.id`.

---

## 8. `parsed_telemetry_entries` — Parsed telemetry/IDS entries

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Auto-increment |
| `upload_id` | Integer (FK → `log_uploads.id`) | Source upload ID |
| `timestamp` | String | Event time (string) |
| `event_type` | String | Event type |
| `source` | String | Detection source |
| `details` | Text | Event detail description |
| `raw_line` | Text | Original raw JSON line |

**Relation:** `upload_id` → `log_uploads.id`.

---

## 9. `analysis_results` — AI analysis results per upload

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Auto-increment |
| `upload_id` | Integer (UNIQUE, FK → `log_uploads.id`) | Upload ID (1:1) |
| `filename` | String | Name of analyzed file |
| `severity` | String | Severity level (CRITICAL / HIGH / MEDIUM / LOW / INFO) |
| `total_incidents` | Integer | Total detected incidents |
| `narrative_report` | Text | Full narrative from LLM |
| `ioc_summary` | Text | JSON array of indicator IPs |
| `attack_timeline` | Text | JSON array of timeline objects |
| `analyzed_at` | DateTime | Analysis time |
| `analysis_duration_seconds` | Integer | Analysis duration in seconds |

**Relation:** `upload_id` → `log_uploads.id` (one-to-one).

---

## Entity Relationship

```
users (1) ──< (N) otp_tokens
users (1) ──< (N) user_sessions
users (1) ──< (N) activity_log

log_uploads (1) ──< (N) parsed_log_entries
log_uploads (1) ──< (N) parsed_telemetry_entries
log_uploads (1) ── (1) analysis_results
```
