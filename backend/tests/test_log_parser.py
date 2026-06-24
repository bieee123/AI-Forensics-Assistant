from app.parsers.log_parser import parse_auth_log_line, detect_event_type

def test_parse_failed_login():
    line = "Jun 25 14:32:01 server1 sshd[1234]: Failed password for invalid user admin from 192.168.1.50 port 54321 ssh2"
    entry = parse_auth_log_line(line)
    assert entry is not None
    assert entry.source == "auth.log"
    assert entry.event_type == "invalid_user_attempt"

def test_detect_successful_login():
    assert detect_event_type("Accepted password for deploy from 10.0.0.5") == "successful_login"

def test_invalid_line_returns_none():
    assert parse_auth_log_line("garbage line that doesn't match") is None