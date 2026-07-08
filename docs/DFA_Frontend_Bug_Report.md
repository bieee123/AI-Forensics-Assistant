# DFA Frontend Bug Report & Fix Recommendations

## Summary
A comprehensive audit of the Next.js 15 frontend and FastAPI backend codebases was conducted to resolve key outstanding issues. Five primary bugs were identified, ranging from CORS configurations and URL binding mismatches to Next.js client-side routing race conditions and unregistered routers. Highly surgical, line-exact fixes have been designed for each issue.

---

## Bug 1: `POST /analyze/` returns 404 from the Browser
**Files:** `backend/app/main.py`, `frontend/src/lib/api.ts`
**Severity:** Critical
**Root Cause:** 
1. **Invalid CORS Configuration:** In `backend/app/main.py`, `allow_origins=["*"]` is combined with `allow_credentials=True`. Starlette/FastAPI rejects this combination and throws a `ValueError` on startup. In the browser, this causes preflight CORS validation to fail or prevents requests from executing correctly.
2. **Build-Time Environment Variable Baking:** Next.js bakes `process.env.NEXT_PUBLIC_API_URL` into the frontend bundles during `npm run build` at build-time. Since `frontend/.env.local` defaults to `http://localhost:8000`, browser clients running from remote networks make API calls to their own `localhost`, which returns a `404` or connection failure.
3. **Fallback URL Mismatch:** In `frontend/src/lib/api.ts`, the default fallback for `BASE` is hardcoded to `http://localhost:8000`.

**Why It Happens:**
The browser attempts to request a backend on the client machine instead of the remote VPS, and CORS headers are rejected by the browser because of the wild-card origin combined with credentials.

**Current Code (`backend/app/main.py` lines 12-18):**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Current Code (`frontend/src/lib/api.ts` lines 1-10):**
```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}
```

**Fixed Code (`backend/app/main.py` lines 12-18):**
Set `allow_credentials=False` (since authentication is token/cookie-free for these public API endpoints), or list explicit origins.
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Fixed Code (`frontend/src/lib/api.ts` lines 1-10):**
Resolve the VPS IP dynamically if no environment variable is provided, preventing hardcoded `localhost` issues:
```typescript
const BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_URL || window.location.origin.replace(":3000", ":8000"))
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}
```

---

## Bug 2: Analysis Page Does Not Auto-Trigger on Client-Side Routing
**File:** `frontend/src/app/analysis/page.tsx`
**Severity:** High
**Root Cause:**
Next.js 15 client-side navigation preserves the layout and page component state instead of destroying and remounting it. Because `uploadId` and `shouldRun` are derived values from the `useSearchParams()` hook on render, the component does not re-initialize its local states (`loading = false`, `result = null`, `error = ""`) when the user clicks the "Analyze" button, causing the `useEffect` to either get skipped or run on stale state.

**Why It Happens:**
The `useEffect` dependency array only listens to `[uploadId, shouldRun]`. When client-side routing transitions occur, React state is preserved, and the transition might bypass the mount cycle needed to trigger the query.

**Current Code (`frontend/src/app/analysis/page.tsx` lines 292-298):**
```tsx
export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="empty-state"><span>Loading...</span></div></div>}>
      <AnalysisPageContent />
    </Suspense>
  );
}
```

**Fixed Code (`frontend/src/app/analysis/page.tsx` lines 292-306):**
Introduce `AnalysisPageWrapper` and supply a dynamic React `key` to the `AnalysisPageContent` component based on `upload_id` and `run` query parameters. This forces React to unmount the old instance and mount a fresh one with reset states and trigger the mount `useEffect`:
```tsx
import { useState, useEffect, Suspense, useCallback } from "react"; // Update import at top

// Add wrapper above AnalysisPage
function AnalysisPageWrapper() {
  const searchParams = useSearchParams();
  const uploadId = searchParams.get("upload_id") || "";
  const run = searchParams.get("run") || "";
  return <AnalysisPageContent key={`${uploadId}-${run}`} />;
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="empty-state"><span>Loading...</span></div></div>}>
      <AnalysisPageWrapper />
    </Suspense>
  );
}
```
*Note: Also wrap `runAnalysis` in `useCallback` to satisfy lint checks.*

