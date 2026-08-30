"""Ingest and Chunking Pipeline for Vietnamese Customs & Legal PDFs.

Extracts hierarchical structures (Chương, Mục, Điều, Khoản), splits into:
  - Parent Chunks (~1500-2000 chars) for LLM context synthesis.
  - Child Chunks (~300 chars) for high-precision FAISS vector embedding.
Updates SQLite database (documents, document_nodes, document_parent_chunks)
and synchronizes FAISS vector store.
"""

import os
import sys
import json
import re
import uuid
import hashlib
import sqlite3
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
import pypdf
from datetime import datetime

# Prevent excessive threading starvation on Windows
os.environ["OMP_NUM_THREADS"] = "2"
os.environ["OPENBLAS_NUM_THREADS"] = "2"

try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
PAPERS_DIR = ROOT_DIR / "papers"
INDEX_DIR = ROOT_DIR / "faiss_index_local"
INDEX_DIR.mkdir(parents=True, exist_ok=True)

INDEX_FILE_FAISS = INDEX_DIR / "index.faiss"
META_FILE = INDEX_DIR / "metadata.json"
PARENT_META_FILE = INDEX_DIR / "parent_chunks.json"
CACHE_DB_PATH = INDEX_DIR / "embeddings_cache.db"

EMBEDDING_MODEL_NAME = os.getenv(
    "LOCAL_EMBEDDING_MODEL",
    "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
)


def extract_pdf_text(pdf_path: str | Path) -> str:
    """Extract clean text from a PDF file using pypdf."""
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    reader = pypdf.PdfReader(str(pdf_path))
    pages_text = []
    for idx, page in enumerate(reader.pages):
        try:
            t = page.extract_text()
            if t and t.strip():
                pages_text.append(t.strip())
        except Exception as e:
            print(f"[Warning] Failed to extract page {idx+1} from {pdf_path.name}: {e}")

    return "\n\n".join(pages_text)


