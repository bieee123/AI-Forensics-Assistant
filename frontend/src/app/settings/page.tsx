"use client";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import StatusDot from "@/components/ui/StatusDot";
import { api, Health } from "@/lib/api";
import { getLang, setLang, t, Lang } from "@/lib/i18n";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [lang, setLangState] = useState<Lang>("en");
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); setLangState(getLang()); }, []);
  useEffect(() => {
    const handler = () => setLangState(getLang());
    window.addEventListener("lang-change", handler);
    return () => window.removeEventListener("lang-change", handler);
  }, []);

  useEffect(() => {
    api.getHealth()
      .then(data => { setHealth(data); setHealthError(false); })
      .catch(() => setHealthError(true));
  }, []);

  const tr = t(lang);

  const changeLang = (l: Lang) => {
    setLang(l);
    setLangState(l);
    window.dispatchEvent(new Event("lang-change"));
  };

  if (!mounted) return null;

  return (
    <AppShell>
      <PageHeader title={tr.settings.title} />
      <div className="p-6 flex flex-col gap-4 max-w-[640px]">
        {/* Appearance */}
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
          <div className="font-semibold text-[13px] text-text-primary mb-3.5">{tr.settings.appearance}</div>

          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
            {tr.settings.theme}
          </label>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTheme("light")}
              className={`py-2 px-4 rounded-md text-[13px] border cursor-pointer font-sans ${theme === "light" ? "bg-accent-bg text-accent border-accent font-semibold" : "bg-bg-elevated border-border-subtle text-text-secondary"}`}
            >
              {tr.settings.light}
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`py-2 px-4 rounded-md text-[13px] border cursor-pointer font-sans ${theme === "dark" ? "bg-accent-bg text-accent border-accent font-semibold" : "bg-bg-elevated border-border-subtle text-text-secondary"}`}
            >
              {tr.settings.dark}
            </button>
          </div>

          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
            {tr.settings.language}
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => changeLang("en")}
              className={`py-2 px-4 rounded-md text-[13px] border cursor-pointer font-sans ${lang === "en" ? "bg-accent-bg text-accent border-accent font-semibold" : "bg-bg-elevated border-border-subtle text-text-secondary"}`}
            >
              {tr.settings.english}
            </button>
            <button
              onClick={() => changeLang("id")}
              className={`py-2 px-4 rounded-md text-[13px] border cursor-pointer font-sans ${lang === "id" ? "bg-accent-bg text-accent border-accent font-semibold" : "bg-bg-elevated border-border-subtle text-text-secondary"}`}
            >
              {tr.settings.bahasa}
            </button>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
          <div className="font-semibold text-[13px] text-text-primary mb-3.5">{tr.settings.systemStatus}</div>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--text-secondary)" }}>{tr.settings.ollama}</span>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full inline-block ${health?.ollama_connected ? "status-dot-active" : ""}`}
                  style={{ background: health?.ollama_connected ? "var(--severity-low)" : "var(--severity-critical)" }} />
                <span className="font-mono text-xs" style={{ color: health?.ollama_connected ? "var(--severity-low)" : "var(--severity-critical)" }}>
                  llama3:8b
                </span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--text-secondary)" }}>{tr.settings.chromadb}</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block status-dot-active" style={{ background: "var(--severity-low)" }} />
                <span className="font-mono text-xs" style={{ color: "var(--severity-low)" }}>nomic-embed-text</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--text-secondary)" }}>{tr.settings.postgres}</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block status-dot-active" style={{ background: "var(--severity-low)" }} />
                <span className="font-mono text-xs" style={{ color: "var(--severity-low)" }}>forensics_db</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--text-secondary)" }}>{tr.settings.apiBackend}</span>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full inline-block ${!healthError && health ? "status-dot-active" : ""}`}
                  style={{ background: !healthError && health ? "var(--severity-low)" : "var(--severity-critical)" }} />
                <span className="font-mono text-xs" style={{ color: !healthError && health ? "var(--severity-low)" : "var(--severity-critical)" }}>
                  localhost:8000
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Model Configuration */}
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
          <div className="font-semibold text-[13px] text-text-primary mb-3.5">{tr.settings.modelConfig}</div>
          <div className="flex flex-col gap-2.5 text-[13px]">
            <div className="flex justify-between">
              <span style={{ color: "var(--text-secondary)" }}>{tr.settings.llmModel}</span>
              <span className="font-mono">llama3:8b</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--text-secondary)" }}>{tr.settings.embeddingModel}</span>
              <span className="font-mono">nomic-embed-text</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--text-secondary)" }}>{tr.settings.apiBaseUrl}</span>
              <span className="font-mono">http://localhost:8000</span>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
          <div className="font-semibold text-[13px] text-text-primary mb-3.5">{tr.settings.about}</div>
          <div className="flex flex-col gap-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            <div>{tr.settings.version}: <span className="font-mono">{tr.settings.versionText}</span></div>
            <div>{tr.settings.client}: {tr.settings.client}</div>
            <div>{tr.settings.project}: {tr.settings.project}</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
