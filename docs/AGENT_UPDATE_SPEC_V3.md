# AGENT TASK — Update Specification v3
## Agentic AI Digital Forensics Assistant
## Full Backend + Frontend Update

---

## CRITICAL RULES BEFORE STARTING

1. Read EVERY file before touching it
2. Surgical edits only — do not rewrite entire files
3. `"use client"` required on all components with hooks or browser APIs
4. All colors via CSS variables — never hardcode hex
5. `typeof window !== "undefined"` guard on all browser API access
6. `npm run build` must pass zero errors before done
7. Dark mode must work on every new element

---

## CONTEXT

- Backend: FastAPI at `http://localhost:8000` (pm2: `dfa-backend`)
- Frontend: Next.js 15 at `http://localhost:3000` (pm2: `dfa-frontend`)
- Project root: `/home/dfa-admin/ai-forensics-assistant/`
- API base URL in frontend: `process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"`

### Verified Working Endpoints
```
GET  /health
GET  /logs/summary
GET  /logs/uploads
GET  /logs/entries?upload_id={id}
POST /upload/
POST /analyze/              body: {"upload_id": N}
GET  /analyze/history
GET  /analyze/result/{id}
POST /report/               body: {upload_id, analyst_name, organization, classification, narrative_report, severity_overall, ioc_summary, attack_timeline, total_incidents}
```

---

## CHANGE 1 — FIX: Report Page Must Use Cached/DB Analysis (No Re-analysis)

**Problem:** Report page calls `/analyze/` again which takes 30-90 seconds. Dashboard/Upload export is fast because they use cached data. Report page should do the same.

**Files to update:**
- `frontend/src/app/report/page.tsx`

**Logic:**
1. On page load, fetch upload list from `GET /logs/uploads`
2. When user selects an upload:
   a. Check session cache (`getSessionCache(uploadId)`)
   b. If not in session, check DB: `GET /analyze/result/{uploadId}`
   c. If not in DB → show "Analysis required" message with button "Run Analysis" (links to `/analysis?upload_id={id}&run=true`)
   d. If found (either cache or DB) → populate preview immediately
3. Never call `POST /analyze/` from report page
4. Generate PDF by calling `POST /report/` with the pre-fetched data

**State structure:**
```tsx
const [uploads, setUploads] = useState<Upload[]>([])
const [selectedId, setSelectedId] = useState<number | null>(null)
const [analysisData, setAnalysisData] = useState<SavedAnalysisResult | null>(null)
const [loadingAnalysis, setLoadingAnalysis] = useState(false)
const [generating, setGenerating] = useState(false)
const [notAnalyzed, setNotAnalyzed] = useState(false)
const [analystName, setAnalystName] = useState("DFA System")
const [organization, setOrganization] = useState("PT Teknologi Nasional Indonesia Siber")
const [classification, setClassification] = useState("CONFIDENTIAL")
```

**When user selects upload:**
```tsx
const selectUpload = async (uploadId: number) => {
  setSelectedId(uploadId)
  setNotAnalyzed(false)
  setAnalysisData(null)
  setLoadingAnalysis(true)

  try {
    // 1. Session cache
    const session = getSessionCache(uploadId)
    if (session) {
      setAnalysisData(session as SavedAnalysisResult)
      setLoadingAnalysis(false)
      return
    }

    // 2. DB cache
    const saved = await api.getAnalysisResult(uploadId)
    setAnalysisData(saved)
    setSessionCache(uploadId, saved as AnalysisResult)

  } catch {
    // Not found in DB — needs analysis first
    setNotAnalyzed(true)
  } finally {
    setLoadingAnalysis(false)
  }
}
```

---

## CHANGE 2 — FIX: Report Page Real-Time Preview

**Problem:** Report page preview does not update when user selects different upload.

**File:** `frontend/src/app/report/page.tsx`

