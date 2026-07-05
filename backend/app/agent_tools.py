"""
LangChain agent tools for forensic triage.
- regex_extract_ioc: extract IP addresses from log text
- timestamp_sorter: sort log entries chronologically
"""

from langchain.tools import tool
import re


@tool
def regex_extract_ioc(text: str) -> dict:
    """Extract Indicators of Compromise (IP addresses) from log text."""
    ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
    ips = re.findall(ip_pattern, text)
    return {"ips_found": list(set(ips))}


@tool
def timestamp_sorter(entries: list) -> list:
    """Sort log entries by timestamp ascending."""
    return sorted(entries, key=lambda x: x.get("timestamp", ""))