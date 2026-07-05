"""
Logs router — retrieve parsed log entries and upload history from database.
"""

from fastapi import APIRouter, Query
from sqlalchemy.orm import Session
from app.models.schemas import (
    SessionLocal, LogUploadDB, ParsedLogEntryDB, ParsedTelemetryEntryDB
)

router = APIRouter()


@router.get("/uploads")
def get_uploads():
    """Return all upload records."""
    db: Session = SessionLocal()
    try:
        uploads = db.query(LogUploadDB).order_by(LogUploadDB.uploaded_at.desc()).all()
        return [
            {
                "upload_id": u.id,
                "filename": u.filename,
                "uploaded_at": str(u.uploaded_at),
                "total_entries": u.total_entries,
            }
            for u in uploads
        ]
    finally:
        db.close()


@router.get("/entries")
def get_entries(upload_id: int = Query(..., description="Upload ID to fetch entries for")):
    """Return parsed log entries for a given upload_id."""
    db: Session = SessionLocal()
    try:
        entries = db.query(ParsedLogEntryDB).filter(
            ParsedLogEntryDB.upload_id == upload_id
        ).order_by(ParsedLogEntryDB.timestamp).all()

        return [
            {
                "id": e.id,
                "upload_id": e.upload_id,
                "timestamp": str(e.timestamp),
                "host": e.host,
                "source": e.source,
                "event_type": e.event_type,
                "source_ip": e.source_ip,
                "user": e.user,
                "port": e.port,
                "auth_method": e.auth_method,
                "status": e.status,
                "raw_message": e.raw_message,
            }
            for e in entries
        ]
    finally:
        db.close()


@router.get("/telemetry")
def get_telemetry(upload_id: int = Query(..., description="Upload ID to fetch telemetry for")):
    """Return parsed telemetry entries for a given upload_id."""
    db: Session = SessionLocal()
    try:
        entries = db.query(ParsedTelemetryEntryDB).filter(
            ParsedTelemetryEntryDB.upload_id == upload_id
        ).all()

        return [
            {
                "id": e.id,
                "upload_id": e.upload_id,
                "timestamp": e.timestamp,
                "event_type": e.event_type,
                "source": e.source,
                "details": e.details,
            }
            for e in entries
        ]
    finally:
        db.close()


@router.get("/summary")
def get_summary():
    """Dashboard summary: total uploads, total entries, recent activity."""
    db: Session = SessionLocal()
    try:
        total_uploads  = db.query(LogUploadDB).count()
        total_entries  = db.query(ParsedLogEntryDB).count()
        total_telemetry = db.query(ParsedTelemetryEntryDB).count()
        recent_uploads = db.query(LogUploadDB).order_by(
            LogUploadDB.uploaded_at.desc()
        ).limit(5).all()

        return {
            "total_uploads": total_uploads,
            "total_log_entries": total_entries,
            "total_telemetry_entries": total_telemetry,
            "recent_uploads": [
                {
                    "upload_id": u.id,
                    "filename": u.filename,
                    "uploaded_at": str(u.uploaded_at),
                    "total_entries": u.total_entries,
                }
                for u in recent_uploads
            ],
        }
    finally:
        db.close()