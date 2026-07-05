"""
Pydantic schemas for request/response validation,
and SQLAlchemy models for database persistence.
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, Text, create_engine
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


def init_db():
    Base.metadata.create_all(bind=engine)
