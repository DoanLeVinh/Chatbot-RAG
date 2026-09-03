"""Database module using SQLite for LogiChat (Chatbot-RAG).

Manages relational tables:
  - users: User credentials, roles ('user'/'admin'), and PBKDF2 authentication
  - sessions: Chat sessions tied to user_id for strict isolation
  - messages: Chat messages per session (user & AI with structured fields)
  - attachments: Document file uploads tied to session/user
  - settings: User preferences
  - documents & document_parent_chunks & document_child_chunks: Two-tier PDR chunks with SHA-256 hash
"""
import sqlite3
import hashlib
import hmac
import base64
import time
import os
import json
import uuid
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple

# Make DB_PATH relative to db.py location, effectively C:\TTTN\Chatbot-RAG\data\logichat.db
ROOT_DIR = Path(__file__).resolve().parent.parent
DB_DIR = ROOT_DIR / "data"
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "logichat.db"
JWT_SECRET = os.getenv("JWT_SECRET", "logichat_super_secure_jwt_secret_key_2026")

def calculate_sha256(content: str) -> str:
    """Calculate SHA-256 hash for document content / chunk integrity verification."""
    return hashlib.sha256(content.encode('utf-8')).hexdigest()

def get_connection():
    """Get SQLite database connection with row factory enabled."""
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """Initialize database tables and run automatic migrations."""
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
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Migration: Ensure 'role' column exists in users
        cursor.execute("PRAGMA table_info(users);")
        user_cols = [col["name"] for col in cursor.fetchall()]
        if "role" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';")
        if "subscription_plan" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN subscription_plan TEXT DEFAULT 'free';")
        if "subscription_expiry" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN subscription_expiry DATETIME;")



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

        # Table: session_documents — tài liệu người dùng tải lên TRONG 1 phiên chat
        # (khác với bảng `documents`/`document_parent_chunks` vốn dành cho kho luật admin nạp chung)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS session_documents (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                status TEXT DEFAULT 'processed',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
            );
        """)

        # Table: session_document_chunks — các đoạn văn bản đã chia nhỏ + embedding
        # của tài liệu, dùng để giới hạn phạm vi trả lời trong 1 phiên chat cụ thể.
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS session_document_chunks (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                document_id TEXT NOT NULL,
                filename TEXT,
                chunk_index INTEGER DEFAULT 0,
                text TEXT NOT NULL,
                embedding_json TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
                FOREIGN KEY(document_id) REFERENCES session_documents(id) ON DELETE CASCADE
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

        # Migration: Ensure 'theme' column exists in settings
        cursor.execute("PRAGMA table_info(settings);")
        setting_cols = [col["name"] for col in cursor.fetchall()]
        if "theme" not in setting_cols:
            cursor.execute("ALTER TABLE settings ADD COLUMN theme TEXT DEFAULT 'light';")

        # Table: documents
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                title TEXT,
                sha256_hash TEXT,
                status TEXT DEFAULT 'processed',
                upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Migration: Ensure 'status' column exists in documents
        cursor.execute("PRAGMA table_info(documents);")
        doc_cols = [col["name"] for col in cursor.fetchall()]
        if "status" not in doc_cols:
            cursor.execute("ALTER TABLE documents ADD COLUMN status TEXT DEFAULT 'processed';")


        # Table: document_parent_chunks (Two-tier PDR Parent Chunks)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS document_parent_chunks (
                parent_id TEXT PRIMARY KEY,
                document_id TEXT,
                source TEXT,
                text TEXT NOT NULL,
                chapter TEXT,
                article_ids TEXT,
                sha256_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
            );
        """)

        # Table: document_chunks (Compatibility table for legacy queries)
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

        # Table: document_nodes (New Hierarchical N-ary Tree)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS document_nodes (
                id TEXT PRIMARY KEY,
                document_id TEXT,
                source TEXT,
                parent_id TEXT,
                node_type TEXT NOT NULL,
                title TEXT,
                text_content TEXT,
                sha256_hash TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
                FOREIGN KEY(parent_id) REFERENCES document_nodes(id) ON DELETE CASCADE
            );
        """)

        # Migration: Ensure 'quiz_json', 'tax_json', and 'case_study_json' columns exist in messages
        cursor.execute("PRAGMA table_info(messages);")
        msg_cols = [col["name"] for col in cursor.fetchall()]
        if "quiz_json" not in msg_cols:
            cursor.execute("ALTER TABLE messages ADD COLUMN quiz_json TEXT;")
        if "tax_json" not in msg_cols:
            cursor.execute("ALTER TABLE messages ADD COLUMN tax_json TEXT;")
        if "case_study_json" not in msg_cols:
            cursor.execute("ALTER TABLE messages ADD COLUMN case_study_json TEXT;")

        # Table: case_studies
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS case_studies (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                user_id TEXT,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                category_name TEXT NOT NULL,
                difficulty TEXT DEFAULT 'medium',
                company TEXT,
                context TEXT NOT NULL,
                documents_json TEXT,
                questions_json TEXT NOT NULL,
                solution_json TEXT NOT NULL,
                rubric_json TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)

        # Table: case_study_submissions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS case_study_submissions (
                id TEXT PRIMARY KEY,
                case_study_id TEXT NOT NULL,
                user_id TEXT,
                user_solution TEXT NOT NULL,
                score REAL NOT NULL,
                rubric_scores_json TEXT NOT NULL,
                feedback TEXT,
                passed BOOLEAN DEFAULT 0,
                submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(case_study_id) REFERENCES case_studies(id) ON DELETE CASCADE,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)

        # Table: tax_calculations
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tax_calculations (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                user_id TEXT,
                product_name TEXT NOT NULL,
                hs_code TEXT NOT NULL,
                quantity REAL NOT NULL,
                unit_price REAL NOT NULL,
                currency TEXT NOT NULL,
                exchange_rate REAL NOT NULL,
                co_form TEXT DEFAULT 'MFN',
                total_tax_vnd REAL NOT NULL,
                breakdown_json TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)

        # Table: quizzes
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quizzes (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                user_id TEXT,
                title TEXT NOT NULL,
                topic TEXT,
                source_type TEXT NOT NULL,
                source_name TEXT,
                total_questions INTEGER NOT NULL,
                time_limit_minutes INTEGER DEFAULT 15,
                difficulty TEXT DEFAULT 'medium',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)

        # Table: quiz_questions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quiz_questions (
                id TEXT PRIMARY KEY,
                quiz_id TEXT NOT NULL,
                question_index INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                option_a TEXT NOT NULL,
                option_b TEXT NOT NULL,
                option_c TEXT NOT NULL,
                option_d TEXT NOT NULL,
                correct_option TEXT NOT NULL,
                explanation TEXT NOT NULL,
                citation_code TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
            );
        """)

        # Table: quiz_submissions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quiz_submissions (
                id TEXT PRIMARY KEY,
                quiz_id TEXT NOT NULL,
                user_id TEXT,
                score REAL NOT NULL,
                total_correct INTEGER NOT NULL,
                total_questions INTEGER NOT NULL,
                answers_json TEXT NOT NULL,
                time_spent_seconds INTEGER DEFAULT 0,
                completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)

        # Seed Default Admin Account if not exists
        cursor.execute("SELECT id FROM users WHERE email = 'admin@logichat.vn';")
        if not cursor.fetchone():
            salt = os.urandom(16)
            hashed = hashlib.pbkdf2_hmac('sha256', "Admin@123456".encode('utf-8'), salt, 100000).hex()
            admin_id = f"admin-{uuid.uuid4().hex[:8]}"
            cursor.execute(
                "INSERT INTO users (id, email, password_hash, salt, full_name, role) VALUES (?, ?, ?, ?, ?, ?);",
                (admin_id, "admin@logichat.vn", hashed, salt.hex(), "Quản Trị Viên Hệ Thống", "admin")
            )

        conn.commit()


