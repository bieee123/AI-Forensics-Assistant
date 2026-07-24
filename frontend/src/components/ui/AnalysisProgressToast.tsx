"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { AnalysisJob, getActiveJob } from "@/lib/analysisStore"

const COLLAPSE_AFTER_MS = 20_000
const DEFAULT_POS = { x: 24, y: 24 } // bottom-right offsets in px

// Global session state to persist collapsed state and position across Next.js page navigations
let globalCollapsed = false
let globalPos = DEFAULT_POS

function CircularProgress({ percent, status }: { percent: number; status: string }) {
  const r = 18, circ = 2 * Math.PI * r
  const dash = circ - (circ * Math.min(percent, 100)) / 100
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="select-none" style={{ display: "block" }}>
      <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
      <circle cx="24" cy="24" r={r} fill="none" stroke="#ffffff" strokeWidth="3.5"
        strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
        transform="rotate(-90 24 24)"
        style={{ transition: "stroke-dashoffset 0.4s ease" }} />
      <text x="24" y="24" textAnchor="middle" dominantBaseline="central" fontSize="11" fill="#ffffff" fontWeight="700">
        {status === "done" ? "✓" : status === "error" ? "✗" : `${percent}%`}
      </text>
    </svg>
  )
}

export default function AnalysisProgressToast() {
  const [job, setJob] = useState<AnalysisJob | null>(() => getActiveJob())
  
  // Persisted state across page navigation
  const [collapsed, setCollapsedState] = useState<boolean>(() => globalCollapsed)
  const [pos, setPosState] = useState<{ x: number; y: number }>(() => globalPos)

  const setCollapsed = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    setCollapsedState(prev => {
      const next = typeof val === "function" ? val(prev) : val
      globalCollapsed = next
      return next
    })
  }, [])

  const setPos = useCallback((val: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => {
    setPosState(prev => {
      const next = typeof val === "function" ? val(prev) : val
      globalPos = next
      return next
    })
  }, [])

  const [isDragging, setIsDragging] = useState(false)
  
  // Track pointer down details to distinguish click vs drag
  const pointerDownRef = useRef<{ clientX: number; clientY: number; posX: number; posY: number; hasMoved: boolean } | null>(null)
  const collapseTimerRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  // Automatically collapse expanded toast to bubble after 20 seconds
  useEffect(() => {
    if (!collapsed && job) {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
      collapseTimerRef.current = setTimeout(() => {
        setCollapsed(true)
      }, COLLAPSE_AFTER_MS)
    }
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
    }
  }, [collapsed, job?.uploadId, setCollapsed])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as AnalysisJob | null
      setJob(prev => {
        // If a brand new job starts, reset position and state
        if (detail && prev?.uploadId !== detail.uploadId) {
          setPos(DEFAULT_POS)
          setCollapsed(false)
        }
        return detail
      })
    }

    window.addEventListener("analysis-job-update", handler)
    return () => {
      window.removeEventListener("analysis-job-update", handler)
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
    }
  }, [setCollapsed, setPos])

  // --- Drag & Click Handler ---
  const onBubbleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    pointerDownRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      posX: pos.x,
      posY: pos.y,
      hasMoved: false,
    }
  }, [pos])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!pointerDownRef.current) return
      const dx = e.clientX - pointerDownRef.current.clientX
      const dy = e.clientY - pointerDownRef.current.clientY

      // If moved more than 4px, treat as dragging
      if (Math.hypot(dx, dy) > 4) {
        pointerDownRef.current.hasMoved = true
        setIsDragging(true)
        const newX = Math.max(8, pointerDownRef.current.posX - dx)
        const newY = Math.max(8, pointerDownRef.current.posY - dy)
        setPos({ x: newX, y: newY })
      }
    }

    const onMouseUp = () => {
      if (pointerDownRef.current) {
        // If it didn't move, it's a click! Expand the bubble & reset 20s collapse timer
        if (!pointerDownRef.current.hasMoved) {
          setCollapsed(false)
        }
        pointerDownRef.current = null
      }
      setIsDragging(false)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [setCollapsed, setPos])

  if (!job) return null

  const bgColor = job.status === "done" ? "var(--severity-low)"
    : job.status === "error" ? "var(--severity-critical)"
    : "var(--accent)"

  // Collapsed bubble (Clean circular bubble, centered, with subtle inner highlight)
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
            ? "0 10px 30px rgba(0,0,0,0.4), 0 0 0 1.5px rgba(255,255,255,0.3) inset"
            : "0 4px 20px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.2) inset",
          transition: isDragging ? "box-shadow 0.15s ease" : "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          cursor: isDragging ? "grabbing" : "pointer",
          userSelect: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseDown={onBubbleMouseDown}
        title={`Analyzing ${job.filename} — ${job.progress}% (Click to expand)`}
      >
        <CircularProgress percent={job.progress} status={job.status} />
      </div>
    )
  }

  // Expanded toast card
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
        <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
          style={{ background: bgColor }}
          onClick={() => {
            if (job.status === "done" || job.status === "running") {
              router.push(`/analysis?upload_id=${job.uploadId}`)
            }
          }}>
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
            <text x="18" y="18" textAnchor="middle" dominantBaseline="central" fontSize="8"
              fill="white" fontWeight="700">
              {job.status === "done" ? "✓"
                : job.status === "error" ? "✗"
                : `${job.progress}%`}
            </text>
          </svg>
        </div>

        {/* Info & Navigation */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate cursor-pointer"
            style={{ color: "var(--text-primary)" }}
            onClick={() => {
              if (job.status === "done" || job.status === "running") {
                router.push(`/analysis?upload_id=${job.uploadId}`)
              }
            }}>
            {job.status === "done" ? "✓ Analysis complete!"
              : job.status === "error" ? "✗ Analysis failed"
              : "Analyzing..."}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
            <span
              className="cursor-pointer hover:underline"
              onClick={() => {
                if (job.status === "done" || job.status === "running") {
                  router.push(`/analysis?upload_id=${job.uploadId}`)
                }
              }}>
              {job.filename}
            </span>
            {job.status === "done" && (
              <span
                className="ml-1 cursor-pointer font-medium hover:underline transition-all"
                style={{ color: "var(--accent)" }}
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/analysis?upload_id=${job.uploadId}`)
                }}>
                · Click to view results
              </span>
            )}
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
          onClick={(e) => { e.stopPropagation(); setCollapsed(true); }}
          className="flex-shrink-0 p-1 rounded"
          title="Minimize to bubble"
          style={{ color: "var(--text-muted)", border: "none", background: "transparent", cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
