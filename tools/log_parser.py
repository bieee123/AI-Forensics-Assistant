"""
Tool: Auth Log Parser
Parses raw auth.log / syslog entries into structured data.
Part of Sprint 2 (Core 1: Ingestion) — this is the Sprint 1 skeleton.
"""

import re
from typing import TypedDict


class ParsedLogEntry(TypedDict):
    timestamp: str
    source: str
    event_type: str
    raw_line: str


def parse_auth_log_line(line: str) -> ParsedLogEntry | None:
    """
    Parse a single line from auth.log.
    To be implemented in Sprint 2.

    Example target pattern:
    "Jun 30 15:05:05 AI-Agentic sshd[1234]: Failed password for invalid user admin from 192.168.1.1 port 54321 ssh2"
    """
    # TODO Sprint 2: implement regex extraction for timestamp, source IP, username, event type
    raise NotImplementedError("Sprint 2 task: implement auth.log parsing logic")


def parse_auth_log_file(filepath: str) -> list[ParsedLogEntry]:
    """
    Parse an entire auth.log file into a list of structured entries.
    To be implemented in Sprint 2.
    """
    raise NotImplementedError("Sprint 2 task: implement file-level parsing")