# ─── Simple & Secure RFC 7519 JWT Token Implementation ────────────

def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def _base64url_decode(data_str: str) -> bytes:
    padding = '=' * (4 - len(data_str) % 4)
    return base64.urlsafe_b64decode((data_str + padding).encode('utf-8'))

def create_jwt_token(payload: dict, expires_in: int = 86400 * 7) -> str:
    """Create a signed JWT token with expiration timestamp."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload_copy = dict(payload)
    payload_copy["exp"] = int(time.time()) + expires_in
    payload_copy["iat"] = int(time.time())

    encoded_header = _base64url_encode(json.dumps(header, separators=(',', ':')).encode('utf-8'))
    encoded_payload = _base64url_encode(json.dumps(payload_copy, separators=(',', ':')).encode('utf-8'))

    signature_input = f"{encoded_header}.{encoded_payload}".encode('utf-8')
    signature = hmac.new(JWT_SECRET.encode('utf-8'), signature_input, hashlib.sha256).digest()
    encoded_sig = _base64url_encode(signature)

    return f"{encoded_header}.{encoded_payload}.{encoded_sig}"

def verify_jwt_token(token: str) -> Optional[dict]:
    """Verify and decode JWT token. Returns payload dict or None if invalid/expired."""
    try:
        parts = token.strip().split('.')
        if len(parts) != 3:
            return None

        encoded_header, encoded_payload, encoded_sig = parts
        signature_input = f"{encoded_header}.{encoded_payload}".encode('utf-8')
        expected_sig = hmac.new(JWT_SECRET.encode('utf-8'), signature_input, hashlib.sha256).digest()
        actual_sig = _base64url_decode(encoded_sig)

        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        payload = json.loads(_base64url_decode(encoded_payload).decode('utf-8'))
        if "exp" in payload and payload["exp"] < time.time():
            return None  # Expired

        return payload
    except Exception:
        return None


# ─── Auth Logic (Password Hashing & User CRUD) ──────────────────────

def _hash_password(password: str, salt: bytes = None) -> tuple[str, str]:
    """Hash password using PBKDF2 with HMAC SHA-256."""
    if salt is None:
        salt = os.urandom(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return hashed.hex(), salt.hex()

def register_user(email: str, password: str, full_name: str, role: str = "user") -> Dict[str, Any]:
    """Register a new user in SQLite."""
    email_clean = email.strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ?;", (email_clean,))
        if cursor.fetchone():
            raise ValueError("Email đã được đăng ký trước đó.")

        user_id = f"user-{uuid.uuid4().hex[:10]}"
        pwd_hash, salt_hex = _hash_password(password)

        cursor.execute(
            """INSERT INTO users (id, email, password_hash, salt, full_name, role)
               VALUES (?, ?, ?, ?, ?, ?);""",
            (user_id, email_clean, pwd_hash, salt_hex, full_name.strip(), role)
        )

        # Default Settings
        cursor.execute(
            """INSERT INTO settings (user_id, auto_cite, theme, law_database, font_size)
               VALUES (?, 1, 'light', '2023-2024', 'medium');""",
            (user_id,)
        )

        conn.commit()

        token = create_jwt_token({"id": user_id, "email": email_clean, "role": role, "fullName": full_name.strip()})

        return {
            "id": user_id,
            "email": email_clean,
            "fullName": full_name.strip(),
            "role": role,
            "subscriptionPlan": "free",
            "subscriptionExpiry": None,
            "token": token
        }

def login_user(email: str, password: str) -> Dict[str, Any]:
    """Authenticate user credentials."""
    email_clean = email.strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, password_hash, salt, full_name, role, subscription_plan, subscription_expiry FROM users WHERE email = ?;", (email_clean,))
        user_row = cursor.fetchone()

        if not user_row:
            raise ValueError("Email hoặc mật khẩu không chính xác.")

        salt_bytes = bytes.fromhex(user_row["salt"])
        calculated_hash, _ = _hash_password(password, salt=salt_bytes)

        if calculated_hash != user_row["password_hash"]:
            raise ValueError("Email hoặc mật khẩu không chính xác.")

        token = create_jwt_token({
            "id": user_row["id"],
            "email": user_row["email"],
            "role": user_row["role"] or "user",
            "fullName": user_row["full_name"]
        })

        return {
            "id": user_row["id"],
            "email": user_row["email"],
            "fullName": user_row["full_name"],
            "role": user_row["role"] or "user",
            "subscriptionPlan": user_row["subscription_plan"] or "free",
            "subscriptionExpiry": user_row["subscription_expiry"],
            "token": token
        }

def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve user record by user ID."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, password_hash, full_name, role, subscription_plan, subscription_expiry, created_at FROM users WHERE id = ?;", (user_id,))
        row = cursor.fetchone()
        if row:
            res = dict(row)
            res["fullName"] = res.get("full_name")
            res["subscriptionPlan"] = res.get("subscription_plan") or "free"
            res["subscriptionExpiry"] = res.get("subscription_expiry")
            return res
        return None

def get_daily_message_count(user_id: str, date_str: str = None) -> int:
    """Đếm số tin nhắn user đã gửi trong một ngày (mặc định hôm nay)."""
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT COUNT(*) FROM messages m
            JOIN sessions s ON m.session_id = s.id
            WHERE s.user_id = ? AND m.sender = 'user' AND DATE(m.created_at) = ?
        ''', (user_id, date_str))
        row = cursor.fetchone()
        return row[0] if row else 0

def get_daily_image_upload_count(user_id: str, date_str: str = None) -> int:
    """Đếm số ảnh user đã tải lên trong một ngày (mặc định hôm nay)."""
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT COUNT(*) FROM attachments
            WHERE user_id = ? AND file_type = 'image' AND DATE(uploaded_at) = ?
        ''', (user_id, date_str))
        row = cursor.fetchone()
        return row[0] if row else 0

def upgrade_user_plan(user_id: str, plan: str, expiry_days: int = 30) -> bool:
    """Cập nhật gói đăng ký của user."""
    expiry_date = (datetime.now() + timedelta(days=expiry_days)).strftime("%Y-%m-%d %H:%M:%S") if plan == "pro" else None
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE users SET subscription_plan = ?, subscription_expiry = ? WHERE id = ?
        ''', (plan, expiry_date, user_id))
        conn.commit()
        return cursor.rowcount > 0


# ─── Sessions & Chat History (Strict User Isolation) ──────────────

def create_session(user_id: Optional[str], title: str = "Hội thoại tư vấn mới", category_tag: str = "Tư vấn Hải quan") -> Dict[str, Any]:
    """Create a new chat session."""
    session_id = f"sess-{uuid.uuid4().hex[:10]}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO sessions (id, user_id, title, category_tag, group_name, preview_text, created_at, updated_at)
               VALUES (?, ?, ?, ?, 'TODAY', 'Bắt đầu đặt câu hỏi pháp lý mới...', ?, ?);""",
            (session_id, user_id, title, category_tag, now_str, now_str)
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
            "messages": [],
            "references": [],
            "attachments": []
        }

