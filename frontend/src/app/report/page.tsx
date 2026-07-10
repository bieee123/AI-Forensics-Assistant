"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Download } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { getLang, t, Lang } from "@/lib/i18n";
import { api, Upload, SavedAnalysisResult } from "@/lib/api";
import { getSessionCache, setSessionCache } from "@/lib/cache";

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

  const narrativeText = analysisData.narrative_report || ""

  return (
    <div className="h-full overflow-y-auto rounded-lg border p-6 text-sm"
      style={{
        background: "var(--bg-elevated)",
        borderColor: "var(--border-subtle)",
        fontFamily: "Helvetica, Arial, sans-serif",
      }}>

      <div className="text-center text-xs font-bold py-1.5 mb-4 rounded"
        style={{ background: "#1F2937", color: "#fff" }}>
        {classification}
      </div>

      <h1 className="text-2xl font-bold mb-0.5" style={{ color: "var(--text-primary)" }}>
        INCIDENT REPORT
      </h1>
      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
        Agentic AI Digital Forensics Assistant
      </p>
      <hr style={{ borderColor: "#0D9488", borderWidth: 2, marginBottom: 16 }} />

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

      <h2 className="text-sm font-bold mb-2" style={{ color: "#0D9488" }}>
        2. NARRATIVE ANALYSIS
      </h2>
      {narrativeText ? (
        <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-primary)" }}>
          {narrativeText}
        </p>
      ) : (
        <p className="text-xs italic mb-3" style={{ color: "var(--text-muted)" }}>
          No narrative available.
        </p>
      )}

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
          {(analysisData.attack_timeline || []).map((e: any, i: number) => (
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

      <hr className="mt-6 mb-2" style={{ borderColor: "var(--border-subtle)" }} />
      <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
        Generated by DFA — Agentic AI Digital Forensics Assistant · {classification}
      </p>
    </div>
  )
}

export default function ReportPage() {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>("en");
  const [uploads, setUploads] = useState<Upload[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [analysisData, setAnalysisData] = useState<SavedAnalysisResult | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [notAnalyzed, setNotAnalyzed] = useState(false)
  const [analystName, setAnalystName] = useState("DFA System")
  const [organization, setOrganization] = useState("PT Teknologi Nasional Indonesia Siber")
  const [classification, setClassification] = useState("CONFIDENTIAL")

  useEffect(() => { setLangState(getLang()); }, []);
  useEffect(() => {
    const handler = () => setLangState(getLang());
    window.addEventListener("lang-change", handler);
    return () => window.removeEventListener("lang-change", handler);
  }, []);

  const tr = t(lang);

  useEffect(() => {
    api.getUploads()
      .then(data => {
        setUploads(data);
      })
      .catch(() => {});
  }, []);

  const selectUpload = async (uploadId: number) => {
    setSelectedId(uploadId)
    setNotAnalyzed(false)
    setAnalysisData(null)
    setLoadingAnalysis(true)

    try {
      const session = getSessionCache(uploadId)
      if (session) {
        setAnalysisData(session as SavedAnalysisResult)
        setLoadingAnalysis(false)
        return
      }

      const saved = await api.getAnalysisResult(uploadId)
      setAnalysisData(saved)
      setSessionCache(uploadId, saved)

    } catch {
      setNotAnalyzed(true)
    } finally {
      setLoadingAnalysis(false)
    }
  }

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
              style={{ borderColor: "#c9a52e", background: "rgba(255,209,102,0.08)" }}>
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
  );
}