class LegalDocumentChunker:
    """Parses legal text into structured 4-level hierarchy (Chương -> Mục -> Điều -> Khoản) and parent/child RAG chunks."""

    def __init__(self, filename: str, source_path: str = None):
        self.filename = filename
        self.source = source_path or f"papers/{filename}"
        self.doc_id = "doc-" + hashlib.md5(self.source.encode('utf-8')).hexdigest()

    def parse_and_chunk(self, raw_text: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Parses text and returns:
          - parent_chunks (for LLM context & document_parent_chunks)
          - child_chunks (for FAISS vector indexing & metadata.json)
          - document_nodes (for hierarchical tree exploration: chuong -> muc -> dieu -> khoan)
        """
        lines = raw_text.split("\n")
        
        nodes = []
        active_nodes = {
            "chuong": None,
            "muc": None,
            "tieu_muc": None,
            "dieu": None,
            "khoan": None,
            "phu_luc": None,
            "mau_so": None
        }
        current_node = None

        def get_parent_id(level: str):
            hierarchy = ["chuong", "muc", "tieu_muc", "dieu", "khoan"]
            if level in ["phu_luc", "mau_so"]:
                return None
            if level not in hierarchy:
                return active_nodes["dieu"]["id"] if active_nodes["dieu"] else (active_nodes["chuong"]["id"] if active_nodes["chuong"] else None)
            idx = hierarchy.index(level)
            for i in range(idx - 1, -1, -1):
                p = active_nodes[hierarchy[i]]
                if p:
                    return p["id"]
            return None

        def create_node(node_type: str, title: str):
            nonlocal current_node
            pid = get_parent_id(node_type)
            node = {
                "id": str(uuid.uuid4()),
                "document_id": self.doc_id,
                "source": self.source,
                "parent_id": pid,
                "node_type": node_type,
                "title": title,
                "text_content": [],
                "sha256_hash": ""
            }
            nodes.append(node)
            active_nodes[node_type] = node
            current_node = node

            hierarchy = ["chuong", "muc", "tieu_muc", "dieu", "khoan"]
            if node_type in hierarchy:
                idx = hierarchy.index(node_type)
                for i in range(idx + 1, len(hierarchy)):
                    active_nodes[hierarchy[i]] = None

        for raw_line in lines:
            line_s = raw_line.strip()
            if not line_s:
                continue

            m_chap = re.match(r"(?i)^(CHƯƠNG\s+[IVXLCDM\d]+)[\.\:\s]*(.*)", line_s)
            m_sec = re.match(r"(?i)^(Mục\s+\d+)[\.\:\s]*(.*)", line_s)
            m_subsec = re.match(r"(?i)^(Tiểu\s+mục\s+\d+)[\.\:\s]*(.*)", line_s)
            m_art = re.match(r"(?i)^(Điều\s+\d+[A-Za-z]?)[\.\:\s]+(.*)", line_s)
            m_clause = re.match(r"^(\d+)[\.\)]\s+(.*)", line_s)
            m_app = re.match(r"(?i)^(Phụ\s+lục\s+[A-Za-z\d]+)[\.\:\s]*(.*)", line_s)
            m_form = re.match(r"(?i)^(Mẫu\s+số\s+[A-Za-z\d]+)[\.\:\s]*(.*)", line_s)

            matched = True
            if m_chap:
                create_node("chuong", m_chap.group(1).upper() + (f": {m_chap.group(2)}" if m_chap.group(2) else ""))
            elif m_sec:
                create_node("muc", m_sec.group(1).title() + (f": {m_sec.group(2)}" if m_sec.group(2) else ""))
            elif m_subsec:
                create_node("tieu_muc", m_subsec.group(1).title() + (f": {m_subsec.group(2)}" if m_subsec.group(2) else ""))
            elif m_art:
                create_node("dieu", m_art.group(1).title() + (f": {m_art.group(2)}" if m_art.group(2) else ""))
            elif m_clause and not active_nodes["phu_luc"] and not active_nodes["mau_so"]:
                create_node("khoan", f"Khoản {m_clause.group(1)}" + (f": {m_clause.group(2)}" if m_clause.group(2) else ""))
            elif m_app:
                create_node("phu_luc", m_app.group(1).title() + (f": {m_app.group(2)}" if m_app.group(2) else ""))
            elif m_form:
                create_node("mau_so", m_form.group(1).title() + (f": {m_form.group(2)}" if m_form.group(2) else ""))
            else:
                matched = False

            if not matched:
                if current_node:
                    title = current_node.get("title", "")
                    if len(current_node["text_content"]) == 0 and title and not re.search(r'[\.\:\;]$', title):
                        if line_s[0].islower() or line_s[0].isdigit():
                            current_node["title"] += " " + line_s
                        else:
                            current_node["text_content"].append(line_s)
                    else:
                        current_node["text_content"].append(line_s)
                else:
                    node = {
                        "id": str(uuid.uuid4()),
                        "document_id": self.doc_id,
                        "source": self.source,
                        "parent_id": None,
                        "node_type": "text",
                        "title": "MỞ ĐẦU",
                        "text_content": [line_s],
                        "sha256_hash": ""
                    }
                    nodes.append(node)
                    current_node = node

        # Finalize text_content and calculate sha256_hash for nodes
        final_nodes = []
        for n in nodes:
            txt = "\n".join(n["text_content"]) if isinstance(n["text_content"], list) else n.get("text_content", "")
            n["text_content"] = txt.strip()
            n["sha256_hash"] = hashlib.sha256(f"{n['title']}\n{n['text_content']}".encode('utf-8')).hexdigest()
            final_nodes.append(n)

        # Build Parent Chunks for RAG synthesis:
        # Group each Điều/Phụ lục with its Khoản children to form rich coherent parent chunks
        parent_chunks = []
        child_chunks = []

        dieu_nodes = [n for n in final_nodes if n["node_type"] in ["dieu", "phu_luc", "mau_so"]]
        if not dieu_nodes:
            dieu_nodes = [n for n in final_nodes if len(n["text_content"]) > 30]

        for dn in dieu_nodes:
            child_khoans = [k for k in final_nodes if k.get("parent_id") == dn["id"]]
            parts = []
            if dn["title"]:
                parts.append(dn["title"])
            if dn["text_content"]:
                parts.append(dn["text_content"])
            for k in child_khoans:
                k_txt = f"{k['title']}\n{k['text_content']}".strip()
                if k_txt:
                    parts.append(k_txt)

            full_text = "\n\n".join(parts).strip()
            if not full_text:
                continue

            # Determine chapter
            chap_name = "VĂN BẢN QUY PHẠM"
            curr_pid = dn.get("parent_id")
            while curr_pid:
                p_node = next((x for x in final_nodes if x["id"] == curr_pid), None)
                if p_node:
                    if p_node["node_type"] == "chuong":
                        chap_name = p_node["title"]
                        break
                    curr_pid = p_node.get("parent_id")
                else:
                    break

            pid = dn["id"]
            p_chunk = {
                "id": pid,
                "parent_id": pid,
                "source": self.source,
                "chapter": chap_name,
                "article_ids": [dn["title"]],
                "text": full_text,
                "sha256_hash": hashlib.sha256(full_text.encode('utf-8')).hexdigest(),
                "filename": self.filename
            }
            parent_chunks.append(p_chunk)

            # Split into child chunks (~300-350 chars) for dense vector search
            c_splits = self._split_child_text(full_text)
            for c_text in c_splits:
                cid = str(uuid.uuid4())
                c_hash = hashlib.sha256(c_text.encode('utf-8')).hexdigest()
                child_chunks.append({
                    "id": cid,
                    "parent_id": pid,
                    "source": self.source,
                    "chapter": chap_name,
                    "article_ids": [dn["title"]],
                    "text": c_text,
                    "sha256_hash": c_hash,
                    "filename": self.filename
                })

        # Fallback if no parent chunks generated
        if not parent_chunks:
            generic_splits = self._split_generic_text(raw_text, chunk_size=1500, overlap=200)
            for g_text in generic_splits:
                pid = str(uuid.uuid4())
                sha256_hash = hashlib.sha256(g_text.encode('utf-8')).hexdigest()
                p_chunk = {
                    "id": pid,
                    "parent_id": pid,
                    "source": self.source,
                    "chapter": "VĂN BẢN QUY PHẠM",
                    "article_ids": [],
                    "text": g_text,
                    "sha256_hash": sha256_hash,
                    "filename": self.filename
                }
                parent_chunks.append(p_chunk)
                for c_text in self._split_child_text(g_text):
                    cid = str(uuid.uuid4())
                    child_chunks.append({
                        "id": cid,
                        "parent_id": pid,
                        "source": self.source,
                        "chapter": "VĂN BẢN QUY PHẠM",
                        "article_ids": [],
                        "text": c_text,
                        "sha256_hash": hashlib.sha256(c_text.encode('utf-8')).hexdigest(),
                        "filename": self.filename
                    })

        return parent_chunks, child_chunks, final_nodes

    @staticmethod
    def _split_child_text(text: str, chunk_size: int = 350, overlap: int = 60) -> List[str]:
        """Splits a parent text into child chunks (~300-350 chars) respecting sentence boundaries."""
        if len(text) <= chunk_size:
            return [text]

        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            if end >= len(text):
                chunks.append(text[start:].strip())
                break

            # Find boundary
            split_at = -1
            for punct in ["\n", ". ", "; ", ", "]:
                idx = text.rfind(punct, start + 100, end)
                if idx != -1:
                    split_at = idx + len(punct)
                    break

            if split_at == -1:
                split_at = end

            c = text[start:split_at].strip()
            if c:
                chunks.append(c)
            start = split_at - overlap
            if start < 0 or start >= len(text):
                break

        return chunks

    @staticmethod
    def _split_generic_text(text: str, chunk_size: int = 1500, overlap: int = 200) -> List[str]:
        """Splits plain long text into parent chunks."""
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            if end >= len(text):
                chunks.append(text[start:].strip())
                break
            idx = text.rfind("\n\n", start + 300, end)
            if idx == -1:
                idx = text.rfind("\n", start + 300, end)
            if idx == -1:
                idx = text.rfind(". ", start + 300, end)
            if idx == -1:
                idx = end
            else:
                idx += 1

            c = text[start:idx].strip()
            if c:
                chunks.append(c)
            start = idx - overlap
        return chunks


def save_chunks_to_db(doc_id: str, filename: str, source: str, parent_chunks: List[Dict], nodes: List[Dict]):
    """Persists extracted parent chunks, nodes, and document tracking to SQLite."""
    import db
    db.init_db()

    with db.get_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Update or Insert into documents
        cursor.execute("SELECT id FROM documents WHERE filename = ?;", (filename,))
        row = cursor.fetchone()
        if row:
            cursor.execute("UPDATE documents SET status = 'ready' WHERE filename = ?;", (filename,))
        else:
            cursor.execute(
                "INSERT INTO documents (id, filename, title, status) VALUES (?, ?, ?, 'ready');",
                (doc_id, filename, filename)
            )

        # 2. Clean previous chunks for this source to ensure idempotency
        clean_name = filename
        cursor.execute("DELETE FROM document_parent_chunks WHERE source = ? OR source LIKE ?;", (source, f"%{clean_name}%"))
        cursor.execute("DELETE FROM document_nodes WHERE source = ? OR source LIKE ?;", (source, f"%{clean_name}%"))

        # 3. Insert into document_parent_chunks
        now_str = datetime.now().isoformat()
        for p in parent_chunks:
            art_str = ",".join(p.get("article_ids", []))
            cursor.execute(
                """
                INSERT OR REPLACE INTO document_parent_chunks 
                (parent_id, source, text, chapter, article_ids, sha256_hash, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (p["parent_id"], source, p["text"], p.get("chapter", ""), art_str, p["sha256_hash"], now_str, now_str)
            )

        # 4. Insert into document_nodes
        for n in nodes:
            cursor.execute(
                """
                INSERT OR REPLACE INTO document_nodes
                (id, document_id, source, parent_id, node_type, title, text_content, sha256_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (n["id"], doc_id, source, n.get("parent_id"), n.get("node_type", "text"), n.get("title", ""), n.get("text_content", ""), n["sha256_hash"])
            )

        conn.commit()


def rebuild_vector_index() -> int:
    """
    Rebuilds the FAISS Vector Index and BM25 index from all parent and child chunks in SQLite and cache.
    Uses sentence-transformers/paraphrase-multilingual-mpnet-base-v2 (768-dim).
    """
    import faiss
    import numpy as np
    from sentence_transformers import SentenceTransformer
    import db

    print(f"\n[VECTOR INDEXER] Loading all chunks from SQLite...")
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM document_parent_chunks ORDER BY source, parent_id;")
        p_rows = cursor.fetchall()
        
        cursor.execute("SELECT * FROM document_nodes ORDER BY source, id;")
        n_rows = cursor.fetchall()

    if not p_rows and not n_rows:
        print("[VECTOR INDEXER] No documents found in database to index.")
        return 0

    all_parent_chunks = []
    all_child_chunks = []

    for r in p_rows:
        art_ids = [x.strip() for x in r["article_ids"].split(",") if x.strip()] if r["article_ids"] else []
        all_parent_chunks.append({
            "id": r["parent_id"],
            "parent_id": r["parent_id"],
            "source": r["source"],
            "chapter": r["chapter"],
            "article_ids": art_ids,
            "text": r["text"],
            "sha256_hash": r["sha256_hash"]
        })

        # Generate child chunks for high-granularity vector search
        splits = LegalDocumentChunker._split_child_text(r["text"], chunk_size=350, overlap=60)
        for s in splits:
            all_child_chunks.append({
                "id": str(uuid.uuid4()),
                "parent_id": r["parent_id"],
                "source": r["source"],
                "chapter": r["chapter"],
                "article_ids": art_ids,
                "text": s,
                "sha256_hash": hashlib.sha256(s.encode('utf-8')).hexdigest()
            })

    # Save parent_chunks.json and metadata.json
    with open(PARENT_META_FILE, "w", encoding="utf-8") as f:
        json.dump(all_parent_chunks, f, ensure_ascii=False, indent=2)

    with open(META_FILE, "w", encoding="utf-8") as f:
        json.dump(all_child_chunks, f, ensure_ascii=False, indent=2)

    print(f"[VECTOR INDEXER] Saved {len(all_parent_chunks)} Parent Chunks to {PARENT_META_FILE}")
    print(f"[VECTOR INDEXER] Saved {len(all_child_chunks)} Child Chunks to {META_FILE}")

    # Compute Embeddings with Cache
    cache_conn = sqlite3.connect(str(CACHE_DB_PATH))
    cache_conn.execute("CREATE TABLE IF NOT EXISTS cache (text_hash TEXT PRIMARY KEY, embedding BLOB)")
    cache_conn.commit()
    cache_cur = cache_conn.cursor()

    texts = [c["text"] for c in all_child_chunks]
    text_hashes = [c["sha256_hash"] for c in all_child_chunks]
    cached_embeddings = {}
    missing_indices = []

    for idx, h in enumerate(text_hashes):
        cache_cur.execute("SELECT embedding FROM cache WHERE text_hash = ?;", (h,))
        row = cache_cur.fetchone()
        if row:
            cached_embeddings[idx] = np.frombuffer(row[0], dtype="float32")
        else:
            missing_indices.append(idx)

    print(f"[VECTOR INDEXER] Embeddings in cache: {len(cached_embeddings)} | Need embedding: {len(missing_indices)}")

    if missing_indices:
        print(f"[VECTOR INDEXER] Loading model {EMBEDDING_MODEL_NAME}...")
        model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        
        batch_size = 64
        missing_texts = [texts[i] for i in missing_indices]
        missing_hashes = [text_hashes[i] for i in missing_indices]

        print(f"[VECTOR INDEXER] Computing embeddings for {len(missing_texts)} chunks...")
        for b_start in range(0, len(missing_texts), batch_size):
            b_texts = missing_texts[b_start : b_start + batch_size]
            b_hashes = missing_hashes[b_start : b_start + batch_size]
            b_embs = model.encode(b_texts, normalize_embeddings=True, convert_to_numpy=True)

            for j, (h, emb) in enumerate(zip(b_hashes, b_embs)):
                cache_cur.execute("INSERT OR REPLACE INTO cache (text_hash, embedding) VALUES (?, ?);", (h, emb.tobytes()))
                global_idx = missing_indices[b_start + j]
                cached_embeddings[global_idx] = emb.astype("float32")

            cache_conn.commit()

    cache_conn.close()

    # Build FAISS Index (IndexFlatIP for normalized cosine similarity)
    ordered_embs = np.vstack([cached_embeddings[i] for i in range(len(texts))]).astype("float32")
    dim = ordered_embs.shape[1]
    
    print(f"[VECTOR INDEXER] Creating FAISS FlatIP index with dim={dim}, total_vectors={ordered_embs.shape[0]}...")
    index = faiss.IndexFlatIP(dim)
    index.add(ordered_embs)
    faiss.write_index(index, str(INDEX_FILE_FAISS))

    print(f"[VECTOR INDEXER] Successfully created and saved FAISS index with {index.ntotal} vectors to {INDEX_FILE_FAISS}!")
    return index.ntotal


def ingest_file(pdf_path: str | Path, rebuild_index: bool = True) -> Dict[str, Any]:
    """Ingest a single PDF document."""
    pdf_path = Path(pdf_path)
    print(f"\n[INGEST] Processing file: {pdf_path.name}...")
    
    raw_text = extract_pdf_text(pdf_path)
    if not raw_text or len(raw_text.strip()) < 20:
        print(f"[Warning] PDF {pdf_path.name} contains no readable text.")
        return {"filename": pdf_path.name, "parent_chunks": 0, "child_chunks": 0, "status": "empty"}

    chunker = LegalDocumentChunker(pdf_path.name, source_path=f"papers/{pdf_path.name}")
    parent_chunks, child_chunks, nodes = chunker.parse_and_chunk(raw_text)

    save_chunks_to_db(
        doc_id=chunker.doc_id,
        filename=pdf_path.name,
        source=chunker.source,
        parent_chunks=parent_chunks,
        nodes=nodes
    )

    print(f"[INGEST] Extracted {len(parent_chunks)} parent chunks, {len(child_chunks)} child chunks from {pdf_path.name}.")

    total_vectors = 0
    if rebuild_index:
        total_vectors = rebuild_vector_index()

    return {
        "filename": pdf_path.name,
        "parent_chunks": len(parent_chunks),
        "child_chunks": len(child_chunks),
        "total_vectors": total_vectors,
        "status": "ready"
    }


def ingest_all_papers(papers_dir: str | Path = None, force: bool = False) -> Dict[str, Any]:
    """Scans and ingests all PDF files in the papers/ directory."""
    papers_dir = Path(papers_dir) if papers_dir else PAPERS_DIR
    if not papers_dir.exists():
        raise FileNotFoundError(f"Papers directory not found: {papers_dir}")

    pdfs = sorted(list(papers_dir.glob("*.pdf")))
    print(f"[INGEST ALL] Found {len(pdfs)} PDF documents in {papers_dir}.")

    results = []
    import db
    db.init_db()

    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT filename, status FROM documents;")
        doc_status_map = {r["filename"]: r["status"] for r in cursor.fetchall()}
        
        cursor.execute("SELECT DISTINCT source, COUNT(*) as cnt FROM document_parent_chunks GROUP BY source;")
        parent_counts = {r["source"]: r["cnt"] for r in cursor.fetchall()}

    for pdf in pdfs:
        clean_name = pdf.name
        source = f"papers/{clean_name}"
        has_chunks = (parent_counts.get(source, 0) > 0) or (parent_counts.get(clean_name, 0) > 0)
        
        if not force and has_chunks and doc_status_map.get(clean_name) == "ready":
            print(f"[INGEST ALL] Skipping '{pdf.name}' (already processed with {parent_counts.get(source, 0)} chunks).")
            continue

        res = ingest_file(pdf, rebuild_index=False)
        results.append(res)

    print(f"\n[INGEST ALL] Finished processing {len(results)} new/updated documents. Rebuilding global Vector Index...")
    total_vectors = rebuild_vector_index()

    return {
        "total_files": len(pdfs),
        "processed_files": len(results),
        "total_vectors": total_vectors,
        "details": results
    }


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Ingest Vietnamese Legal PDFs into LogiChat RAG.")
    parser.add_argument("--file", type=str, help="Ingest a specific PDF file.")
    parser.add_argument("--all", action="store_true", help="Ingest all PDF files in papers/ folder.")
    parser.add_argument("--force", action="store_true", help="Force re-chunking and re-indexing of all files.")

    args = parser.parse_args()

    if args.file:
        ingest_file(args.file, rebuild_index=True)
    elif args.all or args.force:
        ingest_all_papers(force=args.force)
    else:
        # Default to processing all unprocessed papers
        ingest_all_papers(force=False)
