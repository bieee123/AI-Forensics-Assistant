# AGENT TASK — Frontend + Backend Update Specification v2.1
## Agentic AI Digital Forensics Assistant
## Key Change from v2: Analysis results saved to PostgreSQL, not localStorage

---

## OVERVIEW

Update besar mencakup frontend dan backend. Baca semua file sebelum mulai.
Backend perlu tabel baru dan endpoint baru. Frontend perlu update semua page terkait.

---

## PART A — BACKEND CHANGES

---

### A1. Tambah Tabel `analysis_results` ke Database

**File:** `backend/app/models/schemas.py`

Tambahkan SQLAlchemy model baru:

```python
class AnalysisResultDB(Base):
    __tablename__ = "analysis_results"

    id           = Column(Integer, primary_key=True, index=True)
    upload_id    = Column(Integer, nullable=False, unique=True, index=True)
    filename     = Column(String, nullable=False)
    severity     = Column(String, nullable=False)
    total_incidents = Column(Integer, default=0)
    narrative_report = Column(Text, nullable=True)
    ioc_summary  = Column(Text, nullable=True)   # JSON string: ["ip1", "ip2"]
    attack_timeline = Column(Text, nullable=True) # JSON string: [{...}, {...}]
    analyzed_at  = Column(DateTime, default=datetime.utcnow)
    analysis_duration_seconds = Column(Integer, nullable=True)
```

Tambahkan import `json` di bagian atas file jika belum ada.

Tambahkan juga fungsi helper di file yang sama:

```python
def save_analysis_result(db: Session, upload_id: int, filename: str, result: dict, duration_seconds: int = None):
    """Save or update analysis result for an upload."""
    import json
    existing = db.query(AnalysisResultDB).filter(AnalysisResultDB.upload_id == upload_id).first()
    if existing:
        existing.severity          = result.get("severity_overall", "UNKNOWN")
        existing.total_incidents   = result.get("total_incidents", 0)
        existing.narrative_report  = result.get("narrative_report", "")
        existing.ioc_summary       = json.dumps(result.get("ioc_summary", []))
        existing.attack_timeline   = json.dumps(result.get("attack_timeline", []))
        existing.analyzed_at       = datetime.utcnow()
        existing.analysis_duration_seconds = duration_seconds
        db.commit()
        db.refresh(existing)
        return existing
    else:
        record = AnalysisResultDB(
            upload_id    = upload_id,
            filename     = filename,
            severity     = result.get("severity_overall", "UNKNOWN"),
            total_incidents = result.get("total_incidents", 0),
            narrative_report = result.get("narrative_report", ""),
            ioc_summary  = json.dumps(result.get("ioc_summary", [])),
            attack_timeline = json.dumps(result.get("attack_timeline", [])),
            analysis_duration_seconds = duration_seconds,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record
```

Tambahkan `init_db()` call setelah model definition — sudah ada, pastikan tabel baru ikut dibuat.

---

### A2. Update `/analyze/` Endpoint — Auto-save ke DB

**File:** `backend/app/routers/analyze.py`

Setelah analysis berhasil, simpan hasilnya ke `analysis_results` table.

Update fungsi `analyze_log`:

```python
import time
from app.models.schemas import SessionLocal, save_analysis_result, LogUploadDB

@router.post("/", response_model=AnalyzeResponse)
async def analyze_log(request: AnalyzeRequest):
    start_time = time.time()
    
    # ... existing analysis logic ...
    
    # [AFTER building the response dict, BEFORE returning]
    
    duration = int(time.time() - start_time)
    
    # Get filename from DB
    db: Session = SessionLocal()
    try:
        upload = db.query(LogUploadDB).filter(LogUploadDB.id == request.upload_id).first()
        filename = upload.filename if upload else f"upload_{request.upload_id}"
        
        result_dict = {
            "severity_overall": parsed["severity"] or severity,
            "total_incidents": len(entries),
            "narrative_report": narrative,
            "ioc_summary": ioc_list,
            "attack_timeline": sorted_entries,
        }
        
        save_analysis_result(db, request.upload_id, filename, result_dict, duration)
    except Exception as e:
        logger.warning(f"Failed to save analysis result: {e}")
    finally:
        db.close()
    
    return AnalyzeResponse(...)
```

