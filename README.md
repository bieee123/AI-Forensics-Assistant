# Agentic AI Digital Forensics Assistant 

Welcome to the official repository of Team Eight's project. This system is a local and secure LLM-powered agent framework designed to bridge the cybersecurity skills gap by helping infrastructure and development teams perform rapid forensic triage during security incidents.

### Core Features
1. **Log & Artifact Ingestion:** Seamless parsing of `auth.log`, `syslog`, and JSON API telemetry.
2. **Context-Aware Analysis:** Multi-agent framework (LangChain/CrewAI) to reconstruct attack timelines and decode complex Indicators of Compromise (IoCs).
3. **Local & Secure Deployment:** Runs completely on-premise/private VPS using Ollama and local vector databases (ChromaDB) to guarantee strict data sovereignty.

### Repository Structure
* `/frontend` - Next.js dashboard
* `/backend` - FastAPI service
* `/agent` - LangChain agent logic & tools
* `/docs` -  Architecture Documentation, API contract, PRD, etc 

## Tech Stack
* `/docs/architecture.md` and PRD project.