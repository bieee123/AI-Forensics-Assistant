"""
Analyze router — orchestrates LangChain agent for forensic triage.
Retrieves parsed log entries from DB, runs agent tools, queries RAG,
and returns attack timeline + IoC explanation via local LLM.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.models.schemas import SessionLocal, ParsedLogEntryDB
from app.agent_tools import regex_extract_ioc, timestamp_sorter
from app.config import OLLAMA_MODEL, OLLAMA_BASE_URL, OLLAMA_EMBEDDING_MODEL
from langchain_ollama import OllamaLLM, OllamaEmbeddings
from langchain_chroma import Chroma
from langchain_core.prompts import PromptTemplate
import json, os, logging

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
    for line in text.strip().splitlines():
        if line.startswith("SEVERITY:"):
            result["severity"] = line.replace("SEVERITY:", "").strip()
        elif line.startswith("ATTACK_TIMELINE:"):
            result["attack_timeline"] = line.replace("ATTACK_TIMELINE:", "").strip()
        elif line.startswith("IOC_EXPLANATION:"):
            result["ioc_explanation"] = line.replace("IOC_EXPLANATION:", "").strip()
        elif line.startswith("RECOMMENDATION:"):
            result["recommendation"] = line.replace("RECOMMENDATION:", "").strip()
    return result


@router.post("/", response_model=AnalyzeResponse)
async def analyze_log(request: AnalyzeRequest):
    db: Session = SessionLocal()
    try:
        entries = db.query(ParsedLogEntryDB).filter(
            ParsedLogEntryDB.upload_id == request.upload_id
        ).all()
    finally:
        db.close()

    if not entries:
        raise HTTPException(status_code=404, detail=f"No log entries found for upload_id {request.upload_id}")

    # Step 1: Sort by timestamp using agent tool
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

    # Step 2: Extract IoCs using agent tool
    combined_text = " ".join(
        f"{e.get('source_ip', '')} {e.get('raw_message', '')}"
        for e in sorted_entries
    )
    ioc_result = regex_extract_ioc.invoke({"text": combined_text})
    ioc_list   = ioc_result.get("ips_found", [])

    # Step 3: Classify overall severity
    severity = classify_severity(entries)

    # Step 4: Get RAG context from ChromaDB
    rag_query   = f"SSH {severity.lower()} attack incident response runbook"
    rag_context = get_rag_context(rag_query)

    # Step 5: Build prompt and call local LLM
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

    # Step 6: Build narrative report
    narrative = (
        f"{parsed['attack_timeline']} "
        f"{parsed['ioc_explanation']} "
        f"Recommendation: {parsed['recommendation']}"
    ).strip()

    return AnalyzeResponse(
        upload_id=request.upload_id,
        total_incidents=len(entries),
        attack_timeline=sorted_entries,
        ioc_summary=ioc_list,
        narrative_report=narrative,
        severity_overall=parsed["severity"] or severity,
    )