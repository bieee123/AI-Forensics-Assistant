"use client";
import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { getLang, t, Lang } from "@/lib/i18n";

export default function ReportPage() {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => { setLangState(getLang()); }, []);
  useEffect(() => {
    const handler = () => setLangState(getLang());
    window.addEventListener("lang-change", handler);
    return () => window.removeEventListener("lang-change", handler);
  }, []);

  const tr = t(lang);

  return (
    <AppShell>
      <PageHeader
        title={tr.report.title}
        subtitle={tr.report.subtitle}
        actions={
          <button
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer border-none"
            style={{ background: "var(--accent)", color: "#fff" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--accent)")}
          >
            <Download size={14} />
            {tr.report.exportPdf}
          </button>
        }
      />
      <div className="p-6">
        <div className="grid gap-4" style={{ gridTemplateColumns: "60% 40%" }}>
          {/* Report Metadata */}
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
            <div className="font-semibold text-[13px] text-text-primary mb-3.5">{tr.report.reportMetadata}</div>

            <label className="field-label text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
              {tr.report.reportTitle}
            </label>
            <input type="text" defaultValue="Incident Triage Report — sample_auth.log" className="mb-3" />

            <label className="field-label text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
              {tr.report.caseRef}
            </label>
            <input type="text" className="font-mono mb-3" defaultValue="LTI-CASE-2026-0142" />

            <label className="field-label text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
              {tr.report.preparedBy}
            </label>
            <input type="text" defaultValue="analyst01" className="mb-4" />

            <div className="mt-4">
              <label className="field-label text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                {tr.report.includeSections}
              </label>
              <div className="flex flex-col gap-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
                <label className="flex items-center gap-2"><input type="checkbox" defaultChecked style={{ width: "auto" }} /> {tr.report.severitySummary}</label>
                <label className="flex items-center gap-2"><input type="checkbox" defaultChecked style={{ width: "auto" }} /> {tr.report.narrativeReport}</label>
                <label className="flex items-center gap-2"><input type="checkbox" defaultChecked style={{ width: "auto" }} /> {tr.report.iocSummary}</label>
                <label className="flex items-center gap-2"><input type="checkbox" defaultChecked style={{ width: "auto" }} /> {tr.report.attackTimeline}</label>
                <label className="flex items-center gap-2"><input type="checkbox" style={{ width: "auto" }} /> {tr.report.chainOfCustody}</label>
              </div>
            </div>

            <button
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium cursor-pointer border-none mt-4.5"
              style={{ background: "var(--accent)", color: "#fff" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "var(--accent)")}
            >
              {tr.report.generateReport}
            </button>
          </div>

          {/* Preview */}
          <div className="bg-bg-elevated border border-border-subtle rounded-lg self-start">
            <div className="px-5 py-4 border-b border-border-subtle font-semibold text-[13px] text-text-primary">
              {tr.report.preview}
            </div>
            <div className="p-5">
              <div className="font-bold text-sm mb-0.5">Incident Triage Report</div>
              <div className="text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>
                LTI-CASE-2026-0142 · {tr.report.generatedLabel} Jul 05, 2026
              </div>
              <div className="flex items-center gap-2 mb-3.5">
                <span className="badge badge-high">High</span>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>5 incidents · sample_auth.log</span>
              </div>
              <div className="text-[12.5px] mb-3.5" style={{ color: "var(--text-secondary)" }}>
                Multiple failed authentication attempts were observed from a single external source, followed by
                a successful login and subsequent privilege escalation...
              </div>
              <div className="wire-note text-[11px] italic" style={{ color: "var(--text-muted)" }}>
                {tr.report.previewText}
              </div>
            </div>
          </div>
        </div>

        {/* Previous Reports */}
        <div className="bg-bg-elevated border border-border-subtle rounded-lg mt-4">
          <div className="px-5 py-4 border-b border-border-subtle font-semibold text-[13px] text-text-primary">
            {tr.report.previousReports}
          </div>

          <div className="px-5 py-3.5 border-b border-border-subtle">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-text-primary truncate">
                  Incident Triage Report — auth_prod_0702.log
                </div>
                <div className="flex items-center gap-2 text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                  <span className="font-mono" style={{ color: "var(--text-secondary)" }}>LTI-CASE-2026-0139</span>
                  <span style={{ color: "var(--border-strong)" }}>·</span>
                  <span>Jul 02, 2026</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <span className="badge badge-type">PDF</span>
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border-none cursor-pointer"
                  style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--border-subtle)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
                >
                  <Download size={13} />
                  {tr.report.download}
                </button>
              </div>
            </div>
          </div>

          <div className="px-5 py-2 text-[11px] italic" style={{ color: "var(--text-muted)" }}>
            Showing 1 of 1 report
          </div>
        </div>
      </div>
    </AppShell>
  );
}
