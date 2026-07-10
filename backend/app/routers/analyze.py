"""
Analyze router — orchestrates LangChain agent for forensic triage.
Retrieves parsed log entries from DB, runs agent tools, queries RAG,
and returns attack timeline + IoC explanation via local LLM.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.models.schemas import SessionLocal, ParsedLogEntryDB, save_analysis_result, LogUploadDB, AnalysisResultDB
from app.agent_tools import regex_extract_ioc, timestamp_sorter
from app.config import OLLAMA_MODEL, OLLAMA_BASE_URL, OLLAMA_EMBEDDING_MODEL
from langchain_ollama import OllamaLLM, OllamaEmbeddings
from langchain_chroma import Chroma
from langchain_core.prompts import PromptTemplate
import json, os, logging, time

logger = logging.getLogger(__name__)

router = APIRouter()

CHROMA_DIR = os.path.join(os.path.dirname(__file__), "../../../chroma_db")

class AnalyzeRequest(BaseModel):
    upload_id: int

class AnalyzedIncident(BaseModel):
    timestamp: str
    host: str | None
    event_type: str
    source_ip: str | None
    user: str | None
    status: str | None
    severity: str
    ioc_ip: list[str]
    narrative_description: str

class AnalyzeResponse(BaseModel):
    upload_id: int
    total_incidents: int
    attack_timeline: list[dict]
    ioc_summary: list[str]
    narrative_report: str
    severity_overall: str


def classify_severity(entries: list) -> str:
    has_success = any(e.status == "Accepted" for e in entries)
    fail_count  = sum(1 for e in entries if e.status == "Failed")
    if has_success and fail_count >= 3:
        return "CRITICAL"
    elif has_success:
        return "HIGH"
    elif fail_count >= 5:
        return "MEDIUM"
    elif fail_count > 0:
        return "LOW"
    return "INFO"


def get_rag_context(query: str) -> str:
    try:
        embeddings  = OllamaEmbeddings(model=OLLAMA_EMBEDDING_MODEL, base_url=OLLAMA_BASE_URL)
        vectorstore = Chroma(persist_directory=CHROMA_DIR, collection_name="forensic_runbooks", embedding_function=embeddings)
        docs        = vectorstore.similarity_search(query, k=2)
        return "\n\n".join(d.page_content for d in docs) if docs else ""
    except Exception:
        return ""


FORENSIC_PROMPT = PromptTemplate.from_template("""
You are a digital forensics analyst. Analyze the following security log entries and provide a concise incident report.

LOG ENTRIES (chronological):
{log_entries}

RELEVANT RUNBOOK CONTEXT:
{rag_context}

EXTRACTED IoCs (IP addresses found):
{ioc_list}