def get_user_sessions(user_id: Optional[str] = None, search: Optional[str] = None, tag: Optional[str] = None, page: int = 1, limit: int = 50) -> Dict[str, Any]:
    """Get chat sessions isolated by user_id with search/filter and pagination."""
    offset = (page - 1) * limit
    params: list[Any] = []

    sql = "SELECT * FROM sessions WHERE 1=1"
    if user_id:
        sql += " AND user_id = ?"
        params.append(user_id)
    else:
        sql += " AND user_id IS NULL"

    if search:
        sql += " AND (title LIKE ? OR preview_text LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])

    if tag and tag != "ALL":
        sql += " AND category_tag = ?"
        params.append(tag)

    sql += " ORDER BY updated_at DESC LIMIT ? OFFSET ?;"
    params.extend([limit, offset])

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = cursor.fetchall()

        sessions = []
        for r in rows:
            cursor.execute("SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC;", (r["id"],))
            msg_rows = cursor.fetchall()

            messages = []
            citations_all = []
            for m in msg_rows:
                citations = json.loads(m["citations_json"]) if m["citations_json"] else []
                if citations:
                    citations_all.extend(citations)

                messages.append({
                    "id": m["id"],
                    "sender": m["sender"],
                    "text": m["text"],
                    "timestamp": m["timestamp"],
                    "hsCode": m["hs_code"],
                    "taxes": json.loads(m["taxes_json"]) if m["taxes_json"] else None,
                    "inspections": json.loads(m["inspections_json"]) if m["inspections_json"] else None,
                    "citations": citations,
                    "summaryPdf": json.loads(m["summary_pdf_json"]) if m["summary_pdf_json"] else None,
                    "quiz": json.loads(m["quiz_json"]) if ("quiz_json" in m.keys() and m["quiz_json"]) else None,
                })

            cursor.execute("SELECT * FROM attachments WHERE session_id = ?;", (r["id"],))
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

            unique_citations = []
            seen_codes = set()
            for c in citations_all:
                if c.get("code") and c["code"] not in seen_codes:
                    seen_codes.add(c["code"])
                    unique_citations.append(c)

            sessions.append({
                "id": r["id"],
                "userId": r["user_id"],
                "title": r["title"],
                "group": r["group_name"],
                "updatedAt": r["updated_at"],
                "categoryTag": r["category_tag"],
                "previewText": r["preview_text"] or "",
                "messages": messages,
                "references": unique_citations,
                "attachments": attachments
            })

        return {
            "sessions": sessions,
            "page": page,
            "limit": limit,
            "hasMore": len(sessions) == limit
        }

