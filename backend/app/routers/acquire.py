"""
Autonomous Artifact Acquisition Tool (Extra Credit)
Connects to a target server via SSH, pulls log files,
computes SHA-256 hash for chain of custody, stores metadata,
and triggers analysis automatically.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.models.schemas import SessionLocal, LogUploadDB, ParsedLogEntryDB
from app.parsers.log_parser import parse_auth_log_text
from app.config import OLLAMA_MODEL, OLLAMA_BASE_URL
import paramiko
import hashlib
import datetime
import os
import io

router = APIRouter()

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "../../../data/acquired_artifacts")


class AcquireRequest(BaseModel):
    host: str
    port: int = 22
    username: str
    password: str | None = None
    private_key_path: str | None = None
    remote_log_path: str = "/var/log/auth.log"


class AcquireResponse(BaseModel):
    host: str
    remote_path: str
    local_path: str
    sha256_hash: str
    file_size_bytes: int
    acquired_at: str
    upload_id: int
    total_entries_parsed: int
    chain_of_custody: str


@router.post("/", response_model=AcquireResponse)
async def acquire_artifact(request: AcquireRequest):
    """
    SSH into target server, pull log file, hash it (SHA-256),
    store locally with metadata, and ingest into the database.
    """
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)

    # Step 1: Connect via SSH
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        connect_kwargs = {
            "hostname": request.host,
            "port": request.port,
            "username": request.username,
            "timeout": 30,
        }
        if request.private_key_path:
            connect_kwargs["key_filename"] = request.private_key_path
        elif request.password:
            connect_kwargs["password"] = request.password
        else:
            raise HTTPException(status_code=400, detail="Either password or private_key_path is required")

        ssh.connect(**connect_kwargs)

    except paramiko.AuthenticationException:
        raise HTTPException(status_code=401, detail=f"SSH authentication failed for {request.username}@{request.host}")
    except paramiko.NoValidConnectionsError:
        raise HTTPException(status_code=503, detail=f"Cannot connect to {request.host}:{request.port}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SSH connection error: {str(e)}")

    # Step 2: Pull the log file via SFTP
    try:
        sftp = ssh.open_sftp()
        file_buffer = io.BytesIO()
        sftp.getfo(request.remote_log_path, file_buffer)
        raw_bytes = file_buffer.getvalue()
        sftp.close()
    except FileNotFoundError:
        ssh.close()
        raise HTTPException(status_code=404, detail=f"Remote file not found: {request.remote_log_path}")
    except Exception as e:
        ssh.close()
        raise HTTPException(status_code=500, detail=f"SFTP error: {str(e)}")
    finally:
        ssh.close()

    # Step 3: Compute SHA-256 hash (chain of custody)
    sha256_hash = hashlib.sha256(raw_bytes).hexdigest()
    acquired_at = datetime.datetime.utcnow().isoformat() + "Z"
    file_size   = len(raw_bytes)

    # Step 4: Save locally with timestamp in filename
    safe_host     = request.host.replace(".", "_").replace(":", "_")
    safe_path     = request.remote_log_path.replace("/", "_").lstrip("_")
    timestamp_str = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    local_filename = f"{timestamp_str}_{safe_host}_{safe_path}"
    local_path     = os.path.join(ARTIFACTS_DIR, local_filename)

    with open(local_path, "wb") as f:
        f.write(raw_bytes)

    # Step 5: Write chain of custody record
    custody_record = (
        f"CHAIN OF CUSTODY RECORD\n"
        f"=======================\n"
        f"Acquired from:  {request.username}@{request.host}:{request.port}\n"
        f"Remote path:    {request.remote_log_path}\n"
        f"Local path:     {local_path}\n"
        f"Acquired at:    {acquired_at} (UTC)\n"
        f"File size:      {file_size} bytes\n"
        f"SHA-256:        {sha256_hash}\n"
        f"Acquired by:    DFA Autonomous Artifact Acquisition Tool v1.0\n"
    )
    custody_path = local_path + ".custody.txt"
    with open(custody_path, "w") as f:
        f.write(custody_record)

    # Step 6: Parse and ingest into database
    raw_text      = raw_bytes.decode("utf-8", errors="ignore")
    parsed_entries = parse_auth_log_text(raw_text)

    db: Session = SessionLocal()
    try:
        upload_record = LogUploadDB(
            filename=local_filename,
            total_entries=len(parsed_entries),
        )
        db.add(upload_record)
        db.commit()
        db.refresh(upload_record)
        upload_id = upload_record.id

        for entry in parsed_entries:
            db.add(ParsedLogEntryDB(
                upload_id=upload_id,
                timestamp=entry.timestamp,
                host=entry.host,
                source=f"acquired:{request.host}:{request.remote_log_path}",
                event_type=entry.event_type,
                raw_message=entry.raw_message,
                source_ip=entry.source_ip,
                user=entry.user,
                port=entry.port,
                auth_method=entry.auth_method,
                status=entry.status,
            ))
        db.commit()
    finally:
        db.close()

    return AcquireResponse(
        host=request.host,
        remote_path=request.remote_log_path,
        local_path=local_path,
        sha256_hash=sha256_hash,
        file_size_bytes=file_size,
        acquired_at=acquired_at,
        upload_id=upload_id,
        total_entries_parsed=len(parsed_entries),
        chain_of_custody=custody_record,
    )


@router.get("/artifacts")
def list_artifacts():
    """List all locally acquired artifacts with their chain of custody hashes."""
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    artifacts = []
    for fname in sorted(os.listdir(ARTIFACTS_DIR)):
        if fname.endswith(".custody.txt"):
            continue
        fpath    = os.path.join(ARTIFACTS_DIR, fname)
        custody  = fpath + ".custody.txt"
        sha256   = "unknown"
        acquired = "unknown"
        if os.path.exists(custody):
            with open(custody) as f:
                for line in f:
                    if "SHA-256:" in line:
                        sha256 = line.split("SHA-256:")[-1].strip()
                    if "Acquired at:" in line:
                        acquired = line.split("Acquired at:")[-1].strip()
        artifacts.append({
            "filename": fname,
            "path": fpath,
            "sha256": sha256,
            "acquired_at": acquired,
            "size_bytes": os.path.getsize(fpath),
        })
    return artifacts