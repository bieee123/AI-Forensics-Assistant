"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { AnalysisJob, getActiveJob } from "@/lib/analysisStore"

function CircularProgress({ percent, status }: { percent: number; status: string }) {
  const r = 20, circ = 2 * Math.PI * r
  const dash = circ - (circ * Math.min(percent, 100)) / 100
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
      <circle cx="26" cy="26" r={r} fill="none" stroke="white" strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
        transform="rotate(-90 26 26)"
        style={{ transition: "stroke-dashoffset 0.4s ease" }} />
      <text x="26" y="31" textAnchor="middle" fontSize="11" fill="white" fontWeight="700">
        {status === "done" ? "✓" : status === "error" ? "✗" : `${percent}%`}
      </text>
    </svg>
  )
}

export default function AnalysisProgressToast() {
  const [job, setJob] = useState<AnalysisJob | null>(() => getActiveJob())
  const [dismissed, setDismissed] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [hovered, setHovered] = useState(false)
  const collapseTimerRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as AnalysisJob | null
      setJob(detail)
      if (detail) {
        setDismissed(false)
        setCollapsed(false)
        if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
        if (detail.status === "running") {
          collapseTimerRef.current = setTimeout(() => setCollapsed(true), 20000)
        }
        if (detail.status === "done" || detail.status === "error") {
          setCollapsed(false)
          if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
        }
      } else {
        if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
      }
    }
    window.addEventListener("analysis-job-update", handler)
    return () => {
      window.removeEventListener("analysis-job-update", handler)
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
    }
  }, [])

  if (!job || dismissed) return null

  const bgColor = job.status === "done" ? "var(--severity-low)"
    : job.status === "error" ? "var(--severity-critical)"
    : "var(--accent)"

  if (collapsed && !hovered) {
    return (
      <div
        className="fixed bottom-6 right-6 z-[9999] cursor-pointer"
        style={{
          width: 56, height: 56, borderRadius: "50%",
          background: bgColor,
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          transition: "all 0.3s ease",
        }}
        onClick={() => {
          if (job.status === "done" && job.result) {
            router.push(`/analysis?upload_id=${job.uploadId}`)
          }
          setCollapsed(false)
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={`Analyzing ${job.filename} — ${job.progress}%`}
      >
        <CircularProgress percent={job.progress} status={job.status} />
      </div>
    )
  }

  return (
    <div
      className="fixed z-[9999] rounded-xl shadow-2xl overflow-hidden"
      style={{
        bottom: collapsed ? 24 : "auto",
        right: 16,
        top: collapsed ? "auto" : 16,
        minWidth: 280,
        maxWidth: 360,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        transition: "all 0.3s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="h-1" style={{ background: bgColor }} />
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: bgColor }}>
          <svg width="36" height="36" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="13" fill="none"
              stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
            <circle cx="18" cy="18" r="13" fill="none"
              stroke="white" strokeWidth="2.5"
              strokeDasharray={2 * Math.PI * 13}
              strokeDashoffset={2 * Math.PI * 13 * (1 - job.progress / 100)}
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
              style={{ transition: "stroke-dashoffset 0.4s ease" }} />
            <text x="18" y="22" textAnchor="middle" fontSize="8"
              fill="white" fontWeight="700">
              {job.status === "done" ? "✓"
                : job.status === "error" ? "✗"
                : `${job.progress}%`}
            </text>
          </svg>
        </div>
        <div className="flex-1 min-w-0"
          onClick={() => {
            if (job.status === "done") {
              router.push(`/analysis?upload_id=${job.uploadId}`)
            }
          }}
          style={{ cursor: job.status === "done" ? "pointer" : "default" }}>
          <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {job.status === "done" ? "✓ Analysis complete!"
              : job.status === "error" ? "✗ Analysis failed"
              : "Analyzing..."}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
            {job.filename}
            {job.status === "done" ? " · Click to view results" : ""}
          </p>
          {job.status === "running" && (
            <div className="mt-1.5 h-0.5 rounded-full overflow-hidden"
              style={{ background: "var(--border-subtle)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${job.progress}%`, background: bgColor }} />
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setDismissed(true) }}
          className="flex-shrink-0 p-1 rounded"
          style={{ color: "var(--text-muted)", border: "none", background: "transparent", cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
