"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight, AlertCircle } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { api, LogEntry } from "@/lib/api";
import { getLang, t, Lang } from "@/lib/i18n";
import { eventDotColor, formatEventType, eventBadgeClass, fmtTime } from "@/lib/utils";

function TimelinePageContent() {
  const searchParams = useSearchParams();
  const uploadId = searchParams.get("upload_id");

  const [lang, setLangState] = useState<Lang>("en");
  const [entries, setEntries] = useState<LogEntry[]>([]);
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

  useEffect(() => {
    if (uploadId) {
      setLoading(true);
      setError("");
      api.getEntries(parseInt(uploadId))
        .then(data => setEntries(data))
        .catch(() => setError("Failed to load timeline"))
        .finally(() => setLoading(false));
    }
  }, [uploadId]);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AppShell>
      <PageHeader title={tr.timeline.title} subtitle={tr.timeline.subtitle} />
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
