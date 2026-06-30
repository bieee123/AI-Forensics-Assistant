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
