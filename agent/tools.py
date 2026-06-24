from langchain.tools import tool
import re

@tool
def regex_extract_ioc(text: str) -> dict:
    """Ekstrak Indicator of Compromise (IP address, hash) dari teks log."""
    ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
    ips = re.findall(ip_pattern, text)
    return {"ips_found": list(set(ips))}

@tool
def timestamp_sorter(entries: list[dict]) -> list[dict]:
    """Urutkan list log entries berdasarkan timestamp, ascending."""
    return sorted(entries, key=lambda x: x.get("timestamp", ""))