---

## Bug 3: Timeline Page Does Not Load Events After Selecting an Upload
**File:** `frontend/src/app/timeline/page.tsx`
**Severity:** High
**Root Cause:**
1. **Bypassing router state:** The page updates the query parameters via `window.history.replaceState` which does not update Next.js's router context, leading to desynchronization.
2. **Missing State Sync:** `activeUploadId` is a local state initialized once from the initial search params. When client-side routing occurs, the state is never synced.
3. **Conditional uploads fetch:** Upload list is only fetched when the page loads with no `initialUploadId`. If the page is loaded directly with `?upload_id=X`, `uploads` remains empty, making `selectedUpload` undefined, resulting in a blank header subtitle.

**Why It Happens:**
Direct DOM URL manipulations and state/prop synchronization issues prevent the page from reacting to the selected upload ID.

**Current Code (`frontend/src/app/timeline/page.tsx` lines 11-62):**
```tsx
function TimelinePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialUploadId = searchParams.get("upload_id");

  const [lang, setLangState] = useState<Lang>("en");
  const [activeUploadId, setActiveUploadId] = useState<number | null>(initialUploadId ? parseInt(initialUploadId) : null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [uploads, setUploads] = useState<UploadType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  
  // ... i18n hooks ...

  // Fetch recent uploads for the picker
  useEffect(() => {
    if (!initialUploadId) {
      api.getUploads().then(setUploads).catch(() => {});
    }
  }, [initialUploadId]);

  // Fetch entries when activeUploadId changes
  useEffect(() => {
    if (activeUploadId) {
      setLoading(true);
      setError("");
      setEntries([]);
      api.getEntries(activeUploadId)
        .then(data => setEntries(data))
        .catch(() => setError("Failed to load timeline"))
        .finally(() => setLoading(false));
    }
  }, [activeUploadId]);

  const selectUpload = (id: number) => {
    setActiveUploadId(id);
    // Update URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.set("upload_id", String(id));
    window.history.replaceState({}, "", url.toString());
  };

  const selectedUpload = uploads.find(u => u.upload_id === activeUploadId);
```

**Fixed Code (`frontend/src/app/timeline/page.tsx` lines 11-58):**
Derive the active upload ID directly from search params, use `router.replace` for URL updates, and fetch uploads unconditionally on mount:
```tsx
function TimelinePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uploadIdParam = searchParams.get("upload_id");
  const activeUploadId = uploadIdParam ? parseInt(uploadIdParam) : null;

  const [lang, setLangState] = useState<Lang>("en");
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [uploads, setUploads] = useState<UploadType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // ... i18n hooks ...

  // Fetch recent uploads unconditionally on mount
  useEffect(() => {
    api.getUploads().then(setUploads).catch(() => {});
  }, []);

  // Fetch entries when activeUploadId changes
  useEffect(() => {
    if (activeUploadId) {
      setLoading(true);
      setError("");
      setEntries([]);
      api.getEntries(activeUploadId)
        .then(data => setEntries(data))
        .catch(() => setError("Failed to load timeline"))
        .finally(() => setLoading(false));
    }
  }, [activeUploadId]);

  const selectUpload = (id: number) => {
    router.replace(`/timeline?upload_id=${id}`);
  };

  const selectedUpload = uploads.find(u => u.upload_id === activeUploadId);
```

---

## Bug 4: Report Page Uses Dummy Data Instead of `/report` Endpoint
**Files:** `backend/app/main.py`, `frontend/src/lib/api.ts`, `frontend/src/app/report/page.tsx`
**Severity:** Medium
**Root Cause:**
1. The Report router (`backend/app/routers/report.py`) is written but never imported or registered with `app.include_router()` in the main backend launcher (`backend/app/main.py`).
2. The Report page (`frontend/src/app/report/page.tsx`) uses static placeholder layouts instead of querying available uploads and calling the backend endpoint.

