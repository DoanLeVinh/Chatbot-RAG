import sqlite3
import sys

sys.stdout.reconfigure(encoding='utf-8')
db_path = 'data/logichat.db'
print(f"Connecting to {db_path}")
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT source, COUNT(*) FROM document_parent_chunks GROUP BY source;")
    rows = cursor.fetchall()
    for r in rows:
        print(r)
    conn.close()
except Exception as e:
    print(f"Error: {e}")
