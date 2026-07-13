"""
Parsers for auth.log/syslog and JSON API telemetry.
"""

import re
import json
import os
from datetime import datetime
from typing import Any
from app.models.schemas import ParsedLogEntry, ParsedTelemetryEntry

AUTH_LOG_PATTERN = re.compile(
    r'(?P<month>\w{3})\s+(?P<day>\d{1,2})\s+(?P<time>\d{2}:\d{2}:\d{2})\s+'
    r'(?P<host>\S+)\s+(?P<process>\S+?)(?:\[\d+\])?:\s+(?P<message>.+)'
)

SSH_DETAIL_PATTERN = re.compile(
    r'(?P<status>Failed|Accepted)\s+(?P<authmethod>\w+)\s+for\s+'
    r'(?:invalid user\s+)?(?P<user>\S+)\s+from\s+(?P<ip>[\d.]+)\s+port\s+(?P<port>\d+)'
)


def detect_event_type(message: str) -> str:
    msg = message.lower()
    if "invalid user" in msg:
        return "invalid_user_attempt"
    elif "failed password" in msg or "failed publickey" in msg:
        return "failed_login"
    elif "accepted password" in msg or "accepted publickey" in msg:
        return "successful_login"
    elif "session opened" in msg:
        return "session_opened"
    elif "session closed" in msg:
        return "session_closed"
    elif "sudo" in msg:
        return "privilege_escalation"
    return "unknown"


def extract_ssh_details(message: str) -> dict:
    """Extract IP, user, port from SSH log message if available."""
    match = SSH_DETAIL_PATTERN.search(message)
    if match:
        return {
            "source_ip": match.group("ip"),
            "user": match.group("user"),
            "port": match.group("port"),
            "auth_method": match.group("authmethod"),
            "status": match.group("status"),
        }
    return {}


def parse_auth_log_line(line: str, current_year: int = None) -> ParsedLogEntry | None:
    """Parse a single auth.log/syslog line into a ParsedLogEntry."""
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

    message = match["message"]
    ssh_details = extract_ssh_details(message)

    return ParsedLogEntry(
        timestamp=timestamp,
        host=match["host"],
        source="auth.log",
        event_type=detect_event_type(message),
        raw_message=message,
        source_ip=ssh_details.get("source_ip"),
        user=ssh_details.get("user"),
        port=ssh_details.get("port"),
        auth_method=ssh_details.get("auth_method"),
        status=ssh_details.get("status"),
    )


def parse_auth_log_text(raw_text: str, current_year: int = None) -> list[ParsedLogEntry]:
    """Parse raw auth.log content from an uploaded string."""
    entries = []
    for line in raw_text.splitlines():
        entry = parse_auth_log_line(line, current_year)
        if entry:
            entries.append(entry)
    return entries


def parse_json_telemetry_text(raw_text: str) -> list[ParsedTelemetryEntry]:
    """Parse JSON array or NDJSON telemetry into ParsedTelemetryEntry list."""
    entries = []
    raw_text = raw_text.strip()
    if not raw_text:
        return entries

    events: list[dict[str, Any]] = []
    try:
        parsed = json.loads(raw_text)
        events = parsed if isinstance(parsed, list) else [parsed]
    except json.JSONDecodeError:
        for line in raw_text.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    for event in events:
        entries.append(ParsedTelemetryEntry(
            timestamp=str(event.get("timestamp", event.get("time", ""))),
            event_type=str(event.get("event_type", event.get("type", "unknown"))),
            source=str(event.get("source", event.get("service", "unknown"))),
            details=json.dumps(event, ensure_ascii=False),
            raw_line=json.dumps(event, ensure_ascii=False),
        ))

    return entries


BINARY_EXTENSIONS = {".raw", ".dd", ".mem", ".img", ".dmp", ".bin", ".e01"}


def looks_like_binary(filename: str) -> bool:
    _, ext = os.path.splitext(filename.lower())
    return ext in BINARY_EXTENSIONS


def extract_readable_strings(raw_bytes: bytes, min_len: int = 4) -> str:
    """Extract ASCII printable strings from binary data."""
    pattern = re.compile(rb'[\x20-\x7E]{{{},}}'.format(min_len))
    strings = [s.decode("ascii", errors="ignore") for s in pattern.findall(raw_bytes)]
    return "\n".join(strings)


def parse_binary_artifact(raw_bytes: bytes, filename: str) -> tuple[list[ParsedLogEntry], list[ParsedTelemetryEntry]]:
    """Parse binary disk/memory artifact by extracting readable strings."""
    readable = extract_readable_strings(raw_bytes)

    auth_entries = parse_auth_log_text(readable)
    if auth_entries:
        return auth_entries, []

    telemetry_entries = parse_json_telemetry_text(readable)
    if telemetry_entries:
        return [], telemetry_entries

    return [], []
