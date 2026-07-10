const BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`)
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

// Deduplicate in-flight requests — same key returns same promise
const inflight = new Map<string, Promise<any>>()

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getSummary:  () => req<Summary>("/logs/summary"),
  getUploads:  () => req<Upload[]>("/logs/uploads"),
  getEntries:  (id: number) => req<LogEntry[]>(`/logs/entries?upload_id=${id}`),
  getTelemetry:(id: number) => req<TelemetryEntry[]>(`/logs/telemetry?upload_id=${id}`),
  getHealth:   () => req<Health>("/health"),
  uploadFile:  (file: File) => {
    const fd = new FormData(); fd.append("file", file);
    return req<UploadResult>("/upload/", { method: "POST", body: fd });
  },
  analyze: (uploadId: number) => {
    const key = `analyze:${uploadId}`
    if (inflight.has(key)) return inflight.get(key)!
    const promise = req<AnalysisResult>("/analyze/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upload_id: uploadId }),
    }).finally(() => inflight.delete(key))
    inflight.set(key, promise)
    return promise
  },
  acquireArtifact: (data: AcquireRequest) =>
    req<AcquireResponse>("/acquire/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  getArtifacts: () => req<Artifact[]>("/acquire/artifacts"),
  generateReport: (data: {
    upload_id: number;
    analyst_name?: string;
    organization?: string;
    classification?: string;
    narrative_report?: string;
    severity_overall?: string;
    ioc_summary?: string[];
    attack_timeline?: unknown[];
    total_incidents?: number;
  }) =>
    fetch(`${BASE}/report/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    }),
  getAnalysisHistory: () => req<AnalysisHistoryItem[]>("/analyze/history"),
  getAnalysisResult:  (uploadId: number) => req<SavedAnalysisResult>(`/analyze/result/${uploadId}`),
  deleteAnalysisResult: (uploadId: number) =>
    req<{ deleted: boolean }>(`/analyze/result/${uploadId}`, { method: "DELETE" }),
};

// Types
export interface AnalysisHistoryItem {
  id: number;
  upload_id: number;
  filename: string;
  severity: string;
  total_incidents: number;
  analyzed_at: string;
  analysis_duration_seconds: number | null;
}

export interface SavedAnalysisResult extends AnalysisResult {
  analyzed_at: string;
  analysis_duration_seconds: number | null;
  filename: string;
}

export interface Summary {
  total_uploads: number;
  total_log_entries: number;
  total_telemetry_entries: number;
  recent_uploads: Upload[];
}
export interface Upload {
  upload_id: number;
  filename: string;
  uploaded_at: string;
  total_entries: number;
}
export interface LogEntry {
  id: number; upload_id: number; timestamp: string;
  host: string; source: string; event_type: string;
  source_ip: string; user: string; port: string;
  auth_method: string; status: string; raw_message: string;
}
export interface TelemetryEntry {
  id: number; upload_id: number; timestamp: string;
  event_type: string; source: string; details: string;
}
export interface UploadResult {
  filename: string; upload_id: number;
  file_type: string; total_entries_parsed: number;
}
export interface AnalysisResult {
  upload_id: number; total_incidents: number;
  attack_timeline: LogEntry[]; ioc_summary: string[];
  narrative_report: string; severity_overall: string;
}
export interface Health {
  status: string; ollama_connected: boolean; chromadb_connected: boolean;
}
export interface AcquireRequest {
  host: string;
  port: number;
  username: string;
  password?: string;
  private_key_path?: string;
  remote_log_path: string;
}
export interface AcquireResponse {
  host: string;
  remote_path: string;
  local_path: string;
  sha256_hash: string;
  file_size_bytes: number;
  acquired_at: string;
  upload_id: number;
  total_entries_parsed: number;
  chain_of_custody: string;
}
export interface Artifact {
  filename: string;
  path: string;
  sha256: string;
  acquired_at: string;
  size_bytes: number;
}

