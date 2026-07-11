# Backend ↔ Frontend Integration Guide

Panduan ini mendokumentasikan status integrasi antara FastAPI backend (`port 8000`) dan Next.js frontend (`port 3000`) pada project **Agentic AI Digital Forensics Assistant (DFA)**.

> **Status: ✅ Semua integrasi sudah diimplementasikan dan siap digunakan.**  
> Dokumen ini berfungsi sebagai referensi teknis dan checklist verifikasi.

---

## 1. Global API Configuration (`api.ts`)

**File:** [api.ts](file:///d:/Projects/Agentic%20AI%20Digital%20Forensics%20Assistant/AI-Forensics-Assistant/frontend/src/lib/api.ts)  
**Status: ✅ Sudah diimplementasikan**

Frontend secara otomatis meresolve URL backend berdasarkan hostname browser. Jika browser mengakses `http://103.87.66.30:3000`, maka request API diarahkan ke `http://103.87.66.30:8000`.

```typescript
const BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_URL || window.location.origin.replace(":3000", ":8000"))
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");
```

> **Catatan VPS:** Jika URL otomatis tidak akurat, set `NEXT_PUBLIC_API_URL=http://<ip-vps>:8000` di `frontend/.env.local` sebelum build.

---

## 2. Dashboard Page

**File:** [dashboard/page.tsx](file:///d:/Projects/Agentic%20AI%20Digital%20Forensics%20Assistant/AI-Forensics-Assistant/frontend/src/app/dashboard/page.tsx)  
**Status: ✅ Sudah diimplementasikan**

| Tombol | Aksi |
|---|---|
| **Analyze** (per upload) | `router.push("/analysis?upload_id=X&run=true")` — langsung jalankan analisis |
| **Export** (per upload) | Download file `.txt` berisi metadata upload |
| **Analyze Latest** (Quick Actions) | Redirect ke analisis upload terbaru dari database |
| **Refresh** | Fetch ulang summary dari `GET /logs/summary` |

---

## 3. Upload Page

**File:** [upload/page.tsx](file:///d:/Projects/Agentic%20AI%20Digital%20Forensics%20Assistant/AI-Forensics-Assistant/frontend/src/app/upload/page.tsx)  
**Status: ✅ Sudah diimplementasikan**

| Tombol | Aksi |
|---|---|
| **View** | `router.push("/analysis?upload_id=X")` — buka hasil tanpa re-run |
| **Analyze** | `router.push("/analysis?upload_id=X&run=true")` — jalankan analisis baru |
| **Export** | Download file `.txt` metadata upload |
| **Submit Upload** | `POST /upload/` multipart form, refresh list setelah sukses |

---

## 4. History Page

**File:** [history/page.tsx](file:///d:/Projects/Agentic%20AI%20Digital%20Forensics%20Assistant/AI-Forensics-Assistant/frontend/src/app/history/page.tsx)  
**Status: ✅ Sudah diimplementasikan**

| Tombol | Aksi |
|---|---|
| **View** | `router.push("/analysis?upload_id=X")` |
| **Analyze** | `router.push("/analysis?upload_id=X&run=true")` |
| **Search** | Filter client-side berdasarkan nama file |

---

## 5. Artifact Acquisition Page

**File:** [acquisition/page.tsx](file:///d:/Projects/Agentic%20AI%20Digital%20Forensics%20Assistant/AI-Forensics-Assistant/frontend/src/app/acquisition/page.tsx) · [acquire.py](file:///d:/Projects/Agentic%20AI%20Digital%20Forensics%20Assistant/AI-Forensics-Assistant/backend/app/routers/acquire.py)  
**Status: ✅ Sudah diimplementasikan**

Frontend mengirim payload ke `POST /acquire/`:
```typescript
{
  host, port, username, remote_log_path,
  password: authMethod === "password" ? password : undefined,
  private_key_path: authMethod === "key" ? privateKey : undefined,
}
```

Backend mendeteksi apakah `private_key_path` berisi konten PEM key (mengandung `-----BEGIN`) dan memparsanya di-memory via `io.StringIO` dan Paramiko. Hasil akuisisi ditampilkan di terminal panel dan chain of custody log.

---

## 6. Analysis Page

**File:** [analysis/page.tsx](file:///d:/Projects/Agentic%20AI%20Digital%20Forensics%20Assistant/AI-Forensics-Assistant/frontend/src/app/analysis/page.tsx)  
**Status: ✅ Sudah diimplementasikan**

Menggunakan **React key-remount pattern** agar analisis baru selalu di-trigger saat query parameter berubah:

```tsx
function AnalysisPageWrapper() {
  const searchParams = useSearchParams();
  const uploadId = searchParams.get("upload_id") || "";
  const run = searchParams.get("run") || "";
  return <AnalysisPageContent key={`${uploadId}-${run}`} />;
}
```

Ketika `?run=true` ada di URL, `useEffect` di `AnalysisPageContent` otomatis memanggil `POST /analyze/{upload_id}`.

---

## 7. Timeline Page

**File:** [timeline/page.tsx](file:///d:/Projects/Agentic%20AI%20Digital%20Forensics%20Assistant/AI-Forensics-Assistant/frontend/src/app/timeline/page.tsx)  
**Status: ✅ Sudah diimplementasikan**

- `activeUploadId` di-derive langsung dari `useSearchParams()` — tidak ada stale state lokal
- Upload picker menggunakan `router.replace("/timeline?upload_id=X")` agar URL dan state React selalu sinkron
- Upload list di-fetch unconditionally saat mount agar subtitle file tersedia saat load langsung via URL

---

## 8. Report Page

**File:** [report/page.tsx](file:///d:/Projects/Agentic%20AI%20Digital%20Forensics%20Assistant/AI-Forensics-Assistant/frontend/src/app/report/page.tsx) · [report.py](file:///d:/Projects/Agentic%20AI%20Digital%20Forensics%20Assistant/AI-Forensics-Assistant/backend/app/routers/report.py)  
**Status: ✅ Sudah diimplementasikan**

Form mengambil daftar upload dari `GET /logs/uploads`, user memilih upload dan mengisi metadata (Prepared By, Case Reference, Classification), lalu menekan **Generate Report** yang akan:
1. Kirim `POST /report/` dengan parameter
2. Terima binary PDF dari ReportLab backend
3. Trigger download otomatis via `window.URL.createObjectURL(blob)`

Backend router sudah terdaftar di `main.py`:
```python
from app.routers import upload, logs, analyze, acquire, report
app.include_router(report.router, prefix="/report", tags=["report"])
```

---

## 9. CORS Configuration

**File:** [main.py](file:///d:/Projects/Agentic%20AI%20Digital%20Forensics%20Assistant/AI-Forensics-Assistant/backend/app/main.py)  
**Status: ✅ Sudah difix**

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,   # ← was True (conflict dengan wildcard origin)
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 10. VPS Deployment via `deploy.sh`

### A. Script Overview

Script `deploy.sh` sudah ada di root project dan mendukung tiga mode:

| Command | Fungsi |
|---|---|
| `./deploy.sh` | **Full deploy:** pull → install deps → build frontend → restart PM2 |
| `./deploy.sh --setup` | **First-time setup:** clone repo, buat venv, install semua deps, build, start PM2 |
| `./deploy.sh --build` | **Build only:** pull + rebuild tanpa restart service |

### B. Langkah Deploy ke VPS

**1. Pastikan perubahan sudah di-push ke GitHub:**
```bash
git push origin main
```

**2. SSH masuk ke VPS:**
```bash
ssh dfa-admin@103.87.66.30
```

**3. Masuk ke direktori project:**
```bash
cd ~/ai-forensics-assistant
```

**4. Jalankan deploy script:**
```bash
./deploy.sh
```

Atau jika ingin override API URL saat build:
```bash
NEXT_PUBLIC_API_URL=http://103.87.66.30:8000 ./deploy.sh
```

### C. Apa yang Terjadi Saat `./deploy.sh` Dijalankan

```
[INFO] Pulling latest changes...
         git fetch origin main && git reset --hard origin/main
[OK]   Git pull done

[INFO] Checking backend dependencies...
         source venv/bin/activate && pip install -r requirements.txt -q
[OK]   Backend dependencies up to date

[INFO] Installing frontend dependencies...
         npm install
[OK]   Frontend dependencies up to date

[INFO] Building frontend...
         npm run build
[OK]   Frontend built

[INFO] Restarting PM2 services...
         pm2 restart dfa-backend
         pm2 restart dfa-frontend
[OK]   Services restarted
```

> **Keamanan:** `git reset --hard origin/main` hanya mereset file yang di-track oleh git. File `backend/.env` dan `frontend/.env.local` yang ada di `.gitignore` **TIDAK akan terhapus**.

### D. Verifikasi Setelah Deploy

```bash
# Cek status service
pm2 status

# Cek log backend
pm2 logs dfa-backend --lines 50

# Cek log frontend
pm2 logs dfa-frontend --lines 30
```

Output FastAPI yang diharapkan:
```
INFO:     Database tables verified/created
INFO:     ChromaDB already seeded
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### E. Troubleshooting Saat Pull/Deploy Gagal

| Error | Solusi |
|---|---|
| `Permission denied` saat run script | `chmod +x deploy.sh` |
| `.git/index.lock: File exists` | `rm -f .git/index.lock` |
| Conflict dengan file yang dibuat di VPS | `git clean -f -d` (hati-hati, hapus file untracked) |
| PM2 service tidak ditemukan | Jalankan `pm2 list` untuk cek nama service, lalu re-start manual (lihat Section F) |
| Build error: TypeScript | Jalankan `rm -rf .next` dulu lalu `./deploy.sh` |
| HTTP 503 saat analisis | Cek Ollama: `curl http://localhost:11434/api/tags` |

### F. Re-registrasi PM2 Service (Jika Hilang)

```bash
# Backend
cd ~/ai-forensics-assistant/backend
source venv/bin/activate
pm2 start "uvicorn app.main:app --host 0.0.0.0 --port 8000" \
    --name dfa-backend --interpreter bash

# Frontend
cd ~/ai-forensics-assistant/frontend
pm2 start "npx next start --port 3000" \
    --name dfa-frontend --interpreter bash

# Simpan agar otomatis start setelah reboot
pm2 save
pm2 startup
```

### G. Update Cepat (Tanpa Rebuild)

Jika hanya ada perubahan backend Python (tidak ada perubahan frontend), gunakan `update-vps.sh` untuk proses yang lebih cepat:

```bash
./update-vps.sh
```

Script ini hanya melakukan `git reset --hard origin/main` dan `pm2 restart` tanpa `npm install` dan `npm run build`.

### H. Deploy dari Lokal (Windows PowerShell)

Dari lokal, jalankan script ini untuk push ke GitHub dan trigger deploy di VPS secara otomatis:

```powershell
.\deploy-remote.ps1
```

Script tersebut melakukan:
1. `git push origin main`
2. SSH ke VPS dan menjalankan `./update-vps.sh`
