"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { AnalysisJob, getActiveJob } from "@/lib/analysisStore"

function CircularProgress({ percent, status }: { percent: number; status: string }) {
  const r = 12, circ = 2 * Math.PI * r
  const dash = circ - (circ * Math.min(percent, 100)) / 100
  const color = status === "done" ? "var(--severity-low)"
    : status === "error" ? "var(--severity-critical)"
    : "var(--accent)"
  return (
    <svg width="36" height="36" viewBox="0 0 32 32" className="flex-shrink-0">
      <circle cx="16" cy="16" r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="2.5" />
      <circle cx="16" cy="16" r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
        transform="rotate(-90 16 16)"
        style={{ transition: "stroke-dashoffset 0.4s ease" }} />
      <text x="16" y="20" textAnchor="middle" fontSize="9" fill={color} fontWeight="700">
        {status === "done" ? "✓" : status === "error" ? "✗" : `${percent}%`}
      </text>
    </svg>
  )
}

export default function AnalysisProgressToast() {
  const [job, setJob] = useState<AnalysisJob | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setJob(getActiveJob())
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as AnalysisJob | null
      setJob(detail)
      if (detail) setDismissed(false)
    }
    window.addEventListener("analysis-job-update", handler)
    return () => window.removeEventListener("analysis-job-update", handler)
  }, [])

  if (!job || dismissed) return null

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl cursor-pointer"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        minWidth: 280, maxWidth: 360,
      }}
      onClick={() => {
        if (job.status === "done") {
          router.push(`/analysis?upload_id=${job.uploadId}`)
        }
      }}
    >
      <CircularProgress percent={job.progress} status={job.status} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
          {job.status === "done" ? "Analysis complete!"
            : job.status === "error" ? "Analysis failed"
            : "Analyzing..."}
        </p>
        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
          {job.filename}
          {job.status === "done" && " · Click to view results"}
        </p>
        {job.status === "running" && (
          <div className="mt-1.5 h-0.5 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${job.progress}%`, background: "var(--accent)" }} />
          </div>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); setDismissed(true) }}
        className="flex-shrink-0 p-1 rounded"
        style={{ color: "var(--text-muted)", border: "none", background: "transparent", cursor: "pointer" }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