**Why It Happens:**
The feature was left unimplemented on the frontend and unregistered on the backend.

**Fixed Code (`backend/app/main.py` lines 3 & 23):**
Register the router on the main FastAPI application:
```diff
-from app.routers import upload, logs, analyze, acquire
+from app.routers import upload, logs, analyze, acquire, report

...

 app.include_router(upload.router,   prefix="/upload",   tags=["upload"])
 app.include_router(logs.router,     prefix="/logs",     tags=["logs"])
 app.include_router(analyze.router,  prefix="/analyze",  tags=["analyze"])
 app.include_router(acquire.router,  prefix="/acquire",  tags=["acquire"])
+app.include_router(report.router,   prefix="/report",   tags=["report"])
```

**Fixed Code (`frontend/src/lib/api.ts` line 34):**
Add the API client call:
```typescript
  getArtifacts: () => req<Artifact[]>("/acquire/artifacts"),
  generateReport: (data: { upload_id: number; analyst_name?: string; organization?: string; classification?: string }) =>
    fetch(`${BASE}/report/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    }),
};
```

**Fixed Code (`frontend/src/app/report/page.tsx`):**
Refactor the Report Page to load the uploads list dynamically, allow selecting an upload, fill in metadata fields, and download the actual generated PDF:
```tsx
"use client";
import { useState, useEffect } from "react";
import { Download, FileText, Loader2, AlertCircle } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { getLang, t, Lang } from "@/lib/i18n";
import { api, Upload } from "@/lib/api";

