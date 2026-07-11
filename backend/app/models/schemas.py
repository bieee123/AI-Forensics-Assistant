"""
Pydantic schemas for request/response validation,
and SQLAlchemy models for database persistence.
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

# --- Pydantic Schemas ---

class ParsedLogEntry(BaseModel):
    timestamp: datetime
    host: Optional[str] = None
    source: str
    event_type: str
    raw_message: str
    source_ip: Optional[str] = None
    user: Optional[str] = None
    port: Optional[str] = None
    auth_method: Optional[str] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True


class ParsedTelemetryEntry(BaseModel):
    timestamp: str
    event_type: str
    source: str
    details: str
    raw_line: str


class UploadResponse(BaseModel):
    filename: str
    upload_id: int
    file_type: str
    total_entries_parsed: int


# --- Auth Schemas ---

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    organization: str

    class Config:
        from_attributes = True


class ForgotPasswordRequest(BaseModel):
    email: str


class VerifyOTPRequest(BaseModel):
    email: str
    otp_code: str


class ResetPasswordRequest(BaseModel):
    email: str
    otp_code: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None


class ActivityLogEntry(BaseModel):
    timestamp: str
    action: str
    details: str
    dot_color: str

    class Config:
        from_attributes = True


# --- SQLAlchemy Setup ---

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# --- SQLAlchemy ORM Models ---

class LogUploadDB(Base):
    __tablename__ = "log_uploads"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    total_entries = Column(Integer, default=0)


class ParsedLogEntryDB(Base):
    __tablename__ = "parsed_log_entries"

    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, nullable=False)
    timestamp = Column(DateTime)
    host = Column(String)
    source = Column(String)
    event_type = Column(String)
    raw_message = Column(Text)
    source_ip = Column(String)
    user = Column(String)
    port = Column(String)
    auth_method = Column(String)
    status = Column(String)


class ParsedTelemetryEntryDB(Base):
    __tablename__ = "parsed_telemetry_entries"

    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, nullable=False)
    timestamp = Column(String)
    event_type = Column(String)
    source = Column(String)
    details = Column(Text)
    raw_line = Column(Text)



class AnalysisResultDB(Base):
    __tablename__ = "analysis_results"

    id           = Column(Integer, primary_key=True, index=True)
    upload_id    = Column(Integer, nullable=False, unique=True, index=True)
    filename     = Column(String, nullable=False)
    severity     = Column(String, nullable=False)
    total_incidents = Column(Integer, default=0)
    narrative_report = Column(Text, nullable=True)
    ioc_summary  = Column(Text, nullable=True)   # JSON string: ["ip1", "ip2"]
    attack_timeline = Column(Text, nullable=True) # JSON string: [{...}, {...}]
    analyzed_at  = Column(DateTime, default=datetime.utcnow)
    analysis_duration_seconds = Column(Integer, nullable=True)


# --- Auth ORM Models ---

class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False, default="")
    role = Column(String(50), nullable=False, default="Forensic Analyst")
    organization = Column(String(255), nullable=False, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OTPTokenDB(Base):
    __tablename__ = "otp_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    email = Column(String(255), nullable=False)
    otp_code = Column(String(6), nullable=False)
    purpose = Column(String(20), nullable=False)  # "login" or "reset_password"
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class PasswordPolicyDB(Base):
    __tablename__ = "password_policy"

    id = Column(Integer, primary_key=True, index=True)
    min_length = Column(Integer, default=8)
    require_uppercase = Column(Boolean, default=True)
    require_number = Column(Boolean, default=True)
    require_symbol = Column(Boolean, default=True)
    otp_ttl_seconds = Column(Integer, default=300)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserSessionDB(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)


class ActivityLogDB(Base):
    __tablename__ = "activity_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    dot_color = Column(String(20), nullable=False, default="var(--accent)")
    created_at = Column(DateTime, default=datetime.utcnow)


def save_analysis_result(db, upload_id: int, filename: str, result: dict, duration_seconds: int = None):
    """Save or update analysis result for an upload."""
    import json
    existing = db.query(AnalysisResultDB).filter(AnalysisResultDB.upload_id == upload_id).first()
    if existing:
        existing.severity          = result.get("severity_overall", "UNKNOWN")
        existing.total_incidents   = result.get("total_incidents", 0)
        existing.narrative_report  = result.get("narrative_report", "")
        existing.ioc_summary       = json.dumps(result.get("ioc_summary", []))
        existing.attack_timeline   = json.dumps(result.get("attack_timeline", []))
        existing.analyzed_at       = datetime.utcnow()
        existing.analysis_duration_seconds = duration_seconds
        db.commit()
        db.refresh(existing)
        return existing
    else:
        record = AnalysisResultDB(
            upload_id    = upload_id,
            filename     = filename,
            severity     = result.get("severity_overall", "UNKNOWN"),
            total_incidents = result.get("total_incidents", 0),
            narrative_report = result.get("narrative_report", ""),
            ioc_summary  = json.dumps(result.get("ioc_summary", [])),
            attack_timeline = json.dumps(result.get("attack_timeline", [])),
            analysis_duration_seconds = duration_seconds,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record


def init_db():
    Base.metadata.create_all(bind=engine)