def get_session_detail(session_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Get full details of a session, enforcing strict user ownership."""
    with get_connection() as conn:
        cursor = conn.cursor()
        if user_id:
            cursor.execute("SELECT * FROM sessions WHERE id = ? AND (user_id = ? OR user_id IS NULL);", (session_id, user_id))
        else:
            cursor.execute("SELECT * FROM sessions WHERE id = ? AND user_id IS NULL;", (session_id,))

        s_row = cursor.fetchone()
        if not s_row:
            return None

        cursor.execute("SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC;", (session_id,))
        msg_rows = cursor.fetchall()

        messages = []
        references = []
        seen_refs = set()

        for m in msg_rows:
            citations = json.loads(m["citations_json"]) if m["citations_json"] else []
            for c in citations:
                if c.get("code") and c["code"] not in seen_refs:
                    seen_refs.add(c["code"])
                    references.append(c)

            messages.append({
                "id": m["id"],
                "sender": m["sender"],
                "text": m["text"],
                "timestamp": m["timestamp"],
                "hsCode": m["hs_code"],
                "taxes": json.loads(m["taxes_json"]) if m["taxes_json"] else None,
                "inspections": json.loads(m["inspections_json"]) if m["inspections_json"] else None,
                "citations": citations,
                "summaryPdf": json.loads(m["summary_pdf_json"]) if m["summary_pdf_json"] else None,
                "quiz": json.loads(m["quiz_json"]) if ("quiz_json" in m.keys() and m["quiz_json"]) else None,
                "tax": json.loads(m["tax_json"]) if ("tax_json" in m.keys() and m["tax_json"]) else None,
                "caseStudy": json.loads(m["case_study_json"]) if ("case_study_json" in m.keys() and m["case_study_json"]) else None,
            })

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
    """Delete a session by ID enforcing user ownership."""
    with get_connection() as conn:
        cursor = conn.cursor()
        if user_id:
            cursor.execute("DELETE FROM sessions WHERE id = ? AND user_id = ?;", (session_id, user_id))
        else:
            cursor.execute("DELETE FROM sessions WHERE id = ? AND user_id IS NULL;", (session_id,))
        conn.commit()
        return cursor.rowcount > 0

def add_message(session_id: str, sender: str, text: str, timestamp: str,
                hs_code: str = None, taxes: list = None, inspections: dict = None,
                citations: list = None, summary_pdf: dict = None, quiz: dict = None,
                tax: dict = None, case_study: dict = None, user_id: str = None) -> str:
    """Add a new chat message to SQLite database with auto-session recovery."""
    msg_id = f"{sender}-{uuid.uuid4().hex[:8]}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    taxes_str = json.dumps(taxes, ensure_ascii=False) if taxes else None
    inspections_str = json.dumps(inspections, ensure_ascii=False) if inspections else None
    citations_str = json.dumps(citations, ensure_ascii=False) if citations else None
    pdf_str = json.dumps(summary_pdf, ensure_ascii=False) if summary_pdf else None
    quiz_str = json.dumps(quiz, ensure_ascii=False) if quiz else None
    tax_str = json.dumps(tax, ensure_ascii=False) if tax else None
    case_study_str = json.dumps(case_study, ensure_ascii=False) if case_study else None

    with get_connection() as conn:
        cursor = conn.cursor()

        # Ensure user_id exists if provided
        user_id = _ensure_user_exists_cursor(cursor, user_id)
        
        cursor.execute("SELECT id, title, user_id FROM sessions WHERE id = ?;", (session_id,))
        s_row = cursor.fetchone()
        if not s_row:
            cursor.execute(
                """INSERT INTO sessions (id, user_id, title, category_tag, group_name, preview_text, created_at, updated_at)
                   VALUES (?, ?, 'Hội thoại tư vấn mới', 'Tư vấn Hải quan', 'TODAY', ?, ?, ?);""",
                (session_id, user_id, text[:100] if text else "Bắt đầu...", now_str, now_str)
            )
        elif user_id and not s_row["user_id"]:
            cursor.execute("UPDATE sessions SET user_id = ? WHERE id = ?;", (user_id, session_id))

        cursor.execute(
            """INSERT INTO messages (id, session_id, sender, text, timestamp, hs_code, taxes_json, inspections_json, citations_json, summary_pdf_json, quiz_json, tax_json, case_study_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);""",
            (msg_id, session_id, sender, text, timestamp, hs_code, taxes_str, inspections_str, citations_str, pdf_str, quiz_str, tax_str, case_study_str)
        )
        
        if sender == 'user':
            cursor.execute("SELECT title FROM sessions WHERE id = ?;", (session_id,))
            current_s_row = cursor.fetchone()
            new_title = current_s_row["title"] if current_s_row and current_s_row["title"] != "Hội thoại tư vấn mới" else text[:36]
            cursor.execute(
                "UPDATE sessions SET title = ?, preview_text = ?, updated_at = ? WHERE id = ?;",
                (new_title, text[:100], now_str, session_id)
            )

        conn.commit()
        return msg_id

def _ensure_user_exists_cursor(cursor, user_id: Optional[str]) -> Optional[str]:
    """Ensure user exists in users table to satisfy foreign keys and preserve user_id."""
    if not user_id:
        return None
    cursor.execute("SELECT id FROM users WHERE id = ?;", (user_id,))
    if not cursor.fetchone():
        cursor.execute(
            "INSERT OR IGNORE INTO users (id, email, password_hash, salt, full_name, role) VALUES (?, ?, 'dummy', 'dummy', ?, 'guest');",
            (user_id, f"{user_id}@system.local", f"User {user_id}")
        )
    return user_id

# ─── Quiz & Assessment Database Methods ────────────────────────────

def create_quiz(session_id: Optional[str], user_id: Optional[str], title: str,
                topic: str, source_type: str, source_name: str,
                total_questions: int, time_limit_minutes: int,
                difficulty: str, questions: list) -> str:
    """Create a new quiz record and its questions in SQLite."""
    quiz_id = f"quiz-{uuid.uuid4().hex[:10]}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as conn:
        cursor = conn.cursor()

        # Ensure user_id exists if provided
        user_id = _ensure_user_exists_cursor(cursor, user_id)

        # Ensure session_id exists in sessions table
        if session_id:
            cursor.execute("SELECT id FROM sessions WHERE id = ?;", (session_id,))
            if not cursor.fetchone():
                cursor.execute(
                    """INSERT INTO sessions (id, user_id, title, category_tag, group_name, preview_text, created_at, updated_at)
                       VALUES (?, ?, 'Hội thoại tư vấn mới', 'Tư vấn Hải quan', 'TODAY', 'Bài trắc nghiệm...', ?, ?);""",
                    (session_id, user_id, now_str, now_str)
                )

        cursor.execute("""
            INSERT INTO quizzes (id, session_id, user_id, title, topic, source_type, source_name, total_questions, time_limit_minutes, difficulty, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (quiz_id, session_id, user_id, title, topic, source_type, source_name, total_questions, time_limit_minutes, difficulty, now_str))

        for idx, q in enumerate(questions, 1):
            q_id = f"qq-{uuid.uuid4().hex[:8]}"
            opts = q.get("options") if isinstance(q.get("options"), dict) else {}
            opt_a = opts.get("A") or q.get("option_a") or ""
            opt_b = opts.get("B") or q.get("option_b") or ""
            opt_c = opts.get("C") or q.get("option_c") or ""
            opt_d = opts.get("D") or q.get("option_d") or ""
            correct = str(q.get("correct_option") or q.get("correctOption") or "A").strip().upper()

            cursor.execute("""
                INSERT INTO quiz_questions (id, quiz_id, question_index, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, citation_code, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                q_id, quiz_id, idx,
                q.get("question") or q.get("question_text") or "",
                opt_a, opt_b, opt_c, opt_d,
                correct,
                q.get("explanation") or "",
                q.get("citation_code") or q.get("citation") or "",
                now_str
            ))
        conn.commit()
    return quiz_id

def get_quiz_by_id(quiz_id: str, include_answers: bool = False) -> Optional[Dict[str, Any]]:
    """Retrieve quiz by ID. Hides correct answers/explanations unless include_answers=True."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM quizzes WHERE id = ?;", (quiz_id,))
        q_row = cursor.fetchone()
        if not q_row:
            return None

        cursor.execute("SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY question_index ASC;", (quiz_id,))
        qq_rows = cursor.fetchall()

        questions = []
        for r in qq_rows:
            q_data = {
                "id": r["id"],
                "questionIndex": r["question_index"],
                "questionText": r["question_text"],
                "optionA": r["option_a"],
                "optionB": r["option_b"],
                "optionC": r["option_c"],
                "optionD": r["option_d"],
            }
            if include_answers:
                q_data["correctOption"] = r["correct_option"]
                q_data["explanation"] = r["explanation"]
                q_data["citationCode"] = r["citation_code"]
            questions.append(q_data)

        return {
            "id": q_row["id"],
            "sessionId": q_row["session_id"],
            "userId": q_row["user_id"],
            "title": q_row["title"],
            "topic": q_row["topic"],
            "sourceType": q_row["source_type"],
            "sourceName": q_row["source_name"],
            "totalQuestions": q_row["total_questions"],
            "timeLimitMinutes": q_row["time_limit_minutes"],
            "difficulty": q_row["difficulty"],
            "createdAt": q_row["created_at"],
            "questions": questions
        }

def submit_quiz_answers(quiz_id: str, user_id: Optional[str], answers: dict, time_spent_seconds: int = 0) -> Optional[Dict[str, Any]]:
    """Evaluate and grade quiz submission, persisting results to SQLite."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM quizzes WHERE id = ?;", (quiz_id,))
        q_row = cursor.fetchone()
        if not q_row:
            return None

        cursor.execute("SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY question_index ASC;", (quiz_id,))
        qq_rows = cursor.fetchall()

        total_questions = len(qq_rows)
        total_correct = 0
        questions_with_answers = []

        for r in qq_rows:
            q_id = r["id"]
            user_opt = answers.get(q_id)
            if user_opt:
                user_opt = str(user_opt).strip().upper()
            correct_opt = str(r["correct_option"]).strip().upper()
            is_correct = bool(user_opt and user_opt == correct_opt)
            if is_correct:
                total_correct += 1

            questions_with_answers.append({
                "id": q_id,
                "questionIndex": r["question_index"],
                "questionText": r["question_text"],
                "optionA": r["option_a"],
                "optionB": r["option_b"],
                "optionC": r["option_c"],
                "optionD": r["option_d"],
                "userOption": user_opt,
                "correctOption": correct_opt,
                "isCorrect": is_correct,
                "explanation": r["explanation"],
                "citationCode": r["citation_code"]
            })

        score = round((total_correct / max(1, total_questions)) * 100, 1)
        sub_id = f"sub-{uuid.uuid4().hex[:10]}"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Ensure user_id exists if provided
        user_id = _ensure_user_exists_cursor(cursor, user_id)

        cursor.execute("""
            INSERT INTO quiz_submissions (id, quiz_id, user_id, score, total_correct, total_questions, answers_json, time_spent_seconds, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (sub_id, quiz_id, user_id, score, total_correct, total_questions, json.dumps(answers, ensure_ascii=False), time_spent_seconds, now_str))
        conn.commit()

        return {
            "submissionId": sub_id,
            "quizId": quiz_id,
            "title": q_row["title"],
            "score": score,
            "totalCorrect": total_correct,
            "totalQuestions": total_questions,
            "percentage": score,
            "passed": score >= 70.0,
            "timeSpentSeconds": time_spent_seconds,
            "completedAt": now_str,
            "questionsWithAnswers": questions_with_answers
        }

def get_user_quiz_history(user_id: str, limit: int = 20) -> list:
    """Get history of quiz attempts for a user."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT s.*, q.title as quiz_title, q.source_type, q.source_name
            FROM quiz_submissions s
            JOIN quizzes q ON s.quiz_id = q.id
            WHERE s.user_id = ?
            ORDER BY s.completed_at DESC LIMIT ?;
        """, (user_id, limit))
        rows = cursor.fetchall()
        return [
            {
                "id": r["id"],
                "quizId": r["quiz_id"],
                "title": r["quiz_title"],
                "sourceType": r["source_type"],
                "sourceName": r["source_name"],
                "score": r["score"],
                "totalCorrect": r["total_correct"],
                "totalQuestions": r["total_questions"],
                "timeSpentSeconds": r["time_spent_seconds"],
                "completedAt": r["completed_at"]
            }
            for r in rows
        ]

