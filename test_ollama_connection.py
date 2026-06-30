from langchain_ollama import OllamaLLM
from dotenv import load_dotenv
import os

load_dotenv()

model = os.getenv("OLLAMA_MODEL", "llama3:8b")
base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

llm = OllamaLLM(model=model, base_url=base_url)

response = llm.invoke("Jelaskan dalam satu kalimat apa itu SSH brute force attack.")
print("Response dari LLM:")
print(response)
