# Database ERD — AI Forensics Assistant

Terdapat **11 tabel** dalam database PostgreSQL (`forensics_db`):

---

## Tabel & Fungsi

| Tabel | Fungsi |
|---|---|
| `users` | Akun analyst |
| `otp_tokens` | Token OTP login + reset password |
| `password_policy` | Konfigurasi aturan password (min length, uppercase, number, symbol, OTP TTL) |
| `user_sessions` | Riwayat login session |
| `activity_log` | Audit trail semua aksi user (untuk Profile → Recent Activity) |
| `log_uploads` | File log yang di-upload |
| `parsed_log_entries` | Baris log auth yang sudah diparse |
| `parsed_telemetry_entries` | Baris telemetry/IDS yang sudah diparse |
| `analysis_results` | Hasil analisis AI per upload |
| `artifact_acquisitions` | (placeholder) Sesi SSH artifact acquisition |
| `reports` | (placeholder) Laporan yang di-generate |

---

## 1. `users` — Akun analyst

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Integer (PK) | Auto-increment |
| `username` | String (UNIQUE) | Nama pengguna untuk login |
| `email` | String (UNIQUE) | Email untuk OTP & notifikasi |
| `password_hash` | String | Hash bcrypt dari password |
| `full_name` | String | Nama lengkap analyst |
| `role` | String | Jabatan (default: "Forensic Analyst") |
| `organization` | String | Nama instansi/perusahaan |
| `is_active` | Boolean | Status akun aktif/nonaktif |
| `created_at` | DateTime | Waktu pembuatan akun |
| `updated_at` | DateTime | Waktu update terakhir |

**Relasi:** Satu user memiliki banyak `otp_tokens`, `user_sessions`, dan `activity_log`.

---

## 2. `otp_tokens` — Token OTP login + reset password

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Integer (PK) | Auto-increment |
| `user_id` | Integer (FK → `users.id`) | ID user pemilik OTP |
| `email` | String | Email tujuan pengiriman OTP |
| `otp_code` | String (6) | Kode OTP 6 digit |
| `purpose` | String | Tujuan: `login` atau `reset_password` |
| `expires_at` | DateTime | Waktu kadaluarsa OTP |
| `is_used` | Boolean | Apakah OTP sudah dipakai |
| `created_at` | DateTime | Waktu pembuatan OTP |

**Relasi:** `user_id` → `users.id`.

---

## 3. `password_policy` — Konfigurasi aturan password

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Integer (PK) | Auto-increment |
| `min_length` | Integer | Panjang minimum password (default: 8) |
| `require_uppercase` | Boolean | Wajib huruf kapital |
| `require_number` | Boolean | Wajib angka |
| `require_symbol` | Boolean | Wajib simbol |
| `otp_ttl_seconds` | Integer | Masa berlaku OTP dalam detik (default: 300) |
| `updated_at` | DateTime | Waktu update terakhir |

**Relasi:** Hanya ada satu baris konfigurasi global.

---

## 4. `user_sessions` — Riwayat login session

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Integer (PK) | Auto-increment |
| `user_id` | Integer (FK → `users.id`) | ID user |
| `token` | String (UNIQUE) | Token sesi (bearer token) |
| `ip_address` | String | Alamat IP saat login |
| `user_agent` | String | User-Agent browser |
| `is_active` | Boolean | Status sesi masih aktif |
| `created_at` | DateTime | Waktu login |
| `expires_at` | DateTime | Waktu kadaluarsa sesi |

**Relasi:** `user_id` → `users.id`.

---

## 5. `activity_log` — Audit trail semua aksi user

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Integer (PK) | Auto-increment |
| `user_id` | Integer (FK → `users.id`) | ID user pelaku aksi |
| `action` | String | Nama aksi (Login successful, Password changed, dll) |
| `details` | Text | Deskripsi detail aksi (bisa HTML untuk frontend) |
| `dot_color` | String | Warna indikator dot (CSS variable) |
| `created_at` | DateTime | Waktu aksi |

**Relasi:** `user_id` → `users.id`.

---

## 6. `log_uploads` — File log yang di-upload

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Integer (PK) | Auto-increment |
| `filename` | String | Nama file asli |
| `uploaded_at` | DateTime | Timestamp upload |
| `total_entries` | Integer | Jumlah entry yang berhasil diparse |

**Relasi:** Satu upload memiliki banyak entry di `parsed_log_entries` dan `parsed_telemetry_entries`.

---

## 7. `parsed_log_entries` — Baris log auth yang sudah diparse

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Integer (PK) | Auto-increment |
| `upload_id` | Integer (FK → `log_uploads.id`) | ID upload asal |
| `timestamp` | DateTime | Waktu event |
| `host` | String | Hostname server |
| `source` | String | Sumber log (sshd, sudo, dll) |
| `event_type` | String | Jenis event |
| `raw_message` | Text | Baris log mentah asli |
| `source_ip` | String | IP address sumber |
| `user` | String | Username terkait |
| `port` | String | Port koneksi |
| `auth_method` | String | Metode autentikasi |
| `status` | String | Status (Failed, Accepted, dll) |

**Relasi:** `upload_id` → `log_uploads.id`.

---

## 8. `parsed_telemetry_entries` — Baris telemetry/IDS yang sudah diparse

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Integer (PK) | Auto-increment |
| `upload_id` | Integer (FK → `log_uploads.id`) | ID upload asal |
| `timestamp` | String | Waktu event (string) |
| `event_type` | String | Jenis event |
| `source` | String | Sumber deteksi |
| `details` | Text | Deskripsi detail event |
| `raw_line` | Text | Baris JSON mentah asli |

**Relasi:** `upload_id` → `log_uploads.id`.

---

## 9. `analysis_results` — Hasil analisis AI per upload

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Integer (PK) | Auto-increment |
| `upload_id` | Integer (UNIQUE, FK → `log_uploads.id`) | ID upload (1:1) |
| `filename` | String | Nama file yang dianalisis |
| `severity` | String | Tingkat bahaya (CRITICAL / HIGH / MEDIUM / LOW / INFO) |
| `total_incidents` | Integer | Total insiden terdeteksi |
| `narrative_report` | Text | Narasi lengkap dari LLM |
| `ioc_summary` | Text | JSON array IP indikator kompromi |
| `attack_timeline` | Text | JSON array objek timeline |
| `analyzed_at` | DateTime | Waktu analisis |
| `analysis_duration_seconds` | Integer | Durasi analisis dalam detik |

**Relasi:** `upload_id` → `log_uploads.id` (one-to-one).

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
