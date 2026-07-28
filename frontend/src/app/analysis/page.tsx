"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { RefreshCw, Download, Copy, AlertCircle, Clock, Database, FileText, Plus, Eye } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import AnalysisLoader from "@/components/ui/AnalysisLoader";
import { api, AnalysisResult, AnalysisHistoryItem } from "@/lib/api";
import { getLang, t, Lang } from "@/lib/i18n";
import { severityBadgeClass, eventRowClass, eventBadgeClass, formatEventType, fmtTime } from "@/lib/utils";
import { getSessionCache, setSessionCache } from "@/lib/cache"
import { getActiveJob, getElapsedMs, AnalysisJob } from "@/lib/analysisStore"
import { triggerAnalysis } from "@/lib/analysisService"
import { SkeletonCard, SkeletonTable } from "@/components/ui/Skeleton";

function AnalysisPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uploadId = searchParams.get("upload_id");
  const shouldRun = searchParams.get("run") === "true";

  const [lang, setLangState] = useState<Lang>("en");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(() => {
    const id = parseInt(uploadId || "0")
    if (getSessionCache(id)) return false
    const job = getActiveJob()
    return job?.status === "running" && job.uploadId === id
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

      const existing = getActiveJob()
      if (existing?.status === "running" && existing.uploadId === id) {
        return
      }

      if (shouldRun) {
        runAnalysis()
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

  useEffect(() => {
    if (!loading) {
      setElapsedMs(0)
      return
    }
    const timer = setInterval(() => {
      setElapsedMs(getElapsedMs())
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
        const analyzedAt = (job.result as any).analyzed_at
        if (analyzedAt) {
          setCachedAt(analyzedAt)
        }
        setSessionCache(parseInt(uploadId!), job.result)
      } else if (job.status === "error") {
        api.getAnalysisResult(parseInt(uploadId!)).then(saved => {
          if (saved && saved.severity_overall) {
            setLoading(false)
            setResult(saved)
            setSessionCache(parseInt(uploadId!), saved)
            return
          }
        }).catch(() => {
          setLoading(false)
          setError("Analysis failed. Please try again.")
        })
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

    triggerAnalysis(parseInt(uploadId), filename)
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

  const [exportingPDF, setExportingPDF] = useState(false);

  const exportResult = async () => {
    if (!result) return;
    setExportingPDF(true);
    try {
      const blob = await api.generateReport({
        upload_id: result.upload_id,
        analyst_name: "DFA System",
        organization: "PT Teknologi Nasional Indonesia Siber",
        classification: "CONFIDENTIAL",
        narrative_report: result.narrative_report,
        severity_overall: result.severity_overall,
        ioc_summary: result.ioc_summary,
        attack_timeline: result.attack_timeline,
        total_incidents: result.total_incidents,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `incident_report_${result.upload_id}_${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      const exportData = {
        upload_id: result.upload_id,
        severity: result.severity_overall,
        total_incidents: result.total_incidents,
        narrative_report: result.narrative_report,
        ioc_summary: result.ioc_summary,
        attack_timeline: result.attack_timeline,
        exported_at: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `incident_report_${result.upload_id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingPDF(false);
    }
  };

  const narrativeText = result?.narrative_report || ""
  const severityLabel = (result?.severity_overall || "").split(/\s+/)[0] || "UNKNOWN"
  let recommendationText = ""
  let displayNarrative = narrativeText
  const recIndex = narrativeText.toLowerCase().indexOf("recommendation:")
  if (recIndex !== -1) {
    const recLabel = narrativeText.slice(recIndex, recIndex + 15)
    const idx = narrativeText.indexOf(recLabel, recIndex)
    if (idx !== -1) {
      recommendationText = narrativeText.slice(idx + recLabel.length).trim()
      displayNarrative = narrativeText.substring(0, idx).trim()
    }
  }

  return (
    <AppShell>
      <PageHeader
        title={tr.analysis.title}
        actions={
          result ? (
            <>
              <button
                onClick={runAnalysis}
                className="inline-flex items-center gap-1.5 py-[7px] px-3.5 rounded-md text-[13px] font-semibold cursor-pointer border-none font-sans transition-all"
                style={{ background: "var(--accent)", color: "#fff" }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "var(--accent-hover)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,180,216,0.3)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "var(--accent)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <RefreshCw size={14} />
                {tr.analysis.reanalyze}
              </button>
              <button
                onClick={exportResult}
                disabled={exportingPDF}
                className="inline-flex items-center gap-1.5 py-[7px] px-3.5 rounded-md text-[13px] font-semibold cursor-pointer border border-border-subtle bg-bg-elevated font-sans transition-all disabled:opacity-50"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "var(--bg-hover)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "var(--bg-elevated)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                <Download size={14} className={exportingPDF ? "animate-spin" : ""} />
                {exportingPDF ? "Exporting..." : tr.analysis.export}
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

              {historyLoading && (
                <div className="space-y-3">
                  <SkeletonCard lines={2} showHeader={false} />
                  <SkeletonCard lines={2} showHeader={false} />
                  <SkeletonCard lines={2} showHeader={false} />
                </div>
              )}

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
                    <span className={`badge ${severityBadgeClass(item.severity)}`}>{item.severity}</span>
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
                        className="inline-flex items-center gap-1 px-3 py-[6px] rounded-md text-[12.5px] font-semibold cursor-pointer border transition-all"
                        style={{ background: "transparent", color: "var(--accent)", borderColor: "var(--accent)" }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "var(--accent)";
                          e.currentTarget.style.color = "#fff";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,180,216,0.3)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--accent)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <RefreshCw size={13} />
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
        {result && severityLabel === "ERROR" ? (
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6 flex flex-col items-center gap-3"
            style={{ borderLeft: "3px solid var(--severity-critical)" }}>
            <AlertCircle size={32} style={{ color: "var(--severity-critical)" }} />
            <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Analysis Failed</span>
            <p className="text-[13px] text-center m-0" style={{ color: "var(--text-secondary)" }}>
              {result.narrative_report || "An unknown error occurred during analysis."}
            </p>
            <button onClick={runAnalysis}
              className="inline-flex items-center gap-1.5 py-[7px] px-3.5 rounded-md text-[13px] font-semibold cursor-pointer border-none mt-2 transition-all"
              style={{ background: "var(--accent)", color: "#fff" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-hover)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,180,216,0.3)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <RefreshCw size={14} />
              Retry Analysis
            </button>
            {cachedAt && (
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                Failed at {new Date(cachedAt).toLocaleString()}
              </span>
            )}
          </div>
        ) : result && (
          <>
            {/* Severity header */}
            <div
              className="severity-card bg-bg-elevated border border-border-subtle rounded-lg px-5 py-4 flex items-center gap-2.5 flex-wrap"
              style={{ borderLeftColor: severityLabel === "CRITICAL" ? "var(--severity-critical)" : severityLabel === "HIGH" ? "var(--severity-high)" : severityLabel === "MEDIUM" ? "var(--severity-medium)" : "var(--severity-low)" }}
            >
              <span className={severityBadgeClass(severityLabel)}>{severityLabel}</span>
              <span className="font-semibold text-text-primary">Severity: {severityLabel}</span>
              <span style={{ color: "var(--text-muted)" }}>·</span>
              <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{result.total_incidents} {tr.analysis.incidents}</span>
              {cachedAt && (
                <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-md"
                  style={{ background: "var(--accent-bg)", color: "var(--text-muted)" }}>
                  <Database size={11} />
                  {fromCache ? "Saved" : "Analyzed"} · {new Date(cachedAt).toLocaleString()}
                </span>
              )}
            </div>

            {/* Narrative Report */}
            <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
              <div className="font-semibold text-[13px] text-text-primary mb-2.5">{tr.analysis.narrative}</div>
              {displayNarrative ? (
                <p className="text-[13px] m-0 mb-3.5" style={{ color: "var(--text-secondary)" }}>
                  {displayNarrative}
                </p>
              ) : (
                <p className="text-[13px] italic m-0 mb-3.5" style={{ color: "var(--text-muted)" }}>
                  No narrative available.
                </p>
              )}

              {recommendationText && (
                <div className="p-3 rounded mt-4" style={{
                  borderLeft: "3px solid var(--severity-high)",
                  background: "rgba(255,140,66,0.08)",
                }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--severity-high)" }}>
                    ⚠ Recommendation
                  </p>
                  <p className="text-[13px] m-0" style={{ color: "var(--text-primary)" }}>
                    {recommendationText}
                  </p>
                </div>
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
                      {result.attack_timeline.map((entry, idx) => (
                        <>
                          <tr
                            key={idx}
                            className={`row-hover cursor-pointer ${eventRowClass(entry.event_type)}`}
                            onClick={() => toggleRow(idx)}
                          >
                            <td className="font-mono">{fmtTime(entry.timestamp)}</td>
                            <td><span className={eventBadgeClass(entry.event_type)}>{formatEventType(entry.event_type)}</span></td>
                            <td className="font-mono">{entry.source_ip || "—"}</td>
                            <td className="font-mono">{entry.user || "—"}</td>
                            <td className="font-mono">{"—"}</td>
                            <td>{entry.status || "—"}</td>
                          </tr>
                          {expandedRows.has(idx) && (
                            <tr>
                              <td colSpan={6} className="p-0">
                                <div className="m-3 p-3 rounded text-xs space-y-1.5"
                                  style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}>
                                  <div><span className="font-semibold" style={{ color: "var(--text-secondary)" }}>Time: </span>{entry.timestamp}</div>
                                  <div><span className="font-semibold" style={{ color: "var(--text-secondary)" }}>Event: </span>{entry.event_type || "—"}</div>
                                  <div><span className="font-semibold" style={{ color: "var(--text-secondary)" }}>Host: </span>{entry.host || "—"}</div>
                                  <div><span className="font-semibold" style={{ color: "var(--text-secondary)" }}>Source IP: </span>{entry.source_ip || "—"}</div>
                                  <div><span className="font-semibold" style={{ color: "var(--text-secondary)" }}>User: </span>{entry.user || "—"}</div>
                                  <div><span className="font-semibold" style={{ color: "var(--text-secondary)" }}>Status: </span>{entry.status || "—"}</div>
                                  {entry.raw_message && (
                                    <div className="pt-2 mt-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                                      <div className="font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Raw Log:</div>
                                      <div className="font-mono" style={{ color: "var(--text-muted)", wordBreak: "break-all" }}>{entry.raw_message}</div>
                                    </div>
                                  )}
                                </div>
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