Provide your analysis in this exact format:
SEVERITY: [CRITICAL/HIGH/MEDIUM/LOW/INFO]
ATTACK_TIMELINE: [2-4 sentences describing what happened chronologically]
IOC_EXPLANATION: [1-2 sentences explaining what the IP addresses and indicators suggest]
RECOMMENDATION: [1-2 sentences on immediate actions]
""")


def parse_llm_output(text: str) -> dict:
    result = {
        "severity": "UNKNOWN",
        "attack_timeline": "",
        "ioc_explanation": "",
        "recommendation": ""
    }
    current_key = None
    current_value = []

    for line in text.strip().splitlines():
        if line.startswith("SEVERITY:"):
            if current_key and current_value:
                result[current_key] = " ".join(current_value).strip()
            current_key = "severity"
            current_value = [line.replace("SEVERITY:", "").strip()]
        elif line.startswith("ATTACK_TIMELINE:"):
            if current_key and current_value:
                result[current_key] = " ".join(current_value).strip()
            current_key = "attack_timeline"
            current_value = [line.replace("ATTACK_TIMELINE:", "").strip()]
        elif line.startswith("IOC_EXPLANATION:"):
            if current_key and current_value:
                result[current_key] = " ".join(current_value).strip()
            current_key = "ioc_explanation"
            current_value = [line.replace("IOC_EXPLANATION:", "").strip()]
        elif line.startswith("RECOMMENDATION:"):
            if current_key and current_value:
                result[current_key] = " ".join(current_value).strip()
            current_key = "recommendation"
            current_value = [line.replace("RECOMMENDATION:", "").strip()]
        elif current_key:
            current_value.append(line.strip())

    if current_key and current_value:
        result[current_key] = " ".join(current_value).strip()

    return result


@router.post("/", response_model=AnalyzeResponse)
async def analyze_log(request: AnalyzeRequest):
    start_time = time.time()
    db: Session = SessionLocal()
    try:
        entries = db.query(ParsedLogEntryDB).filter(
            ParsedLogEntryDB.upload_id == request.upload_id
        ).all()
    finally:
        db.close()

    if not entries:
        raise HTTPException(status_code=404, detail=f"No log entries found for upload_id {request.upload_id}")

    entries_as_dicts = [
        {
            "timestamp": str(e.timestamp),
            "host": e.host,
            "event_type": e.event_type,
            "source_ip": e.source_ip,
            "user": e.user,
            "status": e.status,
            "raw_message": e.raw_message,
        }
        for e in entries
    ]
    sorted_entries = timestamp_sorter.invoke({"entries": entries_as_dicts})

    combined_text = " ".join(
        f"{e.get('source_ip', '')} {e.get('raw_message', '')}"
        for e in sorted_entries
    )
    ioc_result = regex_extract_ioc.invoke({"text": combined_text})
    ioc_list   = ioc_result.get("ips_found", [])

    severity = classify_severity(entries)

    rag_query   = f"SSH {severity.lower()} attack incident response runbook"
    rag_context = get_rag_context(rag_query)

    log_text = "\n".join(
        f"[{e['timestamp']}] {e['event_type']} | IP: {e['source_ip']} | User: {e['user']} | Status: {e['status']}"
        for e in sorted_entries
    )
    prompt = FORENSIC_PROMPT.format(
        log_entries=log_text,
        rag_context=rag_context or "No runbook context available.",
        ioc_list=", ".join(ioc_list) if ioc_list else "None detected",
    )

    try:
        llm        = OllamaLLM(model=OLLAMA_MODEL, base_url=OLLAMA_BASE_URL)
        llm_output = llm.invoke(prompt)
    except Exception as e:
        logger.error("LLM invocation failed: %s", e)
        raise HTTPException(
            status_code=503,
            detail=f"LLM analysis failed — is Ollama running with model '{OLLAMA_MODEL}'? Error: {e}"
        )
    parsed     = parse_llm_output(llm_output)

    narrative = (
        f"{parsed['attack_timeline']} "
        f"{parsed['ioc_explanation']} "
        f"Recommendation: {parsed['recommendation']}"
    ).strip()

    # Auto-save result to PostgreSQL
    duration = int(time.time() - start_time)
    db_save = SessionLocal()
    try:
        upload = db_save.query(LogUploadDB).filter(LogUploadDB.id == request.upload_id).first()
        filename = upload.filename if upload else f"upload_{request.upload_id}"
        result_dict = {
            "severity_overall": parsed["severity"] or severity,
            "total_incidents": len(entries),
            "narrative_report": narrative,
            "ioc_summary": ioc_list,
            "attack_timeline": sorted_entries,
        }
        save_analysis_result(db_save, request.upload_id, filename, result_dict, duration)
    except Exception as e:
        logger.warning(f"Failed to save analysis result: {e}")
    finally:
        db_save.close()

    return AnalyzeResponse(
        upload_id=request.upload_id,
        total_incidents=len(entries),
        attack_timeline=sorted_entries,
        ioc_summary=ioc_list,
        narrative_report=narrative,
        severity_overall=parsed["severity"] or severity,
    )


@router.get("/history")
def get_analysis_history():
    """Return list of all saved analysis results, newest first."""
    db: Session = SessionLocal()
    try:
        records = db.query(AnalysisResultDB).order_by(
            AnalysisResultDB.analyzed_at.desc()
        ).all()
        return [
            {
                "id": r.id,
                "upload_id": r.upload_id,
                "filename": r.filename,
                "severity": r.severity,
                "total_incidents": r.total_incidents,
                "analyzed_at": str(r.analyzed_at),
                "analysis_duration_seconds": r.analysis_duration_seconds,
            }
            for r in records
        ]
    finally:
        db.close()


@router.get("/result/{upload_id}")
def get_analysis_result(upload_id: int):
    """Return saved analysis result for a specific upload_id."""
    db: Session = SessionLocal()
    try:
        record = db.query(AnalysisResultDB).filter(
            AnalysisResultDB.upload_id == upload_id
        ).first()
        if not record:
            raise HTTPException(status_code=404, detail=f"No analysis found for upload_id {upload_id}")
        return {
            "upload_id":        record.upload_id,
            "filename":         record.filename,
            "severity_overall": record.severity,
            "total_incidents":  record.total_incidents,
            "narrative_report": record.narrative_report,
            "ioc_summary":      json.loads(record.ioc_summary or "[]"),
            "attack_timeline":  json.loads(record.attack_timeline or "[]"),
            "analyzed_at":      str(record.analyzed_at),
            "analysis_duration_seconds": record.analysis_duration_seconds,
        }
    finally:
        db.close()


@router.delete("/result/{upload_id}")
def delete_analysis_result(upload_id: int):
    """Delete saved analysis result to allow re-analysis."""
    db: Session = SessionLocal()
    try:
        record = db.query(AnalysisResultDB).filter(
            AnalysisResultDB.upload_id == upload_id
        ).first()
        if not record:
            raise HTTPException(status_code=404, detail="Not found")
        db.delete(record)
        db.commit()
        return {"deleted": True, "upload_id": upload_id}
    finally:
        db.close()