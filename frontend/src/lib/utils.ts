export function severityBadgeClass(s: string) {
  switch (s?.toUpperCase()) {
    case "CRITICAL": return "badge badge-critical";
    case "HIGH":     return "badge badge-high";
    case "MEDIUM":   return "badge badge-medium";
    case "LOW":      return "badge badge-low";
    default:         return "badge badge-info";
  }
}

export function eventDotColor(eventType: string): string {
  switch (eventType) {
    case "successful_login":     return "#06D6A0";
    case "invalid_user_attempt":
    case "failed_login":         return "#FF8C42";
    case "privilege_escalation": return "#FF4D6A";
    case "session_opened":       return "#4ECDC4";
    default:                     return "#8B92A9";
  }
}

export function eventRowClass(eventType: string): string {
  switch (eventType) {
    case "successful_login":     return "row-success";
    case "invalid_user_attempt":
    case "failed_login":         return "row-warn";
    case "privilege_escalation": return "row-critical";
    default:                     return "";
  }
}

export function eventBadgeClass(eventType: string): string {
  switch (eventType) {
    case "successful_login":     return "badge badge-low";
    case "invalid_user_attempt":
    case "failed_login":         return "badge badge-medium";
    case "privilege_escalation": return "badge badge-critical";
    case "session_opened":       return "badge badge-info";
    default:                     return "badge badge-info";
  }
}

export function formatEventType(eventType: string): string {
  if (!eventType) return "unknown";
  return eventType.replace(/_/g, " ");
}

export function fileTypeBadge(filename: string) {
  if (!filename) return { label: "unknown", cls: "badge badge-info" };
  if (filename.endsWith(".json") || filename.includes("telemetry"))
    return { label: "telemetry", cls: "badge badge-info" };
  return { label: "auth.log", cls: "badge badge-low" };
}

export function fmtDate(s: string) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return s; }
}

export function fmtTime(s: string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
  catch { return s.slice(11, 19) || s; }
}

export function fmtDateShort(s: string) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return s; }
}