export default function ReportPage() {
  const [lang, setLangState] = useState<Lang>("en");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string>("");
  const [title, setTitle] = useState("Incident Triage Report");
  const [caseRef, setCaseRef] = useState("LTI-CASE-2026-0142");
  const [preparedBy, setPreparedBy] = useState("analyst01");
  const [classification, setClassification] = useState("CONFIDENTIAL");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setLangState(getLang()); }, []);
  useEffect(() => {
    const handler = () => setLangState(getLang());
    window.addEventListener("lang-change", handler);
    return () => window.removeEventListener("lang-change", handler);
  }, []);

  useEffect(() => {
    api.getUploads()
      .then(data => {
        setUploads(data);
        if (data.length > 0) {
          setSelectedUploadId(String(data[0].upload_id));
        }
      })
      .catch(() => setError("Failed to load uploads"));
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedUploadId) {
      setError("Please select an upload first");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const blob = await api.generateReport({
        upload_id: parseInt(selectedUploadId),
        analyst_name: preparedBy,
        organization: "PT Teknologi Nasional Indonesia Siber",
        classification: classification,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `incident_report_upload_${selectedUploadId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to generate PDF report.");
    } finally {
      setGenerating(false);
    }
  };

  const tr = t(lang);

  return (
    <AppShell>
      <PageHeader title={tr.report.title} subtitle={tr.report.subtitle} />
      <div className="p-6">
        <div className="grid gap-4" style={{ gridTemplateColumns: "60% 40%" }}>
          {/* Report Metadata */}
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
            <div className="font-semibold text-[13px] text-text-primary mb-3.5">{tr.report.reportMetadata}</div>

            {error && (
              <div className="flex items-center gap-2 text-xs mb-3.5 p-2.5 rounded-md" style={{ background: "rgba(255,77,106,0.1)", color: "var(--severity-critical)" }}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Target Upload Log
            </label>
            <select
              value={selectedUploadId}
              onChange={e => setSelectedUploadId(e.target.value)}
              className="w-full mb-3"
              style={{ fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px", outline: "none" }}
            >
              {uploads.map(u => (
                <option key={u.upload_id} value={u.upload_id}>
                  #{u.upload_id} - {u.filename} ({u.total_entries.toLocaleString()} entries)
                </option>
              ))}
            </select>

            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
              {tr.report.reportTitle}
            </label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="mb-3" />

            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
              {tr.report.caseRef}
            </label>
            <input type="text" className="font-mono mb-3" value={caseRef} onChange={e => setCaseRef(e.target.value)} />

            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
              {tr.report.preparedBy}
            </label>
            <input type="text" value={preparedBy} onChange={e => setPreparedBy(e.target.value)} className="mb-3" />

            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Classification
            </label>
            <select
              value={classification}
              onChange={e => setClassification(e.target.value)}
              className="w-full mb-4.5"
              style={{ fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px", outline: "none" }}
            >
              <option value="UNCLASSIFIED">UNCLASSIFIED</option>
              <option value="RESTRICTED">RESTRICTED</option>
              <option value="CONFIDENTIAL">CONFIDENTIAL</option>
              <option value="SECRET">SECRET</option>
            </select>

            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium cursor-pointer border-none"
              style={{ background: generating ? "var(--text-muted)" : "var(--accent)", color: "#fff", opacity: generating ? 0.7 : 1 }}
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              {generating ? "Generating..." : tr.report.generateReport}
            </button>
          </div>

          {/* Preview Box */}
          <div className="bg-bg-elevated border border-border-subtle rounded-lg self-start">
            <div className="px-5 py-4 border-b border-border-subtle font-semibold text-[13px] text-text-primary">
              {tr.report.preview}
            </div>
            <div className="p-5">
              <div className="font-bold text-sm mb-0.5">{title}</div>
              <div className="text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>
                {caseRef} · {tr.report.generatedLabel} (Real-time Preview)
              </div>
              <div className="text-[12.5px] mb-3.5" style={{ color: "var(--text-secondary)" }}>
                Metadata and selected upload logs will be formatted into a publication-quality PDF report including the Executive Summary, Narrative Analysis, extracted Indicators of Compromise (IoC), and incident Timeline.
              </div>
              <div className="wire-note text-[11px] italic" style={{ color: "var(--text-muted)" }}>
                Prepared by: {preparedBy} | Classification: {classification}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
```

---

## Bug 5: Artifact Acquisition Private Key Integration
**File:** `backend/app/routers/acquire.py`
**Severity:** Medium
**Root Cause:**
The frontend passes the raw content of the SSH private key (pasted into the textarea) as `private_key_path`. The backend passes this raw string directly to paramiko's `key_filename` parameter, which expects a path to a file on disk. This causes a `FileNotFoundError` or connection exception.

**Why It Happens:**
Paramiko expects a filename path for private keys loaded via file path, but gets a multi-line key string instead.

**Current Code (`backend/app/routers/acquire.py` lines 65-72):**
```python
        if request.private_key_path:
            connect_kwargs["key_filename"] = request.private_key_path
        elif request.password:
            connect_kwargs["password"] = request.password
        else:
            raise HTTPException(status_code=400, detail="Either password or private_key_path is required")
```

**Fixed Code (`backend/app/routers/acquire.py` lines 65-82):**
Inspect the string for the private key header. If present, load the key dynamically using Paramiko's key parser and pass it as the `pkey` parameter:
```python
        if request.private_key_path:
            if "-----BEGIN" in request.private_key_path:
                import io
                from paramiko import RSAKey, DSSKey, ECDSAKey, Ed25519Key
                pkey = None
                key_errors = []
                for key_class in (RSAKey, Ed25519Key, ECDSAKey, DSSKey):
                    try:
                        pkey = key_class.from_private_key(io.StringIO(request.private_key_path), password=request.password)
                        break
                    except Exception as e:
                        key_errors.append(f"{key_class.__name__}: {str(e)}")
                if not pkey:
                    raise HTTPException(status_code=400, detail=f"Invalid SSH private key format or passphrase. Errors: {'; '.join(key_errors)}")
                connect_kwargs["pkey"] = pkey
            else:
                connect_kwargs["key_filename"] = request.private_key_path
        elif request.password:
            connect_kwargs["password"] = request.password
        else:
            raise HTTPException(status_code=400, detail="Either password or private_key_path is required")
```

---

## Additional Issues Found

1. **Hardcoded Ports and Base URLs:** `frontend/src/lib/api.ts` falls back to `http://localhost:8000`. The build script `deploy.sh` does not inject or prompt for the public API URL, baking `localhost:8000` into Next.js in production builds. 
2. **Missing `report` router import:** `backend/app/routers/report.py` has no entry in `backend/app/routers/__init__.py`, making wildcard imports less predictable. It should be explicitly imported in `main.py`.

---

## Files That Look Correct
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/app/upload/page.tsx`
- `frontend/src/app/history/page.tsx`
- `frontend/src/lib/i18n.ts`
- `frontend/src/lib/utils.ts`
- `frontend/src/components/layout/AppShell.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/middleware.ts`
- `frontend/next.config.ts`
- `backend/app/routers/logs.py`
- `backend/app/routers/upload.py`
- `backend/app/routers/analyze.py`
- `backend/app/models/schemas.py`
- `backend/app/config.py`

---

## Bug 6: Backend Fails to Start — `ModuleNotFoundError: No module named 'langchain_ollama'`
**File:** `backend/requirements.txt`, VPS `backend/venv/`
**Severity:** Critical
**Root Cause:**
`langchain-ollama==1.1.0` is listed in `requirements.txt` but was not installed in the VPS Python virtual environment (`venv`). This prevents the backend from starting entirely, making all API calls fail.

**How to Fix (on VPS):**
```bash
cd ~/ai-forensics-assistant/backend
source venv/bin/activate
pip install -r requirements.txt
```

Or install individually:
```bash
pip install langchain-ollama==1.1.0
```

**Verify:**
```bash
python -c "from langchain_ollama import OllamaLLM, OllamaEmbeddings; print('OK')"
```

---

## Bug 7: Report Page Triggers Double LLM Invocation (Slow + Timeout Risk)
**Files:** `frontend/src/app/report/page.tsx`, `frontend/src/lib/api.ts`, `backend/app/routers/report.py`
**Severity:** Medium
**Root Cause:**
When the Report page calls `POST /report/` without providing `narrative_report`, the backend's `generate_report` handler calls `analyze_log()` internally, triggering a **second full LLM analysis** via Ollama. This causes:
- Very long wait times (LLM runs twice for the same upload)
- Higher risk of timeout errors on the frontend (`Failed to generate PDF report`)
- Resource exhaustion on VPS running small Ollama models

**Fixed Flow:**
The Report page now runs the LLM analysis first via `api.analyze()`, then immediately passes the returned fields (`narrative_report`, `severity_overall`, `ioc_summary`, `attack_timeline`, `total_incidents`) directly to `api.generateReport()`. The backend skips the internal re-analysis because `narrative_report` is present.

**Fixed Code (`frontend/src/app/report/page.tsx`):**
```typescript
const handleGenerateReport = async () => {
  // Step 1: Run analysis to get pre-computed data
  setStatusMsg("Running forensic analysis...");
  const analysis = await api.analyze(parseInt(selectedUploadId));

  // Step 2: Pass results directly — avoids double LLM call on backend
  setStatusMsg("Generating PDF report...");
  const blob = await api.generateReport({
    upload_id: parseInt(selectedUploadId),
    analyst_name: preparedBy,
    organization: "PT Teknologi Nasional Indonesia Siber",
    classification: classification,
    narrative_report: analysis.narrative_report,
    severity_overall: analysis.severity_overall,
    ioc_summary: analysis.ioc_summary,
    attack_timeline: analysis.attack_timeline,
    total_incidents: analysis.total_incidents,
  });
  // ... download blob
};
```

**Updated `api.ts` Signature:**
```typescript
generateReport: (data: {
  upload_id: number;
  analyst_name?: string;
  organization?: string;
  classification?: string;
  narrative_report?: string;     // ← NEW: pass pre-computed analysis
  severity_overall?: string;
  ioc_summary?: string[];
  attack_timeline?: Record<string, unknown>[];
  total_incidents?: number;
}) => fetch(`${BASE}/report/`, { ... })
```