---

### A3. Tambah Endpoints untuk Analysis History

**File:** `backend/app/routers/analyze.py`

Tambahkan 3 endpoint baru di bawah endpoint `POST /`:

```python
import json as json_lib
from app.models.schemas import AnalysisResultDB

@router.get("/history")
def get_analysis_history():
    """Return list of all saved analysis results, newest first."""
    db: Session = SessionLocal()
    try:
        records = db.query(AnalysisResultDB).order_by(
            AnalysisResultDB.analyzed_at.desc()
        ).all()
        return [
            {
                "id": r.id,
                "upload_id": r.upload_id,
                "filename": r.filename,
                "severity": r.severity,
                "total_incidents": r.total_incidents,
                "analyzed_at": str(r.analyzed_at),
                "analysis_duration_seconds": r.analysis_duration_seconds,
            }
            for r in records
        ]
    finally:
        db.close()


@router.get("/result/{upload_id}")
def get_analysis_result(upload_id: int):
    """Return saved analysis result for a specific upload_id."""
    db: Session = SessionLocal()
    try:
        record = db.query(AnalysisResultDB).filter(
            AnalysisResultDB.upload_id == upload_id
        ).first()
        
        if not record:
            raise HTTPException(status_code=404, detail=f"No analysis found for upload_id {upload_id}")
        
        return {
            "upload_id":        record.upload_id,
            "filename":         record.filename,
            "severity_overall": record.severity,
            "total_incidents":  record.total_incidents,
            "narrative_report": record.narrative_report,
            "ioc_summary":      json_lib.loads(record.ioc_summary or "[]"),
            "attack_timeline":  json_lib.loads(record.attack_timeline or "[]"),
            "analyzed_at":      str(record.analyzed_at),
            "analysis_duration_seconds": record.analysis_duration_seconds,
        }
    finally:
        db.close()


@router.delete("/result/{upload_id}")
def delete_analysis_result(upload_id: int):
    """Delete saved analysis result for re-analysis."""
    db: Session = SessionLocal()
    try:
        record = db.query(AnalysisResultDB).filter(
            AnalysisResultDB.upload_id == upload_id
        ).first()
        if not record:
            raise HTTPException(status_code=404, detail="Not found")
        db.delete(record)
        db.commit()
        return {"deleted": True, "upload_id": upload_id}
    finally:
        db.close()
```

---

### A4. Migrate Database

Setelah semua model update, jalankan init_db untuk buat tabel baru:

```bash
cd /home/dfa-admin/ai-forensics-assistant/backend
source ../venv/bin/activate
python -c "from app.models.schemas import init_db; init_db(); print('Table analysis_results created')"
```

Verify tabel terbuat:
```bash
sudo -u postgres psql -d forensics_db -c "\dt"
sudo -u postgres psql -d forensics_db -c "\d analysis_results"
```

Restart backend:
```bash
pm2 restart dfa-backend
```

---

## PART B — FRONTEND CHANGES

---

### B1. Update `frontend/src/lib/api.ts`

Tambahkan tipe dan endpoint baru:

```ts
// Types
export interface AnalysisHistoryItem {
  id: number
  upload_id: number
  filename: string
  severity: string
  total_incidents: number
  analyzed_at: string
  analysis_duration_seconds: number | null
}

export interface SavedAnalysisResult extends AnalysisResult {
  analyzed_at: string
  analysis_duration_seconds: number | null
  filename: string
}

// API methods — tambahkan ke object `api`
getAnalysisHistory: () => req<AnalysisHistoryItem[]>("/analyze/history"),
getAnalysisResult:  (uploadId: number) => req<SavedAnalysisResult>(`/analyze/result/${uploadId}`),
deleteAnalysisResult: (uploadId: number) =>
  req<{ deleted: boolean }>(`/analyze/result/${uploadId}`, { method: "DELETE" }),
```

---

### B2. Buat `frontend/src/lib/cache.ts`

