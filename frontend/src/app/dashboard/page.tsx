"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, FileText, Activity, AlertCircle, RefreshCw, Zap, Brain, FileDown, Loader2,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { api, Summary, Upload as UploadType } from "@/lib/api";
import { getLang, t, Lang } from "@/lib/i18n";
import { getSessionCache, setSessionCache } from "@/lib/cache";

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
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-4 mb-4 max-[900px]:grid-cols-2">
              <StatCard
                label={tr.dashboard.totalUploads}
                value={data.total_uploads}
                icon={Upload}
              />
              <StatCard
                label={tr.dashboard.logEntries}
                value={data.total_log_entries.toLocaleString()}
                icon={FileText}
              />
              <StatCard
                label={tr.dashboard.telemetryEntries}
                value={data.total_telemetry_entries.toLocaleString()}
                icon={Activity}
              />
              <StatCard
                label={tr.dashboard.criticalAlerts}
                value={0}
                icon={AlertCircle}
                iconColor="var(--severity-critical)"
              />
            </div>

            {/* Latest Incident Triage card */}
            <div className="bg-bg-elevated border border-border-subtle rounded-lg mb-4">
              <div className="flex justify-between items-center px-5 py-4 border-b border-border-subtle">
                <span className="font-semibold text-[13px] text-text-primary">
                  {tr.dashboard.latestTriage}{" "}
                  <span className="font-normal text-text-muted">({tr.dashboard.suspiciousActivity})</span>
                </span>
                <button
                  onClick={() => router.push("/analysis")}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border-none cursor-pointer bg-transparent"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {tr.dashboard.viewFullAnalysis}
                </button>
              </div>
              <div className="p-5">
                <div className="incident-card sev-high">
                  <div className="flex items-center justify-between gap-2.5 flex-wrap font-semibold text-sm mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle size={14} style={{ color: "var(--severity-high)" }} />
                      Privilege Escalation Detected
                    </span>
                    <span className="badge badge-high">High</span>
                  </div>
                  <p className="text-[13px] m-0" style={{ color: "var(--text-secondary)" }}>
                    User <span className="font-mono">&apos;www-data&apos;</span> berhasil mengeksekusi binary pembuat root shell via celah sudoers bug pada{" "}
                    <span className="font-mono">185.220.101.5</span>.
                  </p>
                  <div className="raw-log-box mt-3">
                    sudo: www-data : TTY=unknown ; PWD=/var/www/html ; USER=root ; COMMAND=/usr/bin/pkexec_exploit
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Uploads + Quick Actions */}
            <div className="grid gap-4" style={{ gridTemplateColumns: "60% 40%" }}>
              <div className="bg-bg-elevated border border-border-subtle rounded-lg">
                <div className="flex justify-between items-center px-5 py-4 border-b border-border-subtle">
                  <span className="font-semibold text-[13px] text-text-primary">{tr.dashboard.recentUploads}</span>
                  <button
                    onClick={() => router.push("/history")}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border-none cursor-pointer bg-transparent"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {tr.dashboard.viewAll}
                  </button>
                </div>
                {data.recent_uploads && data.recent_uploads.length > 0 ? (
                  <table>
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
                          <td className="font-mono">{u.upload_id}</td>
                          <td>{u.filename}</td>
                          <td className="font-mono">{u.total_entries.toLocaleString()}</td>
                          <td className="font-mono whitespace-nowrap">{new Date(u.uploaded_at).toLocaleDateString("en-GB")}</td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => router.push(`/analysis?upload_id=${u.upload_id}&run=true`)}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer border-none transition-all"
                                style={{ background: "var(--accent)", color: "#fff", minWidth: 0 }}
                                onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-hover)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,180,216,0.3)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.boxShadow = "none"; }}
                              >
                                <Brain size={13} />
                                {tr.upload.analyze}
                              </button>
                              <button
                                onClick={() => handleExportPDF(u)}
                                disabled={exportingId === u.upload_id}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer border transition-all disabled:opacity-50"
                                style={{ background: "var(--accent-bg)", color: "var(--accent)", borderColor: "var(--accent)" }}
                                onMouseEnter={e => { if (exportingId !== u.upload_id) { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#fff"; } }}
                                onMouseLeave={e => { e.currentTarget.style.background = "var(--accent-bg)"; e.currentTarget.style.color = "var(--accent)"; }}
                              >
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

              <div className="flex flex-col gap-4 self-start">
                <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
                  <div className="font-semibold text-[13px] text-text-primary mb-3.5">{tr.dashboard.quickActions}</div>
                  <button
                    onClick={() => router.push("/upload")}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium cursor-pointer border-none mb-2.5"
                    style={{ background: "var(--accent)", color: "#fff" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "var(--accent)")}
                  >
                    <Upload size={14} />
                    {tr.dashboard.uploadLog}
                  </button>
                  <button
                    onClick={() => {
                      const latest = data?.recent_uploads?.[0];
                      if (latest) router.push(`/analysis?upload_id=${latest.upload_id}&run=true`);
                      else router.push("/upload");
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium cursor-pointer border border-border-subtle"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-elevated)")}
                  >
                    <Zap size={14} />
                    {tr.dashboard.analyzeLatest}
                  </button>
                </div>

                {/* System Status */}
                <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
                  <div className="font-semibold text-[13px] text-text-primary mb-4">System Status</div>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 status-dot-active" style={{ background: "var(--severity-low)" }} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Ollama LLM</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>llama3:8b</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 status-dot-active" style={{ background: "var(--severity-low)" }} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>ChromaDB RAG</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>nomic-embed-text</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 status-dot-active" style={{ background: "var(--severity-low)" }} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>PostgreSQL</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>forensics_db</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 status-dot-active" style={{ background: "var(--severity-low)" }} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>API Backend</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>localhost:8000</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
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
