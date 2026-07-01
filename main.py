"""
FastAPI application — Agentic AI Digital Forensics Assistant
Sprint 2: /upload endpoint for log ingestion (auth.log/syslog + JSON telemetry)
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from db.models import (
    SessionLocal, LogUpload, ParsedLogEntryDB, ParsedTelemetryEntryDB, init_db
)
from tools.log_parser import parse_auth_log_text, parse_json_telemetry_text

app = FastAPI(title="Agentic AI Digital Forensics Assistant")


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def root():
    return {"status": "ok", "service": "Agentic AI Digital Forensics Assistant"}


def _looks_like_json(filename: str, raw_text: str) -> bool:
    if filename.lower().endswith(".json"):
        return True
    stripped = raw_text.strip()
    return stripped.startswith("{") or stripped.startswith("[")


@app.post("/upload")
async def upload_log(file: UploadFile = File(...)):
    """
    Generic ingestion endpoint. Accepts either:
    - Raw auth.log / syslog text files
    - JSON or NDJSON API telemetry files
    Type is auto-detected from filename/content.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    raw_bytes = await file.read()
    try:
        raw_text = raw_bytes.decode("utf-8", errors="ignore")
    except Exception:
        raise HTTPException(status_code=400, detail="Unable to decode file as text")

    db: Session = SessionLocal()
    try:
        if _looks_like_json(file.filename, raw_text):
            parsed_entries = parse_json_telemetry_text(raw_text)

            upload_record = LogUpload(filename=file.filename, total_entries=len(parsed_entries))
            db.add(upload_record)
            db.commit()
            db.refresh(upload_record)

            upload_id = upload_record.id
            upload_filename = upload_record.filename
            upload_total = upload_record.total_entries

            for entry in parsed_entries:
                db.add(ParsedTelemetryEntryDB(
                    upload_id=upload_id,
                    timestamp=entry["timestamp"],
                    event_type=entry["event_type"],
                    source=entry["source"],
                    details=entry["details"],
                    raw_line=entry["raw_line"],
                ))
            db.commit()

            return {
                "filename": upload_filename,
                "upload_id": upload_id,
                "file_type": "json_telemetry",
                "total_entries_parsed": upload_total,
                "entries_preview": parsed_entries[:3],
            }

        else:
            parsed_entries = parse_auth_log_text(raw_text)

            upload_record = LogUpload(filename=file.filename, total_entries=len(parsed_entries))
            db.add(upload_record)
            db.commit()
            db.refresh(upload_record)

            upload_id = upload_record.id
            upload_filename = upload_record.filename
            upload_total = upload_record.total_entries

            for entry in parsed_entries:
                db.add(ParsedLogEntryDB(
                    upload_id=upload_id,
                    timestamp=entry["timestamp"],
                    host=entry["host"],
                    status=entry["status"],
                    auth_method=entry["auth_method"],
                    user=entry["user"],
                    source_ip=entry["source_ip"],
                    port=entry["port"],
                    raw_line=entry["raw_line"],
                ))
            db.commit()

            return {
                "filename": upload_filename,
                "upload_id": upload_id,
                "file_type": "auth_log",
                "total_entries_parsed": upload_total,
                "entries_preview": parsed_entries[:3],
            }
    finally:
        db.close()