Tetap buat file ini untuk cache ringan (menghindari API call berulang dalam satu session).
Tapi sekarang ini hanya session cache (in-memory), bukan primary storage.

```ts
"use client"
import { AnalysisResult } from "./api"

// In-memory session cache — cleared on page refresh
// Primary storage is PostgreSQL via /analyze/result/{id}
const sessionCache = new Map<number, { result: AnalysisResult; at: number }>()
const SESSION_TTL = 30 * 60 * 1000  // 30 menit

export function getSessionCache(uploadId: number): AnalysisResult | null {
  const entry = sessionCache.get(uploadId)
  if (!entry) return null
  if (Date.now() - entry.at > SESSION_TTL) {
    sessionCache.delete(uploadId)
    return null
  }
  return entry.result
}

export function setSessionCache(uploadId: number, result: AnalysisResult) {
  sessionCache.set(uploadId, { result, at: Date.now() })
}

export function clearSessionCache(uploadId: number) {
  sessionCache.delete(uploadId)
}
```

---

### B3. Buat `frontend/src/lib/analysisStore.ts`

Global state untuk background analysis progress — sama seperti v2 spec.

```ts
import { AnalysisResult } from "./api"

export interface AnalysisJob {
  uploadId: number
  filename: string
  status: "running" | "done" | "error"
  progress: number
  result?: AnalysisResult
  error?: string
  startedAt: string
}

let activeJob: AnalysisJob | null = null

export function startAnalysisJob(uploadId: number, filename: string) {
  activeJob = {
    uploadId, filename, status: "running",
    progress: 0, startedAt: new Date().toISOString(),
  }
  dispatch()
}

export function updateProgress(progress: number) {
  if (!activeJob) return
  activeJob = { ...activeJob, progress }
  dispatch()
}

export function completeJob(result: AnalysisResult) {
  if (!activeJob) return
  activeJob = { ...activeJob, status: "done", progress: 100, result }
  dispatch()
  setTimeout(() => { activeJob = null; dispatch() }, 6000)
}

export function failJob(error: string) {
  if (!activeJob) return
  activeJob = { ...activeJob, status: "error", error }
  dispatch()
  setTimeout(() => { activeJob = null; dispatch() }, 4000)
}

export function getActiveJob() { return activeJob }

function dispatch() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("analysis-job-update", { detail: activeJob }))
  }
}
```

---

### B4. Buat `frontend/src/components/ui/AnalysisProgressToast.tsx`

Floating notification di pojok kanan atas.

