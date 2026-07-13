"""
Upload router — handles log file ingestion.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.models.schemas import (
    SessionLocal, LogUploadDB, ParsedLogEntryDB, ParsedTelemetryEntryDB, init_db
)
from app.parsers.log_parser import (
    parse_auth_log_text, parse_json_telemetry_text,
    parse_binary_artifact, looks_like_binary
)

router = APIRouter()


def _looks_like_json(filename: str, raw_text: str) -> bool:
    if filename.lower().endswith(".json"):
        return True
    stripped = raw_text.strip()
    return stripped.startswith("{") or stripped.startswith("[")


@router.post("/")
async def upload_log(file: UploadFile = File(...)):
    """
    Generic ingestion endpoint. Auto-detects auth.log, JSON telemetry, or binary artifact.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    raw_bytes = await file.read()

    # ── Handle binary artifacts (.raw, .dd, .mem, etc.) ──
    if looks_like_binary(file.filename):
        auth_entries, telemetry_entries = parse_binary_artifact(raw_bytes, file.filename)
        total = len(auth_entries) + len(telemetry_entries)
        file_type = "binary_artifact"

        db: Session = SessionLocal()
        try:
            upload_record = LogUploadDB(filename=file.filename, total_entries=total)
            db.add(upload_record)
            db.commit()
            db.refresh(upload_record)
            upload_id = upload_record.id

            for entry in auth_entries:
                db.add(ParsedLogEntryDB(
                    upload_id=upload_id, timestamp=entry.timestamp,
                    host=entry.host, source=entry.source,
                    event_type=entry.event_type, raw_message=entry.raw_message,
                    source_ip=entry.source_ip, user=entry.user,
                    port=entry.port, auth_method=entry.auth_method,
                    status=entry.status,
                ))
            for entry in telemetry_entries:
                db.add(ParsedTelemetryEntryDB(
                    upload_id=upload_id, timestamp=entry.timestamp,
                    event_type=entry.event_type, source=entry.source,
                    details=entry.details, raw_line=entry.raw_line,
                ))
            db.commit()

            return {
                "filename": file.filename,
                "upload_id": upload_id,
                "file_type": file_type,
                "total_entries_parsed": total,
            }
        finally:
            db.close()

    # ── Try decoding as text ──
    try:
        raw_text = raw_bytes.decode("utf-8", errors="ignore")
    except Exception:
        raise HTTPException(status_code=400, detail="Unable to decode file as text")

    db: Session = SessionLocal()
    try:
        if _looks_like_json(file.filename, raw_text):
            parsed_entries = parse_json_telemetry_text(raw_text)

            upload_record = LogUploadDB(filename=file.filename, total_entries=len(parsed_entries))
            db.add(upload_record)
            db.commit()
            db.refresh(upload_record)

            upload_id = upload_record.id
            upload_filename = upload_record.filename
            upload_total = upload_record.total_entries

            for entry in parsed_entries:
                db.add(ParsedTelemetryEntryDB(
                    upload_id=upload_id,
                    timestamp=entry.timestamp,
                    event_type=entry.event_type,
                    source=entry.source,
                    details=entry.details,
                    raw_line=entry.raw_line,
                ))
            db.commit()

            return {
                "filename": upload_filename,
                "upload_id": upload_id,
                "file_type": "json_telemetry",
                "total_entries_parsed": upload_total,
            }

        else:
            parsed_entries = parse_auth_log_text(raw_text)

            upload_record = LogUploadDB(filename=file.filename, total_entries=len(parsed_entries))
            db.add(upload_record)
            db.commit()
            db.refresh(upload_record)

            upload_id = upload_record.id
            upload_filename = upload_record.filename
            upload_total = upload_record.total_entries

            for entry in parsed_entries:
                db.add(ParsedLogEntryDB(
                    upload_id=upload_id,
                    timestamp=entry.timestamp,
                    host=entry.host,
                    source=entry.source,
                    event_type=entry.event_type,
                    raw_message=entry.raw_message,
                    source_ip=entry.source_ip,
                    user=entry.user,
                    port=entry.port,
                    auth_method=entry.auth_method,
                    status=entry.status,
                ))
            db.commit()

            return {
                "filename": upload_filename,
                "upload_id": upload_id,
                "file_type": "auth_log",
                "total_entries_parsed": upload_total,
            }
    finally:
        db.close()
