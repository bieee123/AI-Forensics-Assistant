import { api } from "./api"
import { startAnalysisJob, updateProgress, completeJob, failJob } from "./analysisStore"
import { setSessionCache } from "./cache"

const POLL_INTERVAL_MS = 2000
const MAX_TIMEOUT_MS = 180000

const inflight = new Map<number, Promise<void>>()

export function triggerAnalysis(uploadId: number, filename: string): Promise<void> {
  if (inflight.has(uploadId)) return inflight.get(uploadId)!

  startAnalysisJob(uploadId, filename)

  const jobStartTime = Date.now()
  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - jobStartTime
    const simulated = Math.min(88, Math.floor((elapsed / 70000) * 88))
    updateProgress(simulated)
  }, 500)

  const promise = (async () => {
    try {
      await api.analyzeAsync(uploadId)
    } catch {
      clearInterval(progressInterval)
      failJob("Analysis failed")
      inflight.delete(uploadId)
      return
    }

    const pollStart = Date.now()
    await new Promise<void>((resolve) => {
      const poller = setInterval(async () => {
        if (Date.now() - pollStart > MAX_TIMEOUT_MS) {
          clearInterval(poller)
          clearInterval(progressInterval)
          failJob("Analysis timed out")
          resolve()
          return
        }
        try {
          const data = await api.getAnalysisResult(uploadId)
          if (data && data.severity_overall) {
            clearInterval(poller)
            clearInterval(progressInterval)
            completeJob(data as any)
            setSessionCache(uploadId, data as any)
            resolve()
          }
        } catch {
        }
      }, POLL_INTERVAL_MS)
    })
  })().finally(() => {
    inflight.delete(uploadId)
  })

  inflight.set(uploadId, promise)
  return promise
}