```tsx
"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { AnalysisJob, getActiveJob } from "@/lib/analysisStore"

function CircularProgress({ percent, status }: { percent: number; status: string }) {
  const r = 12, circ = 2 * Math.PI * r
  const dash = circ - (circ * Math.min(percent, 100)) / 100
  const color = status === "done" ? "var(--severity-low)"
    : status === "error" ? "var(--severity-critical)"
    : "var(--accent)"
  return (
    <svg width="36" height="36" viewBox="0 0 32 32" className="flex-shrink-0">
      <circle cx="16" cy="16" r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="2.5" />
      <circle cx="16" cy="16" r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
        transform="rotate(-90 16 16)"
        style={{ transition: "stroke-dashoffset 0.4s ease" }} />
      <text x="16" y="20" textAnchor="middle" fontSize="9" fill={color} fontWeight="700">
        {status === "done" ? "✓" : status === "error" ? "✗" : `${percent}%`}
      </text>
    </svg>
  )
}

export default function AnalysisProgressToast() {
  const [job, setJob] = useState<AnalysisJob | null>(getActiveJob())
  const [dismissed, setDismissed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as AnalysisJob | null
      setJob(detail)
      if (detail) setDismissed(false)
    }
    window.addEventListener("analysis-job-update", handler)
    return () => window.removeEventListener("analysis-job-update", handler)
  }, [])

  if (!job || dismissed) return null

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl cursor-pointer"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        minWidth: 280, maxWidth: 360,
      }}
      onClick={() => {
        if (job.status === "done") {
          router.push(`/analysis?upload_id=${job.uploadId}`)
        }
      }}
    >
      <CircularProgress percent={job.progress} status={job.status} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
          {job.status === "done" ? "Analysis complete!" 
            : job.status === "error" ? "Analysis failed"
            : "Analyzing..."}
        </p>
        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
          {job.filename}
          {job.status === "done" && " · Click to view results"}
        </p>
        {job.status === "running" && (
          <div className="mt-1.5 h-0.5 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${job.progress}%`, background: "var(--accent)" }} />
          </div>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); setDismissed(true) }}
        className="flex-shrink-0 p-1 rounded hover:bg-bg-hover"
        style={{ color: "var(--text-muted)" }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
```

---

### B5. Update `frontend/src/components/layout/AppShell.tsx`

Tambahkan toast:

```tsx
import AnalysisProgressToast from "@/components/ui/AnalysisProgressToast"

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <AnalysisProgressToast />
    </div>
  )
}
```

---

### B6. Update `frontend/src/app/analysis/page.tsx`

Ini perubahan terbesar. Implementasikan semua ini:

#### 6a. Import baru:
```tsx
import { getSessionCache, setSessionCache, clearSessionCache } from "@/lib/cache"
import { startAnalysisJob, updateProgress, completeJob, failJob } from "@/lib/analysisStore"
import { api, AnalysisResult, SavedAnalysisResult, AnalysisHistoryItem } from "@/lib/api"
import { Database, RefreshCw, Clock, FileText, Plus } from "lucide-react"
```

#### 6b. State baru:
```tsx
const [fromCache, setFromCache] = useState(false)
const [cachedAt, setCachedAt] = useState<string | null>(null)
const [historyItems, setHistoryItems] = useState<AnalysisHistoryItem[]>([])
const [historyLoading, setHistoryLoading] = useState(false)
```

#### 6c. runAnalysis() — update dengan DB check + progress store:
```tsx
const runAnalysis = async () => {
  if (!uploadId) return

  // Check session cache first (avoid repeated API calls in same session)
  const sessionCached = getSessionCache(parseInt(uploadId))
  if (sessionCached && !shouldRun) {
    setResult(sessionCached)
    setFromCache(true)
    return
  }

  // Check DB cache via API
  if (!shouldRun) {
    try {
      const saved = await api.getAnalysisResult(parseInt(uploadId))
      setResult(saved as AnalysisResult)
      setFromCache(true)
      setCachedAt(saved.analyzed_at)
      setSessionCache(parseInt(uploadId), saved as AnalysisResult)
      return
    } catch {
      // Not in DB, run fresh analysis
    }
  }

  // Fresh analysis
  setLoading(true)
  setError("")
  setResult(null)
  setFromCache(false)
  setCachedAt(null)

  // Get filename for toast
  const uploads = await api.getUploads().catch(() => [])
  const upload = uploads.find(u => u.upload_id === parseInt(uploadId!))
  const filename = upload?.filename || `upload_${uploadId}`

  // Start background job
  startAnalysisJob(parseInt(uploadId), filename)
  const startTime = Date.now()

  // Simulate progress
  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - startTime
    const simulated = Math.min(88, Math.floor((elapsed / 70000) * 88))
    updateProgress(simulated)
  }, 500)

  try {
    const data = await api.analyze(parseInt(uploadId))
    clearInterval(progressInterval)
    setResult(data)
    setSessionCache(parseInt(uploadId), data)
    completeJob(data)
  } catch (err) {
    clearInterval(progressInterval)
    setError("Analysis failed. Please try again.")
    failJob("Analysis failed")
  } finally {
    setLoading(false)
  }
}
```

#### 6d. Fetch history ketika tidak ada upload_id:
```tsx
useEffect(() => {
  if (!uploadId) {
    setHistoryLoading(true)
    api.getAnalysisHistory()
      .then(setHistoryItems)
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }
}, [uploadId])
```

#### 6e. Horizontal loading timeline (ganti AnalysisLoader):
```tsx
// HORIZONTAL LOADING TIMELINE
{loading && (
  <div className="bg-bg-elevated border border-border-subtle rounded-xl p-8">
    {/* Steps */}
    <div className="flex items-start justify-between mb-8 relative">
      {/* Connector line */}
      <div className="absolute top-4 left-0 right-0 h-0.5 mx-8"
        style={{ background: "var(--border-subtle)", zIndex: 0 }} />
      
      {[
        { key: "parsing",    label: "Parse Logs",   labelId: "Parsing Log",      doneAfter: 0    },
        { key: "extracting", label: "Extract IoC",  labelId: "Ekstrak IoC",      doneAfter: 2000 },
        { key: "querying",   label: "Query RAG",    labelId: "Query Basis Data", doneAfter: 5000 },
        { key: "generating", label: "Generate AI",  labelId: "Generate AI",      doneAfter: null },
      ].map((step, i) => {
        const isDone = elapsedMs > (step.doneAfter ?? Infinity)
        const isActive = !isDone && (i === 0 || elapsedMs > [0,2000,5000,8000][i-1])
        return (
          <div key={step.key} className="flex flex-col items-center gap-2 relative z-10" style={{ width: "25%" }}>
            {/* Dot */}
            <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all"
              style={{
                background: isDone ? "var(--severity-low)" : isActive ? "var(--accent-bg)" : "var(--bg-base)",
                borderColor: isDone ? "var(--severity-low)" : isActive ? "var(--accent)" : "var(--border-subtle)",
              }}>
              {isDone
                ? <span style={{ color: "#fff", fontSize: 14 }}>✓</span>
                : isActive
                  ? <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
                  : <div className="w-2 h-2 rounded-full" style={{ background: "var(--border-strong)" }} />
              }
            </div>
            {/* Label */}
            <span className="text-xs font-medium text-center"
              style={{ color: isDone ? "var(--severity-low)" : isActive ? "var(--accent)" : "var(--text-muted)" }}>
              {lang === "id" ? step.labelId : step.label}
            </span>
            {/* Sub-label */}
            <span className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
              {isDone ? "Done" : isActive && step.key === "generating" ? "Running..." : ""}
            </span>
          </div>
        )
      })}
    </div>

    {/* Progress bar */}
    <div className="h-1 rounded-full overflow-hidden mb-4" style={{ background: "var(--border-subtle)" }}>
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${progressPercent}%`, background: "var(--accent)" }} />
    </div>

    <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
      {lang === "id"
        ? "Proses ini mungkin memakan waktu 30–90 detik pada CPU inference"
        : "This may take 30–90 seconds on CPU inference"}
    </p>
  </div>
)}
```

State tambahan untuk horizontal timeline:
```tsx
const [elapsedMs, setElapsedMs] = useState(0)
const [progressPercent, setProgressPercent] = useState(0)

// Timer untuk horizontal timeline
useEffect(() => {
  if (!loading) { setElapsedMs(0); setProgressPercent(0); return }
  const start = Date.now()
  const timer = setInterval(() => {
    const elapsed = Date.now() - start
    setElapsedMs(elapsed)
    setProgressPercent(Math.min(95, Math.floor((elapsed / 70000) * 95)))
  }, 200)
  return () => clearInterval(timer)
}, [loading])
```

#### 6f. Tampilan ketika tidak ada upload_id — list dari DB:
```tsx
{!uploadId && (
  <div className="space-y-6">
    {/* Recent Analyses dari DB */}
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Recent Analyses
        </h3>
        <button onClick={() => router.push("/upload")}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md"
          style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
          <Plus size={12} /> Analyze New Upload
        </button>
      </div>

      {historyLoading && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</p>}

      {!historyLoading && historyItems.length === 0 && (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No analyses yet. Upload a log file to get started.
        </p>
      )}

      <div className="space-y-2">
        {historyItems.map(item => (
          <div key={item.upload_id}
            className="flex items-center gap-4 p-4 rounded-lg border transition-colors"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}>
            <FileText size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                {item.filename}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Upload #{item.upload_id} · {item.total_incidents} incidents
                · {new Date(item.analyzed_at).toLocaleString()}
              </p>
            </div>
            <span className={`badge badge-${item.severity.toLowerCase()}`}>{item.severity}</span>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/analysis?upload_id=${item.upload_id}`)}
                className="text-xs px-3 py-1.5 rounded-md border transition-colors"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
                Open
              </button>
              <button
                onClick={() => router.push(`/analysis?upload_id=${item.upload_id}&run=true`)}
                className="text-xs px-3 py-1.5 rounded-md border transition-colors"
                style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                Re-analyze
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
```

#### 6g. Cache indicator di result header:
```tsx
{/* Tambahkan setelah severity badge di result header */}
{fromCache && cachedAt && (
  <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-md"
    style={{ background: "var(--accent-bg)", color: "var(--text-muted)" }}>
    <Database size={11} />
    Saved · {new Date(cachedAt).toLocaleString()}
  </span>
)}
```

#### 6h. Fix narrative rendering:
```tsx
{/* NARRATIVE SECTION — pastikan ini ada dan tidak terbungkus conditional yang salah */}
{result && (
  <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
    <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
      {tr.analysis.narrative}
    </h3>
    {narrativeBody ? (
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
        {narrativeBody}
      </p>
    ) : (
      <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>
        No narrative available.
      </p>
    )}
    {recommendation && (
      <div className="mt-4 p-3 rounded-md border-l-4"
        style={{ borderColor: "var(--severity-high)", background: "rgba(255,140,66,0.08)" }}>
        <p className="text-xs font-semibold mb-1" style={{ color: "var(--severity-high)" }}>
          ⚠ {tr.analysis.recommendation}
        </p>
        <p className="text-sm" style={{ color: "var(--text-primary)" }}>{recommendation}</p>
      </div>
    )}
  </div>
)}
```

Split logic narrative (pastikan ini benar):
```ts
let narrativeBody = result?.narrative_report ?? ""
let recommendation = ""
if (narrativeBody && narrativeBody.includes("Recommendation:")) {
  const idx = narrativeBody.indexOf("Recommendation:")
  recommendation = narrativeBody.slice(idx + "Recommendation:".length).trim()
  narrativeBody = narrativeBody.slice(0, idx).trim()
}
```

---

### B7. Update Timeline Page — Remove Card from Picker

**File:** `frontend/src/app/timeline/page.tsx`

Hapus card wrapper dari upload picker. Ganti dengan plain list:

```tsx
{/* BEFORE: wrapped in card */}
{/* AFTER: plain layout */}
{!activeUploadId && (
  <div className="px-6 py-2">
    <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
      {lang === "id"
        ? "Pilih unggahan untuk melihat timeline kejadian"
        : "Select an upload to view its event timeline"}
    </p>
    {uploadsLoading && (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading uploads...</p>
    )}
    <div className="space-y-1">
      {uploads.map(u => (
        <div
          key={u.upload_id}
          onClick={() => selectUpload(u.upload_id)}
          className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors"
          style={{ color: "var(--text-primary)" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <span className="font-mono text-xs w-8 text-right flex-shrink-0"
            style={{ color: "var(--text-muted)" }}>#{u.upload_id}</span>
          <span className="flex-1 text-sm truncate">{u.filename}</span>
          <span className={fileTypeBadge(u.filename).cls}>{fileTypeBadge(u.filename).label}</span>
          <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
            {u.total_entries} entries
          </span>
        </div>
      ))}
    </div>
    {!uploadsLoading && uploads.length === 0 && (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        No uploads found.
      </p>
    )}
  </div>
)}
```

---

### B8. Update Dashboard & Upload — Export PDF Button

**Files:**
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/app/upload/page.tsx`

#### Import tambahan:
```tsx
import { getSessionCache, setSessionCache } from "@/lib/cache"
import { FileDown, Loader2 } from "lucide-react"
```

#### State:
```tsx
const [exportingId, setExportingId] = useState<number | null>(null)
```

#### Handler function:
```tsx
const handleExportPDF = async (upload: Upload) => {
  setExportingId(upload.upload_id)
  try {
    const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

    // Check session cache first
    let analysisData = getSessionCache(upload.upload_id)

    // Check DB cache via API
    if (!analysisData) {
      try {
        const saved = await fetch(`${BASE}/analyze/result/${upload.upload_id}`)
        if (saved.ok) {
          analysisData = await saved.json()
          setSessionCache(upload.upload_id, analysisData!)
        }
      } catch {}
    }

    // Run fresh analysis if no cache
    if (!analysisData) {
      const res = await fetch(`${BASE}/analyze/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upload_id: upload.upload_id }),
      })
      if (!res.ok) throw new Error("Analysis failed")
      analysisData = await res.json()
      setSessionCache(upload.upload_id, analysisData!)
    }

    // Generate PDF
    const reportRes = await fetch(`${BASE}/report/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        upload_id:        upload.upload_id,
        analyst_name:     "DFA System",
        organization:     "PT Teknologi Nasional Indonesia Siber",
        classification:   "CONFIDENTIAL",
        narrative_report: analysisData!.narrative_report,
        severity_overall: analysisData!.severity_overall,
        ioc_summary:      analysisData!.ioc_summary,
        attack_timeline:  analysisData!.attack_timeline,
        total_incidents:  analysisData!.total_incidents,
      }),
    })

    if (!reportRes.ok) throw new Error("Report generation failed")

    const blob = await reportRes.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `incident_report_${upload.upload_id}_${new Date().toISOString().slice(0,10)}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

  } catch (err) {
    alert("Export failed. Please try again.")
  } finally {
    setExportingId(null)
  }
}
```

#### Button di table row:
```tsx
<button
  onClick={() => handleExportPDF(u)}
  disabled={exportingId === u.upload_id}
  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50"
  style={{
    borderColor: "var(--border-subtle)",
    color: exportingId === u.upload_id ? "var(--text-muted)" : "var(--text-secondary)",
    background: "var(--bg-elevated)",
  }}
