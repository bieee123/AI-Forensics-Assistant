"""
Tool: Auth Log Parser
Parses raw auth.log / syslog entries into structured data.
"""

import re
from typing import TypedDict, Optional


class ParsedLogEntry(TypedDict):
    timestamp: str
    host: str
    status: str          # "Failed" or "Accepted"
    auth_method: str      # "password" or "publickey"
    user: str
    source_ip: str
    port: str
    raw_line: str


AUTH_LOG_PATTERN = re.compile(
    r'^(?P<timestamp>\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+'
    r'(?P<host>\S+)\s+'
    r'sshd\[\d+\]:\s+'
    r'(?P<status>Failed|Accepted)\s+'
    r'(?P<authmethod>\w+)\s+for\s+'
    r'(?:invalid user\s+)?'
    r'(?P<user>\S+)\s+from\s+'
    r'(?P<ip>[\d.]+)\s+port\s+(?P<port>\d+)'
)


def parse_auth_log_line(line: str) -> Optional[ParsedLogEntry]:
    """
    Parse a single line from auth.log.
    Returns None if the line doesn't match a recognized SSH auth pattern.
    """
    match = AUTH_LOG_PATTERN.match(line.strip())
    if not match:
        return None

    groups = match.groupdict()
    return ParsedLogEntry(
        timestamp=groups["timestamp"],
        host=groups["host"],
        status=groups["status"],
        auth_method=groups["authmethod"],
        user=groups["user"],
        source_ip=groups["ip"],
        port=groups["port"],
        raw_line=line.strip(),
    )


def parse_auth_log_file(filepath: str) -> list[ParsedLogEntry]:
    """
    Parse an entire auth.log file into a list of structured entries.
    Lines that don't match the SSH auth pattern are skipped.
    """
    entries: list[ParsedLogEntry] = []
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            parsed = parse_auth_log_line(line)
            if parsed:
                entries.append(parsed)
    return entries


def parse_auth_log_text(raw_text: str) -> list[ParsedLogEntry]:
    """
    Parse raw auth.log content provided as a string (e.g., from an upload).
    """
    entries: list[ParsedLogEntry] = []
    for line in raw_text.splitlines():
        parsed = parse_auth_log_line(line)
        if parsed:
            entries.append(parsed)
    return entries


# --- JSON API Telemetry Parsing ---

import json
from typing import Any


class ParsedTelemetryEntry(TypedDict):
    timestamp: str
    event_type: str
    source: str
    details: str
    raw_line: str


def parse_json_telemetry_text(raw_text: str) -> list[ParsedTelemetryEntry]:
    """
    Parse JSON API telemetry. Supports either:
    - A JSON array of event objects
    - Newline-delimited JSON (NDJSON), one object per line

    Expected (flexible) fields per event: timestamp, event_type/type, source/service, and
    any additional fields are captured under 'details'.
    """
    entries: list[ParsedTelemetryEntry] = []
    raw_text = raw_text.strip()

    if not raw_text:
        return entries

    # Try parsing as a single JSON array first
    events: list[dict[str, Any]] = []
    try:
        parsed = json.loads(raw_text)
        if isinstance(parsed, list):
            events = parsed
        elif isinstance(parsed, dict):
            events = [parsed]
    except json.JSONDecodeError:
        # Fall back to NDJSON: one JSON object per line
        for line in raw_text.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                continue  # skip malformed lines

    for event in events:
        entries.append(ParsedTelemetryEntry(
            timestamp=str(event.get("timestamp", event.get("time", ""))),
            event_type=str(event.get("event_type", event.get("type", "unknown"))),
            source=str(event.get("source", event.get("service", "unknown"))),
            details=json.dumps(event, ensure_ascii=False),
            raw_line=json.dumps(event, ensure_ascii=False),
        ))

    return entries
