"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, HardDrive } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { api, Upload as UploadType } from "@/lib/api";
import { getLang, t, Lang } from "@/lib/i18n";
import { fmtDate, fileTypeBadge } from "@/lib/utils";

export default function UploadPage() {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>("en");
  const [file, setFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [uploads, setUploads] = useState<UploadType[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uploadType, setUploadType] = useState<"system" | "disk">("system");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLangState(getLang()); }, []);
  useEffect(() => {
    const handler = () => setLangState(getLang());
    window.addEventListener("lang-change", handler);
    return () => window.removeEventListener("lang-change", handler);
  }, []);

  const tr = t(lang);

  const fetchUploads = async () => {
    try {
      const data = await api.getUploads();
      setUploads(data);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchUploads(); }, []);

  const handleUpload = async () => {
    const fileToUpload = file || (pasteText.trim() ? new Blob([pasteText], { type: "text/plain" }) : null);
    if (!fileToUpload) return;

    setUploading(true);
    setMessage(null);
    try {
      const actualFile = file || new File([fileToUpload], "pasted_log.txt", { type: "text/plain" });
      const result = await api.uploadFile(actualFile);
      setMessage({ type: "success", text: `${result.total_entries_parsed} ${tr.upload.success}` });
      setFile(null);
      setPasteText("");
      fetchUploads();
    } catch {
      setMessage({ type: "error", text: tr.upload.error });
    } finally {
      setUploading(false);
    }
  };

  const detectedType = file
    ? (file.name.endsWith(".json") || file.name.includes("telemetry") ? "telemetry" : "auth.log")
    : null;

  return (
    <AppShell>
      <PageHeader title={tr.upload.title} subtitle={tr.upload.subtitle} />
      <div className="p-6">
        {/* Upload type selector cards */}
        <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div
            onClick={() => setUploadType("system")}
            className={`border-[1.5px] rounded-lg p-[18px] cursor-pointer transition-colors
              ${uploadType === "system" ? "border-accent bg-accent-bg" : "border-border-subtle bg-bg-elevated hover:bg-bg-hover"}`}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
              style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
              <FileText size={18} />
            </div>
            <div className="font-semibold text-[13.5px] mb-1">{tr.upload.systemLog}</div>
            <div className="text-xs text-text-secondary mb-2">{tr.upload.systemLogDesc}</div>
            <div className="text-[11px] font-mono text-text-muted">.log · .txt · .json</div>
          </div>
          <div
            onClick={() => setUploadType("disk")}
            className={`border-[1.5px] rounded-lg p-[18px] cursor-pointer transition-colors
              ${uploadType === "disk" ? "border-accent bg-accent-bg" : "border-border-subtle bg-bg-elevated hover:bg-bg-hover"}`}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
              style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
              <HardDrive size={18} />
            </div>
            <div className="font-semibold text-[13.5px] mb-1">{tr.upload.diskArtifact}</div>
            <div className="text-xs text-text-secondary mb-2">{tr.upload.diskArtifactDesc}</div>
            <div className="text-[11px] font-mono text-text-muted">{uploadType === "disk" ? tr.upload.supportedDisk : ".raw · .dd · .mem"}</div>
          </div>
        </div>

        {/* Upload zone */}
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6 mb-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) setFile(f);
            }}
            className="border-[1.5px] border-dashed rounded-lg p-10 text-center cursor-pointer"
            style={{ borderColor: "var(--border-strong)", background: "var(--bg-base)", color: "var(--text-secondary)" }}
          >
            <div className="mb-2.5" style={{ color: "var(--text-muted)" }}>
              <UploadCloud size={32} />
            </div>
            <div className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>{tr.upload.dropzone}</div>
            <div className="text-xs mb-3.5" style={{ color: "var(--text-muted)" }}>
              {uploadType === "disk" ? tr.upload.supportedDisk : tr.upload.supported}
            </div>
            <button
              onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="inline-flex items-center gap-1.5 py-[7px] px-3.5 rounded-md text-[13px] font-medium border border-border-subtle bg-bg-elevated cursor-pointer font-sans"
              style={{ color: "var(--text-primary)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-elevated)")}
            >
              {tr.upload.browse}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }}
            />
          </div>

          {/* File detected info */}
          {file && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{file.name}</span>
              {detectedType && (
                <span className="badge badge-type">{detectedType}</span>
              )}
            </div>
          )}

          {/* Paste textarea */}
          <div className="mt-4">
            <label className="field-label text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
              {tr.upload.paste}
            </label>
            <textarea
              rows={4}
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder={tr.upload.pastePlaceholder}
              style={{
                fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)",
                border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px",
                width: "100%", outline: "none", resize: "vertical",
              }}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end mt-3.5">
            <button
              onClick={handleUpload}
              disabled={uploading || (!file && !pasteText.trim())}
              className="inline-flex items-center gap-1.5 py-[7px] px-3.5 rounded-md text-[13px] font-medium cursor-pointer border-none"
              style={{
                background: (uploading || (!file && !pasteText.trim())) ? "var(--border-subtle)" : "var(--accent)",
                color: "#fff",
                opacity: (uploading || (!file && !pasteText.trim())) ? 0.5 : 1,
              }}
            >
              {uploading ? "Uploading..." : tr.upload.submit}
            </button>
          </div>

          {message && (
            <div
              className="mt-3 text-xs"
              style={{ color: message.type === "success" ? "var(--severity-low)" : "var(--severity-critical)" }}
            >
              {message.text}
            </div>
          )}
        </div>

        {/* Recent uploads table */}
        <div className="bg-bg-elevated border border-border-subtle rounded-lg">
          <div className="px-5 py-4 border-b border-border-subtle font-semibold text-[13px] text-text-primary">
            {tr.upload.recent}
          </div>
          {uploads.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Filename</th>
                  <th>Type</th>
                  <th>Entries</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploads.slice(0, 10).map((u) => {
                  const ft = fileTypeBadge(u.filename);
                  return (
                    <tr key={u.upload_id} className="row-hover">
                      <td className="font-mono">{u.upload_id}</td>
                      <td>{u.filename}</td>
                      <td><span className={ft.cls}>{ft.label}</span></td>
                      <td className="font-mono">{u.total_entries.toLocaleString()}</td>
                      <td className="font-mono">{fmtDate(u.uploaded_at)}</td>
                      <td>
                        <button
                          onClick={() => router.push(`/analysis?upload_id=${u.upload_id}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border border-border-subtle bg-bg-elevated cursor-pointer font-sans mr-1"
                          style={{ color: "var(--text-primary)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-elevated)")}
                        >
                          {tr.upload.view}
                        </button>
                        <button
                          onClick={() => router.push(`/analysis?upload_id=${u.upload_id}&run=true`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer border-none"
                          style={{ background: "var(--accent)", color: "#fff" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-hover)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "var(--accent)")}
                        >
                          {tr.upload.analyze}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <UploadCloud size={32} />
              <span>{tr.upload.noRecent}</span>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
