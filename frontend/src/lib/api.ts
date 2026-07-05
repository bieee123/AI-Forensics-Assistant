const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  analyze: (uploadId: number) =>
    req<AnalysisResult>("/analyze/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upload_id: uploadId }),
    }),
  acquireArtifact: (data: AcquireRequest) =>
    req<AcquireResponse>("/acquire/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  getArtifacts: () => req<Artifact[]>("/acquire/artifacts"),
};

// Types
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