def save_tax_calculation(session_id: Optional[str], user_id: Optional[str], product_name: str,
                         hs_code: str, quantity: float, unit_price: float, currency: str,
                         exchange_rate: float, co_form: str, total_tax_vnd: float,
                         breakdown: dict) -> str:
    """Lưu trữ kết quả tính thuế XNK vào cơ sở dữ liệu SQLite."""
    calc_id = f"tax-{uuid.uuid4().hex[:10]}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as conn:
        cursor = conn.cursor()
        user_id = _ensure_user_exists_cursor(cursor, user_id)

        effective_session_id = None
        if session_id:
            cursor.execute("SELECT id FROM sessions WHERE id = ?;", (session_id,))
            s_row = cursor.fetchone()
            if s_row:
                effective_session_id = session_id
            else:
                try:
                    cursor.execute(
                        """INSERT INTO sessions (id, user_id, title, category_tag, group_name, preview_text, created_at, updated_at)
                           VALUES (?, ?, 'Hội thoại tư vấn mới', 'Tư vấn Hải quan', 'TODAY', ?, ?, ?);""",
                        (session_id, user_id, product_name[:100], now_str, now_str)
                    )
                    effective_session_id = session_id
                except Exception:
                    effective_session_id = None

        cursor.execute("""
            INSERT INTO tax_calculations (id, session_id, user_id, product_name, hs_code, quantity, unit_price, currency, exchange_rate, co_form, total_tax_vnd, breakdown_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (calc_id, effective_session_id, user_id, product_name, hs_code, quantity, unit_price, currency, exchange_rate, co_form, total_tax_vnd, json.dumps(breakdown, ensure_ascii=False), now_str))
        conn.commit()
        return calc_id

def get_user_tax_history(user_id: str, limit: int = 20) -> list:
    """Lấy danh sách các lần tính toán thuế của người dùng."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM tax_calculations
            WHERE user_id = ?
            ORDER BY created_at DESC LIMIT ?;
        """, (user_id, limit))
        rows = cursor.fetchall()
        return [
            {
                "id": r["id"],
                "sessionId": r["session_id"],
                "productName": r["product_name"],
                "hsCode": r["hs_code"],
                "quantity": r["quantity"],
                "unitPrice": r["unit_price"],
                "currency": r["currency"],
                "exchangeRate": r["exchange_rate"],
                "coForm": r["co_form"],
                "totalTaxVnd": r["total_tax_vnd"],
                "breakdown": json.loads(r["breakdown_json"]) if r["breakdown_json"] else {},
                "createdAt": r["created_at"]
            }
            for r in rows
        ]

def get_recent_messages_for_llm(session_id: str, limit: int = 4) -> list:
    """Lấy N tin nhắn gần nhất để làm Sliding Window Memory cho LLM."""
    if not session_id:
        return []
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT sender, text FROM messages WHERE session_id = ? ORDER BY created_at DESC LIMIT ?;", (session_id, limit))
        rows = cursor.fetchall()
        
        # rows are in DESC order, we need ASC for LLM
        history = []
        for r in reversed(rows):
            role = "assistant" if r["sender"] == "ai" else "user"
            history.append({"role": role, "content": r["text"]})
        return history

# ─── Attachments & Settings ────────────────────────────────────────

def save_attachment(session_id: Optional[str], user_id: Optional[str], file_name: str, file_size: str, file_type: str, file_url: str) -> Dict[str, Any]:
    """Save metadata of uploaded document file."""
    att_id = f"att-{uuid.uuid4().hex[:8]}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as conn:
        cursor = conn.cursor()

        # Ensure user_id exists if provided
        user_id = _ensure_user_exists_cursor(cursor, user_id)
        
        if session_id:
            cursor.execute("SELECT id FROM sessions WHERE id = ?;", (session_id,))
            if not cursor.fetchone():
                cursor.execute(
                    """INSERT INTO sessions (id, user_id, title, category_tag, group_name, preview_text, created_at, updated_at)
                       VALUES (?, ?, 'Hội thoại tư vấn mới', 'Tư vấn Hải quan', 'TODAY', 'Đính kèm tệp', ?, ?);""",
                    (session_id, user_id, now_str, now_str)
                )

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


# ─── Session-scoped document chunks (Chat theo phạm vi tài liệu tải lên) ───

def save_session_document_chunks(session_id: str, filename: str, chunks_with_embeddings: list) -> str:
    """Lưu tài liệu + các chunk đã embed cho 1 phiên chat cụ thể.
    chunks_with_embeddings: List[{'text': str, 'embedding': List[float]}]
    Trả về document_id.
    """
    document_id = f"sdoc-{uuid.uuid4().hex[:10]}"
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM sessions WHERE id = ?;", (session_id,))
        if not cursor.fetchone():
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute(
                """INSERT INTO sessions (id, user_id, title, category_tag, group_name, preview_text, created_at, updated_at)
                   VALUES (?, NULL, 'Hội thoại tư vấn mới', 'Tư vấn Hải quan', 'TODAY', 'Đính kèm tài liệu', ?, ?);""",
                (session_id, now_str, now_str)
            )

        cursor.execute(
            "INSERT INTO session_documents (id, session_id, filename, status) VALUES (?, ?, ?, 'processed');",
            (document_id, session_id, filename)
        )

        for idx, ch in enumerate(chunks_with_embeddings):
            chunk_id = f"schunk-{uuid.uuid4().hex[:10]}"
            cursor.execute(
                """INSERT INTO session_document_chunks
                   (id, session_id, document_id, filename, chunk_index, text, embedding_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?);""",
                (chunk_id, session_id, document_id, filename, idx, ch['text'], json.dumps(ch['embedding']))
            )
        conn.commit()
        return document_id


def get_session_document_chunks(session_id: str) -> List[Dict[str, Any]]:
    """Lấy toàn bộ chunk (kèm embedding đã parse) của các tài liệu đã tải lên trong 1 phiên."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT filename, chunk_index, text, embedding_json FROM session_document_chunks WHERE session_id = ?;",
            (session_id,)
        )
        rows = cursor.fetchall()
        return [{
            'source': r['filename'],
            'chunk_index': r['chunk_index'],
            'text': r['text'],
            'embedding': json.loads(r['embedding_json']),
        } for r in rows]


