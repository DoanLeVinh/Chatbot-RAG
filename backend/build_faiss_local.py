"""[DEPRECATED] Build a local FAISS (or hnswlib fallback) index using sentence-transformers embeddings.
WARNING: This script is deprecated and kept for CLI testing only.
FAISS index building has been moved to an in-memory process inside LocalRetriever
to improve performance and avoid CPU/Memory bottlenecks during web server operation.

Nâng cấp PDR: Embed Child Chunks (nhỏ, ~300 ký tự) thay vì Parent Chunks lớn.
Đồng thời copy parent_chunks.json vào faiss_index_local/ để retriever lookup.

Usage:
  python build_faiss_local.py

Creates:
  - faiss_index_local/index.faiss  (or hnsw_index.bin)
  - faiss_index_local/metadata.json       (Child Chunks metadata)
  - faiss_index_local/parent_chunks.json  (Parent Chunks for LLM context)

Performs a sample query at the end and prints top-5 sources.
"""

import os
import sys
import json
import shutil
from pathlib import Path

# Prevent CPU starvation which causes 502 Bad Gateway in Vite proxy
os.environ["OMP_NUM_THREADS"] = "2"
os.environ["OPENBLAS_NUM_THREADS"] = "2"
os.environ["MKL_NUM_THREADS"] = "2"
os.environ["VECLIB_MAXIMUM_THREADS"] = "2"
os.environ["NUMEXPR_NUM_THREADS"] = "2"

# Ensure UTF-8 output in Windows console to avoid UnicodeEncodeError when printing Vietnamese text
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    # reconfigure may not be available in some embeded streams; ignore if it fails
    pass

CHUNKS_PATH = Path.cwd() / "out" / "chunks.json"
PARENT_CHUNKS_PATH = Path.cwd() / "out" / "parent_chunks.json"
INDEX_DIR = Path.cwd() / "faiss_index_local"
INDEX_DIR.mkdir(parents=True, exist_ok=True)
INDEX_FILE_FAISS = INDEX_DIR / "index.faiss"
INDEX_FILE_HNSW = INDEX_DIR / "index_hnsw.bin"
META_FILE = INDEX_DIR / "metadata.json"
PARENT_META_FILE = INDEX_DIR / "parent_chunks.json"

MODEL_NAME = os.getenv("LOCAL_EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-mpnet-base-v2")
BATCH_SIZE = int(os.getenv("EMBED_BATCH_SIZE", "64"))
TOP_K = 5

if not CHUNKS_PATH.exists():
    print(f"ERROR: chunks.json not found at {CHUNKS_PATH}. Run 'python Chatbot.py' first.")
    raise SystemExit(1)

with open(CHUNKS_PATH, "r", encoding="utf-8") as f:
    chunks = json.load(f)

texts = [c.get("text", "") or "" for c in chunks]
if not texts:
    print("No texts found in chunks.json")
    raise SystemExit(1)

print(f"Loaded {len(texts)} Child Chunks from {CHUNKS_PATH}")

# Copy parent_chunks.json vào faiss_index_local/ để retriever có thể lookup
if PARENT_CHUNKS_PATH.exists():
    shutil.copy2(str(PARENT_CHUNKS_PATH), str(PARENT_META_FILE))
    with open(PARENT_CHUNKS_PATH, "r", encoding="utf-8") as f:
        parent_count = len(json.load(f))
    print(f"Copied {parent_count} Parent Chunks to {PARENT_META_FILE}")
else:
    print(f"WARNING: parent_chunks.json not found at {PARENT_CHUNKS_PATH}. Parent-Document Retrieval sẽ không hoạt động.")

print("Loading sentence-transformers model: ", MODEL_NAME)
from sentence_transformers import SentenceTransformer
import numpy as np
import sqlite3
import hashlib

# Initialize Cache DB
CACHE_DB_PATH = INDEX_DIR / "embeddings_cache.db"
conn = sqlite3.connect(str(CACHE_DB_PATH))
conn.execute("CREATE TABLE IF NOT EXISTS cache (text_hash TEXT PRIMARY KEY, embedding BLOB)")
conn.commit()

def hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

# Check cache for existing embeddings
print("Checking embedding cache...")
cursor = conn.cursor()
text_hashes = [hash_text(t) for t in texts]
cached_embeddings = {}
new_texts_with_indices = []

for i, h in enumerate(text_hashes):
    cursor.execute("SELECT embedding FROM cache WHERE text_hash=?", (h,))
    row = cursor.fetchone()
    if row:
        cached_embeddings[i] = np.frombuffer(row[0], dtype="float32")
    else:
        new_texts_with_indices.append((i, texts[i], h))

