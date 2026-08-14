"""Seed SQLite database with Parent & Child chunks from JSON."""
import json
import sqlite3
import uuid
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import db

def seed_db():
    db.init_db()
    
    base_dir = Path(__file__).resolve().parent.parent
    parent_chunks_path = base_dir / 'faiss_index_local' / 'parent_chunks.json'
    if not parent_chunks_path.exists():
        parent_chunks_path = base_dir / 'out' / 'parent_chunks.json'

    if parent_chunks_path.exists():
        inserted_parents = db.seed_parent_chunks_from_json(parent_chunks_path)
        print(f"[OK] Seeded {inserted_parents} Parent Chunks with SHA-256 hashes into SQLite.")
    else:
        print(f"[WARN] parent_chunks.json not found at {parent_chunks_path}")

    # Seed child chunks for legacy compatibility if available
    chunks_path = base_dir / 'out' / 'chunks.json'
    if chunks_path.exists():
        with open(chunks_path, 'r', encoding='utf-8') as f:
            chunks = json.load(f)

        with db.get_connection() as conn:
            cursor = conn.cursor()
            doc_id = "doc-default-01"
            cursor.execute(
                "INSERT OR IGNORE INTO documents (id, filename, title) VALUES (?, ?, ?)",
                (doc_id, "All_Legal_Documents", "Dữ liệu pháp luật tổng hợp")
            )
            
            inserted = 0
            for chunk in chunks:
                chunk_id = chunk.get("id") or str(uuid.uuid4())
                parent_id = chunk.get("parent_id", "")
                text = chunk.get("text", "")
                chapter = chunk.get("chapter", "")
                article_ids_raw = chunk.get("article_ids", [])
                article_ids = ", ".join(article_ids_raw) if isinstance(article_ids_raw, list) else str(article_ids_raw)
                
                cursor.execute("SELECT id FROM document_chunks WHERE id=?", (chunk_id,))
                if not cursor.fetchone():
                    cursor.execute(
                        """
                        INSERT INTO document_chunks (id, document_id, parent_id, text, chapter, article_ids)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        (chunk_id, doc_id, parent_id, text, chapter, article_ids)
                    )
                    inserted += 1
            conn.commit()
            print(f"[OK] Seeded {inserted} Child Chunks into SQLite.")

if __name__ == '__main__':
    seed_db()
