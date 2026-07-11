# AGENT TASK — Frontend Code Analysis & Bug Report
## Agentic AI Digital Forensics Assistant

---

## YOUR ROLE

You are a senior full-stack engineer performing a **code audit and bug investigation** on a Next.js 15 + FastAPI project. Your job is to read every relevant source file, identify all bugs, and produce a structured bug report with exact fix recommendations.

Do NOT fix anything yet. Only read, analyze, and report.

---

## CONTEXT

This is a digital forensics dashboard (DFA) with:
- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, running on port 3000
- **Backend:** FastAPI (Python), running on port 8000
- **Backend API Base URL:** `http://103.87.66.30:8000`

### Known Issues to Investigate

1. **`POST /analyze/` returns 404** when called from the browser (via frontend), but returns 200 when called via `curl` from the VPS terminal directly. Backend openapi.json confirms `/analyze/` is registered.

2. **Analysis page does not auto-trigger** when navigating via client-side routing from Dashboard, Upload, or History pages (clicking "Analyze" button). It only works when the URL is typed manually in the browser.

3. **Timeline page** does not show events after selecting an upload from the picker. The upload list appears but the timeline remains empty.

4. **Report page** still uses dummy/hardcoded data instead of calling the real backend `/report/` endpoint.

5. **Artifact Acquisition page** — unknown status, needs testing and verification that it correctly calls `POST /acquire/` with the right payload.

---

## FILES TO READ

Read ALL of the following files completely before writing your report:

### Frontend
```
frontend/src/app/analysis/page.tsx
frontend/src/app/timeline/page.tsx
frontend/src/app/report/page.tsx
frontend/src/app/acquisition/page.tsx
frontend/src/app/dashboard/page.tsx
frontend/src/app/upload/page.tsx
frontend/src/app/history/page.tsx
frontend/src/lib/api.ts
frontend/src/lib/utils.ts
frontend/src/lib/i18n.ts
frontend/src/components/layout/AppShell.tsx
frontend/src/components/layout/Sidebar.tsx
frontend/src/middleware.ts (if exists)
frontend/.env.local
frontend/next.config.ts
```

### Backend
```
backend/app/main.py
backend/app/routers/analyze.py
backend/app/routers/report.py
backend/app/routers/acquire.py
backend/app/routers/logs.py
backend/app/routers/upload.py
backend/app/models/schemas.py
backend/app/config.py
```

---

## WHAT TO ANALYZE

For each known issue above, investigate:

1. **Root cause** — exactly which file, line number, and what the bug is
2. **Why it happens** — explain the mechanism (e.g., React re-render issue, wrong URL, missing dependency array, etc.)
3. **Exact fix** — provide the complete corrected code block, with file path and line numbers

Additionally, look for:
- Any hardcoded URLs, IPs, or ports that should come from environment variables
- Any `fetch` calls with wrong HTTP method, missing headers, or wrong body format
- Any `useEffect` with missing or wrong dependency arrays
- Any TypeScript type mismatches that could cause runtime errors
- Any CORS issues
- Any Next.js App Router specific issues (server vs client components, Suspense boundaries, useSearchParams usage)
- Any API response shape mismatches between backend and frontend types

---

## OUTPUT FORMAT

Produce a markdown document with this exact structure:

```markdown
# DFA Frontend Bug Report & Fix Recommendations

## Summary
[Brief overview of findings]

## Bug 1: [Title]
**File:** `path/to/file.tsx`
**Line(s):** 34-38
**Severity:** Critical / High / Medium / Low
**Root Cause:** [Explanation]
**Why It Happens:** [Mechanism]
**Current Code:**
\`\`\`tsx
[broken code]
\`\`\`
**Fixed Code:**
\`\`\`tsx
[corrected code]
\`\`\`

## Bug 2: [Title]
...

## Additional Issues Found
[Any other bugs found during general audit]

## Files That Look Correct
[List of files with no issues found]
```

---

## CONSTRAINTS

- Do not make assumptions — read the actual code before reporting
- If you cannot determine the root cause from the code alone, say so explicitly and list what additional information is needed
- Provide line-exact fixes, not vague suggestions
- If a fix in one file requires changes in another file, list both
- Do not rewrite entire files — provide surgical, minimal fixes only