>
  {exportingId === u.upload_id
    ? <><Loader2 size={12} className="animate-spin" /> Generating...</>
    : <><FileDown size={12} /> Export PDF</>
  }
</button>
```

---

## IMPLEMENTATION ORDER

1. **Backend first:**
   - Update `backend/app/models/schemas.py` — tambah `AnalysisResultDB` model
   - Update `backend/app/routers/analyze.py` — tambah auto-save + 3 endpoint baru
   - Run `init_db()` — buat tabel baru
   - `pm2 restart dfa-backend`
   - Verify: `curl http://localhost:8000/analyze/history`

2. **Frontend lib files:**
   - Create `frontend/src/lib/cache.ts`
   - Create `frontend/src/lib/analysisStore.ts`
   - Update `frontend/src/lib/api.ts`

3. **Frontend components:**
   - Create `frontend/src/components/ui/AnalysisProgressToast.tsx`
   - Update `frontend/src/components/layout/AppShell.tsx`

4. **Frontend pages:**
   - Update `frontend/src/app/analysis/page.tsx`
   - Update `frontend/src/app/timeline/page.tsx`
   - Update `frontend/src/app/dashboard/page.tsx`
   - Update `frontend/src/app/upload/page.tsx`

5. **Build & restart:**
   ```bash
   cd /home/dfa-admin/ai-forensics-assistant/frontend
   npm run build
   pm2 restart dfa-frontend
   ```

---

## VERIFICATION CHECKLIST

After implementation, verify each item:

- [ ] `GET /analyze/history` returns list of saved analyses
- [ ] `GET /analyze/result/1` returns saved result for upload #1
- [ ] After running analysis, result persists in DB (verify with psql)
- [ ] Opening `/analysis?upload_id=1` loads from DB without re-analyzing
- [ ] Opening `/analysis?upload_id=1&run=true` forces fresh analysis
- [ ] `/analysis` (no upload_id) shows list of past analyses from DB
- [ ] Analysis loading shows horizontal timeline, not vertical list
- [ ] Analysis narrative text visible in result
- [ ] Timeline page picker has no card wrapper
- [ ] Export PDF button in Dashboard works (downloads PDF)
- [ ] Export PDF button in Upload page works (downloads PDF)
- [ ] Floating progress toast appears when analysis starts
- [ ] Toast remains visible when navigating to other pages
- [ ] Toast disappears after 6 seconds when analysis completes
- [ ] Clicking toast navigates to analysis result
- [ ] `npm run build` → zero TypeScript errors
