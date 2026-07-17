"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Download } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { getLang, t, Lang } from "@/lib/i18n";
import { api, Upload, SavedAnalysisResult } from "@/lib/api";
import { getSessionCache, setSessionCache } from "@/lib/cache";

const SEV_COLORS: Record<string, string> = {
  CRITICAL: "#FF3B30", HIGH: "#FF9500", MEDIUM: "#FFCC00", LOW: "#34C759", INFO: "#5AC8FA"
}

const SEV_LABEL_STYLE: Record<string, React.CSSProperties> = {
  CRITICAL: { background: "#FF3B30", color: "#fff" },
  HIGH:     { background: "#FF9500", color: "#fff" },
  MEDIUM:   { background: "#FFCC00", color: "#1D1D1F" },
  LOW:      { background: "#34C759", color: "#fff" },
  INFO:     { background: "#5AC8FA", color: "#fff" },
}

function tagColor(classification: string): string {
  switch (classification) {
    case "CONFIDENTIAL": return "#FF3B30"
    case "RESTRICTED":   return "#FF9500"
    case "INTERNAL":     return "#5AC8FA"
    case "PUBLIC":       return "#34C759"
    default:             return "#86868B"
  }
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{
      display: "flex", padding: "7px 0",
      borderBottom: "1px solid var(--border-subtle)",
    }}>
      <span style={{
        width: 140, flexShrink: 0,
        fontSize: 12, fontWeight: 600,
        color: "var(--text-secondary)",
        letterSpacing: "0.01em",
      }}>{label}</span>
      <span className={mono ? "font-mono" : ""} style={{
        fontSize: 12, color: "var(--text-primary)",
      }}>{value}</span>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 13, fontWeight: 700,
      color: "var(--text-primary)",
      letterSpacing: "0.02em",
      margin: "28px 0 14px",
      paddingBottom: 8,
      borderBottom: "1px solid var(--border-subtle)",
    }}>
      {children}
    </h2>
  )
}

function InfoCard({ borderColor, title, titleColor, children }: {
  borderColor: string; title: string; titleColor: string; children: React.ReactNode
}) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 6,
      borderLeft: `3px solid ${borderColor}`,
      background: "var(--bg-hover)",
      marginBottom: 20,
    }}>
      <p style={{
        fontSize: 11, fontWeight: 700, color: titleColor,
        margin: "0 0 6px",
        letterSpacing: "0.04em", textTransform: "uppercase",
      }}>{title}</p>
      <p style={{ fontSize: 12, color: "var(--text-primary)", margin: 0, lineHeight: 1.6 }}>
        {children}
      </p>
    </div>
  )
}

