import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.tools import regex_extract_ioc, timestamp_sorter

def test_extract_ip_from_log():
    text = "Failed password for invalid user admin from 192.168.1.50 port 54321"
    result = regex_extract_ioc.invoke({"text": text})
    assert "192.168.1.50" in result["ips_found"]

def test_sort_timestamps():
    entries = [{"timestamp": "2026-06-25T14:35:00"}, {"timestamp": "2026-06-25T14:30:00"}]
    sorted_entries = timestamp_sorter.invoke({"entries": entries})
    assert sorted_entries[0]["timestamp"] == "2026-06-25T14:30:00"