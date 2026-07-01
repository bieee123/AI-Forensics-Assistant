from fastapi import FastAPI
from app.routers import upload, logs, analyze

app = FastAPI(title="Agentic AI Digital Forensics Assistant API")

app.include_router(upload.router, prefix="/upload", tags=["upload"])
app.include_router(logs.router, prefix="/logs", tags=["logs"])
app.include_router(analyze.router, prefix="/analyze", tags=["analyze"])

@app.get("/health")
def health_check():
    return {"status": "ok", "ollama_connected": False, "chromadb_connected": False}