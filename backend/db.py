"""Database module using SQLite for LogiChat (Chatbot-RAG).

Manages relational tables:
  - users: User credentials and profile
  - sessions: Chat sessions tied to user_id for strict isolation
  - messages: Chat messages per session (user & AI with structured fields)
  - attachments: Document file uploads tied to session/user
  - settings: User preferences
"""
import sqlite3
import hashlib
import os
import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any

DB_PATH = Path.cwd() / 'data' / 'logichat.db'

def get_connection():
    """Get SQLite database connection with row factory enabled."""
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """Initialize database tables if they do not exist."""
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Table: users
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                full_name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Table: sessions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                title TEXT NOT NULL,
                category_tag TEXT DEFAULT 'Tư vấn Hải quan',
                group_name TEXT DEFAULT 'TODAY',
                preview_text TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)

        # Table: messages
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                sender TEXT NOT NULL,
                text TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                hs_code TEXT,
                taxes_json TEXT,
                inspections_json TEXT,
                citations_json TEXT,
                summary_pdf_json TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
            );
        """)

        # Table: attachments
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS attachments (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                user_id TEXT,
                file_name TEXT NOT NULL,
                file_size TEXT,
                file_type TEXT,
                file_url TEXT NOT NULL,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)

        # Table: settings
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                user_id TEXT PRIMARY KEY,
                auto_cite INTEGER DEFAULT 1,
                theme TEXT DEFAULT 'light',
                law_database TEXT DEFAULT '2023-2024',
                font_size TEXT DEFAULT 'medium',
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)

        # Table: documents
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                title TEXT,
                upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Table: document_chunks
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS document_chunks (
                id TEXT PRIMARY KEY,
                document_id TEXT,
                parent_id TEXT NOT NULL,
                text TEXT NOT NULL,
                chapter TEXT,
                article_ids TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
            );
        """)

        conn.commit()


# ─── Auth Logic (Password Hashing & User CRUD) ──────────────────────

def _hash_password(password: str, salt: bytes = None) -> tuple[str, str]:
    """Hash password using PBKDF2 with HMAC SHA-256."""
    if salt is None:
        salt = os.urandom(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return hashed.hex(), salt.hex()

def register_user(email: str, password: str, full_name: str) -> Dict[str, Any]:
    """Register a new user in SQLite."""
    email_clean = email.strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ?;", (email_clean,))
        if cursor.fetchone():
            raise ValueError("Email đã được đăng ký trước đó.")

        user_id = f"user-{uuid.uuid4().hex[:10]}"
        pwd_hash, salt_hex = _hash_password(password)
        name_clean = full_name.strip() if full_name else email_clean.split('@')[0]

        cursor.execute(
            "INSERT INTO users (id, email, password_hash, salt, full_name) VALUES (?, ?, ?, ?, ?);",
            (user_id, email_clean, pwd_hash, salt_hex, name_clean)
        )
        
        # Initialize default settings for user
        cursor.execute(
            "INSERT OR REPLACE INTO settings (user_id, auto_cite, law_database, font_size) VALUES (?, 1, '2023-2024', 'medium');",
            (user_id,)
        )
        conn.commit()

        return {
            "id": user_id,
            "email": email_clean,
            "fullName": name_clean
        }

def login_user(email: str, password: str) -> Dict[str, Any]:
    """Authenticate user with email and password."""
    email_clean = email.strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, password_hash, salt, full_name FROM users WHERE email = ?;", (email_clean,))
        row = cursor.fetchone()
        if not row:
            raise ValueError("Email hoặc mật khẩu không chính xác.")

        stored_hash = row["password_hash"]
        salt_bytes = bytes.fromhex(row["salt"])
        computed_hash, _ = _hash_password(password, salt_bytes)

        if computed_hash != stored_hash:
            raise ValueError("Email hoặc mật khẩu không chính xác.")

        return {
            "id": row["id"],
            "email": row["email"],
            "fullName": row["full_name"]
        }


# ─── Sessions Logic ─────────────────────────────────────────────────

def get_user_sessions(user_id: Optional[str], search: str = None, tag: str = None, page: int = 1, limit: int = 20) -> Dict[str, Any]:
    """Retrieve user-isolated sessions with filtering and pagination."""
    with get_connection() as conn:
        cursor = conn.cursor()
        
        query = "SELECT * FROM sessions WHERE 1=1"
        params = []

        if user_id:
            query += " AND (user_id = ? OR user_id IS NULL)"
            params.append(user_id)
        else:
            query += " AND user_id IS NULL"

        if search:
            query += " AND (title LIKE ? OR preview_text LIKE ?)"
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern])

        if tag:
            query += " AND category_tag = ?"
            params.append(tag)

        query += " ORDER BY updated_at DESC"

        # Count total
        count_query = f"SELECT COUNT(*) FROM ({query})"
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]

        # Pagination
        offset = (page - 1) * limit
        query += " LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(query, params)
        rows = cursor.fetchall()

        sessions_list = []
        for r in rows:
            # Check message count
            cursor.execute("SELECT COUNT(*) FROM messages WHERE session_id = ?;", (r["id"],))
            msg_count = cursor.fetchone()[0]

            # Fetch references/attachments if available
            cursor.execute("SELECT * FROM attachments WHERE session_id = ?;", (r["id"],))
            att_rows = cursor.fetchall()
            atts = [
                {
                    "id": a["id"],
                    "name": a["file_name"],
                    "size": a["file_size"],
                    "type": a["file_type"],
                    "url": a["file_url"]
                }
                for a in att_rows
            ]

            sessions_list.append({
                "id": r["id"],
                "userId": r["user_id"],
                "title": r["title"],
                "group": r["group_name"],
                "updatedAt": r["updated_at"],
                "categoryTag": r["category_tag"],
                "previewText": r["preview_text"] or "",
                "messageCount": msg_count,
                "attachments": atts,
            })

        return {
            "sessions": sessions_list,
            "total": total,
            "page": page,
            "hasMore": (offset + limit) < total
        }