print(f"Found {len(cached_embeddings)} embeddings in cache. Need to compute {len(new_texts_with_indices)} new embeddings.")

if new_texts_with_indices:
    model = SentenceTransformer(MODEL_NAME)
    new_indices = [item[0] for item in new_texts_with_indices]
    new_texts = [item[1] for item in new_texts_with_indices]
    new_hashes = [item[2] for item in new_texts_with_indices]
    
    new_embs_list = []
    for i in range(0, len(new_texts), BATCH_SIZE):
        batch = new_texts[i : i + BATCH_SIZE]
        emb = model.encode(batch, show_progress_bar=True, convert_to_numpy=True, normalize_embeddings=True)
        new_embs_list.append(emb)
    
    new_embeddings = np.vstack(new_embs_list).astype("float32")
    
    # Save to cache
    for j, (h, emb) in enumerate(zip(new_hashes, new_embeddings)):
        cursor.execute("INSERT OR REPLACE INTO cache (text_hash, embedding) VALUES (?, ?)", (h, emb.tobytes()))
    conn.commit()
    
    # Store in dict
    for j, global_idx in enumerate(new_indices):
        cached_embeddings[global_idx] = new_embeddings[j]

conn.close()

# Reconstruct full ordered embeddings array
ordered_embs = [cached_embeddings[i] for i in range(len(texts))]
embeddings = np.vstack(ordered_embs).astype("float32")
print("Embeddings ready. shape=", embeddings.shape)

# Try FAISS first
use_faiss = False
try:
    import faiss
    use_faiss = True
    print("faiss available: using faiss-cpu for index")
except Exception as e:
    print("faiss not available or failed to import:", e)
    try:
        import hnswlib
        print("hnswlib available: will use hnswlib fallback")
    except Exception as e2:
        print("hnswlib also not available. Please pip install faiss-cpu or hnswlib")
        raise SystemExit(1)

if use_faiss:
    d = embeddings.shape[1]
    # Using inner product on normalized vectors is equivalent to cosine similarity
    index = faiss.IndexFlatIP(d)
    index.add(embeddings)
    faiss.write_index(index, str(INDEX_FILE_FAISS))
    print(f"Saved FAISS index to {INDEX_FILE_FAISS}")
    index_type = "faiss"
else:
    # hnswlib fallback: space = 'ip' for inner product; we'll use normalized embeddings
    import hnswlib
    dim = embeddings.shape[1]
    num_elements = embeddings.shape[0]
    p = hnswlib.Index(space='ip', dim=dim)
    # ef_construction and M are internal params; choose defaults
    p.init_index(max_elements=num_elements, ef_construction=200, M=16)
    p.add_items(embeddings, np.arange(num_elements))
    p.set_ef(50)
    p.save_index(str(INDEX_FILE_HNSW))
    print(f"Saved hnswlib index to {INDEX_FILE_HNSW}")
    index_type = "hnsw"

# Save metadata (Child Chunks)
with open(META_FILE, "w", encoding="utf-8") as f:
    json.dump(chunks, f, ensure_ascii=False, indent=2)
print(f"Saved metadata to {META_FILE}")

# Quick query test
def query_and_print(q, top_k=TOP_K):
    q_emb = model.encode([q], convert_to_numpy=True, normalize_embeddings=True).astype("float32")
    if use_faiss:
        # FAISS expects shape (n, d)
        D, I = index.search(q_emb, top_k)
        scores = D[0].tolist()
        ids = I[0].tolist()
    else:
        import hnswlib
        p = hnswlib.Index(space='ip', dim=embeddings.shape[1])
        p.load_index(str(INDEX_FILE_HNSW))
        labels, distances = p.knn_query(q_emb, k=top_k)
        ids = labels[0].tolist()
        # For ip space, distances are raw inner product (higher better)
        scores = distances[0].tolist()

    print(f"\nTop {top_k} results for query: {q}\n")
    for rank, (idx, score) in enumerate(zip(ids, scores), start=1):
        meta = chunks[idx]
        src = meta.get('source')
        parent_id = meta.get('parent_id', '?')[:8]
        snippet = (meta.get('text') or "").strip().replace('\n',' ')[:200]
        print(f"{rank}. id={idx} score={score:.4f} parent={parent_id}... source={src} snippet={snippet}...\n")

# Run a sample query
sample_q = "Quy định về kiểm tra hàng hóa là gì?"
query_and_print(sample_q)

print("Done.")
