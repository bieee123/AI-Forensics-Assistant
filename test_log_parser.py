from tools.log_parser import parse_auth_log_file

entries = parse_auth_log_file("data/sample_logs/sample_auth.log")
print(f"Total entries parsed: {len(entries)}\n")
for entry in entries:
    print(entry)
