"use client";
import { useState, useEffect } from "react";
import { Zap } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { getLang, t, Lang } from "@/lib/i18n";

export default function AcquisitionPage() {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => { setLangState(getLang()); }, []);
  useEffect(() => {
    const handler = () => setLangState(getLang());
    window.addEventListener("lang-change", handler);
    return () => window.removeEventListener("lang-change", handler);
  }, []);

  const tr = t(lang);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const terminalLines: string[] = tr.acquisition.terminal as any;

  return (
    <AppShell>
      <PageHeader title={tr.acquisition.title} subtitle={tr.acquisition.subtitle} />
      <div className="p-6">
        <div className="grid gap-4" style={{ gridTemplateColumns: "5fr 2fr" }}>
          {/* LEFT COLUMN: Target Server Connection + Acquisition Process Log */}
          <div className="flex flex-col gap-4">
            {/* Target Server Connection */}
            <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
              <div className="font-semibold text-[13px] text-text-primary mb-3.5">Target Server Connection</div>
              <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    {tr.acquisition.host}
                  </label>
                  <input type="text" className="font-mono w-full" placeholder="10.20.4.112"
                    style={{ fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px", outline: "none" }} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    {tr.acquisition.port}
                  </label>
                  <input type="text" className="font-mono w-full" placeholder="22"
                    style={{ fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px", outline: "none" }} />
                </div>
              </div>
              <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    {tr.acquisition.username}
                  </label>
                  <input type="text" className="w-full" placeholder="root"
                    style={{ fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px", outline: "none" }} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    {tr.acquisition.authMethod}
                  </label>
                  <select className="w-full"
                    style={{ fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px", outline: "none" }}>
                    <option>{tr.acquisition.sshKey}</option>
                    <option>{tr.acquisition.password}</option>
                  </select>
                </div>
              </div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                {tr.acquisition.privateKey}
              </label>
              <textarea rows={3} className="font-mono w-full" placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px", outline: "none", resize: "vertical" }} />
              <div className="flex justify-between items-center mt-3.5">
                <span className="text-[11px] italic" style={{ color: "var(--text-muted)" }}>
                  {tr.acquisition.target}
                </span>
                <button
                  className="inline-flex items-center gap-1.5 py-[7px] px-3.5 rounded-md text-[13px] font-medium cursor-pointer border-none"
                  style={{ background: "var(--accent)", color: "#fff" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "var(--accent)")}
                >
                  <Zap size={14} />
                  {tr.acquisition.connect}
                </button>
              </div>
            </div>

            {/* Acquisition Process Log */}
            <div className="bg-bg-elevated border border-border-subtle rounded-lg">
              <div className="flex justify-between items-center px-5 py-4 border-b border-border-subtle">
                <span className="font-semibold text-[13px] text-text-primary">
                  {tr.acquisition.logTitle}{" "}
                  <span className="font-normal text-text-muted">({tr.acquisition.realtime})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="status-dot-active w-[7px] h-[7px] rounded-full inline-block" style={{ background: "var(--severity-low)" }} />
                  <span className="font-mono text-[11px]" style={{ color: "var(--severity-low)" }}>{tr.acquisition.streaming}</span>
                </span>
              </div>
              <div className="p-4">
                <div className="terminal-panel">
                  {terminalLines.map((line: string, i: number) => (
                    <div key={i} dangerouslySetInnerHTML={{ __html: line }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Chain of Custody Record */}
          <div className="bg-bg-elevated border border-border-subtle rounded-lg self-start">
            <div className="px-4 py-3 border-b border-border-subtle font-semibold text-[13px] text-text-primary">
              {tr.acquisition.chainCustody}
            </div>

            {/* Artifact 1 */}
            <div className="px-4 py-3 border-b border-border-subtle">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[13px] font-semibold text-text-primary">disk_sda.dd</span>
                <span className="badge badge-low">VERIFIED</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>
                <span className="font-mono" style={{ color: "var(--text-secondary)" }}>2026-07-05 00:02:15</span>
                <span style={{ color: "var(--border-strong)" }}>·</span>
                <span>analyst01</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium flex-shrink-0" style={{ color: "var(--text-muted)" }}>SHA-256</span>
                <span className="custody-hash text-[10px]" style={{ fontSize: 10 }}>a3f184e7c92d01b6f80e5a3c9b02c7</span>
              </div>
            </div>

            {/* Artifact 2 */}
            <div className="px-4 py-3 border-b border-border-subtle">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[13px] font-semibold text-text-primary">memdump.lime</span>
                <span className="badge badge-low">VERIFIED</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>
                <span className="font-mono" style={{ color: "var(--text-secondary)" }}>2026-07-05 00:02:41</span>
                <span style={{ color: "var(--border-strong)" }}>·</span>
                <span>analyst01</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium flex-shrink-0" style={{ color: "var(--text-muted)" }}>SHA-256</span>
                <span className="custody-hash text-[10px]" style={{ fontSize: 10 }}>7e44d29a81c3f506b2e9a4d1f80a</span>
              </div>
            </div>

            {/* Footer note */}
            <div className="px-4 py-2.5 text-[10px] italic leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {tr.acquisition.custodyNote}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