def create_session(user_id: Optional[str], title: str = "Hội thoại tư vấn mới", category_tag: str = "Tư vấn Hải quan") -> Dict[str, Any]:
    """Create a new chat session."""
    session_id = f"session-{uuid.uuid4().hex[:10]}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO sessions (id, user_id, title, category_tag, group_name, preview_text, created_at, updated_at)
               VALUES (?, ?, ?, ?, 'TODAY', 'Bắt đầu đặt câu hỏi pháp lý mới...', ?, ?);""",
            (session_id, user_id, title, category_tag, now_str, now_str)
        )
        
        # Insert initial welcome message
        welcome_msg_id = f"m-{uuid.uuid4().hex[:8]}"
        timestamp = datetime.now().strftime("%H:%M")
        cursor.execute(
            """INSERT INTO messages (id, session_id, sender, text, timestamp)
               VALUES (?, ?, 'ai', ?, ?);""",
            (welcome_msg_id, session_id, 'Xin chào. Tôi là Trợ lý Pháp lý Hải quan LogiChat. Tôi có thể giúp gì cho bạn về quy định xuất nhập khẩu, mã HS, thuế quan hoặc thủ tục thông quan?', timestamp)
        )
        conn.commit()

        return {
            "id": session_id,
            "userId": user_id,
            "title": title,
            "group": "TODAY",
            "updatedAt": "Vừa xong",
            "categoryTag": category_tag,
            "previewText": "Bắt đầu đặt câu hỏi pháp lý mới...",
            "messages": [
                {
                    "id": welcome_msg_id,
                    "sender": "ai",
                    "text": 'Xin chào. Tôi là Trợ lý Pháp lý Hải quan LogiChat. Tôi có thể giúp gì cho bạn về quy định xuất nhập khẩu, mã HS, thuế quan hoặc thủ tục thông quan?',
                    "timestamp": timestamp,
                }
            ],
            "references": [],
            "attachments": []
        }

def get_session_detail(session_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Retrieve session details with all messages and citations."""
    with get_connection() as conn:
        cursor = conn.cursor()
        
        if user_id:
            cursor.execute("SELECT * FROM sessions WHERE id = ? AND (user_id = ? OR user_id IS NULL);", (session_id, user_id))
        else:
            cursor.execute("SELECT * FROM sessions WHERE id = ?;", (session_id,))

        s_row = cursor.fetchone()
        if not s_row:
            return None

        # Fetch messages
        cursor.execute("SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC;", (session_id,))
        m_rows = cursor.fetchall()

        messages = []
        references = []
        ref_seen = set()

        for m in m_rows:
            taxes = json.loads(m["taxes_json"]) if m["taxes_json"] else None
            inspections = json.loads(m["inspections_json"]) if m["inspections_json"] else None
            citations = json.loads(m["citations_json"]) if m["citations_json"] else None
            summary_pdf = json.loads(m["summary_pdf_json"]) if m["summary_pdf_json"] else None

            if citations:
                for c in citations:
                    code = c.get("code")
                    if code and code not in ref_seen:
                        ref_seen.add(code)
                        references.append(c)

            msg_obj = {
                "id": m["id"],
                "sender": m["sender"],
                "text": m["text"],
                "timestamp": m["timestamp"],
            }
            if m["hs_code"]:
                msg_obj["hsCode"] = m["hs_code"]
            if taxes:
                msg_obj["taxes"] = taxes
            if inspections:
                msg_obj["inspections"] = inspections
            if citations:
                msg_obj["citations"] = citations
            if summary_pdf:
                msg_obj["summaryPdf"] = summary_pdf

            messages.append(msg_obj)

        # Fetch attachments
        cursor.execute("SELECT * FROM attachments WHERE session_id = ?;", (session_id,))
        att_rows = cursor.fetchall()
        attachments = [
            {
                "id": a["id"],
                "name": a["file_name"],
                "size": a["file_size"],
                "type": a["file_type"],
                "url": a["file_url"]
            }
            for a in att_rows
        ]

        return {
            "id": s_row["id"],
            "userId": s_row["user_id"],
            "title": s_row["title"],
            "group": s_row["group_name"],
            "updatedAt": s_row["updated_at"],
            "categoryTag": s_row["category_tag"],
            "previewText": s_row["preview_text"] or "",
            "messages": messages,
            "references": references,
            "attachments": attachments
        }