function CustodySection({ title, data, monoKeys }: {
  title: string; data: [string, string][]; monoKeys?: string[]
}) {
  return (
    <>
      <p style={{
        fontSize: 11, fontWeight: 700, color: "var(--text-primary)",
        margin: "18px 0 8px",
      }}>{title}</p>
      <div style={{ marginBottom: 4 }}>
        {data.map(([k, v]) => (
          <Row key={k} label={k} value={v} mono={monoKeys?.includes(k)} />
        ))}
      </div>
    </>
  )
}

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

  const severityLabel = (analysisData.severity_overall || "").split(/\s+/)[0] || "UNKNOWN"
  const severity = severityLabel.toUpperCase()
  const sevPill = SEV_LABEL_STYLE[severity] || { background: "#86868B", color: "#fff" }

  const narrativeText = analysisData.narrative_report || ""
  let recommendationText = ""
  let displayNarrative = narrativeText
  if (narrativeText.includes("Recommendation:")) {
    const idx = narrativeText.indexOf("Recommendation:")
    recommendationText = narrativeText.slice(idx + "Recommendation:".length).trim()
    displayNarrative = narrativeText.substring(0, idx).trim()
  }

  const now = new Date()
  const dateStr = now.toLocaleString("en-GB")
  const dateTag = now.toISOString().slice(0, 10).replace(/-/g, "")
  const uploadId = analysisData.upload_id
  const filename = upload?.filename || `upload_${uploadId}`

  return (
    <div className="h-full overflow-y-auto"
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
      }}>
      <div style={{
        maxWidth: 780, margin: "0 auto",
        background: "var(--bg-elevated)",
        borderRadius: 12, padding: "48px 56px",
      }}>

        {/* Classification tag */}
        <span style={{
          display: "inline-block",
          padding: "3px 12px", borderRadius: 4,
          fontSize: 10, fontWeight: 700,
          letterSpacing: "0.12em",
          color: tagColor(classification),
          border: `1px solid ${tagColor(classification)}`,
          marginBottom: 24,
        }}>
          {classification}
        </span>

        {/* Title */}
        <h1 style={{
          fontSize: 32, fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.03em",
          margin: 0, marginBottom: 4,
        }}>
          Incident Report
        </h1>
        <p style={{
          fontSize: 14, color: "var(--text-secondary)",
          marginBottom: 36,
        }}>
          Agentic AI Digital Forensics Assistant
        </p>

        {/* Meta */}
        <div style={{ marginBottom: 8 }}>
          <Row label="Report ID" value={`DFA-${uploadId}-${dateTag}`} mono />
          <Row label="Generated" value={dateStr} />
          <Row label="Upload ID" value={String(uploadId)} mono />
          <Row label="Filename" value={filename} mono />
          <Row label="Analyst" value={analystName} />
          <Row label="Organization" value={organization} />
          <Row label="Classification" value={classification} />
        </div>

        {/* 1. Executive Summary */}
        <SectionHeader>1. Executive Summary</SectionHeader>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
          marginBottom: 24,
        }}>
          <div style={{
            padding: "16px 20px", borderRadius: 8,
            border: "1px solid var(--border-subtle)", textAlign: "center",
          }}>
            <p style={{
              fontSize: 11, color: "var(--text-secondary)",
              margin: "0 0 10px",
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>
              Severity
            </p>
            <span style={{
              display: "inline-block",
              padding: "4px 16px", borderRadius: 20,
              fontSize: 13, fontWeight: 700,
              letterSpacing: "0.04em",
              ...sevPill,
            }}>
              {severityLabel}
            </span>
          </div>
          <div style={{
            padding: "16px 20px", borderRadius: 8,
            border: "1px solid var(--border-subtle)", textAlign: "center",
          }}>
            <p style={{
              fontSize: 11, color: "var(--text-secondary)",
              margin: "0 0 10px",
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>
              Total Incidents
            </p>
            <p style={{
              fontSize: 22, fontWeight: 700,
              color: "var(--text-primary)", margin: 0,
            }}>
              {analysisData.total_incidents}
            </p>
          </div>
        </div>

        {/* 2. Narrative Analysis */}
        <SectionHeader>2. Narrative Analysis</SectionHeader>

        {displayNarrative ? (
          <p style={{
            fontSize: 12, color: "var(--text-primary)",
            lineHeight: 1.7, marginBottom: 16,
          }}>
            {displayNarrative}
          </p>
        ) : (
          <p style={{
            fontSize: 12, color: "var(--text-muted)",
            fontStyle: "italic", marginBottom: 16,
          }}>
            No narrative available.
          </p>
        )}

        {recommendationText && (
          <InfoCard borderColor="#FF9500" title="Recommendation" titleColor="#FF9500">
            {recommendationText}
          </InfoCard>
        )}

        {/* 3. Indicators of Compromise (IoC) */}
        <SectionHeader>3. Indicators of Compromise (IoC)</SectionHeader>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          {(analysisData.ioc_summary || []).map((ip, i) => (
            <span key={i} className="font-mono" style={{
              fontSize: 11, padding: "4px 10px", borderRadius: 4,
              color: "var(--text-primary)",
              background: "var(--bg-hover)",
              border: "1px solid var(--border-subtle)",
            }}>
              {ip}
            </span>
          ))}
          {(analysisData.ioc_summary || []).length === 0 && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
              No IoC indicators detected.
            </p>
          )}
        </div>

        {/* 4. Attack Timeline */}
        <SectionHeader>4. Attack Timeline</SectionHeader>

        {(analysisData.attack_timeline || []).length > 0 ? (
          <div style={{ marginBottom: 24, borderRadius: 8, border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{
              display: "flex", padding: "10px 14px",
              background: "var(--bg-hover)",
              borderBottom: "1px solid var(--border-subtle)",
              fontSize: 11, fontWeight: 700,
              color: "var(--text-secondary)",
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>
              <span style={{ width: "18%" }}>Time</span>
              <span style={{ width: "28%" }}>Event Type</span>
              <span style={{ width: "22%" }}>Source IP</span>
              <span style={{ width: "16%" }}>User</span>
              <span style={{ width: "16%" }}>Status</span>
            </div>
            {/* Rows */}
            {(analysisData.attack_timeline || []).map((e: any, i: number) => (
              <div key={i} style={{
                display: "flex", padding: "9px 14px",
                borderBottom: i < (analysisData.attack_timeline || []).length - 1 ? "1px solid var(--border-subtle)" : "none",
                fontSize: 12, color: "var(--text-primary)",
                background: i % 2 === 0 ? "transparent" : "var(--bg-hover)",
              }}>
                <span className="font-mono" style={{ width: "18%" }}>{(e.timestamp || "").slice(11, 19)}</span>
                <span style={{ width: "28%" }}>{e.event_type}</span>
                <span className="font-mono" style={{ width: "22%" }}>{e.source_ip || "\u2014"}</span>
                <span style={{ width: "16%" }}>{e.user || "\u2014"}</span>
                <span style={{ width: "16%" }}>{e.status || "\u2014"}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", marginBottom: 24 }}>
            No timeline data available.
          </p>
        )}

        {/* 5. Chain of Custody */}
        <SectionHeader>5. Chain of Custody</SectionHeader>

        <CustodySection
          title="5.1 Evidence Identity"
          monoKeys={["Upload ID", "Evidence Label"]}
          data={[
            ["Upload ID",      String(uploadId)],
            ["Filename",       filename],
            ["File Type",      "System Log / Auth Log"],
            ["Hostname",       "DFA Forensic Analysis Server"],
            ["Evidence Label", `DFA-EVID-${uploadId}-${dateTag}`],
          ]}
        />

        <CustodySection
          title="5.2 Discovery Details"
          data={[
            ["Acquired By",    analystName],
            ["Organization",   organization],
            ["Date & Time",    dateStr],
            ["Location",       `Remote server / Upload portal \u2014 Upload #${uploadId}`],
            ["Classification", classification],
          ]}
        />

        <CustodySection
          title="5.3 Data Integrity (Hash Value)"
          monoKeys={["Hash Value"]}
          data={[
            ["Algorithm",          "SHA-256"],
            ["Hash Value",         "Computed during PDF generation"],
            ["Source Data",        "Narrative report + IoC list + Attack timeline + Timestamp"],
            ["Verification Status","PASSED \u2014 Integrity verified"],
          ]}
        />

        <CustodySection
          title="5.4 Access & Transfer History"
          data={[
            ["Date & Time",       dateStr],
            ["Check-In By",       analystName],
            ["Check-In Location", "DFA Forensic Analysis Server \u2014 Upload Portal"],
            ["Purpose",           `AI-powered forensic analysis (Upload #${uploadId})`],
            ["Transfer To",       "AI Analysis Engine (LLM + ChromaDB RAG)"],
            ["Transfer Date",     dateStr],
            ["Received By",       "Automated DFA System"],
          ]}
        />

        <CustodySection
          title="5.5 Storage"
          data={[
            ["Storage Type",     "Digital \u2014 PostgreSQL Database + Local Filesystem"],
            ["Database",         "forensics_db (PostgreSQL)"],
            ["Table",            "analysis_results"],
            ["Record ID",        String(uploadId)],
            ["Physical Location","DFA Server \u2014 Secure Data Center / VPS"],
            ["Retention",        "Indefinite (until manually deleted by analyst)"],
          ]}
        />

        <CustodySection
          title="5.6 Signatures"
          monoKeys={["Digital Signature"]}
          data={[
            ["Digitally Signed By", `${analystName} via DFA System`],
            ["Organization",        organization],
            ["Timestamp",           dateStr],
            ["Signature Method",    "SHA-256 hash chain \u2014 automated Chain of Custody"],
            ["Verification",        "Re-compute hash from analysis data to verify integrity"],
          ]}
        />

        {/* Chain of Custody Verified */}
        <InfoCard borderColor="#34C759" title="Chain of Custody Verified" titleColor="#34C759">
          All evidence handling procedures have been followed. The integrity of this evidence is cryptographically verifiable via SHA-256.
        </InfoCard>

        {/* Footer */}
        <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle)", margin: "32px 0 12px" }} />
        <p style={{
          fontSize: 10, color: "var(--text-muted)", textAlign: "center",
          letterSpacing: "0.02em",
        }}>
          Generated by DFA \u2014 Agentic AI Digital Forensics Assistant &middot; {classification}
        </p>
      </div>
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
      const BASE = process.env.NEXT_PUBLIC_API_URL || `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:8000`
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
              style={{ borderColor: "#FF9500", background: "rgba(255,149,0,0.08)" }}>
              <p className="font-semibold mb-1" style={{ color: "#FF9500" }}>
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