def session_has_documents(session_id: str) -> bool:
    """Kiểm tra phiên chat này đã có tài liệu người dùng tải lên chưa (để quyết định
    có giới hạn phạm vi trả lời hay không)."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM session_documents WHERE session_id = ? LIMIT 1;", (session_id,))
        return cursor.fetchone() is not None


def get_user_settings(user_id: str) -> Dict[str, Any]:
    """Get settings for a user."""
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
        cursor.execute("SELECT id, email, full_name, role, subscription_plan, subscription_expiry, created_at FROM users ORDER BY created_at DESC;")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

def delete_user(user_id: str) -> bool:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id = ?;", (user_id,))
        conn.commit()
        return cursor.rowcount > 0

def update_user(user_id: str, email: str, full_name: str, password: Optional[str] = None, role: Optional[str] = None, subscription_plan: Optional[str] = None) -> bool:
    with get_connection() as conn:
        cursor = conn.cursor()
        updates = ["email = ?", "full_name = ?"]
        params = [email.strip().lower(), full_name.strip()]

        if role:
            updates.append("role = ?")
            params.append(role)

        if subscription_plan:
            updates.append("subscription_plan = ?")
            params.append(subscription_plan)

        if password:
            pwd_hash, salt_hex = _hash_password(password)
            updates.extend(["password_hash = ?", "salt = ?"])
            params.extend([pwd_hash, salt_hex])

        params.append(user_id)
        sql = f"UPDATE users SET {', '.join(updates)} WHERE id = ?;"
        cursor.execute(sql, params)
        conn.commit()
        return cursor.rowcount > 0


# ─── Two-Tier PDR & SHA-256 Hash Integrity Verification ────────────

def seed_parent_chunks_from_json(json_path: Path):
    """Seed Parent Chunks from JSON into document_parent_chunks with SHA-256."""
    if not json_path.exists():
        return 0

    with open(json_path, 'r', encoding='utf-8') as f:
        parents = json.load(f)

    with get_connection() as conn:
        cursor = conn.cursor()
        inserted = 0
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        for p in parents:
            parent_id = p.get("parent_id")
            source = str(p.get("source") or "")
            text = str(p.get("text") or "")
            chapter = str(p.get("chapter") or "")
            article_ids_raw = p.get("article_ids", [])
            article_ids_str = ", ".join(article_ids_raw) if isinstance(article_ids_raw, list) else str(article_ids_raw or "")
            sha256_hash = calculate_sha256(f"{source}|{chapter}|{article_ids_str}|{text}")

            cursor.execute(
                """
                INSERT INTO document_parent_chunks (parent_id, source, text, chapter, article_ids, sha256_hash, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(parent_id) DO UPDATE SET
                    source = excluded.source,
                    text = excluded.text,
                    chapter = excluded.chapter,
                    article_ids = excluded.article_ids,
                    sha256_hash = excluded.sha256_hash,
                    updated_at = excluded.updated_at;
                """,
                (parent_id, source, text, chapter, article_ids_str, sha256_hash, now_str, now_str)
            )
            inserted += 1

        conn.commit()
        return inserted

def get_all_chunks(page: int = 1, limit: int = 50, search: Optional[str] = None) -> Dict[str, Any]:
    """Get parent chunks with pagination and search."""
    offset = (page - 1) * limit
    params = []

    sql_count = "SELECT COUNT(*) as count FROM document_parent_chunks WHERE 1=1"
    sql = "SELECT * FROM document_parent_chunks WHERE 1=1"

    if search:
        clause = " AND (text LIKE ? OR source LIKE ? OR chapter LIKE ? OR article_ids LIKE ?)"
        sql_count += clause
        sql += clause
        search_pattern = f"%{search}%"
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern])

    sql += " ORDER BY source, chapter, parent_id LIMIT ? OFFSET ?;"
    count_params = list(params)
    params.extend([limit, offset])

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql_count, count_params)
        total_count = cursor.fetchone()["count"]

        cursor.execute(sql, params)
        rows = cursor.fetchall()
        result = []
        for r in rows:
            chunk = dict(r)
            if chunk.get("article_ids"):
                chunk["article_ids"] = [x.strip() for x in chunk["article_ids"].split(",") if x.strip()]
            else:
                chunk["article_ids"] = []
            result.append(chunk)

        # Fallback to document_chunks if document_parent_chunks is empty
        if not result and total_count == 0:
            cursor.execute("SELECT * FROM document_chunks ORDER BY chapter, parent_id LIMIT ? OFFSET ?;", (limit, offset))
            rows = cursor.fetchall()
            for r in rows:
                chunk = dict(r)
                if chunk.get("article_ids"):
                    chunk["article_ids"] = [x.strip() for x in chunk["article_ids"].split(",") if x.strip()]
                else:
                    chunk["article_ids"] = []
                chunk["sha256_hash"] = calculate_sha256(chunk.get("text", ""))
                result.append(chunk)
            total_count = len(result)

        return {
            "chunks": result,
            "total": total_count,
            "page": page,
            "limit": limit,
            "totalPages": (total_count + limit - 1) // limit if limit > 0 else 1
        }

def update_chunk(parent_id: str, text: str, chapter: str, article_ids: List[str]) -> bool:
    """Update parent chunk in SQLite and update SHA-256 hash."""
    with get_connection() as conn:
        cursor = conn.cursor()
        article_ids_str = ", ".join(article_ids)
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Get existing source
        cursor.execute("SELECT source FROM document_parent_chunks WHERE parent_id = ?;", (parent_id,))
        row = cursor.fetchone()
        source = row["source"] if row else ""
        sha256_hash = calculate_sha256(f"{source}|{chapter}|{article_ids_str}|{text}")

        cursor.execute(
            """UPDATE document_parent_chunks 
               SET text = ?, chapter = ?, article_ids = ?, sha256_hash = ?, updated_at = ? 
               WHERE parent_id = ?;""",
            (text, chapter, article_ids_str, sha256_hash, now_str, parent_id)
        )
        
        # Also update legacy document_chunks table if present
        cursor.execute(
            "UPDATE document_chunks SET text = ?, chapter = ?, article_ids = ?, updated_at = ? WHERE parent_id = ?;",
            (text, chapter, article_ids_str, now_str, parent_id)
        )

        conn.commit()
        return True

def insert_chunk(parent_id: str, source: str, text: str, chapter: str, article_ids: List[str]) -> bool:
    """Insert a new parent chunk into SQLite and calculate SHA-256 hash."""
    with get_connection() as conn:
        cursor = conn.cursor()
        article_ids_str = ", ".join(article_ids)
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        sha256_hash = calculate_sha256(f"{source}|{chapter}|{article_ids_str}|{text}")

        cursor.execute(
            """INSERT INTO document_parent_chunks 
               (parent_id, source, text, chapter, article_ids, sha256_hash, created_at, updated_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?);""",
            (parent_id, source, text, chapter, article_ids_str, sha256_hash, now_str, now_str)
        )
        conn.commit()
        return True

def delete_chunk(parent_id: str) -> bool:
    """Delete a parent chunk from SQLite."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM document_parent_chunks WHERE parent_id = ?;", (parent_id,))
        conn.commit()
        return True

