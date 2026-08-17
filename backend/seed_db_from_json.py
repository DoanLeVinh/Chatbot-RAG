"""Seed SQLite database with hierarchical nodes from JSON."""
import json
import sqlite3
import uuid
import sys
from pathlib import Path
import hashlib

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import db

def seed_db():
    db.init_db()
    
    base_dir = Path(__file__).resolve().parent.parent
    nodes_path = base_dir / 'out' / 'document_nodes.json'

    if nodes_path.exists():
        with open(nodes_path, 'r', encoding='utf-8') as f:
            nodes = json.load(f)

        with db.get_connection() as conn:
            cursor = conn.cursor()
            
            inserted = 0
            for node in nodes:
                node_id = node.get("id")
                parent_id = node.get("parent_id")
                node_type = node.get("node_type")
                title = node.get("title", "")
                text_content = node.get("text_content", "")
                source = node.get("source", "")
                
                # Create a document entry if not exists
                doc_id = "doc-" + hashlib.md5(source.encode()).hexdigest()
                cursor.execute("SELECT id FROM documents WHERE id=?", (doc_id,))
                if not cursor.fetchone():
                    cursor.execute(
                        "INSERT INTO documents (id, filename, title) VALUES (?, ?, ?)",
                        (doc_id, Path(source).name, Path(source).name)
                    )
                
                # Calculate sha256_hash for the text
                content_to_hash = title + "\n" + text_content
                sha256_hash = hashlib.sha256(content_to_hash.encode('utf-8')).hexdigest()
                node["sha256_hash"] = sha256_hash
                
                cursor.execute("SELECT id FROM document_nodes WHERE id=?", (node_id,))
                if not cursor.fetchone():
                    cursor.execute(
                        """
                        INSERT INTO document_nodes (id, document_id, source, parent_id, node_type, title, text_content, sha256_hash)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (node_id, doc_id, source, parent_id, node_type, title, text_content, sha256_hash)
                    )
                    inserted += 1
                    
            # update json with hashes
            with open(nodes_path, 'w', encoding='utf-8') as fw:
                json.dump(nodes, fw, ensure_ascii=False, indent=2)
                
            conn.commit()
            print(f"[OK] Seeded {inserted} Hierarchical Nodes into SQLite.")
    else:
        print(f"[WARN] document_nodes.json not found at {nodes_path}")

if __name__ == '__main__':
    seed_db()
