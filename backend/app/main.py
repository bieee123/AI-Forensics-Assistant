from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import upload, logs, analyze, acquire

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

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "ollama_connected": False,
        "chromadb_connected": False,
    }