def delete_session(session_id: str, user_id: Optional[str] = None) -> bool:
    """Delete a session by ID."""
    with get_connection() as conn:
        cursor = conn.cursor()
        if user_id:
            cursor.execute("DELETE FROM sessions WHERE id = ? AND (user_id = ? OR user_id IS NULL);", (session_id, user_id))
        else:
            cursor.execute("DELETE FROM sessions WHERE id = ?;", (session_id,))
        conn.commit()
        return cursor.rowcount > 0

def add_message(session_id: str, sender: str, text: str, timestamp: str,
                hs_code: str = None, taxes: list = None, inspections: dict = None,
                citations: list = None, summary_pdf: dict = None) -> str:
    """Add a new chat message to SQLite database."""
    msg_id = f"{sender}-{uuid.uuid4().hex[:8]}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    taxes_str = json.dumps(taxes, ensure_ascii=False) if taxes else None
    inspections_str = json.dumps(inspections, ensure_ascii=False) if inspections else None
    citations_str = json.dumps(citations, ensure_ascii=False) if citations else None
    pdf_str = json.dumps(summary_pdf, ensure_ascii=False) if summary_pdf else None

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO messages (id, session_id, sender, text, timestamp, hs_code, taxes_json, inspections_json, citations_json, summary_pdf_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);""",
            (msg_id, session_id, sender, text, timestamp, hs_code, taxes_str, inspections_str, citations_str, pdf_str)
        )
        
        # Update session title and preview if user message
        if sender == 'user':
            cursor.execute("SELECT title FROM sessions WHERE id = ?;", (session_id,))
            s_row = cursor.fetchone()
            new_title = s_row["title"] if s_row and s_row["title"] != "Hội thoại tư vấn mới" else text[:36]
            cursor.execute(
                "UPDATE sessions SET title = ?, preview_text = ?, updated_at = ? WHERE id = ?;",
                (new_title, text[:100], now_str, session_id)
            )

        conn.commit()
        return msg_id


# ─── Attachments & Settings ────────────────────────────────────────

def save_attachment(session_id: Optional[str], user_id: Optional[str], file_name: str, file_size: str, file_type: str, file_url: str) -> Dict[str, Any]:
    """Save metadata of uploaded document file."""
    att_id = f"att-{uuid.uuid4().hex[:8]}"
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO attachments (id, session_id, user_id, file_name, file_size, file_type, file_url)
               VALUES (?, ?, ?, ?, ?, ?, ?);""",
            (att_id, session_id, user_id, file_name, file_size, file_type, file_url)
        )
        conn.commit()

        return {
            "id": att_id,
            "name": file_name,
            "size": file_size,
            "type": file_type,
            "url": file_url
        }

