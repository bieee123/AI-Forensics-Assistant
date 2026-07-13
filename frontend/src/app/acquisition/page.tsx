"use client";
import { useState, useEffect } from "react";
import { Zap, AlertCircle, CheckCircle, Loader2, ShieldCheck } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { api, AcquireResponse, Artifact } from "@/lib/api";
import { getLang, t, Lang } from "@/lib/i18n";
import { fmtDate } from "@/lib/utils";

export default function AcquisitionPage() {
  const [lang, setLangState] = useState<Lang>("en");

  // Form state
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("");
  const [authMethod, setAuthMethod] = useState<"password" | "key">("password");
  const [password, setPassword] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [remotePath, setRemotePath] = useState("/var/log/auth.log");

  // Acquisition state
  const [acquiring, setAcquiring] = useState(false);
  const [result, setResult] = useState<AcquireResponse | null>(null);
  const [error, setError] = useState("");
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loadingArtifacts, setLoadingArtifacts] = useState(true);

  useEffect(() => { setLangState(getLang()); }, []);
  useEffect(() => {
    const handler = () => setLangState(getLang());
    window.addEventListener("lang-change", handler);
    return () => window.removeEventListener("lang-change", handler);
  }, []);

  const tr = t(lang);

  // Load artifacts on mount
  useEffect(() => {
    api.getArtifacts()
      .then(setArtifacts)
      .catch(() => {})
      .finally(() => setLoadingArtifacts(false));
  }, []);

  const handleAcquire = async () => {
    if (!host || !username || !remotePath) {
      setError("Host, username, and remote path are required");
      return;
    }
    if (authMethod === "password" && !password) {
      setError("Password is required");
      return;
    }

    setAcquiring(true);
    setError("");
    setResult(null);

    try {
      const payload: Record<string, unknown> = {
        host,
        port: parseInt(port) || 22,
        username,
        remote_log_path: remotePath,
      };
      if (authMethod === "password") {
        payload.password = password;
      } else {
        payload.private_key_path = privateKey;
      }

      const res = await api.acquireArtifact(payload as never);
      setResult(res);

      // Refresh artifacts list
      const updated = await api.getArtifacts();
      setArtifacts(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Acquisition failed";
      setError(msg);
    } finally {
      setAcquiring(false);
    }
  };

  return (
    <AppShell>
      <PageHeader title={tr.acquisition.title} subtitle={tr.acquisition.subtitle} />
      <div className="p-6">
        <div className="grid gap-4" style={{ gridTemplateColumns: "3fr 2fr" }}>
          {/* LEFT COLUMN */}
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
                    value={host} onChange={e => setHost(e.target.value)}
                    style={{ fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px", outline: "none" }} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    {tr.acquisition.port}
                  </label>
                  <input type="text" className="font-mono w-full" placeholder="22"
                    value={port} onChange={e => setPort(e.target.value)}
                    style={{ fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px", outline: "none" }} />
                </div>
              </div>

              <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    {tr.acquisition.username}
                  </label>
                  <input type="text" className="w-full" placeholder="root"
                    value={username} onChange={e => setUsername(e.target.value)}
                    style={{ fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px", outline: "none" }} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    {tr.acquisition.authMethod}
                  </label>
                  <select className="w-full"
                    value={authMethod} onChange={e => setAuthMethod(e.target.value as "password" | "key")}
                    style={{ fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px", outline: "none" }}>
                    <option value="password">{tr.acquisition.password}</option>
                    <option value="key">{tr.acquisition.sshKey}</option>
                  </select>
                </div>
              </div>

              {authMethod === "password" ? (
                <div className="mb-3">
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    {tr.acquisition.password}
                  </label>
                  <input type="password" className="w-full" placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)}
                    style={{ fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px", outline: "none" }} />
                </div>
              ) : (
                <div className="mb-3">
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    {tr.acquisition.privateKey}
                  </label>
                  <textarea rows={3} className="font-mono w-full" placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                    value={privateKey} onChange={e => setPrivateKey(e.target.value)}
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px", outline: "none", resize: "vertical" }} />
                </div>
              )}

              <div className="mb-3">
                <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Remote Log Path
                </label>
                <input type="text" className="font-mono w-full" placeholder="/var/log/auth.log"
                  value={remotePath} onChange={e => setRemotePath(e.target.value)}
                  style={{ fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px", outline: "none" }} />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs mb-3 p-2.5 rounded-md" style={{ background: "rgba(255,77,106,0.1)", color: "var(--severity-critical)" }}>
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-[11px] italic" style={{ color: "var(--text-muted)" }}>
                  {tr.acquisition.target}
                </span>
                <button
                  onClick={handleAcquire}
                  disabled={acquiring}
                  className="inline-flex items-center gap-1.5 py-[7px] px-3.5 rounded-md text-[13px] font-medium cursor-pointer border-none"
                  style={{ whiteSpace: "nowrap", background: acquiring ? "var(--text-muted)" : "var(--accent)", color: "#fff", opacity: acquiring ? 0.7 : 1 }}
                  onMouseEnter={e => { if (!acquiring) e.currentTarget.style.background = "var(--accent-hover)"; }}
                  onMouseLeave={e => { if (!acquiring) e.currentTarget.style.background = "var(--accent)"; }}
                >
                  {acquiring ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  {acquiring ? "Acquiring..." : tr.acquisition.connect}
                </button>
              </div>
            </div>

            {/* Acquisition Log / Result */}
            {result && (
              <div className="bg-bg-elevated border border-border-subtle rounded-lg">
                <div className="flex justify-between items-center px-5 py-4 border-b border-border-subtle">
                  <span className="font-semibold text-[13px] text-text-primary">
                    Acquisition Result
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle size={14} style={{ color: "var(--severity-low)" }} />
                    <span className="font-mono text-[11px]" style={{ color: "var(--severity-low)" }}>COMPLETED</span>
                  </span>
                </div>
                <div className="p-4">
                  <div className="terminal-panel" style={{ height: "auto", maxHeight: 280 }}>
                    <div className="t-ok">✓ SSH connected to {result.host}</div>
                    <div className="t-info">  Pulled: {result.remote_path}</div>
                    <div className="t-info">  Size:  {result.file_size_bytes.toLocaleString()} bytes</div>
                    <div className="t-dim">  Saved: {result.local_path.split("/").pop()}</div>
                    <div className="t-ok">✓ SHA-256: {result.sha256_hash}</div>
                    <div className="t-ok">✓ Parsed {result.total_entries_parsed} entries → Upload #{result.upload_id}</div>
                    <div className="t-dim mt-1">  Acquired at: {result.acquired_at}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Chain of Custody Record */}
          <div className="bg-bg-elevated border border-border-subtle rounded-lg self-start">
            <div className="px-4 py-3 border-b border-border-subtle font-semibold text-[13px] text-text-primary">
              {tr.acquisition.chainCustody}
            </div>

            {loadingArtifacts && (
              <div className="px-4 py-6 flex items-center justify-center gap-2" style={{ color: "var(--text-muted)" }}>
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs">Loading artifacts...</span>
              </div>
            )}

            {!loadingArtifacts && artifacts.length === 0 && (
              <div className="px-4 py-6 text-center">
                <ShieldCheck size={28} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  No artifacts acquired yet.<br />Connect to a target to start.
                </p>
              </div>
            )}

            {!loadingArtifacts && artifacts.map((a, i) => (
              <div key={a.filename} className="px-4 py-3 border-b border-border-subtle">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[13px] text-text-primary truncate" style={{ maxWidth: "70%" }} title={a.filename}>
                    {a.filename.length > 28 ? a.filename.substring(0, 28) + '...' : a.filename}
                  </span>
                  <span className="badge badge-low">VERIFIED</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>
                  <span className="font-mono" style={{ color: "var(--text-secondary)" }}>
                    {a.acquired_at !== "unknown" ? fmtDate(a.acquired_at) : "—"}
                  </span>
                  <span style={{ color: "var(--border-strong)" }}>·</span>
                  <span>{(a.size_bytes / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium flex-shrink-0" style={{ color: "var(--text-muted)" }}>SHA-256</span>
                  <span className="custody-hash text-[10px]" style={{ fontSize: 10 }}>
                    {a.sha256 !== "unknown" ? a.sha256 : "Pending"}
                  </span>
                </div>
              </div>
            ))}

            {/* Footer */}
            <div className="px-4 py-2.5 text-[10px] italic leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {result
                ? `${artifacts.length} artifact(s) acquired · latest upload #${result.upload_id}`
                : tr.acquisition.custodyNote}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
