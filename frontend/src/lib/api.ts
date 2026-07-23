const BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`)
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

// Deduplicate in-flight requests — same key returns same promise
const inflight = new Map<string, Promise<any>>()

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const text = await res.text();
    let msg = `HTTP ${res.status}`;
    try {
      const json = JSON.parse(text);
      msg = json.detail || json.message || msg;
    } catch {
      msg = text || msg;
    }
    throw new Error(msg);
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
  analyzeAsync: (uploadId: number) =>
    req<{ upload_id: number; status: string }>("/analyze/", {
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

  // Auth
  login: (username: string, password: string) =>
    req<LoginResponse>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }),
  forgotPassword: (email: string) =>
    req<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }),
  verifyOtp: (email: string, otp_code: string) =>
    req<{ message: string; reset_token: string }>("/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp_code }),
    }),
  resetPassword: (email: string, otp_code: string, new_password: string) =>
    req<{ message: string }>("/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp_code, new_password }),
    }),
  getProfile: (token: string) =>
    req<ProfileResponse>("/auth/profile", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateProfile: (token: string, data: { full_name?: string; email?: string }) =>
    req<{ message: string }>("/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),
  changePassword: (token: string, current_password: string, new_password: string) =>
    req<{ message: string }>("/auth/change-password", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ current_password, new_password }),
    }),
  getActivityLog: (token: string) =>
    req<ActivityLogItem[]>("/auth/activity-log", {
      headers: { Authorization: `Bearer ${token}` },
    }),
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
  total_analyses: number;
  total_incidents: number;
  critical_alerts: number;
  severity_breakdown: Record<string, number>;
  recent_analyses: RecentAnalysis[];
  recent_iocs: string[];
  total_artifacts: number;
  acquisition_data_size: number;
  last_acquisition: string | null;
  recent_artifacts: RecentArtifact[];
  timeline_daily_counts: TimelineDailyCount[];
  latest_triage: LatestTriage | null;
}
export interface LatestTriage {
  upload_id: number;
  filename: string;
  severity: string;
  total_incidents: number;
  analyzed_at: string;
  narrative_preview: string;
  iocs: string[];
  raw_message: string;
  source_ip: string;
  user: string;
  event_type: string;
}
export interface RecentAnalysis {
  upload_id: number;
  filename: string;
  severity: string;
  total_incidents: number;
  analyzed_at: string;
}
export interface RecentArtifact {
  filename: string;
  size_bytes: number;
  sha256: string;
}
export interface TimelineDailyCount {
  date: string;
  count: number;
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

// Auth types
export interface LoginResponse {
  token: string;
  user: UserInfo;
}

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  organization: string;
}

export interface ProfileResponse {
  user: UserInfo & { created_at: string };
  stats: {
    total_sessions: number;
    total_uploads: number;
    total_reports: number;
  };
  last_login: string | null;
}

export interface ActivityLogItem {
  timestamp: string;
  action: string;
  details: string;
  dot_color: string;
}

