"""
Forensic Triage Agent
Single-agent design using LangChain, equipped with tools for log parsing,
IoC extraction, timestamp correlation, and RAG-based runbook lookup.

Sprint 1: skeleton only — full implementation begins Sprint 2/3.
"""

from langchain_ollama import OllamaLLM
from dotenv import load_dotenv
import os

load_dotenv()

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3:8b")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")


def get_llm():
    return OllamaLLM(model=OLLAMA_MODEL, base_url=OLLAMA_BASE_URL)


# TODO Sprint 2/3:
# - Bind tools: log_parser, ioc_extractor, timestamp_sorter, rag_retriever
# - Define agent prompt/system message for forensic triage role
# - Implement agent executor (LangChain AgentExecutor or LCEL chain)