def verify_document_integrity(identifier: str) -> Dict[str, Any]:
    """Verify SHA-256 integrity hash of a Parent Chunk or Legal Citation."""
    with get_connection() as conn:
        cursor = conn.cursor()
        # Search by parent_id or article_id
        cursor.execute(
            "SELECT * FROM document_parent_chunks WHERE parent_id = ? OR article_ids LIKE ? LIMIT 1;",
            (identifier, f"%{identifier}%")
        )
        row = cursor.fetchone()
        if not row:
            return {
                "valid": False,
                "message": f"Không tìm thấy bản ghi pháp luật với mã: {identifier}"
            }

        source = row["source"] or ""
        chapter = row["chapter"] or ""
        article_ids = row["article_ids"] or ""
        text = row["text"] or ""
        stored_hash = row["sha256_hash"] or ""

        current_calculated_hash = calculate_sha256(f"{source}|{chapter}|{article_ids}|{text}")
        is_intact = (stored_hash == current_calculated_hash)

        return {
            "valid": is_intact,
            "parentId": row["parent_id"],
            "source": source,
            "chapter": chapter,
            "articleIds": [x.strip() for x in article_ids.split(",") if x.strip()],
            "storedHash": stored_hash,
            "calculatedHash": current_calculated_hash,
            "updatedAt": row["updated_at"],
            "status": "VERIFIED_AUTHENTIC" if is_intact else "TAMPER_DETECTED"
        }

def insert_admin_document(filename: str) -> str:
    """Insert a new document record with processing status."""
    with get_connection() as conn:
        cursor = conn.cursor()
        doc_id = f"doc-{uuid.uuid4().hex[:8]}"
        cursor.execute(
            "INSERT INTO documents (id, filename, status) VALUES (?, ?, ?);",
            (doc_id, filename, 'processing')
        )
        conn.commit()
        return doc_id

