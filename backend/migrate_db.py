import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
import db

def migrate():
    with db.get_connection() as conn:
        cursor = conn.cursor()
        
        # Select all from document_parent_chunks that are NOT in document_nodes yet
        cursor.execute("""
            SELECT * FROM document_parent_chunks 
            WHERE source NOT IN (SELECT DISTINCT source FROM document_nodes)
        """)
        legacy_chunks = cursor.fetchall()
        
        inserted = 0
        for chunk in legacy_chunks:
            # chunk: parent_id, document_id, source, text, chapter, article_ids, sha256_hash
            node_id = chunk["parent_id"]
            doc_id = chunk["document_id"]
            source = chunk["source"]
            node_type = "chuong"
            title = f"{chunk['chapter']} - {chunk['article_ids']}" if chunk['article_ids'] else chunk['chapter']
            text_content = chunk["text"]
            sha256 = chunk["sha256_hash"]
            
            cursor.execute("""
                INSERT INTO document_nodes (id, document_id, source, parent_id, node_type, title, text_content, sha256_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (node_id, doc_id, source, None, node_type, title, text_content, sha256))
            inserted += 1
            
        conn.commit()
        print(f"Migrated {inserted} legacy chunks into document_nodes.")

if __name__ == "__main__":
    migrate()
