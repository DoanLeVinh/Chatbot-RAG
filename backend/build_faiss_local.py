import os
import sys
import json
import sqlite3
from pathlib import Path

# Prevent CPU starvation
os.environ["OMP_NUM_THREADS"] = "2"
os.environ["OPENBLAS_NUM_THREADS"] = "2"
os.environ["MKL_NUM_THREADS"] = "2"
os.environ["VECLIB_MAXIMUM_THREADS"] = "2"
os.environ["NUMEXPR_NUM_THREADS"] = "2"

try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

INDEX_DIR = Path.cwd() / "faiss_index_local"
INDEX_DIR.mkdir(parents=True, exist_ok=True)
INDEX_FILE_FAISS = INDEX_DIR / "index.faiss"
INDEX_FILE_HNSW = INDEX_DIR / "index_hnsw.bin"
META_FILE = INDEX_DIR / "metadata.json"
PARENT_META_FILE = INDEX_DIR / "parent_chunks.json"

MODEL_NAME = os.getenv("LOCAL_EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-mpnet-base-v2")
BATCH_SIZE = int(os.getenv("EMBED_BATCH_SIZE", "64"))

DB_PATH = Path.cwd() / "data" / "logichat.db"

print("Reading nodes from SQLite Database...")
conn = sqlite3.connect(str(DB_PATH))
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Get all nodes that have text_content
cursor.execute("SELECT * FROM document_nodes WHERE text_content != '' OR node_type = 'text'")
rows = cursor.fetchall()

chunks = []
parent_chunks = []

for row in rows:
    title = row["title"] or ""
    text = row["text_content"] or ""
    full_text = (title + "\n" + text).strip()
    
    meta = {
        "id": row["id"],
        "parent_id": row["parent_id"],
        "node_type": row["node_type"],
        "title": title,
        "text": full_text,
        "source": row["source"],
        "sha256_hash": row["sha256_hash"]
    }
    chunks.append(meta)

# For parent_chunks, we just pull everything that could be a parent (chuong, muc, dieu, khoan)
cursor.execute("SELECT * FROM document_nodes WHERE node_type IN ('chuong', 'muc', 'tieu_muc', 'dieu', 'khoan')")
parent_rows = cursor.fetchall()
for row in parent_rows:
    parent_chunks.append({
        "id": row["id"],
        "parent_id": row["id"],  # For backward compatibility where parent_id = self id
        "node_type": row["node_type"],
        "title": row["title"],
        "text_content": row["text_content"],
        "source": row["source"]
    })
    
conn.close()

if not chunks:
    print("No chunks found in DB. Run 'python backend/run_parser.py' first.")
    raise SystemExit(1)

print(f"Loaded {len(chunks)} Child Chunks from DB")
print(f"Loaded {len(parent_chunks)} Parent Chunks from DB")

with open(PARENT_META_FILE, "w", encoding="utf-8") as f:
    json.dump(parent_chunks, f, ensure_ascii=False, indent=2)
print(f"Saved {len(parent_chunks)} Parent Chunks to {PARENT_META_FILE}")

print("Loading sentence-transformers model: ", MODEL_NAME)
from sentence_transformers import SentenceTransformer
import numpy as np

# Cache DB
CACHE_DB_PATH = INDEX_DIR / "embeddings_cache.db"
cache_conn = sqlite3.connect(str(CACHE_DB_PATH))
cache_conn.execute("CREATE TABLE IF NOT EXISTS cache (text_hash TEXT PRIMARY KEY, embedding BLOB)")
cache_conn.commit()

import hashlib
def hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

print("Checking embedding cache...")
cache_cursor = cache_conn.cursor()
texts = [c["text"] for c in chunks]
text_hashes = [hash_text(t) for t in texts]
cached_embeddings = {}
new_texts_with_indices = []

for i, h in enumerate(text_hashes):
    cache_cursor.execute("SELECT embedding FROM cache WHERE text_hash=?", (h,))
    row = cache_cursor.fetchone()
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
    
    for j, (h, emb) in enumerate(zip(new_hashes, new_embeddings)):
        cache_cursor.execute("INSERT OR REPLACE INTO cache (text_hash, embedding) VALUES (?, ?)", (h, emb.tobytes()))
    cache_conn.commit()
    
    for j, global_idx in enumerate(new_indices):
        cached_embeddings[global_idx] = new_embeddings[j]

cache_conn.close()

ordered_embs = [cached_embeddings[i] for i in range(len(texts))]
embeddings = np.vstack(ordered_embs).astype("float32")
print("Embeddings ready. shape=", embeddings.shape)

use_faiss = False
try:
    import faiss
    use_faiss = True
    print("faiss available: using faiss-cpu for index")
except Exception as e:
    pass

if use_faiss:
    d = embeddings.shape[1]
    index = faiss.IndexFlatIP(d)
    index.add(embeddings)
    faiss.write_index(index, str(INDEX_FILE_FAISS))
    print(f"Saved FAISS index to {INDEX_FILE_FAISS}")
else:
    import hnswlib
    dim = embeddings.shape[1]
    num_elements = embeddings.shape[0]
    p = hnswlib.Index(space='ip', dim=dim)
    p.init_index(max_elements=num_elements, ef_construction=200, M=16)
    p.add_items(embeddings, np.arange(num_elements))
    p.set_ef(50)
    p.save_index(str(INDEX_FILE_HNSW))
    print(f"Saved hnswlib index to {INDEX_FILE_HNSW}")

with open(META_FILE, "w", encoding="utf-8") as f:
    json.dump(chunks, f, ensure_ascii=False, indent=2)
print(f"Saved metadata to {META_FILE}")
print("Done.")
