"""
FastAPI application — Agentic AI Digital Forensics Assistant
Sprint 2: /upload endpoint for log ingestion
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from db.models import SessionLocal, LogUpload, ParsedLogEntryDB, init_db
from tools.log_parser import parse_auth_log_text

app = FastAPI(title="Agentic AI Digital Forensics Assistant")


@app.on_event("startup")
def on_startup():
    init_db()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def root():
    return {"status": "ok", "service": "Agentic AI Digital Forensics Assistant"}


@app.post("/upload")
async def upload_log(file: UploadFile = File(...)):
    """
    Accepts a raw log file (e.g., auth.log), parses it, and stores
    structured entries in the database.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    raw_bytes = await file.read()
    try:
        raw_text = raw_bytes.decode("utf-8", errors="ignore")
    except Exception:
        raise HTTPException(status_code=400, detail="Unable to decode file as text")

    parsed_entries = parse_auth_log_text(raw_text)

    db: Session = SessionLocal()
    try:
        upload_record = LogUpload(
            filename=file.filename,
            total_entries=len(parsed_entries),
        )
        db.add(upload_record)
        db.commit()
        db.refresh(upload_record)

        # Capture values BEFORE the session closes, to avoid DetachedInstanceError
        upload_id = upload_record.id
        upload_filename = upload_record.filename
        upload_total = upload_record.total_entries

        for entry in parsed_entries:
            db_entry = ParsedLogEntryDB(
                upload_id=upload_id,
                timestamp=entry["timestamp"],
                host=entry["host"],
                status=entry["status"],
                auth_method=entry["auth_method"],
                user=entry["user"],
                source_ip=entry["source_ip"],
                port=entry["port"],
                raw_line=entry["raw_line"],
            )
            db.add(db_entry)
        db.commit()
    finally:
        db.close()

    return {
        "filename": upload_filename,
        "upload_id": upload_id,
        "total_entries_parsed": upload_total,
        "entries_preview": parsed_entries[:3],
    }
