"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { AnalysisJob, getActiveJob } from "@/lib/analysisStore"

const COLLAPSE_AFTER_MS = 20_000
const DEFAULT_POS = { x: 24, y: 24 } // bottom-right offsets in px

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

  // Drag state — position stored as { x, y } = distance from bottom-right corner
  const [pos, setPos] = useState(DEFAULT_POS)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null)

  const collapseTimerRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  // --- Collapse timer logic (Fix 3) ---
  const scheduleCollapse = useCallback((startedAt: string) => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
    const startMs = new Date(startedAt).getTime()
    const elapsed = Date.now() - startMs
    const remaining = COLLAPSE_AFTER_MS - elapsed
    if (remaining <= 0) {
      setCollapsed(true)
    } else {
      collapseTimerRef.current = setTimeout(() => setCollapsed(true), remaining)
    }
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as AnalysisJob | null
      setJob(prev => {
        // Reset position to default when a brand-new job starts
        if (detail && prev?.uploadId !== detail.uploadId) {
          setPos(DEFAULT_POS)
        }
        return detail
      })
      if (detail) {
        setDismissed(false)
        setCollapsed(false)
        if (detail.status === "running") {
          scheduleCollapse(detail.startedAt)
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
  }, [scheduleCollapse])

  // --- Drag handlers (Fix 5) ---
  const onBubbleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, posX: pos.x, posY: pos.y }
    setIsDragging(true)
  }, [pos])

  useEffect(() => {
    if (!isDragging) return

    const onMouseMove = (e: MouseEvent) => {
      if (!dragStart.current) return
      const dx = e.clientX - dragStart.current.mouseX
      const dy = e.clientY - dragStart.current.mouseY
      // Moving right → decrease right offset; moving down → decrease bottom offset
      const newX = Math.max(8, dragStart.current.posX - dx)
      const newY = Math.max(8, dragStart.current.posY - dy)
      setPos({ x: newX, y: newY })
    }

    const onMouseUp = () => {
      dragStart.current = null
      setIsDragging(false)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [isDragging])

  if (!job || dismissed) return null

  const bgColor = job.status === "done" ? "var(--severity-low)"
    : job.status === "error" ? "var(--severity-critical)"
    : "var(--accent)"

  // Collapsed bubble (Fix 4: click expands, not navigates; Fix 5: draggable)
  if (collapsed) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: pos.y,
          right: pos.x,
          zIndex: 9999,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: bgColor,
          boxShadow: isDragging
            ? "0 8px 32px rgba(0,0,0,0.45)"
            : "0 4px 20px rgba(0,0,0,0.3)",
          transition: isDragging ? "box-shadow 0.15s ease" : "all 0.3s ease",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
        }}
        onMouseDown={onBubbleMouseDown}
        onClick={(e) => {
          // Only expand on click (not after drag)
          if (!isDragging && dragStart.current === null) {
            setCollapsed(false)
          }
        }}
        title={`Analyzing ${job.filename} — ${job.progress}%`}
      >
        <CircularProgress percent={job.progress} status={job.status} />
        {/* Dismiss on bubble — small X in corner */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setDismissed(true) }}
          style={{
            position: "absolute",
            top: -4, right: -4,
            width: 18, height: 18,
            borderRadius: "50%",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 0,
            color: "var(--text-muted)",
          }}
        >
          <X size={10} />
        </button>
      </div>
    )
  }

  // Expanded toast card — at fixed position (bottom-right, using pos offsets)
  return (
    <div
      className="fixed z-[9999] rounded-xl shadow-2xl overflow-hidden"
      style={{
        bottom: pos.y,
        right: pos.x,
        minWidth: 280,
        maxWidth: 360,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        transition: "all 0.3s ease",
      }}
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
        {/* Clicking filename/status area navigates (Fix 4) */}
        <div className="flex-1 min-w-0"
          onClick={() => {
            if (job.status === "done" || job.status === "running") {
              router.push(`/analysis?upload_id=${job.uploadId}`)
            }
          }}
          style={{ cursor: job.status === "done" || job.status === "running" ? "pointer" : "default" }}>
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
