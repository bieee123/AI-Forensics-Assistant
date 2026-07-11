# AGENT TASK — Verify & Debug Implementation from AGENT_UPDATE_SPEC_V2_1.md
## Agentic AI Digital Forensics Assistant

---

## YOUR ROLE

You are a senior engineer doing a **post-implementation audit**. A previous AI agent was given `AGENT_UPDATE_SPEC_V2_1.md` and claimed to implement all changes. Your job is to:

1. **Verify what was actually implemented** (read every file that should have changed)
2. **Identify what is missing or wrong**
3. **Implement the missing parts yourself**
4. **Build and verify the result**

Do NOT trust that anything was done. Verify everything from scratch by reading the actual files.

---

## CONTEXT

- **Frontend:** Next.js 15, running at `http://103.87.66.30:3000` via pm2 (`dfa-frontend`)
- **Backend:** FastAPI, running at `http://103.87.66.30:8000` via pm2 (`dfa-backend`)
- **Project root:** `/home/dfa-admin/ai-forensics-assistant/`
- **Frontend root:** `/home/dfa-admin/ai-forensics-assistant/frontend/src/`
- **Backend root:** `/home/dfa-admin/ai-forensics-assistant/backend/app/`

---

## STEP 1 — VERIFY BACKEND CHANGES

### 1a. Check if `analysis_results` table exists in database
```bash
sudo -u postgres psql -d forensics_db -c "\dt"
sudo -u postgres psql -d forensics_db -c "\d analysis_results"
```

**Expected:** Table `analysis_results` exists with columns: `id, upload_id, filename, severity, total_incidents, narrative_report, ioc_summary, attack_timeline, analyzed_at, analysis_duration_seconds`

**If missing:** The backend model was not updated. Implement it now (see Section IMPLEMENT MISSING BACKEND below).

### 1b. Check if new API endpoints exist
```bash
curl http://localhost:8000/analyze/history
curl http://localhost:8000/analyze/result/1
curl http://localhost:8000/openapi.json | python3 -m json.tool | grep -E "history|result"
```

**Expected:**
- `/analyze/history` → returns JSON array (may be empty `[]`)
- `/analyze/result/1` → returns 200 with data OR 404 (not 404 on the endpoint itself — only on missing data)
- openapi.json should list both endpoints

**If missing:** The analyze router was not updated. Implement it now.

### 1c. Check if analyze endpoint auto-saves to DB
```bash
# Run a fresh analysis and check if it saves to DB
curl -X POST "http://localhost:8000/analyze/" \
  -H "Content-Type: application/json" \
  -d '{"upload_id": 1}'

# Then check if it was saved
curl http://localhost:8000/analyze/result/1
curl http://localhost:8000/analyze/history
```

**Expected:** After running `/analyze/`, calling `/analyze/result/1` returns the saved result.

---

## STEP 2 — VERIFY FRONTEND FILES EXIST

Check each file that should have been created or modified:

### New files (should exist):
```bash
ls -la frontend/src/lib/cache.ts
ls -la frontend/src/lib/analysisStore.ts
ls -la frontend/src/components/ui/AnalysisProgressToast.tsx
```

### Modified files (check they contain the new code):
```bash
# Check cache.ts has sessionCache (not localStorage)
grep -n "sessionCache\|Map\|in-memory" frontend/src/lib/cache.ts

# Check analysisStore.ts has startAnalysisJob function
grep -n "startAnalysisJob\|activeJob\|analysis-job-update" frontend/src/lib/analysisStore.ts

# Check AnalysisProgressToast.tsx has CircularProgress
grep -n "CircularProgress\|analysis-job-update\|fixed top-4 right-4" frontend/src/components/ui/AnalysisProgressToast.tsx

# Check AppShell imports and uses the toast
grep -n "AnalysisProgressToast" frontend/src/components/layout/AppShell.tsx

# Check analysis page uses DB cache
grep -n "getAnalysisResult\|getAnalysisHistory\|startAnalysisJob\|elapsedMs\|historyItems" frontend/src/app/analysis/page.tsx

# Check timeline page has no card wrapper
grep -n "Select an upload\|space-y-1\|bg-bg-elevated" frontend/src/app/timeline/page.tsx | head -10

# Check dashboard has handleExportPDF
grep -n "handleExportPDF\|exportingId\|FileDown" frontend/src/app/dashboard/page.tsx

# Check upload page has handleExportPDF
grep -n "handleExportPDF\|exportingId\|FileDown" frontend/src/app/upload/page.tsx

# Check api.ts has new endpoints
grep -n "getAnalysisHistory\|getAnalysisResult\|deleteAnalysisResult" frontend/src/lib/api.ts
```

