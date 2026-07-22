import { api } from "./api"
import { startAnalysisJob, updateProgress, completeJob, failJob } from "./analysisStore"
import { setSessionCache } from "./cache"

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

  const promise = api.analyze(uploadId)
    .then(data => {
      clearInterval(progressInterval)
      completeJob(data)
      setSessionCache(uploadId, data)
    })
    .catch(() => {
      clearInterval(progressInterval)
      failJob("Analysis failed")
    })
    .finally(() => {
      inflight.delete(uploadId)
    })

  inflight.set(uploadId, promise)
  return promise
}
