"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronRight, AlertCircle, Clock, Upload } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { api, LogEntry, Upload as UploadType } from "@/lib/api";
import { getLang, t, Lang } from "@/lib/i18n";
import { eventDotColor, formatEventType, eventBadgeClass, fmtTime, fmtDateShort } from "@/lib/utils";

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

  useEffect(() => { setLangState(getLang()); }, []);
  useEffect(() => {
    const handler = () => setLangState(getLang());
    window.addEventListener("lang-change", handler);
    return () => window.removeEventListener("lang-change", handler);
  }, []);

  const tr = t(lang);

  // Fetch recent uploads unconditionally on mount
  useEffect(() => {
    api.getUploads().then(setUploads).catch(() => {});
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

  // NO UPLOAD SELECTED — show picker
  if (!activeUploadId) {
    return (
      <AppShell>
        <PageHeader title={tr.timeline.title} subtitle={tr.timeline.subtitle} />
        <div className="p-6">
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-10 text-center max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
              <Clock size={28} />
            </div>
            <div className="font-semibold text-[15px] mb-1 text-text-primary">{tr.timeline.selectUpload}</div>
            <div className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              {tr.timeline.pickUpload}
            </div>
            {uploads.length > 0 ? (
              <div className="grid gap-2 text-left">
                {uploads.slice(0, 8).map(u => (
                  <button
                    key={u.upload_id}
                    onClick={() => selectUpload(u.upload_id)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all text-left w-full"
                    style={{ background: "var(--bg-base)", borderColor: "var(--border-subtle)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-bg)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-base)"; e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                  >
                    <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                      <Upload size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-text-primary truncate">{u.filename}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {u.total_entries.toLocaleString()} entries · {fmtDateShort(u.uploaded_at)}
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                No uploads yet. Go to Upload page first.
              </div>
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
                  <span style={{ color: "var(--border-strong)" }}>·</span>
                  <span>IP: {entry.source_ip}</span>
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
                    User <span className="font-mono">&apos;{entry.user}&apos;</span> via {entry.auth_method} from {entry.source_ip}
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