**Full page layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Report                                                          │
├──────────────────────────┬──────────────────────────────────────┤
│  LEFT: Configuration     │  RIGHT: Live Preview                 │
│  (40% width)             │  (60% width)                         │
│                          │                                       │
│  Select Upload:          │  [PDF Preview rendered as HTML]       │
│  [dropdown/list]         │                                       │
│                          │  ┌─────────────────────────────────┐ │
│  Analyst Name:           │  │ CONFIDENTIAL                    │ │
│  [input]                 │  │ INCIDENT REPORT                 │ │
│                          │  │ ...                             │ │
│  Organization:           │  │ 1. EXECUTIVE SUMMARY            │ │
│  [input]                 │  │ Severity: HIGH  Incidents: 5    │ │
│                          │  │                                 │ │
│  Classification:         │  │ 2. NARRATIVE ANALYSIS           │ │
│  [CONFIDENTIAL ▼]        │  │ [narrative text here]           │ │
│                          │  │                                 │ │
│  [Generate & Download]   │  │ 3. IoC SUMMARY                 │ │
│                          │  │ 192.168.1.1                    │ │
│                          │  │                                 │ │
│                          │  │ 4. ATTACK TIMELINE              │ │
│                          │  │ [table rows]                    │ │
│                          │  └─────────────────────────────────┘ │
└──────────────────────────┴──────────────────────────────────────┘
```

**Preview component — renders live HTML preview of what PDF will contain:**
```tsx
function ReportPreview({
  analysisData,
  analystName,
  organization,
  classification,
  upload,
}: {
  analysisData: SavedAnalysisResult | null
  analystName: string
  organization: string
  classification: string
  upload: Upload | null
}) {
  if (!analysisData) {
    return (
      <div className="flex items-center justify-center h-full"
        style={{ color: "var(--text-muted)" }}>
        <div className="text-center">
          <FileText size={40} style={{ margin: "0 auto 12px" }} />
          <p className="text-sm">Select an upload to preview the report</p>
        </div>
      </div>
    )
  }

  const sevColor: Record<string, string> = {
    CRITICAL: "#FF4D6A", HIGH: "#FF8C42", MEDIUM: "#c9a52e", LOW: "#06D6A0", INFO: "#4ECDC4"
  }
  const color = sevColor[analysisData.severity_overall?.toUpperCase()] || "#8B92A9"

  // Split narrative from recommendation
  let narrativeBody = analysisData.narrative_report || ""
  let recommendation = ""
  if (narrativeBody.includes("Recommendation:")) {
    const idx = narrativeBody.indexOf("Recommendation:")
    recommendation = narrativeBody.slice(idx + 15).trim()
    narrativeBody = narrativeBody.slice(0, idx).trim()
  }

  return (
    <div className="h-full overflow-y-auto rounded-lg border p-6 text-sm"
      style={{
        background: "var(--bg-elevated)",
        borderColor: "var(--border-subtle)",
        fontFamily: "Helvetica, Arial, sans-serif",
      }}>

      {/* Classification banner */}
      <div className="text-center text-xs font-bold py-1.5 mb-4 rounded"
        style={{ background: "#1F2937", color: "#fff" }}>
        {classification}
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold mb-0.5" style={{ color: "var(--text-primary)" }}>
        INCIDENT REPORT
      </h1>
      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
        Agentic AI Digital Forensics Assistant
      </p>
      <hr style={{ borderColor: "#0D9488", borderWidth: 2, marginBottom: 16 }} />

      {/* Meta table */}
      <table className="w-full text-xs mb-5" style={{ borderCollapse: "collapse" }}>
        {[
          ["Report ID", `DFA-${analysisData.upload_id}-${new Date().toISOString().slice(0,10).replace(/-/g,"")}`],
          ["Generated", new Date().toLocaleString("en-GB")],
          ["Upload ID", String(analysisData.upload_id)],
          ["Filename", upload?.filename || `upload_${analysisData.upload_id}`],
          ["Analyst", analystName],
          ["Organization", organization],
          ["Classification", classification],
        ].map(([k, v], i) => (
          <tr key={k} style={{ background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.04)" }}>
            <td className="py-1.5 px-2 font-semibold w-1/3" style={{ color: "var(--text-secondary)" }}>{k}</td>
            <td className="py-1.5 px-2" style={{ color: "var(--text-primary)" }}>{v}</td>
          </tr>
        ))}
      </table>

      {/* Executive Summary */}
      <h2 className="text-sm font-bold mb-3" style={{ color: "#0D9488" }}>
        1. EXECUTIVE SUMMARY
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-3 rounded border text-center"
          style={{ borderColor: "var(--border-subtle)" }}>
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Severity</p>
          <p className="text-xl font-bold" style={{ color }}>{analysisData.severity_overall}</p>
        </div>
        <div className="p-3 rounded border text-center"
          style={{ borderColor: "var(--border-subtle)" }}>
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Total Incidents</p>
          <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {analysisData.total_incidents}
          </p>
        </div>
      </div>

      {/* Narrative */}
      <h2 className="text-sm font-bold mb-2" style={{ color: "#0D9488" }}>
        2. NARRATIVE ANALYSIS
      </h2>
      {narrativeBody ? (
        <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-primary)" }}>
          {narrativeBody}
        </p>
      ) : (
        <p className="text-xs italic mb-3" style={{ color: "var(--text-muted)" }}>
          No narrative available.
        </p>
      )}
      {recommendation && (
        <div className="p-3 rounded mb-4 border-l-4"
          style={{ borderColor: "#FF8C42", background: "rgba(255,140,66,0.08)" }}>
          <p className="text-xs font-bold mb-1" style={{ color: "#FF8C42" }}>⚠ Recommendation</p>
          <p className="text-xs" style={{ color: "var(--text-primary)" }}>{recommendation}</p>
        </div>
      )}

      {/* IoC */}
      <h2 className="text-sm font-bold mb-2" style={{ color: "#0D9488" }}>
        3. INDICATORS OF COMPROMISE (IoC)
      </h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {(analysisData.ioc_summary || []).map((ip, i) => (
          <span key={i} className="font-mono text-xs px-2 py-1 rounded"
            style={{ background: "rgba(255,77,106,0.1)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.3)" }}>
            {ip}
          </span>
        ))}
      </div>

      {/* Timeline */}
      <h2 className="text-sm font-bold mb-2" style={{ color: "#0D9488" }}>
        4. ATTACK TIMELINE
      </h2>
      <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#0D9488" }}>
            {["Time", "Event Type", "Source IP", "User", "Status"].map(h => (
              <th key={h} className="py-1.5 px-2 text-left font-semibold" style={{ color: "#fff" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(analysisData.attack_timeline || []).map((e: Record<string, string>, i: number) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.04)" }}>
              <td className="py-1.5 px-2 font-mono">{(e.timestamp || "").slice(11,19)}</td>
              <td className="py-1.5 px-2">{e.event_type}</td>
              <td className="py-1.5 px-2 font-mono">{e.source_ip || "—"}</td>
              <td className="py-1.5 px-2">{e.user || "—"}</td>
              <td className="py-1.5 px-2">{e.status || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <hr className="mt-6 mb-2" style={{ borderColor: "var(--border-subtle)" }} />
      <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
        Generated by DFA — Agentic AI Digital Forensics Assistant · {classification}
      </p>
    </div>
  )
}
```

**Full page layout implementation:**
```tsx
export default function ReportPage() {
  // ... state declarations ...

  return (
    <AppShell>
      <PageHeader title={tr.report.title} />
      <div className="flex h-[calc(100vh-56px)]">

        {/* LEFT: Configuration panel */}
        <div className="w-96 flex-shrink-0 border-r overflow-y-auto p-5 space-y-5"
          style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}>

          {/* Upload selector */}
          <div>
            <label className="text-xs font-semibold block mb-2"
              style={{ color: "var(--text-secondary)" }}>
              Select Upload
            </label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {uploads.map(u => (
                <div key={u.upload_id}
                  onClick={() => selectUpload(u.upload_id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors"
                  style={{
                    background: selectedId === u.upload_id ? "var(--accent-bg)" : "transparent",
                    color: selectedId === u.upload_id ? "var(--accent)" : "var(--text-primary)",
                    border: selectedId === u.upload_id ? "1px solid var(--accent)" : "1px solid transparent",
                  }}>
                  <span className="font-mono text-xs w-6 flex-shrink-0"
                    style={{ color: "var(--text-muted)" }}>#{u.upload_id}</span>
                  <span className="flex-1 truncate">{u.filename}</span>
                  <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                    {u.total_entries}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Analysis status */}
          {loadingAnalysis && (
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <Loader2 size={14} className="animate-spin" /> Loading analysis data...
            </div>
          )}
          {notAnalyzed && selectedId && (
            <div className="p-3 rounded-lg border-l-4 text-xs"
              style={{ borderColor: "var(--severity-medium)", background: "rgba(255,209,102,0.08)" }}>
              <p className="font-semibold mb-1" style={{ color: "#c9a52e" }}>
                ⚠ Not yet analyzed
              </p>
              <p style={{ color: "var(--text-secondary)" }} className="mb-2">
                This upload has not been analyzed yet.
              </p>
              <button
                onClick={() => router.push(`/analysis?upload_id=${selectedId}&run=true`)}
                className="text-xs px-3 py-1.5 rounded-md"
                style={{ background: "var(--accent)", color: "#fff" }}>
                Run Analysis →
              </button>
            </div>
          )}

          {/* Report metadata inputs */}
          {analysisData && (
            <>
              <div>
                <label className="text-xs font-semibold block mb-1.5"
                  style={{ color: "var(--text-secondary)" }}>Analyst Name</label>
                <input value={analystName} onChange={e => setAnalystName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md text-sm"
                  style={{
                    background: "var(--bg-base)", border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)", outline: "none"
                  }} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5"
                  style={{ color: "var(--text-secondary)" }}>Organization</label>
                <input value={organization} onChange={e => setOrganization(e.target.value)}
                  className="w-full px-3 py-2 rounded-md text-sm"
                  style={{
                    background: "var(--bg-base)", border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)", outline: "none"
                  }} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5"
                  style={{ color: "var(--text-secondary)" }}>Classification</label>
                <select value={classification} onChange={e => setClassification(e.target.value)}
                  className="w-full px-3 py-2 rounded-md text-sm"
                  style={{
                    background: "var(--bg-base)", border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)", outline: "none"
                  }}>
                  <option>CONFIDENTIAL</option>
                  <option>INTERNAL</option>
                  <option>PUBLIC</option>
                  <option>RESTRICTED</option>
                </select>
              </div>

              <button
                onClick={handleGeneratePDF}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                style={{ background: "var(--accent)", color: "#fff" }}>
                {generating
                  ? <><Loader2 size={14} className="animate-spin" /> Generating PDF...</>
                  : <><Download size={14} /> Generate & Download PDF</>
                }
              </button>
            </>
          )}
        </div>

        {/* RIGHT: Live preview */}
        <div className="flex-1 p-5 overflow-hidden">
          {loadingAnalysis ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
                <Loader2 size={16} className="animate-spin" /> Loading preview...
              </div>
            </div>
          ) : (
            <ReportPreview
              analysisData={analysisData}
              analystName={analystName}
              organization={organization}
              classification={classification}
              upload={uploads.find(u => u.upload_id === selectedId) || null}
            />
          )}
        </div>
      </div>
    </AppShell>
  )
}
```

**handleGeneratePDF function:**
```tsx
const handleGeneratePDF = async () => {
  if (!analysisData || !selectedId) return
  setGenerating(true)
  try {
    const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    const res = await fetch(`${BASE}/report/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        upload_id:        selectedId,
        analyst_name:     analystName,
        organization:     organization,
        classification:   classification,
        narrative_report: analysisData.narrative_report,
        severity_overall: analysisData.severity_overall,
        ioc_summary:      analysisData.ioc_summary,
        attack_timeline:  analysisData.attack_timeline,
        total_incidents:  analysisData.total_incidents,
      }),
    })
    if (!res.ok) throw new Error("Failed")
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `incident_report_${selectedId}_${new Date().toISOString().slice(0,10)}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch {
    alert("PDF generation failed. Please try again.")
  } finally {
    setGenerating(false)
  }
}
```

---

## CHANGE 3 — FIX: Open Cached Analysis from Analysis Page, Upload Page, History Page

**Problem:** "Open" button in analysis list and "View" button in upload/history always re-routes to analysis page but the page doesn't load from DB cache — it shows empty unless `?run=true` is added.

**Root cause:** `runAnalysis()` only runs when `shouldRun === true`. When `shouldRun` is false and there's no session cache, it does nothing.

**Fix in `frontend/src/app/analysis/page.tsx`:**

Update the `useEffect` that triggers analysis to ALWAYS try loading from cache/DB first:

```tsx
useEffect(() => {
  if (!uploadId) return

  const tryLoadFromCache = async () => {
    // 1. Session cache
    const session = getSessionCache(parseInt(uploadId))
    if (session) {
      setResult(session)
      setFromCache(true)
      return
    }

    // 2. DB cache
    try {
      const saved = await api.getAnalysisResult(parseInt(uploadId))
      setResult(saved as AnalysisResult)
      setFromCache(true)
      setCachedAt(saved.analyzed_at)
      setSessionCache(parseInt(uploadId), saved as AnalysisResult)
      return
    } catch {
      // Not in DB
    }

    // 3. If run=true or no cache exists at all, run fresh
    if (shouldRun) {
      runAnalysis()
    }
    // If no cache and no run=true → show "Run Analysis" button (existing UI)
  }

  tryLoadFromCache()
}, [uploadId]) // only depends on uploadId, not shouldRun
```

**Fix in `frontend/src/app/upload/page.tsx` and `history/page.tsx`:**

"View" button must route with just `?upload_id=N` (no `run=true`). The analysis page will auto-load from DB.

```tsx
// View button — do NOT add &run=true
onClick={() => router.push(`/analysis?upload_id=${u.upload_id}`)}
```

---

## CHANGE 4 — FIX: Narrative Report Not Showing in Analysis Page and PDF

**Problem:** `narrative_report` from API response exists but does not render in UI or PDF.

### Fix in `frontend/src/app/analysis/page.tsx`:

Ensure split logic runs ONLY when result exists and narrative is non-empty:

```tsx
// Place this OUTSIDE JSX, directly in component body after result state
const narrativeRaw = result?.narrative_report ?? ""
let narrativeBody = narrativeRaw
let recommendation = ""

if (narrativeRaw && narrativeRaw.includes("Recommendation:")) {
  const idx = narrativeRaw.indexOf("Recommendation:")
  recommendation = narrativeRaw.slice(idx + "Recommendation:".length).trim()
  narrativeBody = narrativeRaw.slice(0, idx).trim()
}
```

Ensure narrative section renders correctly:
```tsx
{result && (
  <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
    <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
      Narrative Analysis
    </h3>

    {/* DEBUG: always show raw value if narrativeBody is empty */}
    {!narrativeBody && result.narrative_report && (
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
        {result.narrative_report}
      </p>
    )}

    {narrativeBody && (
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
        {narrativeBody}
      </p>
    )}

    {!narrativeBody && !result.narrative_report && (
      <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>
        No narrative available.
      </p>
    )}

    {recommendation && (
      <div className="mt-4 p-3 rounded-md border-l-4"
        style={{ borderColor: "var(--severity-high)", background: "rgba(255,140,66,0.08)" }}>
        <p className="text-xs font-semibold mb-1" style={{ color: "var(--severity-high)" }}>
          ⚠ Recommendation
        </p>
        <p className="text-sm" style={{ color: "var(--text-primary)" }}>{recommendation}</p>
      </div>
    )}
  </div>
)}
```

### Fix in `backend/app/routers/report.py`:

Narrative in PDF is empty because `analysis.get("narrative_report")` returns empty string or None when called from report endpoint. The issue is that `/report/` runs its own analysis call which may timeout or fail silently.

Since we now pass narrative in the request body, ensure `build_pdf` uses it correctly:

```python
# In build_pdf() function, ensure this line uses the passed data:
narrative = analysis.get("narrative_report") or ""

# Add explicit check and fallback
if not narrative:
    narrative = "Narrative analysis not available. Please re-run the analysis."
```

Also in `generate_report()` endpoint, ensure the request body narrative is passed through:
```python
@router.post("/")
async def generate_report(req: ReportRequest):
    # If narrative provided in request, use it directly — no analysis needed
    if req.narrative_report and req.attack_timeline is not None:
        analysis_dict = {
            "upload_id":        req.upload_id,
            "narrative_report": req.narrative_report,  # Use what was sent
            "severity_overall": req.severity_overall or "UNKNOWN",
            "ioc_summary":      req.ioc_summary or [],
            "attack_timeline":  req.attack_timeline or [],
            "total_incidents":  req.total_incidents or 0,
        }
    else:
        # Fallback: run analysis (slow path — avoid if possible)
        try:
            result = await analyze_log(AnalyzeRequest(upload_id=req.upload_id))
            analysis_dict = result.model_dump()
        except Exception as e:
            raise HTTPException(500, f"Analysis failed: {e}")

    pdf_bytes = build_pdf(analysis_dict, req)
    # ... return StreamingResponse ...
```

---

## CHANGE 5 — FIX: Analysis Continues When User Switches Tabs/Pages

**Problem:** When user navigates away from `/analysis` page during analysis, the loading state is lost. When they return, the horizontal timeline is gone and only a plain loading spinner shows.

**Root cause:** `loading` state and `elapsedMs` are local to the component. When component unmounts (page navigation), they reset to initial values.

**Solution:** Store analysis state in `analysisStore.ts` (module-level, persists across navigations).

### Update `frontend/src/lib/analysisStore.ts`:

Add elapsed time tracking:

```ts
export interface AnalysisJob {
  uploadId: number
  filename: string
  status: "running" | "done" | "error"
  progress: number
  result?: AnalysisResult
  error?: string
  startedAt: string      // ISO timestamp — use to recompute elapsed on re-mount
}

// Existing functions remain the same, just ensure startedAt is always set:
export function startAnalysisJob(uploadId: number, filename: string) {
  activeJob = {
    uploadId, filename, status: "running",
    progress: 0, startedAt: new Date().toISOString(),
  }
  dispatch()
}

// Add getter for elapsed time
export function getElapsedMs(): number {
  if (!activeJob || activeJob.status !== "running") return 0
  return Date.now() - new Date(activeJob.startedAt).getTime()
}
```

### Update `frontend/src/app/analysis/page.tsx`:

When component mounts, check if there's an active job in the store:

```tsx
import { startAnalysisJob, updateProgress, completeJob, failJob, getActiveJob, getElapsedMs } from "@/lib/analysisStore"

// In component body:
const [loading, setLoading] = useState(() => {
  // On mount, check if analysis is already running
  const job = getActiveJob()
  return job?.status === "running" && job.uploadId === parseInt(uploadId || "0")
})

const [elapsedMs, setElapsedMs] = useState(() => {
  const job = getActiveJob()
  if (job?.status === "running" && job.uploadId === parseInt(uploadId || "0")) {
    return getElapsedMs()
  }
  return 0
})

// Timer for horizontal timeline — restores from store if already running
useEffect(() => {
  if (!loading) {
    setElapsedMs(0)
    setProgressPercent(0)
    return
  }

  // Get base elapsed from store (in case we re-mounted mid-analysis)
  const baseElapsed = getElapsedMs()

  const timer = setInterval(() => {
    const total = baseElapsed + (Date.now() - mountTime)
    setElapsedMs(total)
    setProgressPercent(Math.min(95, Math.floor((total / 70000) * 95)))
  }, 200)

  return () => clearInterval(timer)
}, [loading])

// Track mount time for elapsed calculation
const mountTime = useRef(Date.now()).current
```

Also listen to store events to update loading state when analysis completes:

```tsx
useEffect(() => {
  const handler = (e: Event) => {
    const job = (e as CustomEvent).detail as AnalysisJob | null
    if (!job) return

    if (job.uploadId !== parseInt(uploadId || "0")) return

    if (job.status === "done" && job.result) {
      setLoading(false)
      setResult(job.result)
      setSessionCache(parseInt(uploadId!), job.result)
    } else if (job.status === "error") {
      setLoading(false)
      setError("Analysis failed. Please try again.")
    } else if (job.status === "running") {
      setLoading(true)
      setProgressPercent(job.progress)
    }
  }

  window.addEventListener("analysis-job-update", handler)
  return () => window.removeEventListener("analysis-job-update", handler)
}, [uploadId])
```

**Key point:** `runAnalysis()` must NOT set `setLoading(false)` on unmount — it continues in the background via the store. The component re-subscribes when it re-mounts.

Updated `runAnalysis()`:
```tsx
const runAnalysis = async () => {
  if (!uploadId) return

  setLoading(true)
  setError("")
  setResult(null)
  setFromCache(false)
  setElapsedMs(0)

  const uploads = await api.getUploads().catch(() => [])
  const upload = uploads.find(u => u.upload_id === parseInt(uploadId))
  const filename = upload?.filename || `upload_${uploadId}`

  startAnalysisJob(parseInt(uploadId), filename)

  const jobStartTime = Date.now()
  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - jobStartTime
    const simulated = Math.min(88, Math.floor((elapsed / 70000) * 88))
    updateProgress(simulated)
  }, 500)

  try {
    const data = await api.analyze(parseInt(uploadId))
    clearInterval(progressInterval)
    // Store handles notifying all listeners including this component
    completeJob(data)
    setSessionCache(parseInt(uploadId), data)
    // Component will update via the event listener above
  } catch (err) {
    clearInterval(progressInterval)
    failJob("Analysis failed")
    // Component will update via the event listener above
  }
  // NOTE: Do NOT call setLoading(false) here — handled by event listener
}
```

---

## CHANGE 6 — UPDATE: Analysis Progress Toast — Collapse to Bubble After 20 Seconds

**Problem:** Toast stays full-width permanently. Should collapse to a small circular bubble after 20 seconds.

**File:** `frontend/src/components/ui/AnalysisProgressToast.tsx`

**Behavior:**
- 0–20 seconds: show full toast (expanded) with filename, progress bar, percentage
- After 20 seconds: animate collapse to small circular bubble (like Messenger floating button)
- Bubble: 52px circle, fixed bottom-right OR top-right, shows circular progress %
- Hover bubble: expand back to full toast
- When done/error: brief full expand to show result, then auto-dismiss

**Implementation:**

```tsx
"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { AnalysisJob, getActiveJob } from "@/lib/analysisStore"

function CircularProgress({ percent, status }: { percent: number; status: string }) {
  const r = 20, circ = 2 * Math.PI * r
  const dash = circ - (circ * Math.min(percent, 100)) / 100
  const color = status === "done" ? "var(--severity-low)"
    : status === "error" ? "var(--severity-critical)"
    : "var(--accent)"
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
      <circle cx="26" cy="26" r={r} fill="none" stroke="white" strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
        transform="rotate(-90 26 26)"
        style={{ transition: "stroke-dashoffset 0.4s ease" }} />
      <text x="26" y="31" textAnchor="middle" fontSize="11" fill="white" fontWeight="700">
        {status === "done" ? "✓" : status === "error" ? "✗" : `${percent}%`}
      </text>
    </svg>
  )
}

export default function AnalysisProgressToast() {
  const [job, setJob] = useState<AnalysisJob | null>(() => getActiveJob())
  const [dismissed, setDismissed] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [hovered, setHovered] = useState(false)
  const collapseTimerRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as AnalysisJob | null
      setJob(detail)
      if (detail) {
        setDismissed(false)
        setCollapsed(false)
        // Start collapse timer — collapse after 20 seconds
        if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
        if (detail.status === "running") {
          collapseTimerRef.current = setTimeout(() => setCollapsed(true), 20000)
        }
        // When done — expand briefly then auto-dismiss
        if (detail.status === "done" || detail.status === "error") {
          setCollapsed(false)
          if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
        }
      } else {
        if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
      }
    }
    window.addEventListener("analysis-job-update", handler)
    return () => {
      window.removeEventListener("analysis-job-update", handler)
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
    }
  }, [])

  if (!job || dismissed) return null

  const bgColor = job.status === "done" ? "var(--severity-low)"
    : job.status === "error" ? "var(--severity-critical)"
    : "var(--accent)"

  // COLLAPSED STATE — circular bubble
  if (collapsed && !hovered) {
    return (
      <div
        className="fixed bottom-6 right-6 z-[9999] cursor-pointer"
        style={{
          width: 56, height: 56, borderRadius: "50%",
          background: bgColor,
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          transition: "all 0.3s ease",
        }}
        onClick={() => {
          if (job.status === "done" && job.result) {
            router.push(`/analysis?upload_id=${job.uploadId}`)
          }
          setCollapsed(false)
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={`Analyzing ${job.filename} — ${job.progress}%`}
      >
        <CircularProgress percent={job.progress} status={job.status} />
      </div>
    )
  }

  // EXPANDED STATE — full toast
  return (
    <div
      className="fixed z-[9999] rounded-xl shadow-2xl overflow-hidden"
      style={{
        bottom: collapsed ? 24 : "auto",
        right: 16,
        top: collapsed ? "auto" : 16,
        minWidth: 280,
        maxWidth: 360,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        transition: "all 0.3s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Accent top bar */}
      <div className="h-1" style={{ background: bgColor }} />

      <div className="flex items-center gap-3 px-4 py-3">
        {/* Circular progress */}
        <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: bgColor }}>
          <svg width="36" height="36" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="13" fill="none"
              stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
            <circle cx="18" cy="18" r="13" fill="none"
              stroke="white" strokeWidth="2.5"
              strokeDasharray={2 * Math.PI * 13}
              strokeDashoffset={2 * Math.PI * 13 * (1 - job.progress / 100)}
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
              style={{ transition: "stroke-dashoffset 0.4s ease" }} />
            <text x="18" y="22" textAnchor="middle" fontSize="8"
              fill="white" fontWeight="700">
              {job.status === "done" ? "✓"
                : job.status === "error" ? "✗"
                : `${job.progress}%`}
            </text>
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0"
          onClick={() => {
            if (job.status === "done") {
              router.push(`/analysis?upload_id=${job.uploadId}`)
            }
          }}
          style={{ cursor: job.status === "done" ? "pointer" : "default" }}>
          <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {job.status === "done" ? "✓ Analysis complete!"
              : job.status === "error" ? "✗ Analysis failed"
              : "Analyzing..."}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
            {job.filename}
            {job.status === "done" ? " · Click to view results" : ""}
          </p>
          {job.status === "running" && (
            <div className="mt-1.5 h-0.5 rounded-full overflow-hidden"
              style={{ background: "var(--border-subtle)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${job.progress}%`, background: bgColor }} />
            </div>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={(e) => { e.stopPropagation(); setDismissed(true) }}
          className="flex-shrink-0 p-1 rounded transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
```

---

## IMPLEMENTATION ORDER

```
1. backend/app/models/schemas.py     — ensure AnalysisResultDB exists
2. backend/app/routers/analyze.py    — ensure auto-save + /history + /result endpoints
3. backend/app/routers/report.py     — fix narrative passthrough
4. Run init_db + pm2 restart dfa-backend

5. frontend/src/lib/analysisStore.ts  — add getElapsedMs()
6. frontend/src/lib/cache.ts          — ensure exists with getSessionCache/setSessionCache
7. frontend/src/lib/api.ts            — ensure getAnalysisHistory/getAnalysisResult exist

8. frontend/src/components/ui/AnalysisProgressToast.tsx  — collapse to bubble after 20s
9. frontend/src/components/layout/AppShell.tsx           — ensure toast is included

10. frontend/src/app/analysis/page.tsx   — DB load on mount, persist loading across nav
11. frontend/src/app/report/page.tsx     — no re-analysis, live preview, narrative fix
12. frontend/src/app/upload/page.tsx     — view button no run=true, export PDF fix
13. frontend/src/app/history/page.tsx    — view button no run=true
14. frontend/src/app/dashboard/page.tsx  — export PDF fix

15. npm run build   — must be zero errors
16. pm2 restart dfa-frontend
```

---

## FINAL VERIFICATION

```bash
# Backend checks
curl http://localhost:8000/analyze/history
curl http://localhost:8000/analyze/result/1
curl http://localhost:8000/openapi.json | python3 -m json.tool | grep -E "history|result"

# Frontend build
cd /home/dfa-admin/ai-forensics-assistant/frontend
npm run build

# Restart
pm2 restart dfa-frontend
pm2 list

# Functional tests:
# 1. Run analysis for upload #1
curl -X POST "http://localhost:8000/analyze/" -H "Content-Type: application/json" -d '{"upload_id": 1}'

# 2. Check it saved to DB
curl http://localhost:8000/analyze/result/1 | python3 -m json.tool | grep narrative_report

# 3. Open browser: http://103.87.66.30:3000/analysis
#    → should show list of past analyses

# 4. Click Open on upload #1
#    → should load immediately from DB, no re-analysis

# 5. Go to /report
#    → select upload #1
#    → preview should show immediately (from DB)
#    → narrative should be visible in preview
#    → Generate PDF should be fast (no re-analysis)

# 6. Start analysis for upload #2 (from History or Upload page)
#    → navigate to Dashboard while loading
#    → toast should remain visible
#    → after 20 seconds, toast collapses to circular bubble
#    → return to /analysis?upload_id=2
#    → horizontal timeline still shows, not a plain spinner
```

---

## VERIFICATION CHECKLIST

- [ ] `analysis_results` table exists in PostgreSQL
- [ ] `/analyze/history` returns array
- [ ] `/analyze/result/{id}` returns saved data including `narrative_report`
- [ ] `/analysis` page (no upload_id) shows list of past analyses from DB
- [ ] `/analysis?upload_id=1` loads from DB without re-analyzing (fast)
- [ ] `/analysis?upload_id=1&run=true` force runs fresh analysis
- [ ] Narrative report visible in analysis page result
- [ ] Narrative report visible in generated PDF
- [ ] Report page shows live preview when upload is selected
- [ ] Report page does NOT call `/analyze/` (uses cached data only)
- [ ] Report page PDF downloads immediately with correct content
- [ ] View button in Upload/History loads from DB cache (no re-analysis)
- [ ] Export PDF in Dashboard/Upload uses cached data
- [ ] Analysis toast collapses to circular bubble after 20 seconds
- [ ] Bubble shows progress percentage
- [ ] Hover bubble → expand to full toast
- [ ] Navigate away during analysis → toast/bubble persists
- [ ] Return to analysis page → horizontal timeline still shows (not lost)
- [ ] `npm run build` → zero TypeScript errors
