"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Upload, Brain, Eye } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { api, Upload as UploadType } from "@/lib/api";
import { getLang, t, Lang } from "@/lib/i18n";
import { fmtDate, fileTypeBadge } from "@/lib/utils";
import { triggerAnalysis } from "@/lib/analysisService";

export default function HistoryPage() {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>("en");
  const [uploads, setUploads] = useState<UploadType[]>([]);
  const [filtered, setFiltered] = useState<UploadType[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { setLangState(getLang()); }, []);
  useEffect(() => {
    const handler = () => setLangState(getLang());
    window.addEventListener("lang-change", handler);
    return () => window.removeEventListener("lang-change", handler);
  }, []);

  const tr = t(lang);

  useEffect(() => {
    setLoading(true);
    setError("");
    api.getUploads()
      .then(data => {
        setUploads(data);
        setFiltered(data);
      })
      .catch(() => setError("Failed to load upload history"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(uploads);
    } else {
      const q = search.toLowerCase();
      setFiltered(uploads.filter(u => u.filename.toLowerCase().includes(q)));
    }
  }, [search, uploads]);

  return (
    <AppShell>
      <PageHeader title={tr.history.title} />
      <div className="p-6">
        {/* Search */}
        <div className="relative max-w-[320px] mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder={tr.history.search}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            style={{
              fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px", width: "100%", outline: "none",
            }}
          />
        </div>

        {loading && (
          <div className="empty-state">
            <span>Loading...</span>
          </div>
        )}

        {error && (
          <div className="empty-state">
            <Upload size={32} style={{ color: "var(--severity-critical)" }} />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <Upload size={32} />
            <span>{tr.history.noHistory}</span>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <div className="bg-bg-elevated border border-border-subtle rounded-lg">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{tr.history.filename}</th>
                    <th>{tr.history.type}</th>
                    <th>{tr.history.entries}</th>
                    <th>{tr.history.date}</th>
                    <th>{tr.history.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
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
                        <Eye size={12} />
                            {tr.history.view}
                          </button>
                          <button
                            onClick={() => { triggerAnalysis(u.upload_id, u.filename); router.push(`/analysis?upload_id=${u.upload_id}`); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer border-none"
                            style={{ background: "var(--accent)", color: "#fff" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-hover)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "var(--accent)")}
                          >
                        <Brain size={12} />
                            {tr.history.analyze}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="text-xs mt-2.5" style={{ color: "var(--text-muted)" }}>
              {tr.history.showing} {filtered.length} {tr.history.of} {uploads.length} {tr.history.uploads}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
