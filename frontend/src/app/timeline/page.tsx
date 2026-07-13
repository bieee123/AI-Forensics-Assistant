"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronRight, AlertCircle, Eye } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { api, LogEntry, Upload as UploadType } from "@/lib/api";
import { getLang, t, Lang } from "@/lib/i18n";
import { eventDotColor, formatEventType, eventBadgeClass, fmtTime, fmtDateShort, fileTypeBadge } from "@/lib/utils";

function TimelinePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uploadIdParam = searchParams.get("upload_id");
  const activeUploadId = uploadIdParam ? parseInt(uploadIdParam) : null;

  const [lang, setLangState] = useState<Lang>("en");
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [uploads, setUploads] = useState<UploadType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [uploadsLoading, setUploadsLoading] = useState(false);

  useEffect(() => { setLangState(getLang()); }, []);
  useEffect(() => {
    const handler = () => setLangState(getLang());
    window.addEventListener("lang-change", handler);
    return () => window.removeEventListener("lang-change", handler);
  }, []);

  const tr = t(lang);

  // Fetch recent uploads unconditionally on mount
  useEffect(() => {
    setUploadsLoading(true);
    api.getUploads().then(setUploads).catch(() => {}).finally(() => setUploadsLoading(false));
  }, []);

  // Fetch entries when activeUploadId changes
  useEffect(() => {
    if (activeUploadId) {
      setLoading(true);
      setError("");
      setEntries([]);
      api.getEntries(activeUploadId)
        .then(data => setEntries(data))
        .catch(() => setError("Failed to load timeline"))
        .finally(() => setLoading(false));
    }
  }, [activeUploadId]);

  const selectUpload = (id: number) => {
    router.replace(`/timeline?upload_id=${id}`);
  };

  const selectedUpload = uploads.find(u => u.upload_id === activeUploadId);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // NO UPLOAD SELECTED — data table
  if (!activeUploadId) {
    return (
      <AppShell>
        <PageHeader title={tr.timeline.title} subtitle={tr.timeline.subtitle} crumbs={[{ label: "Home", href: "/" }, { label: "Timeline" }]} />
        <div className="p-6">
          <div className="bg-bg-elevated border border-border-subtle rounded-lg overflow-hidden">
            {uploadsLoading ? (
              <div className="empty-state">
                <span>Loading uploads...</span>
              </div>
            ) : uploads.length === 0 ? (
              <div className="empty-state">
                <span>No uploads found.</span>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>File Name</th>
                    <th>Log Type</th>
                    <th>Entry Count</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map((u) => (
                    <tr key={u.upload_id} className="row-hover">
                      <td className="font-mono">#{u.upload_id}</td>
                      <td>{u.filename}</td>
                      <td><span className={fileTypeBadge(u.filename).cls}>{fileTypeBadge(u.filename).label}</span></td>
                      <td><span className="font-mono" style={{ color: "var(--text-muted)" }}>{u.total_entries} entries</span></td>
                      <td>
                        <button
                          onClick={() => selectUpload(u.upload_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer border-none transition-all"
                          style={{ background: "var(--accent)", color: "#fff" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-hover)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,180,216,0.3)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.boxShadow = "none"; }}
                        >
                          <Eye size={13} />
                          View Timeline
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  // TIMELINE VIEW — with active upload and entries loaded
  return (
    <AppShell>
      <PageHeader
        title={tr.timeline.title}
        subtitle={selectedUpload ? `Upload #${activeUploadId} · ${selectedUpload.filename}` : tr.timeline.subtitle}
        crumbs={
          selectedUpload
            ? [{ label: "Home", href: "/" }, { label: "Timeline", href: "/timeline" }, { label: `Upload #${activeUploadId}` }]
            : [{ label: "Home", href: "/" }, { label: "Timeline" }]
        }
      />
      <div className="p-6">
        {/* Filters */}
        <div className="flex gap-2.5 mb-5">
          <select style={{ width: "auto" }}>
            <option>{tr.timeline.allSeverities}</option>
          </select>
          <select style={{ width: "auto" }}>
            <option>{tr.timeline.allEventTypes}</option>
          </select>
          <select style={{ width: "auto" }}>
            <option>{tr.timeline.allIPs}</option>
          </select>
        </div>

        {loading && (
          <div className="empty-state">
            <span>Loading...</span>
          </div>
        )}

        {error && (
          <div className="empty-state">
            <AlertCircle size={32} style={{ color: "var(--severity-critical)" }} />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="empty-state">
            <AlertCircle size={32} />
            <span>{tr.timeline.noEvents}</span>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="incident-list">
            {entries.map((entry) => (
              <div key={entry.id} className="incident-item">
                <span className="inc-dot" style={{ background: eventDotColor(entry.event_type) }} />
                <div className="inc-meta">
                  <span>{fmtTime(entry.timestamp)}</span>
                  {entry.source_ip && (
                    <><span style={{ color: "var(--border-strong)" }}>·</span>
                    <span>IP: {entry.source_ip}</span></>
                  )}
                </div>
                <div className={`incident-card ${
                  entry.event_type === "privilege_escalation" ? "sev-critical" :
                  entry.event_type === "successful_login" ? "sev-info" :
                  entry.event_type === "invalid_user_attempt" || entry.event_type === "failed_login" ? "sev-high" : ""
                }`}>
                  <div className="flex items-center justify-between gap-2.5 flex-wrap font-semibold text-sm mb-1.5">
                    <span>{formatEventType(entry.event_type)}</span>
                    <span className={eventBadgeClass(entry.event_type)}>{formatEventType(entry.event_type)}</span>
                  </div>
                  <p className="text-[13px] m-0" style={{ color: "var(--text-secondary)" }}>
                    {entry.source_ip ? (
                      <>User <span className="font-mono">&apos;{entry.user}&apos;</span> via {entry.auth_method} from {entry.source_ip}</>
                    ) : (
                      <>Source: <span className="font-mono">{entry.source}</span></>
                    )}
                  </p>
                  <button
                    onClick={() => toggleExpand(entry.id)}
                    className="inline-flex items-center gap-1.5 mt-2.5 px-0 py-0 rounded-md text-xs border-none cursor-pointer bg-transparent"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
                  >
                    <ChevronRight
                      size={14}
                      style={{ transform: expandedIds.has(entry.id) ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}
                    />
                    {expandedIds.has(entry.id) ? tr.timeline.hideRaw : tr.timeline.showRaw}
                  </button>
                  {expandedIds.has(entry.id) && (
                    <div className="raw-log-box mt-3">{entry.raw_message}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function TimelinePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="empty-state"><span>Loading...</span></div></div>}>
      <TimelinePageContent />
    </Suspense>
  );
}
