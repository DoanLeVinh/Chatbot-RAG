import json
import sqlite3
import uuid
from pathlib import Path
from db import init_db, get_connection

def seed_db():
    init_db()
    
    # Path is relative to the backend directory where this script resides
    base_dir = Path(__file__).resolve().parent.parent
    chunks_path = base_dir / 'out' / 'chunks.json'
    if not chunks_path.exists():
        print(f"File {chunks_path} not found.")
        return

    with open(chunks_path, 'r', encoding='utf-8') as f:
        chunks = json.load(f)

    with get_connection() as conn:
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
        print(f"Seeded {inserted} chunks into SQLite.")

if __name__ == '__main__':
    seed_db()
