/**
 * Skeleton — Atom + Composite Skeleton Components
 *
 * Atom:
 *   <Sk />             — blok skeleton dasar
 *
 * Composite:
 *   <SkeletonTable />        — skeleton tabel (n baris)
 *   <SkeletonStatCards />    — 6 stat card (dashboard)
 *   <SkeletonProfileHero />  — hero profil
 *   <SkeletonIncidentList /> — daftar incident card (timeline)
 *   <SkeletonArtifactList /> — daftar artifact (acquisition)
 */

import React from "react"

// ─── Atom ────────────────────────────────────────────────────────────────────

interface SkProps {
  h?: number | string
  w?: number | string
  rounded?: "sm" | "md" | "lg" | "full"
  className?: string
  style?: React.CSSProperties
}

const radii: Record<string, string> = {
  sm: "4px",
  md: "6px",
  lg: "10px",
  full: "9999px",
}

export function Sk({ h = 14, w = "100%", rounded = "md", className = "", style }: SkProps) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{
        height: typeof h === "number" ? h : h,
        width: typeof w === "number" ? `${w}px` : w,
        borderRadius: radii[rounded] ?? radii.md,
        background: "var(--bg-hover)",
        flexShrink: 0,
        ...style,
      }}
    />
  )
}

// ─── Skeleton Table ───────────────────────────────────────────────────────────

interface SkeletonTableProps {
  rows?: number
  cols?: number
  /** Lebar kolom (px atau %). Default semua equal. */
  colWidths?: (number | string)[]
  showHeader?: boolean
}

export function SkeletonTable({
  rows = 5,
  cols = 4,
  colWidths,
  showHeader = true,
}: SkeletonTableProps) {
  return (
    <div style={{ width: "100%", overflow: "hidden" }}>
      {showHeader && (
        <div
          className="flex gap-4 px-5 py-3 border-b"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {Array.from({ length: cols }).map((_, i) => (
            <Sk
              key={i}
              h={11}
              w={colWidths?.[i] ?? `${Math.floor(100 / cols)}%`}
              rounded="sm"
            />
          ))}
        </div>
      )}
      <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
        {Array.from({ length: rows }).map((_, row) => (
          <div
            key={row}
            className="flex items-center gap-4 px-5 py-3.5"
          >
            {Array.from({ length: cols }).map((_, col) => (
              <Sk
                key={col}
                h={13}
                w={colWidths?.[col] ?? `${Math.floor(100 / cols)}%`}
                // Vary widths slightly for realism
                style={{
                  width:
                    colWidths?.[col] ??
                    `${Math.floor(100 / cols) - (col % 2 === 0 ? 0 : 8)}%`,
                  opacity: row === 0 ? 0.9 : row === 1 ? 0.75 : row === 2 ? 0.6 : row === 3 ? 0.45 : 0.3,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Skeleton Stat Cards ──────────────────────────────────────────────────────

export function SkeletonStatCards({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border p-4 flex flex-col gap-3"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-subtle)",
            opacity: 1 - i * 0.08,
          }}
        >
          <div className="flex items-center justify-between">
            <Sk h={11} w="55%" rounded="sm" />
            <Sk h={28} w={28} rounded="lg" />
          </div>
          <Sk h={28} w="40%" rounded="md" />
        </div>
      ))}
    </>
  )
}

// ─── Skeleton Profile Hero ────────────────────────────────────────────────────

export function SkeletonProfileHero() {
  return (
    <div
      className="rounded-xl border p-5 mb-6 flex items-center gap-5"
      style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}
    >
      {/* Avatar */}
      <Sk h={64} w={64} rounded="full" />
      {/* Info */}
      <div className="flex-1 flex flex-col gap-2.5">
        <Sk h={18} w="35%" />
        <Sk h={13} w="55%" />
        <div className="flex gap-4 mt-1">
          <Sk h={11} w="20%" rounded="sm" />
          <Sk h={11} w="30%" rounded="sm" />
        </div>
      </div>
      {/* Buttons */}
      <div className="flex gap-2">
        <Sk h={32} w={100} rounded="md" />
        <Sk h={32} w={80} rounded="md" />
      </div>
    </div>
  )
}

// ─── Skeleton Stat Row (3 cards for Profile) ─────────────────────────────────

export function SkeletonStatRow({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border p-4 flex flex-col gap-2"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-subtle)",
            opacity: 1 - i * 0.1,
          }}
        >
          <Sk h={10} w="60%" rounded="sm" />
          <Sk h={28} w="40%" />
          <Sk h={10} w="45%" rounded="sm" />
        </div>
      ))}
    </>
  )
}

// ─── Skeleton Card (generic panel) ───────────────────────────────────────────

export function SkeletonCard({ lines = 4, showHeader = true }: { lines?: number; showHeader?: boolean }) {
  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}
    >
      {showHeader && (
        <div
          className="px-5 py-4 border-b flex items-center gap-2"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <Sk h={13} w="40%" />
        </div>
      )}
      <div className="p-5 flex flex-col gap-3.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Sk h={10} w="30%" rounded="sm" />
            <Sk h={36} w="100%" rounded="md" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Skeleton Incident List (Timeline) ───────────────────────────────────────

export function SkeletonIncidentList({ count = 4 }: { count?: number }) {
  return (
    <div className="incident-list">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="incident-item"
          style={{ opacity: 1 - i * 0.18 }}
        >
          {/* Dot */}
          <span
            className="inc-dot animate-pulse"
            style={{ background: "var(--bg-hover)" }}
          />
          {/* Meta row */}
          <div className="inc-meta">
            <Sk h={11} w={80} rounded="sm" />
            <Sk h={11} w={100} rounded="sm" />
          </div>
          {/* Card */}
          <div
            className="incident-card rounded-lg p-4 flex flex-col gap-2.5"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center justify-between">
              <Sk h={14} w="45%" />
              <Sk h={20} w={80} rounded="full" />
            </div>
            <Sk h={13} w="75%" />
            <Sk h={11} w="55%" rounded="sm" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Skeleton Artifact List (Acquisition) ────────────────────────────────────

export function SkeletonArtifactList({ count = 3 }: { count?: number }) {
  return (
    <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="px-4 py-3"
          style={{ opacity: 1 - i * 0.2 }}
        >
          <div className="flex items-center justify-between mb-2">
            <Sk h={13} w="60%" />
            <Sk h={18} w={64} rounded="full" />
          </div>
          <div className="flex gap-2 mb-2">
            <Sk h={11} w={90} rounded="sm" />
            <Sk h={11} w={50} rounded="sm" />
          </div>
          <Sk h={11} w="90%" rounded="sm" />
        </div>
      ))}
    </div>
  )
}
