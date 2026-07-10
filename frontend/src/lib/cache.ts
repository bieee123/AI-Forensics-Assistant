"use client"
import { AnalysisResult } from "./api"

// In-memory session cache — cleared on page refresh
// Primary storage is PostgreSQL via /analyze/result/{id}
const sessionCache = new Map<number, { result: AnalysisResult; at: number }>()
const SESSION_TTL = 30 * 60 * 1000  // 30 minutes

export function getSessionCache(uploadId: number): AnalysisResult | null {
  const entry = sessionCache.get(uploadId)
  if (!entry) return null
  if (Date.now() - entry.at > SESSION_TTL) {
    sessionCache.delete(uploadId)
    return null
  }
  return entry.result
}

export function setSessionCache(uploadId: number, result: AnalysisResult) {
  sessionCache.set(uploadId, { result, at: Date.now() })
}

export function clearSessionCache(uploadId: number) {
  sessionCache.delete(uploadId)
}