def get_user_settings(user_id: str) -> Dict[str, Any]:
    """Get settings for a user (or default)."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM settings WHERE user_id = ?;", (user_id,))
        row = cursor.fetchone()
        if row:
            return {
                "autoCite": bool(row["auto_cite"]),
                "lawDatabase": row["law_database"],
                "fontSize": row["font_size"]
            }
        return {
            "autoCite": True,
            "lawDatabase": "2023-2024",
            "fontSize": "medium"
        }

def update_user_settings(user_id: str, auto_cite: bool, law_database: str, font_size: str) -> Dict[str, Any]:
    """Update settings for a user."""
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT OR REPLACE INTO settings (user_id, auto_cite, law_database, font_size, updated_at)
               VALUES (?, ?, ?, ?, ?);""",
            (user_id, 1 if auto_cite else 0, law_database, font_size, now_str)
        )
        conn.commit()
        return {
            "autoCite": auto_cite,
            "lawDatabase": law_database,
            "fontSize": font_size
        }


# ─── Admin API (Users) ─────────────────────────────────────────────

def get_all_users() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, full_name, created_at FROM users ORDER BY created_at DESC;")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

def delete_user(user_id: str) -> bool:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id = ?;", (user_id,))
        conn.commit()
        return cursor.rowcount > 0

def update_user(user_id: str, email: str, full_name: str, password: Optional[str] = None) -> bool:
    with get_connection() as conn:
        cursor = conn.cursor()
        if password:
            pwd_hash, salt_hex = _hash_password(password)
            cursor.execute(
                "UPDATE users SET email = ?, full_name = ?, password_hash = ?, salt = ? WHERE id = ?;",
                (email.strip().lower(), full_name.strip(), pwd_hash, salt_hex, user_id)
            )
        else:
            cursor.execute(
                "UPDATE users SET email = ?, full_name = ? WHERE id = ?;",
                (email.strip().lower(), full_name.strip(), user_id)
            )
        conn.commit()
        return cursor.rowcount > 0

# ─── Admin API (Chunks) ─────────────────────────────────────────────

def get_all_chunks() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM document_chunks ORDER BY chapter, parent_id;")
        rows = cursor.fetchall()
        result = []
        for r in rows:
            chunk = dict(r)
            if chunk["article_ids"]:
                chunk["article_ids"] = [x.strip() for x in chunk["article_ids"].split(",")]
            else:
                chunk["article_ids"] = []
            result.append(chunk)
        return result

def update_chunk(parent_id: str, text: str, chapter: str, article_ids: List[str]) -> bool:
    with get_connection() as conn:
        cursor = conn.cursor()
        article_ids_str = ", ".join(article_ids)
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(
            "UPDATE document_chunks SET text = ?, chapter = ?, article_ids = ?, updated_at = ? WHERE parent_id = ?;",
            (text, chapter, article_ids_str, now_str, parent_id)
        )
        conn.commit()
        return cursor.rowcount > 0

# Initialize DB upon import
init_db()
