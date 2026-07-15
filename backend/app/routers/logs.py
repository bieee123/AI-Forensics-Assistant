"""
Logs router — retrieve parsed log entries and upload history from database.
"""

import json
import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.schemas import (
    SessionLocal, LogUploadDB, ParsedLogEntryDB, ParsedTelemetryEntryDB,
    AnalysisResultDB
)

router = APIRouter()

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "../../../data/acquired_artifacts")


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
    """Return parsed log entries for a given upload_id (supports both auth logs and telemetry)."""
    db: Session = SessionLocal()
    try:
        auth_entries = db.query(ParsedLogEntryDB).filter(
            ParsedLogEntryDB.upload_id == upload_id
        ).order_by(ParsedLogEntryDB.timestamp).all()

        if auth_entries:
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
                for e in auth_entries
            ]

        telemetry_entries = db.query(ParsedTelemetryEntryDB).filter(
            ParsedTelemetryEntryDB.upload_id == upload_id
        ).all()

        return [
            {
                "id": e.id,
                "upload_id": e.upload_id,
                "timestamp": e.timestamp,
                "host": e.source,
                "source": e.source,
                "event_type": e.event_type,
                "source_ip": "",
                "user": "",
                "port": "",
                "auth_method": "",
                "status": "",
                "raw_message": e.details,
            }
            for e in telemetry_entries
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
    """Dashboard summary with stats from all modules: uploads, analysis, acquisition, timeline."""
    db: Session = SessionLocal()
    try:
        # ── Upload stats ──
        total_uploads    = db.query(LogUploadDB).count()
        total_log_entries = db.query(ParsedLogEntryDB).count()
        total_telemetry  = db.query(ParsedTelemetryEntryDB).count()

        recent_uploads = db.query(LogUploadDB).order_by(
            LogUploadDB.uploaded_at.desc()
        ).limit(5).all()

        # ── Analysis stats ──
        total_analyses  = db.query(AnalysisResultDB).count()
        total_incidents = db.query(func.coalesce(func.sum(AnalysisResultDB.total_incidents), 0)).scalar()
        critical_alerts = db.query(AnalysisResultDB).filter(
            AnalysisResultDB.severity == "CRITICAL"
        ).count()

        severity_rows = db.query(
            AnalysisResultDB.severity, func.count(AnalysisResultDB.id)
        ).group_by(AnalysisResultDB.severity).all()
        severity_breakdown = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
        for sev, cnt in severity_rows:
            key = sev.upper() if sev else "UNKNOWN"
            if key in severity_breakdown:
                severity_breakdown[key] = cnt

        recent_analyses = db.query(AnalysisResultDB).order_by(
            AnalysisResultDB.analyzed_at.desc()
        ).limit(5).all()

        # ── IoC overview: collect unique IPs from recent analyses ──
        recent_iocs = set()
        for r in recent_analyses:
            if r.ioc_summary:
                try:
                    ips = json.loads(r.ioc_summary)
                    if isinstance(ips, list):
                        for ip in ips:
                            recent_iocs.add(ip)
                except (json.JSONDecodeError, TypeError):
                    pass

        # ── Acquisition stats (file-system based) ──
        total_artifacts = 0
        acquisition_data_size = 0
        last_acquisition = None
        recent_artifacts = []
        if os.path.exists(ARTIFACTS_DIR):
            for fname in sorted(os.listdir(ARTIFACTS_DIR), reverse=True):
                if fname.endswith(".custody.txt"):
                    continue
                if last_acquisition is None:
                    last_acquisition = fname
                total_artifacts += 1
                fpath = os.path.join(ARTIFACTS_DIR, fname)
                try:
                    size = os.path.getsize(fpath)
                except OSError:
                    size = 0
                acquisition_data_size += size
                if len(recent_artifacts) < 5:
                    sha256 = "unknown"
                    custody = fpath + ".custody.txt"
                    if os.path.exists(custody):
                        with open(custody) as f:
                            for line in f:
                                if "SHA-256:" in line:
                                    sha256 = line.split("SHA-256:")[-1].strip()
                                    break
                    recent_artifacts.append({
                        "filename": fname,
                        "size_bytes": size,
                        "sha256": sha256,
                    })

        # ── Timeline preview: entries per day for last 7 days ──
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_log_entries = db.query(ParsedLogEntryDB).filter(
            ParsedLogEntryDB.timestamp >= seven_days_ago
        ).all()
        daily_counts = {}
        for e in recent_log_entries:
            day = e.timestamp.strftime("%Y-%m-%d")
            daily_counts[day] = daily_counts.get(day, 0) + 1

        timeline_daily_counts = []
        for i in range(7):
            day = (datetime.utcnow() - timedelta(days=6 - i)).strftime("%Y-%m-%d")
            timeline_daily_counts.append({
                "date": day,
                "count": daily_counts.get(day, 0),
            })

        # ── Build upload list ──
        def serialize_upload(u):
            return {
                "upload_id": u.id,
                "filename": u.filename,
                "uploaded_at": str(u.uploaded_at),
                "total_entries": u.total_entries,
            }

        def serialize_analysis(a):
            return {
                "upload_id": a.upload_id,
                "filename": a.filename,
                "severity": a.severity,
                "total_incidents": a.total_incidents,
                "analyzed_at": str(a.analyzed_at),
            }

        return {
            "total_uploads": total_uploads,
            "total_log_entries": total_log_entries,
            "total_telemetry_entries": total_telemetry,
            "recent_uploads": [serialize_upload(u) for u in recent_uploads],

            "total_analyses": total_analyses,
            "total_incidents": total_incidents,
            "critical_alerts": critical_alerts,
            "severity_breakdown": severity_breakdown,
            "recent_analyses": [serialize_analysis(a) for a in recent_analyses],
            "recent_iocs": list(recent_iocs),

            "total_artifacts": total_artifacts,
            "acquisition_data_size": acquisition_data_size,
            "last_acquisition": last_acquisition,
            "recent_artifacts": recent_artifacts,

            "timeline_daily_counts": timeline_daily_counts,
        }
    finally:
        db.close()