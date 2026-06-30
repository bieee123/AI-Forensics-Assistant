# Agentic AI Digital Forensics Assistant 

Welcome to the official repository of Team Eight's project. This system is a local and secure LLM-powered agent framework designed to bridge the cybersecurity skills gap by helping infrastructure and development teams perform rapid forensic triage during security incidents.

### Core Features
1. **Log & Artifact Ingestion:** Seamless parsing of `auth.log`, `syslog`, and JSON API telemetry.
2. **Context-Aware Analysis:** Multi-agent framework (LangChain/CrewAI) to reconstruct attack timelines and decode complex Indicators of Compromise (IoCs).
3. **Local & Secure Deployment:** Runs completely on-premise/private VPS using Ollama and local vector databases (ChromaDB) to guarantee strict data sovereignty.

### Repository Structure
* `/frontend` - React + Tailwind UI Dashboard
* `/backend` - FastAPI application & log parsing pipelines
* `/agent` - Core AI Agent logic, custom tools, and RAG configuration
* `/docs` - System architecture, API contracts, and procurement documentation
