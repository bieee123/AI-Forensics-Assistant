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
