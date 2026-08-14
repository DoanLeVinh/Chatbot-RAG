import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / "backend"))
import db

with db.get_connection() as conn:
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET role = 'admin' WHERE email = 'admin12@gmail.com';")
    conn.commit()
    print(f"Successfully promoted admin12@gmail.com to admin. Rows updated: {cursor.rowcount}")

    cursor.execute("SELECT id, email, full_name, role FROM users WHERE role = 'admin';")
    print("Current Admin Accounts:")
    for r in cursor.fetchall():
        print(f" - Email: {r['email']} | Name: {r['full_name']} | Role: {r['role']}")
