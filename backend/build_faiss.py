import os
import json
from dotenv import load_dotenv

load_dotenv()
if not os.getenv("OPENAI_API_KEY"):
    print("ERROR: OPENAI_API_KEY not set. Create a .env with OPENAI_API_KEY or export it in your environment.")
    raise SystemExit(1)

from langchain.schema import Document
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS

# Load persisted chunks
chunks_path = os.path.join(os.getcwd(), "out", "chunks.json")
if not os.path.exists(chunks_path):
    print(f"ERROR: chunks.json not found at {chunks_path}. Run chunking first.")
    raise SystemExit(1)

with open(chunks_path, "r", encoding="utf-8") as f:
    chunks = json.load(f)

docs = []
for c in chunks:
    docs.append(Document(page_content=c.get("text", ""), metadata={
        "source": c.get("source"),
        "start_index": c.get("start_index"),
        "chunk_id": c.get("chunk_id"),
    }))

print(f"Embedding {len(docs)} documents using OpenAI embeddings (this may incur cost)...")
emb = OpenAIEmbeddings(model=os.getenv("EMBEDDING_MODEL", "text-embedding-3-large"))

# Build FAISS index
vector_store = FAISS.from_documents(documents=docs, embedding=emb)
index_path = os.path.join(os.getcwd(), "faiss_index")
vector_store.save_local(index_path)
print(f"Saved FAISS index to {index_path} (num vectors = {len(docs)})")
