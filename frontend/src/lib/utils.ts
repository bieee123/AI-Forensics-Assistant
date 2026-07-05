export function severityColor(severity: string): string {
    switch (severity?.toUpperCase()) {
        case "CRITICAL": return "#FF4D6A";
        case "HIGH": return "#FF8C42";
        case "MEDIUM": return "#FFD166";
        case "LOW": return "#06D6A0";
        default: return "#4ECDC4";
    }
}

export function severityClass(severity: string): string {
    switch (severity?.toUpperCase()) {
        case "CRITICAL": return "badge-critical";
        case "HIGH": return "badge-high";
        case "MEDIUM": return "badge-medium";
        case "LOW": return "badge-low";
        default: return "badge-info";
    }
}

export function eventTypeColor(eventType: string): string {
    switch (eventType) {
        case "successful_login": return "#06D6A0";
        case "invalid_user_attempt":
        case "failed_login": return "#FF8C42";
        case "privilege_escalation": return "#FF4D6A";
        case "session_opened": return "#4ECDC4";
        default: return "#8B92A9";
    }
}

export function formatDate(dateStr: string): string {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

export function fileTypeLabel(filename: string): string {
    if (!filename) return "unknown";
    if (filename.endsWith(".json") || filename.includes("telemetry")) return "telemetry";
    return "auth.log";
}