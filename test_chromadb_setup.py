from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from dotenv import load_dotenv
import os

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# Load dokumen runbook
loader = TextLoader("data/runbooks/ssh_brute_force_runbook.txt")
documents = loader.load()

# Split jadi chunks
text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = text_splitter.split_documents(documents)
print(f"Jumlah chunks: {len(chunks)}")

# Setup embeddings via Ollama, pakai model embedding khusus
embeddings = OllamaEmbeddings(model="nomic-embed-text", base_url=OLLAMA_BASE_URL)

# Simpan ke ChromaDB
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./chroma_db"
)
print("Berhasil disimpan ke ChromaDB")

# Test retrieval
query = "Bagaimana cara merespons serangan SSH brute force?"
results = vectorstore.similarity_search(query, k=2)

print("\n--- Hasil Retrieval ---")
for i, doc in enumerate(results):
    print(f"\nChunk {i+1}:")
    print(doc.page_content[:200])
