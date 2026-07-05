"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw, Download, Copy, AlertCircle } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import AnalysisLoader from "@/components/ui/AnalysisLoader";
import { api, AnalysisResult } from "@/lib/api";
import { getLang, t, Lang } from "@/lib/i18n";
import { severityBadgeClass, eventRowClass, eventBadgeClass, formatEventType, fmtTime } from "@/lib/utils";

function AnalysisPageContent() {
  const searchParams = useSearchParams();
  const uploadId = searchParams.get("upload_id");
  const shouldRun = searchParams.get("run") === "true";

  const [lang, setLangState] = useState<Lang>("en");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => { setLangState(getLang()); }, []);
  useEffect(() => {
    const handler = () => setLangState(getLang());
    window.addEventListener("lang-change", handler);
    return () => window.removeEventListener("lang-change", handler);
  }, []);

  const tr = t(lang);

  useEffect(() => {
    if (uploadId && shouldRun) {
      runAnalysis();
    }
  }, [uploadId, shouldRun]);

  const runAnalysis = async () => {
    if (!uploadId) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api.analyze(parseInt(uploadId));
      setResult(data);
    } catch (err) {
      setError("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

  // Split narrative into report and recommendation
  let narrativeBody = result?.narrative_report || "";
  let recommendation = "";
  if (narrativeBody.includes("Recommendation:")) {
    const parts = narrativeBody.split("Recommendation:");
    narrativeBody = parts[0].trim();
    recommendation = parts.slice(1).join("Recommendation:").trim();
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
        {/* No upload_id */}
        {!uploadId && (
          <div className="empty-state">
            <AlertCircle size={32} />
            <span>Select an upload from History or Upload page.</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-bg-elevated border border-border-subtle rounded-lg">
            <AnalysisLoader
              steps={tr.analysis.steps}
              estimatedTime={tr.analysis.estimatedTime}
              onCancel={() => setLoading(false)}
            />
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
            </div>

            {/* Narrative Report */}
            <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
              <div className="font-semibold text-[13px] text-text-primary mb-2.5">{tr.analysis.narrative}</div>
              <p className="text-[13px] m-0 mb-3.5" style={{ color: "var(--text-secondary)" }}>
                {narrativeBody}
              </p>
              {recommendation && (
                <div className="reco-block">
                  <div
                    className="font-semibold text-xs mb-1 uppercase tracking-wider"
                    style={{ color: "var(--severity-high)" }}
                  >
                    {tr.analysis.recommendation}
                  </div>
                  <div className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{recommendation}</div>
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
              <div className="px-5 py-4 border-b border-border-subtle font-semibold text-[13px] text-text-primary">
                {tr.analysis.attackTimeline}
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

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="empty-state"><span>Loading...</span></div></div>}>
      <AnalysisPageContent />
    </Suspense>
  );
}
