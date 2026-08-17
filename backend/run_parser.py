import sys
from pathlib import Path
import hashlib
import sqlite3

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
import db
from Chatbot import process_single_pdf

def run():
    print("Starting reprocessing...", flush=True)
    papers_dir = Path(__file__).resolve().parent.parent / "papers"
    pdfs = list(papers_dir.glob("*.pdf"))
    
    with db.get_connection() as conn:
        cursor = conn.cursor()
        # Clear existing data
        cursor.execute("DELETE FROM document_nodes")
        cursor.execute("DELETE FROM documents")
        conn.commit()
        
        for pdf_path in pdfs:
            print(f"Processing: {pdf_path.name}...", flush=True)
            nodes = process_single_pdf(str(pdf_path))
            print(f"-> Extracted {len(nodes)} nodes.", flush=True)
            
            source = f"papers/{pdf_path.name}"
            doc_id = "doc-" + hashlib.md5(source.encode()).hexdigest()
            cursor.execute(
                "INSERT INTO documents (id, filename, title) VALUES (?, ?, ?)",
                (doc_id, pdf_path.name, pdf_path.name)
            )
            
            inserted = 0
            for node in nodes:
                node_id = node.get("id")
                parent_id = node.get("parent_id")
                node_type = node.get("node_type")
                title = node.get("title", "")
                text_content = node.get("text_content", "")
                
                content_to_hash = title + "\n" + text_content
                sha256_hash = hashlib.sha256(content_to_hash.encode('utf-8')).hexdigest()
                
                cursor.execute(
                    """
                    INSERT INTO document_nodes (id, document_id, source, parent_id, node_type, title, text_content, sha256_hash)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (node_id, doc_id, source, parent_id, node_type, title, text_content, sha256_hash)
                )
                inserted += 1
            
            conn.commit()
            print(f"-> Saved {inserted} nodes to database.", flush=True)
            
    print("Done reprocessing all PDFs!", flush=True)

if __name__ == "__main__":
    run()
