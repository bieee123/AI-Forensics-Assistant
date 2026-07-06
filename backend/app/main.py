from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import upload, logs, analyze, acquire
from app.models.schemas import init_db
from app.config import OLLAMA_BASE_URL, OLLAMA_EMBEDDING_MODEL
import httpx, os, glob, logging

logger = logging.getLogger(__name__)

app = FastAPI(title="Agentic AI Digital Forensics Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router,   prefix="/upload",   tags=["upload"])
app.include_router(logs.router,     prefix="/logs",     tags=["logs"])
app.include_router(analyze.router,  prefix="/analyze",  tags=["analyze"])
app.include_router(acquire.router,  prefix="/acquire",  tags=["acquire"])

CHROMA_DIR = os.path.join(os.path.dirname(__file__), "../../chroma_db")
RUNBOOKS_DIR = os.path.join(os.path.dirname(__file__), "../../data/runbooks")


@app.on_event("startup")
def on_startup():
    """Initialize database tables on first run, then seed ChromaDB."""
    try:
        init_db()
        logger.info("Database tables verified/created")
    except Exception as e:
        logger.warning("init_db skipped: %s", e)

    seed_chromadb()


def seed_chromadb():
    """Ingest runbook .txt files into ChromaDB on startup if collection is empty."""
    try:
        from chromadb import PersistentClient
        from langchain_ollama import OllamaEmbeddings
        from langchain_chroma import Chroma
        from langchain_text_splitters import RecursiveCharacterTextSplitter

        # Check if collection already exists
        chroma_client = PersistentClient(path=CHROMA_DIR)
        try:
            existing = chroma_client.get_collection("forensic_runbooks")
            if existing.count() > 0:
                logger.info("ChromaDB already seeded (%d docs)", existing.count())
                return
        except Exception:
            pass  # collection doesn't exist yet

        # Find runbook files
        runbook_files = glob.glob(os.path.join(RUNBOOKS_DIR, "*.txt"))
        if not runbook_files:
            logger.warning("No runbook files found in %s", RUNBOOKS_DIR)
            return

        logger.info("Seeding ChromaDB with %d runbooks...", len(runbook_files))
        embeddings = OllamaEmbeddings(model=OLLAMA_EMBEDDING_MODEL, base_url=OLLAMA_BASE_URL)
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=80)

        docs = []
        for fpath in runbook_files:
            with open(fpath, encoding="utf-8") as f:
                text = f.read()
            fname = os.path.basename(fpath)
            chunks = splitter.split_text(text)
            for i, chunk in enumerate(chunks):
                docs.append({"content": chunk, "source": f"{fname}#chunk{i}"})

        Chroma.from_texts(
            texts=[d["content"] for d in docs],
            embedding=embeddings,
            persist_directory=CHROMA_DIR,
            collection_name="forensic_runbooks",
            metadatas=[{"source": d["source"]} for d in docs],
        )
        logger.info("ChromaDB seeded: %d chunks from %d runbooks", len(docs), len(runbook_files))
    except Exception as e:
        logger.warning("ChromaDB seeding skipped: %s", e)

@app.get("/health")
async def health_check():
    # Check Ollama
    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            ollama_ok = resp.status_code == 200
    except Exception:
        pass

    # Check ChromaDB
    chroma_ok = False
    try:
        from chromadb import PersistentClient
        client = PersistentClient(path=CHROMA_DIR)
        client.heartbeat()
        chroma_ok = True
    except Exception:
        pass

    return {
        "status": "ok",
        "ollama_connected": ollama_ok,
        "chromadb_connected": chroma_ok,
    }