---

## STEP 3 — FOR EACH MISSING ITEM, IMPLEMENT IT NOW

Read the spec below and implement whatever is missing. The spec is the source of truth.

---

## SPEC REFERENCE — What Must Exist

### Backend: `backend/app/models/schemas.py`
Must contain `AnalysisResultDB` class with these columns:
- `id` (Integer, primary key)
- `upload_id` (Integer, unique, indexed)
- `filename` (String)
- `severity` (String)
- `total_incidents` (Integer)
- `narrative_report` (Text)
- `ioc_summary` (Text — JSON string)
- `attack_timeline` (Text — JSON string)
- `analyzed_at` (DateTime)
- `analysis_duration_seconds` (Integer, nullable)

And helper function `save_analysis_result(db, upload_id, filename, result_dict, duration)`.

### Backend: `backend/app/routers/analyze.py`
Must contain these endpoints:
- `POST /` — existing, but now also calls `save_analysis_result()` after analysis
- `GET /history` — returns list of all `AnalysisResultDB` records
- `GET /result/{upload_id}` — returns single saved result
- `DELETE /result/{upload_id}` — deletes saved result

### Frontend: `frontend/src/lib/cache.ts`
In-memory session cache using `Map`. NOT localStorage.
Functions: `getSessionCache(id)`, `setSessionCache(id, result)`, `clearSessionCache(id)`

### Frontend: `frontend/src/lib/analysisStore.ts`
Module-level `activeJob` variable. Functions: `startAnalysisJob`, `updateProgress`, `completeJob`, `failJob`, `getActiveJob`.
Dispatches `CustomEvent("analysis-job-update")` on every change.

### Frontend: `frontend/src/components/ui/AnalysisProgressToast.tsx`
- Fixed position: `top-4 right-4 z-[9999]`
- SVG circular progress indicator
- Shows filename, percentage, status
- Listens to `analysis-job-update` window event
- Dismiss button (X)
- Click → navigate to analysis result

### Frontend: `frontend/src/components/layout/AppShell.tsx`
Must import and render `<AnalysisProgressToast />` inside the layout.

### Frontend: `frontend/src/app/analysis/page.tsx`
Must have ALL of these:
1. **DB cache check** before running fresh analysis (`api.getAnalysisResult()`)
2. **Session cache check** (`getSessionCache()`) before DB check
3. **`startAnalysisJob()` call** when starting fresh analysis
4. **Progress simulation** with `setInterval` updating `updateProgress()`
5. **`completeJob()`/`failJob()` call** after analysis finishes
6. **Horizontal loading timeline** (4 steps with dots and connector line)
7. **`elapsedMs` state** and timer `useEffect` for driving the horizontal timeline
8. **History list** when no `upload_id` in URL (from `api.getAnalysisHistory()`)
9. **Cache indicator badge** showing "Saved · [date]" when result is from DB
10. **Narrative section** that always renders when `result.narrative_report` exists
11. **Recommendation split** correctly separating narrative from "Recommendation:"

### Frontend: `frontend/src/app/timeline/page.tsx`
Upload picker must NOT use a card wrapper (`bg-bg-elevated`, `border`, etc.).
Must be plain rows with hover effect only.

### Frontend: `frontend/src/app/dashboard/page.tsx` and `upload/page.tsx`
Export button must:
1. Check session cache → check DB (`/analyze/result/{id}`) → run fresh analysis if neither
2. Then call `POST /report/` with full analysis data
3. Download the PDF blob automatically
4. Show loading state (`Loader2` spinner + "Generating..." text) while working

