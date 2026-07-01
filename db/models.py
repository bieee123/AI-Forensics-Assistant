"""
SQLAlchemy models for storing parsed log entries and analysis metadata.
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class LogUpload(Base):
    __tablename__ = "log_uploads"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    total_entries = Column(Integer, default=0)


class ParsedLogEntryDB(Base):
    __tablename__ = "parsed_log_entries"

    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, nullable=False)
    timestamp = Column(String)
    host = Column(String)
    status = Column(String)
    auth_method = Column(String)
    user = Column(String)
    source_ip = Column(String)
    port = Column(String)
    raw_line = Column(Text)


def init_db():
    Base.metadata.create_all(bind=engine)


class ParsedTelemetryEntryDB(Base):
    __tablename__ = "parsed_telemetry_entries"

    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, nullable=False)
    timestamp = Column(String)
    event_type = Column(String)
    source = Column(String)
    details = Column(Text)
    raw_line = Column(Text)
