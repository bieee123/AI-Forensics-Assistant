"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { RefreshCw, Download, Copy, AlertCircle, Clock, Database, FileText, Plus, Eye } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import AnalysisLoader from "@/components/ui/AnalysisLoader";
import { api, AnalysisResult, AnalysisHistoryItem } from "@/lib/api";
import { getLang, t, Lang } from "@/lib/i18n";
import { severityBadgeClass, eventRowClass, eventBadgeClass, formatEventType, fmtTime } from "@/lib/utils";
import { getSessionCache, setSessionCache } from "@/lib/cache"
import { startAnalysisJob, updateProgress, completeJob, failJob, getActiveJob, getElapsedMs, AnalysisJob } from "@/lib/analysisStore"

function AnalysisPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uploadId = searchParams.get("upload_id");
  const shouldRun = searchParams.get("run") === "true";

  const [lang, setLangState] = useState<Lang>("en");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(() => {
    const job = getActiveJob()
    return job?.status === "running" && job.uploadId === parseInt(uploadId || "0")
  })
  const [error, setError] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false)
  const [cachedAt, setCachedAt] = useState<string | null>(null)
  const [historyItems, setHistoryItems] = useState<AnalysisHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(() => {
    const job = getActiveJob()
    if (job?.status === "running" && job.uploadId === parseInt(uploadId || "0")) {
      return getElapsedMs()
    }
    return 0
  })
  const [progressPercent, setProgressPercent] = useState(0)

  const mountTime = useRef(Date.now()).current

  useEffect(() => { setLangState(getLang()); }, []);
  useEffect(() => {
    const handler = () => setLangState(getLang());
    window.addEventListener("lang-change", handler);
    return () => window.removeEventListener("lang-change", handler);
  }, []);

  const tr = t(lang);

  useEffect(() => {
    if (!uploadId) return

    const tryLoadFromCache = async () => {
      const id = parseInt(uploadId)

      // Don't start a new analysis if one is already running for this upload
      const existing = getActiveJob()
      if (existing?.status === "running" && existing.uploadId === id) {
        return
      }

      const session = getSessionCache(id)
      if (session) {
        setResult(session)
        setFromCache(true)
        return
      }
      try {
        const saved = await api.getAnalysisResult(id)
        setResult(saved as AnalysisResult)
        setFromCache(true)
        setCachedAt(saved.analyzed_at)
        setSessionCache(id, saved as AnalysisResult)
        return
      } catch {
        // Not in DB
      }
      if (shouldRun) {
        runAnalysis()
      }
    }

    tryLoadFromCache()
  }, [uploadId])

  // Fetch history when no upload_id
  useEffect(() => {
    if (!uploadId) {
      setHistoryLoading(true)
      api.getAnalysisHistory()
        .then(setHistoryItems)
        .catch(() => {})
        .finally(() => setHistoryLoading(false))
    }
  }, [uploadId])

  // Timer for horizontal timeline — restores from store if already running
  useEffect(() => {
    if (!loading) {
      setElapsedMs(0)
      setProgressPercent(0)
      return
    }

    const baseElapsed = getElapsedMs()

    const timer = setInterval(() => {
      const total = baseElapsed + (Date.now() - mountTime)
      setElapsedMs(total)
      setProgressPercent(Math.min(95, Math.floor((total / 70000) * 95)))
    }, 200)

    return () => clearInterval(timer)
  }, [loading])

  // Listen to store events for cross-navigation analysis updates
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
      completeJob(data)
      setSessionCache(parseInt(uploadId), data)
    } catch (err: any) {
      clearInterval(progressInterval)
      failJob("Analysis failed")
    }
  }

  const toggleRow = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyIoc = (ip: string, idx: number) => {
    navigator.clipboard.writeText(ip);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const exportResult = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis_${result.upload_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const narrativeText = result?.narrative_report || ""

  return (
    <AppShell>
      <PageHeader
        title={tr.analysis.title}
        actions={
          result ? (
            <>
              <button
                onClick={runAnalysis}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border border-border-subtle bg-bg-elevated cursor-pointer font-sans"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-elevated)")}
              >
                <RefreshCw size={14} />
                {tr.analysis.reanalyze}
              </button>
              <button
                onClick={exportResult}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border border-border-subtle bg-bg-elevated cursor-pointer font-sans"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-elevated)")}
              >
                <Download size={14} />
                {tr.analysis.export}
              </button>
            </>
          ) : undefined
        }
      />
      <div className="p-6 flex flex-col gap-4">
        {/* No upload_id — show history list */}
        {!uploadId && (
          <div className="space-y-6">
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
                        className="inline-flex items-center gap-1 px-3 py-[6px] rounded-md text-[12.5px] font-medium cursor-pointer border transition-all"
                        style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", borderColor: "var(--border-subtle)" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
                        <Eye size={13} /> Open
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

        {/* Horizontal loading timeline */}
        {loading && (
          <div className="bg-bg-elevated border border-border-subtle rounded-xl p-8">
            <div className="flex items-start justify-between mb-8 relative">
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
                    <span className="text-xs font-medium text-center"
                      style={{ color: isDone ? "var(--severity-low)" : isActive ? "var(--accent)" : "var(--text-muted)" }}>
                      {lang === "id" ? step.labelId : step.label}
                    </span>
                    <span className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                      {isDone ? "Done" : isActive && step.key === "generating" ? "Running..." : ""}
                    </span>
                  </div>
                )
              })}
            </div>

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

        {/* Error */}
        {error && (
          <div className="empty-state">
            <AlertCircle size={32} style={{ color: "var(--severity-critical)" }} />
            <span>{error}</span>
          </div>
        )}

        {/* No result yet - show Run Analysis button */}
        {!loading && !result && !error && uploadId && (
          <div className="empty-state">
            <AlertCircle size={32} />
            <span>{tr.analysis.noResult}</span>
            <button
              onClick={runAnalysis}
              className="inline-flex items-center gap-1.5 py-[7px] px-3.5 rounded-md text-[13px] font-medium cursor-pointer border-none mt-2"
              style={{ background: "var(--accent)", color: "#fff" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "var(--accent)")}
            >
              <RefreshCw size={14} />
              {tr.analysis.runAnalysis}
            </button>
          </div>
        )}

        {/* Result */}
        {result && (
          <>
            {/* Severity header */}
            <div
              className="severity-card bg-bg-elevated border border-border-subtle rounded-lg px-5 py-4 flex items-center gap-2.5 flex-wrap"
              style={{ borderLeftColor: result.severity_overall?.toUpperCase() === "CRITICAL" ? "var(--severity-critical)" : result.severity_overall?.toUpperCase() === "HIGH" ? "var(--severity-high)" : "var(--severity-medium)" }}
            >
              <span className={severityBadgeClass(result.severity_overall)}>{result.severity_overall}</span>
              <span className="font-semibold text-text-primary">Severity: {result.severity_overall?.toUpperCase()}</span>
              <span style={{ color: "var(--text-muted)" }}>·</span>
              <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{result.total_incidents} {tr.analysis.incidents}</span>
              {fromCache && cachedAt && (
                <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-md"
                  style={{ background: "var(--accent-bg)", color: "var(--text-muted)" }}>
                  <Database size={11} />
                  Saved · {new Date(cachedAt).toLocaleString()}
                </span>
              )}
            </div>

            {/* Narrative Report */}
            <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
              <div className="font-semibold text-[13px] text-text-primary mb-2.5">{tr.analysis.narrative}</div>
              {narrativeText ? (
                <p className="text-[13px] m-0 mb-3.5" style={{ color: "var(--text-secondary)" }}>
                  {narrativeText}
                </p>
              ) : (
                <p className="text-[13px] italic m-0 mb-3.5" style={{ color: "var(--text-muted)" }}>
                  No narrative available.
                </p>
              )}
            </div>

            {/* IoC Summary */}
            <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
              <div className="font-semibold text-[13px] text-text-primary mb-3">{tr.analysis.iocSummary}</div>
              <div className="flex flex-wrap gap-2.5">
                {result.ioc_summary && result.ioc_summary.map((ip: string, idx: number) => (
                  <div key={idx} className="chip inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12.5px]"
                    style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}>
                    <span className="font-mono">{ip}</span>
                    <button
                      onClick={() => copyIoc(ip, idx)}
                      className="border-none bg-none cursor-pointer p-0 flex items-center"
                      style={{ color: "var(--text-muted)" }}
                      title="Copy to clipboard"
                    >
                      {copiedIdx === idx ? "✓" : <Copy size={13} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Attack Timeline */}
            <div className="bg-bg-elevated border border-border-subtle rounded-lg">
              <div className="px-5 py-4 border-b border-border-subtle font-semibold text-[13px] text-text-primary flex items-center justify-between">
                <span>{tr.analysis.attackTimeline}</span>
                <button
                  onClick={() => router.push(`/timeline?upload_id=${uploadId}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-md text-[12.5px] font-medium cursor-pointer border transition-all"
                  style={{ background: "var(--accent-bg)", color: "var(--accent)", borderColor: "var(--accent)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--accent-bg)"; e.currentTarget.style.color = "var(--accent)"; }}
                >
                  <Clock size={13} />
                  {tr.analysis.viewFullTimeline}
                </button>
              </div>
              {result.attack_timeline && result.attack_timeline.length > 0 ? (
                <>
                  <table>
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Event Type</th>
                        <th>Source IP</th>
                        <th>User</th>
                        <th>Auth Method</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.attack_timeline.map((entry) => (
                        <>
                          <tr
                            key={entry.id}
                            className={`row-hover cursor-pointer ${eventRowClass(entry.event_type)}`}
                            onClick={() => toggleRow(entry.id)}
                          >
                            <td className="font-mono">{fmtTime(entry.timestamp)}</td>
                            <td><span className={eventBadgeClass(entry.event_type)}>{formatEventType(entry.event_type)}</span></td>
                            <td className="font-mono">{entry.source_ip}</td>
                            <td className="font-mono">{entry.user}</td>
                            <td className="font-mono">{entry.auth_method}</td>
                            <td>{entry.status}</td>
                          </tr>
                          {expandedRows.has(entry.id) && (
                            <tr>
                              <td colSpan={6} className="p-0">
                                <div className="raw-log-box m-3">{entry.raw_message}</div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                  <div className="wire-note px-5 py-2.5 text-[11px] italic" style={{ color: "var(--text-muted)" }}>
                    {tr.analysis.clickRow}
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <span>No timeline events</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

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
