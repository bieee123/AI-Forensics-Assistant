"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, FileText, Activity, AlertCircle, RefreshCw, Zap, Brain, FileDown, Loader2, Database, Server,
  AlertTriangle, BarChart3, Globe, Clock, HardDrive,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { api, Summary, Upload as UploadType } from "@/lib/api";
import { getLang, t, Lang } from "@/lib/i18n";
import { getSessionCache, setSessionCache } from "@/lib/cache";

const SEV_COLORS: Record<string, string> = {
  CRITICAL: "#FF4D6A",
  HIGH: "#FF8C42",
  MEDIUM: "#c9a52e",
  LOW: "#06D6A0",
  INFO: "#4ECDC4",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>("en");
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportingId, setExportingId] = useState<number | null>(null);

  useEffect(() => { setLangState(getLang()); }, []);

  useEffect(() => {
    const handler = () => setLangState(getLang());
    window.addEventListener("lang-change", handler);
    return () => window.removeEventListener("lang-change", handler);
  }, []);

  const tr = t(lang);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const summary = await api.getSummary();
      setData(summary);
    } catch (err) {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleExportPDF = async (upload: UploadType) => {
    setExportingId(upload.upload_id)
    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL || `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:8000`

      let analysisData: any = getSessionCache(upload.upload_id)

      if (!analysisData) {
        try {
          const saved = await fetch(`${BASE}/analyze/result/${upload.upload_id}`)
          if (saved.ok) {
            analysisData = await saved.json()
            setSessionCache(upload.upload_id, analysisData!)
          }
        } catch {}
      }

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

      const reportRes = await fetch(`${BASE}/report/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upload_id: upload.upload_id,
          analyst_name: "DFA System",
          organization: "PT Teknologi Nasional Indonesia Siber",
          classification: "CONFIDENTIAL",
          narrative_report: analysisData!.narrative_report,
          severity_overall: analysisData!.severity_overall,
          ioc_summary: analysisData!.ioc_summary,
          attack_timeline: analysisData!.attack_timeline,
          total_incidents: analysisData!.total_incidents,
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

  const maxSeverity = data ? Math.max(...Object.values(data.severity_breakdown), 1) : 1;

  return (
    <AppShell>
      <PageHeader
        title={tr.dashboard.title}
        subtitle={tr.dashboard.subtitle}
        actions={
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border border-border-subtle bg-bg-elevated cursor-pointer font-sans"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-elevated)")}
          >
            <RefreshCw size={14} />
            {tr.dashboard.refresh}
          </button>
        }
      />
      <div className="p-6">
        {loading && (
          <div className="empty-state">
            <RefreshCw size={32} className="animate-spin" style={{ color: "var(--text-muted)" }} />
            <p>Loading...</p>
          </div>
        )}

        {error && (
          <div className="empty-state">
            <AlertCircle size={32} style={{ color: "var(--severity-critical)" }} />
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <div className="flex flex-col gap-4">
            {/* Row 1: Stat Cards */}
            <div className="grid grid-cols-6 gap-4 max-[1200px]:grid-cols-3 max-[700px]:grid-cols-2">
              <StatCard label="Total Uploads" value={data.total_uploads} icon={Upload} />
              <StatCard label="Total Analyses" value={data.total_analyses} icon={Brain} />
              <StatCard label="Total Incidents" value={data.total_incidents.toLocaleString()} icon={AlertTriangle} />
              <StatCard label="Critical Alerts" value={data.critical_alerts} icon={AlertCircle} iconColor="var(--severity-critical)" />
              <StatCard label="Artifacts Acquired" value={data.total_artifacts} icon={HardDrive} />
              <StatCard label="Log Entries" value={data.total_log_entries.toLocaleString()} icon={FileText} />
            </div>

            {/* Row 2: Two columns — Left: Severity + Recent Analyses, Right: Acquisition + IoC */}
            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {/* Left column */}
              <div className="flex flex-col gap-4">
                {/* Severity Breakdown */}
                <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
                  <div className="flex items-center gap-2 font-semibold text-[13px] text-text-primary mb-4">
                    <BarChart3 size={15} />
                    Severity Breakdown
                  </div>
                  {Object.entries(data.severity_breakdown).map(([sev, count]) => {
                    const pct = maxSeverity > 0 ? (count / maxSeverity) * 100 : 0;
                    return (
                      <div key={sev} className="flex items-center gap-2.5 mb-2 last:mb-0">
                        <span className="text-[12px] font-mono w-16 shrink-0" style={{ color: "var(--text-secondary)" }}>{sev}</span>
                        <div className="flex-1 h-[18px] rounded-sm" style={{ background: "var(--bg-base)" }}>
                          <div className="h-full rounded-sm transition-all duration-500" style={{
                            width: `${Math.max(pct, count > 0 ? 3 : 0)}%`,
                            background: SEV_COLORS[sev] || "#8B92A9",
                          }} />
                        </div>
                        <span className="text-[12px] font-mono w-10 text-right" style={{ color: "var(--text-primary)" }}>{count}</span>
                      </div>
                    );
                  })}
                  {Object.values(data.severity_breakdown).every(v => v === 0) && (
                    <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>No analysis data yet.</p>
                  )}
                </div>

                {/* Recent Analyses */}
                <div className="bg-bg-elevated border border-border-subtle rounded-lg">
                  <div className="flex justify-between items-center px-5 py-4 border-b border-border-subtle">
                    <span className="font-semibold text-[13px] text-text-primary">Recent Analysis Results</span>
                    <button onClick={() => router.push("/analysis")}
                      className="text-xs border-none bg-transparent cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                      View All
                    </button>
                  </div>
                  {data.recent_analyses.length > 0 ? (
                    <table>
                      <colgroup>
                        <col style={{ width: 100 }} />
                        <col />
                        <col style={{ width: 80 }} />
                        <col style={{ width: 90 }} />
                        <col style={{ width: 100 }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>Severity</th>
                          <th>Filename</th>
                          <th>Incidents</th>
                          <th>Date</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recent_analyses.map((a) => (
                          <tr key={a.upload_id} className="row-hover cursor-pointer" onClick={() => router.push(`/analysis?upload_id=${a.upload_id}`)}>
                            <td>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold"
                                style={{ background: `${SEV_COLORS[a.severity] || "#8B92A9"}20`, color: SEV_COLORS[a.severity] || "#8B92A9" }}>
                                {a.severity}
                              </span>
                            </td>
                            <td className="truncate max-w-0">{a.filename}</td>
                            <td className="font-mono">{a.total_incidents}</td>
                            <td className="font-mono text-[12px]">{new Date(a.analyzed_at).toLocaleDateString("en-GB")}</td>
                            <td>
                              <button onClick={(e) => { e.stopPropagation(); router.push(`/analysis?upload_id=${a.upload_id}`); }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer border-none transition-all"
                                style={{ background: "var(--accent)", color: "#fff" }}
                                onMouseEnter={e => e.currentTarget.style.background = "var(--accent-hover)"}
                                onMouseLeave={e => e.currentTarget.style.background = "var(--accent)"}
                              >
                                <Brain size={12} />
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-state">
                      <Brain size={28} />
                      <span>No analyses performed yet.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-4">
                {/* Acquisition Summary */}
                <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
                  <div className="flex items-center gap-2 font-semibold text-[13px] text-text-primary mb-3.5">
                    <HardDrive size={15} />
                    Acquisition Summary
                  </div>
                  {data.total_artifacts > 0 ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>Total Artifacts</span>
                        <span className="font-mono text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{data.total_artifacts}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>Total Data Size</span>
                        <span className="font-mono text-[13px]" style={{ color: "var(--text-primary)" }}>{formatBytes(data.acquisition_data_size)}</span>
                      </div>
                      {data.recent_artifacts.length > 0 && (
                        <div className="mt-1">
                          <span className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>RECENT</span>
                          <div className="flex flex-col gap-1.5 mt-2">
                            {data.recent_artifacts.slice(0, 3).map((art, i) => (
                              <div key={i} className="flex items-center justify-between text-[12px]">
                                <span className="truncate max-w-[140px]" title={art.filename} style={{ color: "var(--text-secondary)" }}>{art.filename}</span>
                                <span className="font-mono shrink-0" style={{ color: "var(--text-muted)" }}>{formatBytes(art.size_bytes)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <button onClick={() => router.push("/acquisition")}
                        className="w-full mt-2 py-1.5 rounded-md text-[12px] font-medium cursor-pointer border-none transition-all"
                        style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--accent)"}
                        onMouseLeave={e => e.currentTarget.style.background = "var(--accent-bg)"}
                      >
                        View All Artifacts
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-3">
                      <HardDrive size={24} style={{ color: "var(--text-muted)" }} />
                      <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>No artifacts acquired yet.</p>
                    </div>
                  )}
                </div>

                {/* IoC Overview */}
                <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
                  <div className="flex items-center gap-2 font-semibold text-[13px] text-text-primary mb-3">
                    <Globe size={15} />
                    IoC Overview
                  </div>
                  {data.recent_iocs.length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {data.recent_iocs.slice(0, 10).map((ip, i) => (
                          <span key={i} className="chip font-mono text-[11px] px-2 py-1 rounded-md"
                            style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                            {ip}
                          </span>
                        ))}
                        {data.recent_iocs.length > 10 && (
                          <span className="text-[11px] self-center" style={{ color: "var(--text-muted)" }}>
                            +{data.recent_iocs.length - 10} more
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>
                        {data.recent_iocs.length} unique IPs from recent analyses
                      </p>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-3">
                      <Globe size={24} style={{ color: "var(--text-muted)" }} />
                      <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>No IoCs identified yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Row 3: Timeline Preview (full width) */}
            <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
              <div className="flex items-center gap-2 font-semibold text-[13px] text-text-primary mb-4">
                <Clock size={15} />
                Activity Timeline (Last 7 Days)
              </div>
              {data.timeline_daily_counts.some(d => d.count > 0) ? (
                <div className="flex items-end gap-2" style={{ height: 120 }}>
                  {data.timeline_daily_counts.map((day) => {
                    const maxCount = Math.max(...data.timeline_daily_counts.map(d => d.count), 1);
                    const barH = (day.count / maxCount) * 100;
                    const shortDay = new Date(day.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short" });
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-mono" style={{ color: day.count > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>{day.count}</span>
                        <div className="w-full rounded-sm" style={{ background: "var(--bg-base)", height: 80 }}>
                          <div className="w-full rounded-sm transition-all duration-500" style={{
                            height: `${Math.max(barH, day.count > 0 ? 3 : 0)}%`,
                            background: day.count > 0 ? "var(--accent)" : "transparent",
                            borderRadius: 3,
                            minHeight: day.count > 0 ? 4 : 0,
                            alignSelf: "flex-end",
                          }} />
                        </div>
                        <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{shortDay}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>No log activity in the last 7 days.</p>
              )}
            </div>

            {/* Row 4: Recent Uploads + Quick Actions */}
            <div className="grid gap-4" style={{ gridTemplateColumns: "60% 40%" }}>
              {/* Recent Uploads */}
              <div className="bg-bg-elevated border border-border-subtle rounded-lg">
                <div className="flex justify-between items-center px-5 py-4 border-b border-border-subtle">
                  <span className="font-semibold text-[13px] text-text-primary">{tr.dashboard.recentUploads}</span>
                  <button onClick={() => router.push("/history")}
                    className="text-xs border-none bg-transparent cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                    {tr.dashboard.viewAll}
                  </button>
                </div>
                {data.recent_uploads.length > 0 ? (
                  <table>
                    <colgroup>
                      <col style={{ width: 40 }} />
                      <col />
                      <col style={{ width: 80 }} />
                      <col style={{ width: 100 }} />
                      <col style={{ width: 200 }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Filename</th>
                        <th>Entries</th>
                        <th>Date</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent_uploads.slice(0, 5).map((u) => (
                        <tr key={u.upload_id} className="row-hover">
                          <td className="font-mono whitespace-nowrap">{u.upload_id}</td>
                          <td className="truncate max-w-0">{u.filename}</td>
                          <td className="font-mono whitespace-nowrap">{u.total_entries.toLocaleString()}</td>
                          <td className="font-mono whitespace-nowrap">{new Date(u.uploaded_at).toLocaleDateString("en-GB")}</td>
                          <td>
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <button onClick={() => router.push(`/analysis?upload_id=${u.upload_id}&run=true`)}
                                className="inline-flex items-center gap-1 px-3 py-[6px] rounded-md text-[12.5px] font-semibold cursor-pointer border-none transition-all"
                                style={{ background: "var(--accent)", color: "#fff" }}
                                onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-hover)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,180,216,0.3)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.boxShadow = "none"; }}>
                                <Brain size={13} />
                                {tr.upload.analyze}
                              </button>
                              <button onClick={() => handleExportPDF(u)}
                                disabled={exportingId === u.upload_id}
                                className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-md text-[12.5px] font-medium cursor-pointer border transition-all disabled:opacity-50"
                                style={{ background: "var(--accent-bg)", color: "var(--accent)", borderColor: "var(--accent)" }}
                                onMouseEnter={e => { if (exportingId !== u.upload_id) { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#fff"; } }}
                                onMouseLeave={e => { e.currentTarget.style.background = "var(--accent-bg)"; e.currentTarget.style.color = "var(--accent)"; }}>
                                {exportingId === u.upload_id ? <><Loader2 size={13} className="animate-spin" /> Generating...</> : <><FileDown size={13} /> Export PDF</>}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    <Upload size={32} />
                    <span>{tr.dashboard.noData}</span>
                  </div>
                )}
              </div>

              {/* Right sidebar: Quick Actions + System Status */}
              <div className="flex flex-col gap-4 self-start">
                <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
                  <div className="font-semibold text-[13px] text-text-primary mb-3.5">{tr.dashboard.quickActions}</div>
                  <button onClick={() => router.push("/upload")}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium cursor-pointer border-none mb-2.5"
                    style={{ background: "var(--accent)", color: "#fff" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--accent-hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "var(--accent)"}>
                    <Upload size={14} />
                    {tr.dashboard.uploadLog}
                  </button>
                  <button onClick={() => { const latest = data?.recent_uploads?.[0]; if (latest) router.push(`/analysis?upload_id=${latest.upload_id}&run=true`); else router.push("/upload"); }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium cursor-pointer border border-border-subtle"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "var(--bg-elevated)"}>
                    <Zap size={14} />
                    {tr.dashboard.analyzeLatest}
                  </button>
                </div>

                <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
                  <div className="font-semibold text-[13px] text-text-primary mb-3.5">System Status</div>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <Brain size={14} /> Ollama LLM
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--severity-low)" }} />
                        <span className="font-mono text-xs" style={{ color: "var(--severity-low)" }}>llama3:8b</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <Database size={14} /> ChromaDB RAG
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--severity-low)" }} />
                        <span className="font-mono text-xs" style={{ color: "var(--severity-low)" }}>nomic-embed-text</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <Server size={14} /> PostgreSQL
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--severity-low)" }} />
                        <span className="font-mono text-xs" style={{ color: "var(--severity-low)" }}>forensics_db</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <Activity size={14} /> API Backend
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--severity-low)" }} />
                        <span className="font-mono text-xs" style={{ color: "var(--severity-low)" }}>localhost:8000</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && !data && (
          <div className="empty-state">
            <Upload size={32} />
            <span>{tr.dashboard.noData}</span>
          </div>
        )}
      </div>
    </AppShell>
  );
}