### Frontend: `frontend/src/lib/api.ts`
Must export these new functions:
- `api.getAnalysisHistory()` → `GET /analyze/history`
- `api.getAnalysisResult(id)` → `GET /analyze/result/{id}`
- `api.deleteAnalysisResult(id)` → `DELETE /analyze/result/{id}`

And new TypeScript interfaces:
- `AnalysisHistoryItem`
- `SavedAnalysisResult`

---

## STEP 4 — BUILD AND VERIFY

After implementing all missing parts:

```bash
# 1. Restart backend
pm2 restart dfa-backend
sleep 3

# 2. Verify backend endpoints
curl http://localhost:8000/analyze/history
curl http://localhost:8000/openapi.json | python3 -m json.tool | grep -E '"/analyze'

# 3. Run init_db to create new table if missing
cd /home/dfa-admin/ai-forensics-assistant/backend
source ../venv/bin/activate
python -c "from app.models.schemas import init_db; init_db(); print('OK')"

# 4. Build frontend
cd /home/dfa-admin/ai-forensics-assistant/frontend
npm run build
# MUST show: ✓ Compiled successfully
# MUST show: zero TypeScript errors

# 5. Restart frontend
pm2 restart dfa-frontend
sleep 3

# 6. Verify both running
pm2 list
```

---

## STEP 5 — FUNCTIONAL TEST

After build succeeds, test each feature:

```bash
# Test 1: Backend saves analysis to DB
curl -X POST "http://localhost:8000/analyze/" \
  -H "Content-Type: application/json" \
  -d '{"upload_id": 1}' > /dev/null

curl http://localhost:8000/analyze/result/1 | python3 -m json.tool | head -20
# Expected: JSON with narrative_report, severity_overall, etc.

# Test 2: History endpoint
curl http://localhost:8000/analyze/history | python3 -m json.tool
# Expected: Array with at least 1 item

# Test 3: Frontend accessible
curl -s http://localhost:3000 | head -5
# Expected: HTML response (not error)
```

---

## STEP 6 — PRODUCE REPORT

After completing all steps, produce a report in this format:

```markdown
# Implementation Verification Report

## Backend Status
| Check | Status | Notes |
|-------|--------|-------|
| analysis_results table | ✅ Created / ❌ Missing | ... |
| GET /analyze/history | ✅ Working / ❌ Missing | ... |
| GET /analyze/result/{id} | ✅ Working / ❌ Missing | ... |
| Auto-save on /analyze/ | ✅ Working / ❌ Missing | ... |

## Frontend Files Status
| File | Status | What Was Missing | Fixed |
|------|--------|-----------------|-------|
| lib/cache.ts | ✅ Existed / ❌ Created now | ... | ... |
| lib/analysisStore.ts | ... | ... | ... |
| components/ui/AnalysisProgressToast.tsx | ... | ... | ... |
| components/layout/AppShell.tsx | ... | ... | ... |
| app/analysis/page.tsx | ... | ... | ... |
| app/timeline/page.tsx | ... | ... | ... |
| app/dashboard/page.tsx | ... | ... | ... |
| app/upload/page.tsx | ... | ... | ... |
| lib/api.ts | ... | ... | ... |

## Build Result
[paste npm run build output here]

## Functional Tests
| Test | Result |
|------|--------|
| DB table created | ✅ / ❌ |
| Analysis saves to DB | ✅ / ❌ |
| History endpoint returns data | ✅ / ❌ |
| Frontend builds successfully | ✅ / ❌ |

## What Was Actually Missing from Previous Agent's Work
[List everything the previous agent failed to implement]
```

---

## CRITICAL RULES

1. **Read before writing** — check every file before deciding it needs to be changed
2. **Surgical edits only** — do not rewrite entire files, only add/change what is missing
3. **SSR safety** — all `localStorage`, `Map`, and `window` access must be guarded with `typeof window !== "undefined"`
4. **`"use client"`** — required on every component file that uses `useState`, `useEffect`, `useRouter`, `useSearchParams`, or any browser API
5. **Zero TypeScript errors** — `npm run build` must pass before you are done
6. **Dark mode** — all new UI elements must use CSS variables (`var(--bg-elevated)`, etc.), never hardcoded colors
7. If a file is correct and complete, do NOT touch it
