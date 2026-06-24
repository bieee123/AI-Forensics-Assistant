import re
from datetime import datetime
from app.models.schemas import ParsedLogEntry

# Pattern untuk auth.log standar (format syslog klasik)
AUTH_LOG_PATTERN = re.compile(
    r'(?P<month>\w{3})\s+(?P<day>\d{1,2})\s+(?P<time>\d{2}:\d{2}:\d{2})\s+'
    r'(?P<host>\S+)\s+(?P<process>\S+?)(?:\[\d+\])?:\s+(?P<message>.+)'
)

def detect_event_type(message: str) -> str:
    message_lower = message.lower()
    if "invalid user" in message_lower:
        return "invalid_user_attempt"
    elif "failed password" in message_lower:
        return "failed_login"
    elif "accepted password" in message_lower or "session opened" in message_lower:
        return "successful_login"
    elif "sudo" in message_lower:
        return "privilege_escalation"
    return "unknown"

def parse_auth_log_line(line: str, current_year: int = None) -> ParsedLogEntry | None:
    """Parse satu baris auth.log/syslog jadi ParsedLogEntry."""
    match = AUTH_LOG_PATTERN.match(line.strip())
    if not match:
        return None

    if current_year is None:
        current_year = datetime.now().year

    timestamp_str = f"{current_year} {match['month']} {match['day']} {match['time']}"
    try:
        timestamp = datetime.strptime(timestamp_str, "%Y %b %d %H:%M:%S")
    except ValueError:
        return None

    return ParsedLogEntry(
        timestamp=timestamp,
        source="auth.log",
        event_type=detect_event_type(match['message']),
        raw_message=match['message']
    )

def parse_log_file(filepath: str) -> list[ParsedLogEntry]:
    """Parse seluruh file log, baris per baris, skip baris yang gagal diparsing."""
    entries = []
    with open(filepath, 'r', errors='ignore') as f:
        for line in f:
            entry = parse_auth_log_line(line)
            if entry:
                entries.append(entry)
    return entries