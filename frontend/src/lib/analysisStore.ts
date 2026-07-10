import { AnalysisResult } from "./api"

export interface AnalysisJob {
  uploadId: number
  filename: string
  status: "running" | "done" | "error"
  progress: number
  result?: AnalysisResult
  error?: string
  startedAt: string
}

let activeJob: AnalysisJob | null = null

export function startAnalysisJob(uploadId: number, filename: string) {
  activeJob = {
    uploadId, filename, status: "running",
    progress: 0, startedAt: new Date().toISOString(),
  }
  dispatch()
}

export function updateProgress(progress: number) {
  if (!activeJob) return
  activeJob = { ...activeJob, progress }
  dispatch()
}

export function completeJob(result: AnalysisResult) {
  if (!activeJob) return
  activeJob = { ...activeJob, status: "done", progress: 100, result }
  dispatch()
  setTimeout(() => { activeJob = null; dispatch() }, 6000)
}

export function failJob(error: string) {
  if (!activeJob) return
  activeJob = { ...activeJob, status: "error", error }
  dispatch()
  setTimeout(() => { activeJob = null; dispatch() }, 4000)
}

export function getActiveJob() { return activeJob }

function dispatch() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("analysis-job-update", { detail: activeJob }))
  }
}