def update_document_status(filename: str, status: str):
    """Update document status based on filename."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE documents SET status = ? WHERE filename = ?;",
            (status, filename)
        )
        conn.commit()

def get_documents_hierarchy() -> List[Dict[str, Any]]:
    """Get list of PDF sources, processing status, and their chunk count across all tables and the papers folder."""
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Sources from document_parent_chunks
        cursor.execute("""
            SELECT source, COUNT(*) as chunk_count 
            FROM document_parent_chunks 
            GROUP BY source;
        """)
        parent_sources = {r["source"]: r["chunk_count"] for r in cursor.fetchall()}

        # 2. Sources from document_nodes
        cursor.execute("""
            SELECT source, COUNT(*) as chunk_count 
            FROM document_nodes 
            GROUP BY source;
        """)
        node_sources = {r["source"]: r["chunk_count"] for r in cursor.fetchall()}

        # 3. Documents table
        cursor.execute("SELECT filename, status FROM documents ORDER BY upload_date DESC;")
        doc_rows = {r["filename"]: r["status"] for r in cursor.fetchall()}

        # 4. Scan physical papers directory
        papers_dir = Path(__file__).resolve().parent.parent / "papers"
        physical_files = set()
        if papers_dir.exists():
            for f in papers_dir.glob("*.pdf"):
                physical_files.add(f.name)

        # Merge all distinct sources
        all_sources = set()
        for s in parent_sources:
            all_sources.add(s)
        for s in node_sources:
            all_sources.add(s)
        for fname in doc_rows:
            all_sources.add(f"papers/{fname}" if not fname.startswith("papers/") else fname)
        for pf in physical_files:
            all_sources.add(f"papers/{pf}")

        result = []
        for s in sorted(all_sources):
            clean_name = s.replace("papers/", "").replace("papers\\", "")
            chunk_cnt = (
                node_sources.get(s, 0)
                or parent_sources.get(s, 0)
                or parent_sources.get(f"papers/{clean_name}", 0)
                or node_sources.get(f"papers/{clean_name}", 0)
            )
            status = doc_rows.get(clean_name, "ready" if chunk_cnt > 0 else "unprocessed")
            
            result.append({
                "source": s if s.startswith("papers/") else f"papers/{s}",
                "total_chunks": chunk_cnt,
                "status": status
            })

        return result

def get_chunks_by_source(source: str) -> List[Dict[str, Any]]:
    """Get all chunks belonging to a specific source (from document_nodes or document_parent_chunks)."""
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Try document_nodes first
        cursor.execute(
            "SELECT * FROM document_nodes WHERE source = ? OR source = ? ORDER BY rowid;",
            (source, f"papers/{source.replace('papers/', '')}")
        )
        rows = cursor.fetchall()
        
        if rows:
            result = []
            for r in rows:
                chunk = dict(r)
                chunk["parent_id"] = r["parent_id"]
                chunk["node_id"] = r["id"]
                chunk["chapter"] = (r["node_type"] or "NỘI DUNG").upper()
                chunk["article_ids"] = [r["title"]] if r["title"] else []
                chunk["text"] = r["text_content"]
                result.append(chunk)
                
            node_map = {n["node_id"]: n for n in result}
            tree = []
            for n in result:
                n["children"] = []
            for n in result:
                pid = n["parent_id"]
                if pid and pid in node_map:
                    node_map[pid]["children"].append(n)
                else:
                    tree.append(n)
            return tree

        # 2. Fallback to document_parent_chunks
        clean_name = source.replace("papers/", "").replace("papers\\", "")
        cursor.execute(
            "SELECT * FROM document_parent_chunks WHERE source = ? OR source = ? OR source LIKE ? ORDER BY parent_id;",
            (source, f"papers/{clean_name}", f"%{clean_name}%")
        )
        p_rows = cursor.fetchall()
        if p_rows:
            tree = []
            for r in p_rows:
                article_ids = [x.strip() for x in r["article_ids"].split(",") if x.strip()] if r["article_ids"] else []
                tree.append({
                    "node_id": r["parent_id"],
                    "parent_id": r["parent_id"],
                    "chapter": r["chapter"] or "ĐIỀU KHOẢN",
                    "article_ids": article_ids,
                    "text": r["text"],
                    "children": []
                })
            return tree

        return []

def delete_document_by_source(source: str) -> bool:
    """Delete all chunks and document records belonging to a specific source."""
    with get_connection() as conn:
        cursor = conn.cursor()
        clean_name = source.replace("papers/", "").replace("papers\\", "")
        
        cursor.execute("DELETE FROM document_nodes WHERE source = ? OR source LIKE ?;", (source, f"%{clean_name}%"))
        cursor.execute("DELETE FROM document_parent_chunks WHERE source = ? OR source LIKE ?;", (source, f"%{clean_name}%"))
        cursor.execute("DELETE FROM documents WHERE filename = ? OR filename = ?;", (clean_name, source))
        conn.commit()
        return True

def save_case_study(case_id: str, user_id: Optional[str], session_id: Optional[str], case_study_data: dict) -> str:
    """Lưu trữ bài tập tình huống / tự luận vào cơ sở dữ liệu."""
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as conn:
        cursor = conn.cursor()
        user_id = _ensure_user_exists_cursor(cursor, user_id)

        effective_session_id = None
        if session_id:
            cursor.execute("SELECT id FROM sessions WHERE id = ?;", (session_id,))
            if cursor.fetchone():
                effective_session_id = session_id

        cursor.execute("""
            INSERT OR REPLACE INTO case_studies (
                id, session_id, user_id, title, category, category_name, difficulty,
                company, context, documents_json, questions_json, solution_json, rubric_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            case_id,
            effective_session_id,
            user_id,
            case_study_data.get("title", ""),
            case_study_data.get("category", ""),
            case_study_data.get("categoryName", ""),
            case_study_data.get("difficulty", "medium"),
            case_study_data.get("company", ""),
            case_study_data.get("context", ""),
            json.dumps(case_study_data.get("documents", []), ensure_ascii=False),
            json.dumps(case_study_data.get("questions", []), ensure_ascii=False),
            json.dumps(case_study_data.get("solution", {}), ensure_ascii=False),
            json.dumps(case_study_data.get("rubric", []), ensure_ascii=False),
            now_str
        ))
        conn.commit()
        return case_id

def get_case_study(case_id: str) -> Optional[dict]:
    """Lấy thông tin chi tiết bài tập tình huống."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM case_studies WHERE id = ?;", (case_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "sessionId": row["session_id"],
            "userId": row["user_id"],
            "title": row["title"],
            "category": row["category"],
            "categoryName": row["category_name"],
            "difficulty": row["difficulty"],
            "company": row["company"],
            "context": row["context"],
            "documents": json.loads(row["documents_json"]) if row["documents_json"] else [],
            "questions": json.loads(row["questions_json"]) if row["questions_json"] else [],
            "solution": json.loads(row["solution_json"]) if row["solution_json"] else {},
            "rubric": json.loads(row["rubric_json"]) if row["rubric_json"] else [],
            "createdAt": row["created_at"]
        }

def save_case_study_submission(
    case_study_id: str,
    user_id: Optional[str],
    user_solution: str,
    score: float,
    rubric_scores: list,
    feedback: str,
    passed: bool
) -> str:
    """Lưu trữ bài nộp và kết quả chấm điểm của người dùng."""
    sub_id = f"sub-{uuid.uuid4().hex[:10]}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as conn:
        cursor = conn.cursor()
        user_id = _ensure_user_exists_cursor(cursor, user_id)
        cursor.execute("""
            INSERT INTO case_study_submissions (
                id, case_study_id, user_id, user_solution, score, rubric_scores_json, feedback, passed, submitted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            sub_id,
            case_study_id,
            user_id,
            user_solution,
            score,
            json.dumps(rubric_scores, ensure_ascii=False),
            feedback,
            1 if passed else 0,
            now_str
        ))
        conn.commit()
        return sub_id

def get_user_case_study_history(user_id: str, limit: int = 20) -> list:
    """Lấy danh sách các bài tập tình huống người dùng đã nộp bài."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT sub.*, cs.title, cs.category, cs.category_name
            FROM case_study_submissions sub
            JOIN case_studies cs ON sub.case_study_id = cs.id
            WHERE sub.user_id = ?
            ORDER BY sub.submitted_at DESC LIMIT ?;
        """, (user_id, limit))
        rows = cursor.fetchall()
        return [
            {
                "id": r["id"],
                "caseStudyId": r["case_study_id"],
                "title": r["title"],
                "category": r["category"],
                "categoryName": r["category_name"],
                "score": r["score"],
                "passed": bool(r["passed"]),
                "feedback": r["feedback"],
                "submittedAt": r["submitted_at"]
            }
            for r in rows
        ]

# Initialize DB upon import
init_db()