"""FastAPI backend for LogiChat — Trợ lý Pháp lý Hải quan & XNK AI.

Provides full REST API with SQLite database integration, JWT authentication & RBAC,
user session isolation, Parent-Document Retrieval (PDR), Blockchain SHA-256 Integrity Verification,
and professional UTF-8 PDF export.

Run:
  python backend/serve.py
"""
from fastapi import FastAPI, Request, UploadFile, File as FastAPIFile, Header, HTTPException, Depends, Query, Form, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, AsyncGenerator
import uvicorn
from pathlib import Path
import sys
import os
import shutil

# Trên Windows, uvicorn dùng ProactorEventLoop mặc định — event loop này có lỗi đã biết
# (WinError 64: "The specified network name is no longer available") khi 1 kết nối HTTP
# bị đóng đột ngột (trình duyệt hủy request, proxy của frontend đóng socket...). Lỗi này
# không làm sập server hay ảnh hưởng các request khác, nhưng in traceback gây nhiễu log.
# Chuyển sang SelectorEventLoop để tránh lỗi này hoàn toàn trên Windows.
if sys.platform == 'win32':
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
import json
import re
import uuid
import markdown
import pypdf
from datetime import datetime
from dotenv import load_dotenv

# Set working directory to project root to ensure all Path.cwd() and relative paths work
os.chdir(Path(__file__).resolve().parent.parent)

# Load .env file
load_dotenv()

# Ensure UTF-8 output
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import db
from retriever_local import LocalRetriever

app = FastAPI(title='LogiChat — Trợ lý Pháp lý Hải quan & XNK AI (SQLite & PDR Backend)')

# ─── Data directory setup ───────────────────────────────────────────
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / 'data'
DATA_DIR.mkdir(exist_ok=True)
UPLOADS_DIR = DATA_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

# ─── Mount static assets ───────────────────────────────────────────
static_dir = ROOT_DIR / 'frontend' / 'dist'
if not static_dir.exists():
    static_dir = ROOT_DIR / 'frontend'

assets_dir = static_dir / 'assets'
if assets_dir.exists():
    app.mount('/assets', StaticFiles(directory=str(assets_dir)), name='assets')

# Mount uploads for download
app.mount('/uploads', StaticFiles(directory=str(UPLOADS_DIR)), name='uploads')
app.mount('/frontend', StaticFiles(directory=str(static_dir)), name='frontend')

PAPERS_DIR = ROOT_DIR / 'papers'
if PAPERS_DIR.exists():
    app.mount('/api/papers', StaticFiles(directory=str(PAPERS_DIR)), name='papers')

retriever: Optional[LocalRetriever] = None


# ─── Security & Authentication Dependencies ────────────────────────

def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """Extract and verify user from Bearer Token, or return None for anonymous."""
    if not authorization:
        return None
    try:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == 'bearer':
            token = parts[1]
            payload = db.verify_jwt_token(token)
            return payload
    except Exception:
        pass
    return None

def get_current_user_required(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Require valid JWT token or raise 401 Unauthorized."""
    user = get_current_user_optional(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để tiếp tục thao tác.")
    return user

def require_admin_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Require user with 'admin' role or raise 403 Forbidden."""
    user = get_current_user_required(authorization)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Yêu cầu quyền Quản trị viên (Admin) để thực hiện hành động này.")
    return user


# ─── Helper functions ───────────────────────────────────────────────

def _extract_hs_code(text: str) -> Optional[str]:
    """Extract HS code from text (e.g. 8542.31, 8427.10.00)."""
    patterns = [
        r'(?:HS|mã HS|HS Code|mã số)\s*[:\s]?\s*(\d{4}\.\d{2}(?:\.\d{2})?)',
        r'(\d{4}\.\d{2}\.\d{2})',
        r'(\d{4}\.\d{2})',
    ]
    for pat in patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def _extract_tax_info(text: str) -> list:
    """Extract tax information from AI response text."""
    taxes = []
    tax_patterns = [
        (r'[Tt]huế nhập khẩu[^:]*?:\s*(\d+%)', 'Thuế nhập khẩu'),
        (r'[Tt]huế (?:nhập khẩu )?ưu đãi[^:]*?:\s*(\d+%)', 'Thuế nhập khẩu ưu đãi đặc biệt'),
        (r'[Tt]huế (?:GTGT|VAT|giá trị gia tăng)[^:]*?:\s*(\d+%)', 'Thuế Giá trị gia tăng (VAT)'),
        (r'[Tt]huế xuất khẩu[^:]*?:\s*(\d+%)', 'Thuế xuất khẩu'),
        (r'[Tt]huế tiêu thụ đặc biệt[^:]*?:\s*(\d+%)', 'Thuế tiêu thụ đặc biệt'),
    ]
    for pattern, label in tax_patterns:
        match = re.search(pattern, text)
        if match:
            taxes.append({'label': label, 'rate': match.group(1)})

    return taxes


def _extract_inspection_info(text: str) -> Optional[dict]:
    """Extract inspection/regulation info from AI response text."""
    text_lower = text.lower()
    inspection_keywords = ['kiểm tra chuyên ngành đối với', 'phải có giấy phép', 'kiểm tra chất lượng nhà nước']
    for kw in inspection_keywords:
        if kw in text_lower:
            sentences = text.split('.')
            for sent in sentences:
                if kw in sent.lower():
                    required = not any(neg in sent.lower() for neg in
                                      ['không', 'miễn', 'không cần', 'không thuộc', 'không phải'])
                    cite_match = re.search(
                        r'((?:NĐ|TT|QĐ|Luật)\s*\d+[/-]\d+[/-]?[A-ZĐ-]*)',
                        sent
                    )
                    return {
                        'required': required,
                        'description': sent.strip(),
                        'citationCode': cite_match.group(1) if cite_match else None,
                    }
    return None


def _build_legal_citations(sources: list) -> list:
    """Build LegalCitation objects matching the UI's LegalCitation interface."""
    import re
    citations = []
    seen_sources = set()

    for i, src in enumerate(sources):
        source_name = src.get('source', '') or ''
        if source_name.startswith('papers/') or source_name.startswith('papers\\'):
            source_name = source_name[7:]
        
        if not source_name or source_name in seen_sources:
            continue
        seen_sources.add(source_name)

        article_refs = src.get('article_refs', [])
        text_snippet = src.get('text', '') or ''

        code_match = re.search(
            r'((?:Luật|NĐ|Nghị định|TT|Thông tư|QĐ|Quyết định)\s*(?:số\s*)?\d+[/-]\d+[/-]?[\w-]*)',
            source_name,
            re.IGNORECASE
        )
        code = code_match.group(1) if code_match else source_name

        title = source_name
        if article_refs:
            title = f"{source_name} - {', '.join(article_refs[:3])}"

        # SHA-256 hash preview
        raw_hash = db.calculate_sha256(text_snippet)

        # Determine valid pdfUrl if the source is a pdf
        basename = Path(source_name).name if source_name else ''
        pdf_url = f'/api/papers/{basename}' if basename.lower().endswith('.pdf') else '#'
        # Smart bullet-point summary extraction
        summary_text = ""
        if text_snippet:
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text_snippet) if len(s.strip()) > 20]
            if sentences:
                summary_text = "\n".join(f"• {s}" for s in sentences[:3])
            else:
                summary_text = text_snippet[:300] + '...'
        else:
            summary_text = f'Trích dẫn từ {source_name}'

        citations.append({
            'id': f'cit-{i}-{uuid.uuid4().hex[:6]}',
            'code': code,
            'title': title,
            'status': 'active',
            'statusLabel': 'Đang có hiệu lực',
            'enactmentDate': '',
            'summary': summary_text,
            'fullText': text_snippet if text_snippet else None,
            'sha256': raw_hash,
            'verified': True,

            'pdfUrl': pdf_url,
            'pdfUrl': f"/api/admin/docs/papers/{source_name}",
        })

    return citations[:6]


def _attach_citation_codes_to_taxes(taxes: list, citations: list) -> list:
    """Match tax entries with citation codes from sources."""
    if not taxes or not citations:
        return taxes

    for tax in taxes:
        if not tax.get('citationCode') and citations:
            for cite in citations:
                code_lower = cite.get('code', '').lower()
                if 'thuế' in code_lower or 'biểu thuế' in code_lower or 'nđ' in code_lower:
                    tax['citationCode'] = cite['code']
                    break
    return taxes


# ─── Pydantic models ───────────────────────────────────────────────

class QueryIn(BaseModel):
    query: str
    top_k: int = 5

class ChatIn(BaseModel):
    prompt: str
    sessionId: Optional[str] = None
    userId: Optional[str] = None

class AuthIn(BaseModel):
    email: str
    password: str
    fullName: Optional[str] = None

class AdminUserCreateReq(BaseModel):
    email: str
    fullName: str
    password: str
    role: Optional[str] = "user"

class AdminUserUpdateReq(BaseModel):
    email: str
    fullName: str
    password: Optional[str] = None
    role: Optional[str] = None

class AdminChunkCreateReq(BaseModel):
    source: str
    text: str
    article_ids: List[str]
    chapter: Optional[str] = None

class AdminChunkUpdateReq(BaseModel):
    text: str
    article_ids: List[str]
    chapter: Optional[str] = None

class SessionCreate(BaseModel):
    title: Optional[str] = 'Hội thoại tư vấn mới'
    categoryTag: Optional[str] = 'Tư vấn Hải quan'
    userId: Optional[str] = None

class SettingsIn(BaseModel):
    userId: Optional[str] = None
    autoCite: Optional[bool] = True
    lawDatabase: Optional[str] = '2023-2024'
    fontSize: Optional[str] = 'medium'

class PdfExportIn(BaseModel):
    sessionId: Optional[str] = None
    title: Optional[str] = 'Bản tóm tắt quy định Hải quan & Thuế suất'
    content: Optional[str] = None
    hsCode: Optional[str] = None
    taxes: Optional[list] = None
    citations: Optional[list] = None


# ─── Startup event ──────────────────────────────────────────────────

def get_retriever() -> LocalRetriever:
    """Ensure LocalRetriever is initialized (lazy initialization for test suites and production)."""
    global retriever
    if retriever is None:
        db.init_db()
        retriever = LocalRetriever()
    return retriever

@app.on_event('startup')
async def startup_event():
    get_retriever()


# ═══════════════════════════════════════════════════════════════════
# CHAT API — Structured Response with SQLite Persistence & Isolation
# ═══════════════════════════════════════════════════════════════════

@app.post('/api/query')
async def api_query(q: QueryIn):
    r = get_retriever()
    answer, sources, provider = r.synthesize(q.query, top_k=q.top_k, max_sentences=6)
    return JSONResponse({'answer': answer, 'sources': sources, 'provider': provider})


@app.post('/api/chat')
async def api_chat(req: ChatIn, user_payload: Optional[dict] = Depends(get_current_user_optional)):
    r = get_retriever()

    # Retrieve last 4 messages (2 pairs) for sliding window memory
    chat_history = db.get_recent_messages_for_llm(req.sessionId, limit=4) if req.sessionId else []

    # "Chat theo phạm vi tài liệu": nếu phiên này đã có tài liệu người dùng tải lên,
    # CHỈ trả lời dựa trên nội dung (các) tài liệu đó — không dùng kho luật chung.
    if req.sessionId and db.session_has_documents(req.sessionId):
        scoped_chunks = db.get_session_document_chunks(req.sessionId)
        answer, sources, provider = r.synthesize_scoped(req.prompt, scoped_chunks, top_k=2, max_sentences=5)
    else:
        # Giảm top_k từ 5 xuống 2 để LLM không bị ngợp context, tăng tốc độ sinh chữ (giảm TTFT)
        answer, sources, provider = r.synthesize(req.prompt, chat_history=chat_history, top_k=3, max_sentences=5)

    # Extract structured data
    hs_code = _extract_hs_code(req.prompt + ' ' + answer)
    taxes = _extract_tax_info(answer)
    inspections = _extract_inspection_info(answer)
    citations = _build_legal_citations(sources)
    taxes = _attach_citation_codes_to_taxes(taxes, citations)

    summary_pdf = {
        'title': 'Tải bản tóm tắt quy định Hải quan (PDF)',
        'downloadUrl': '/api/export/pdf',
    } if answer and len(answer) > 50 else None

    # SQLite Persistence & Strict User Isolation
    if req.sessionId:
        try:
            timestamp = datetime.now().strftime('%H:%M')
            # Ưu tiên user_id từ JWT token (đã đăng nhập); fallback sang userId gửi kèm request
            effective_user_id = user_payload["id"] if user_payload else req.userId
            # Add User Message to SQLite DB
            db.add_message(req.sessionId, 'user', req.prompt, timestamp, user_id=effective_user_id)
            # Add AI Message to SQLite DB
            db.add_message(
                req.sessionId, 'ai', answer, timestamp,
                hs_code=hs_code, taxes=taxes, inspections=inspections,
                citations=citations, summary_pdf=summary_pdf, user_id=effective_user_id
            )
        except Exception as db_err:
            print(f"[Warning] Failed to persist chat message to SQLite: {db_err}")

    response = {
        'reply': answer,
        'provider': provider,
        'hsCode': hs_code,
        'taxes': taxes if taxes else None,
        'inspections': inspections,
        'citations': citations if citations else None,
        'summaryPdf': summary_pdf,
    }

    return JSONResponse(response)


# ─── Chat Streaming Endpoint (Server-Sent Events) ──────────────────

@app.post('/api/chat/stream')
async def api_chat_stream(req: ChatIn, user_payload: Optional[dict] = Depends(get_current_user_optional)):
    r = get_retriever()
    effective_user_id = user_payload["id"] if user_payload else req.userId

    async def event_generator() -> AsyncGenerator[str, None]:
        full_answer = ""
        provider = "local"
        sources = []
        # Send pipeline stage indicators before streaming begins
        yield f"data: {json.dumps({'stage': '🔍 Đang tìm kiếm văn bản pháp luật liên quan...'}, ensure_ascii=False)}\n\n"
        await asyncio.sleep(0)

        # Retrieve sliding window memory
        chat_history = db.get_recent_messages_for_llm(req.sessionId, limit=4) if req.sessionId else []

        yield f"data: {json.dumps({'stage': '⚖️ Đang phân tích và đánh giá mức độ phù hợp...'}, ensure_ascii=False)}\n\n"
        await asyncio.sleep(0)

        # Consume the generator synchronously but yield async for SSE
        first_chunk = True
        for chunk in r.synthesize_stream(req.prompt, chat_history=chat_history, top_k=3):
            if first_chunk:
                yield f"data: {json.dumps({'stage': '✍️ Đang tổng hợp câu trả lời...'}, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0)
                first_chunk = False
            if chunk["type"] == "text":
                text = chunk["content"]
                full_answer += text
                
                if chunk.get("sources") and not sources:
                    sources = chunk["sources"]
                    # Stream citations early to frontend
                    early_citations = _build_legal_citations(sources)
                    if early_citations:
                        yield f"data: {json.dumps({'citations': early_citations}, ensure_ascii=False)}\n\n"
                        await asyncio.sleep(0)
                
                payload = json.dumps({"token": text}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
                await asyncio.sleep(0) # Yield control
            elif chunk["type"] == "error":
                yield f"data: {json.dumps({'error': chunk['content']}, ensure_ascii=False)}\n\n"
                return

        # End of stream extraction
        hs_code = _extract_hs_code(req.prompt + ' ' + full_answer)
        taxes = _extract_tax_info(full_answer)
        inspections = _extract_inspection_info(full_answer)
        citations = _build_legal_citations(sources)
        taxes = _attach_citation_codes_to_taxes(taxes, citations)

        summary_pdf = {
            'title': 'Tải bản tóm tắt (PDF)',
            'downloadUrl': '/api/export/pdf',
        } if full_answer and len(full_answer) > 50 else None

        final_payload = {
            "done": True,
            "reply": full_answer,
            "provider": provider,
            "hsCode": hs_code,
            "taxes": taxes if taxes else None,
            "inspections": inspections,
            "citations": citations if citations else None,
            "summaryPdf": summary_pdf
        }

        if req.sessionId:
            try:
                timestamp = datetime.now().strftime('%H:%M')
                db.add_message(req.sessionId, 'user', req.prompt, timestamp, user_id=effective_user_id)
                db.add_message(
                    req.sessionId, 'ai', full_answer, timestamp,
                    hs_code=hs_code, taxes=taxes, inspections=inspections,
                    citations=citations, summary_pdf=summary_pdf, user_id=effective_user_id
                )
            except Exception as db_err:
                print(f"[Warning] Failed to persist stream message to SQLite: {db_err}")

        yield f"data: {json.dumps(final_payload, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ═══════════════════════════════════════════════════════════════════
# AUTH API — SQLite Registration, Login & JWT Generation
# ═══════════════════════════════════════════════════════════════════

@app.post('/api/auth/register')
async def auth_register(req: AuthIn):
    try:
        user_info = db.register_user(req.email, req.password, req.fullName or "Người dùng")
        return JSONResponse({
            'success': True,
            'user': user_info,
            'token': user_info.get("token")
        })
    except ValueError as e:
        return JSONResponse({'error': str(e)}, status_code=400)
    except Exception as e:
        return JSONResponse({'error': f'Lỗi hệ thống: {str(e)}'}, status_code=500)


@app.post('/api/auth/login')
async def auth_login(req: AuthIn):
    try:
        user_info = db.login_user(req.email, req.password)
        return JSONResponse({
            'success': True,
            'user': user_info,
            'token': user_info.get("token")
        })
    except ValueError as e:
        return JSONResponse({'error': str(e)}, status_code=401)
    except Exception as e:
        return JSONResponse({'error': f'Lỗi hệ thống: {str(e)}'}, status_code=500)


@app.get('/api/auth/me')
async def auth_me(user: dict = Depends(get_current_user_required)):
    user_db = db.get_user_by_id(user["id"])
    if not user_db:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại.")
    return JSONResponse({"success": True, "user": user_db})


# ═══════════════════════════════════════════════════════════════════
# SESSION & HISTORY API — Isolated by User ID
# ═══════════════════════════════════════════════════════════════════

@app.get('/api/sessions')
async def get_sessions(
    userId: Optional[str] = None,
    search: Optional[str] = None,
    tag: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    effective_user_id = current_user["id"] if current_user else userId
    result = db.get_user_sessions(user_id=effective_user_id, search=search, tag=tag, page=page, limit=limit)
    return JSONResponse(result)


@app.post('/api/sessions')
async def create_session(
    req: SessionCreate,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    effective_user_id = current_user["id"] if current_user else req.userId
    new_session = db.create_session(
        user_id=effective_user_id,
        title=req.title or "Hội thoại tư vấn mới",
        category_tag=req.categoryTag or "Tư vấn Hải quan"
    )
    return JSONResponse({'session': new_session})


@app.get('/api/sessions/{session_id}')
async def get_session(
    session_id: str,
    userId: Optional[str] = None,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    effective_user_id = current_user["id"] if current_user else userId
    session = db.get_session_detail(session_id, user_id=effective_user_id)
    if not session:
        return JSONResponse({'error': 'Không tìm thấy phiên hội thoại hoặc không có quyền truy cập.'}, status_code=404)
    return JSONResponse({'session': session})


@app.delete('/api/sessions/{session_id}')
async def delete_session(
    session_id: str,
    userId: Optional[str] = None,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    effective_user_id = current_user["id"] if current_user else userId
    success = db.delete_session(session_id, user_id=effective_user_id)
    if not success:
        return JSONResponse({'error': 'Không tìm thấy phiên hội thoại hoặc không có quyền truy cập.'}, status_code=404)
    return JSONResponse({'success': True, 'message': 'Đã xóa phiên hội thoại thành công.'})


# ═══════════════════════════════════════════════════════════════════
# FILE UPLOAD API — Attached to Session/User with Size Validation
# ═══════════════════════════════════════════════════════════════════

MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB
ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.webp', '.txt'}

# Separator dùng để chia nhỏ NỘI DUNG BÊN TRONG 1 Điều luật (khi Điều đó quá dài, vượt
# chunk_size) — KHÔNG dùng để gộp nhiều Điều khác nhau lại với nhau.
SESSION_DOC_INNER_SEPARATORS = [
    r"\n(?=CHƯƠNG\s+[IVXLCDM\d]+)",
    r"\n(?=Chương\s+[IVXLCDM\d]+)",
    r"\n(?=Mục\s+\d+)",
    r"\n(?=PHẦN\s+[IVXLCDM\d]+)",
    r"\n\n+",
    r"\n",
    r"\.\s+",
    r"\s+",
]


def _split_text_with_regex(text: str, chunk_size: int, chunk_overlap: int, separators: list) -> List[str]:
    """Bộ tách văn bản đệ quy theo thứ tự ưu tiên separator — dùng để chia nhỏ TIẾP nội
    dung bên trong 1 Điều luật quá dài (KHÔNG dùng ở bước tách theo Điều, để tránh gộp
    nhiều Điều khác nhau lại chung 1 đoạn)."""
    if len(text) <= chunk_size:
        return [text.strip()] if text.strip() else []

    for sep in separators:
        splits = re.split(sep, text)
        if len(splits) > 1:
            chunks = []
            current = ""
            for s in splits:
                s_clean = s.strip()
                if not s_clean:
                    continue
                if len(current) + len(s_clean) + 1 <= chunk_size:
                    current = (current + "\n" + s_clean).strip() if current else s_clean
                else:
                    if current:
                        chunks.append(current)
                    if len(s_clean) > chunk_size:
                        sub_chunks = _split_text_with_regex(s_clean, chunk_size, chunk_overlap, separators[1:])
                        chunks.extend(sub_chunks)
                        current = ""
                    else:
                        current = s_clean
            if current:
                chunks.append(current)
            return chunks

    # Fallback cuối cùng: cắt theo ký tự nhưng LUÔN lùi về khoảng trắng gần nhất,
    # không bao giờ cắt ngang giữa 1 từ (chỉ xảy ra khi văn bản hoàn toàn không có
    # dấu câu/khoảng trắng nào để tách — trường hợp cực hiếm).
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end]
        if end < len(text):
            last_space = chunk.rfind(' ')
            if last_space > chunk_size * 0.5:
                chunk = chunk[:last_space]
                end = start + last_space
        if chunk.strip():
            chunks.append(chunk.strip())
        start = max(end - chunk_overlap, start + 1)
    return chunks


def _split_by_article_boundaries(text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
    """Tách văn bản pháp luật theo ranh giới TỪNG Điều — mỗi Điều luôn là 1 chunk RIÊNG,
    KHÔNG bao giờ gộp 2 Điều khác nhau vào chung 1 đoạn (khác hành vi 'đóng gói nhiều
    mảnh nhỏ cho đầy chunk_size' trước đây, vốn gây ra lỗi 1 đoạn trả lời dính nội dung
    của 2 Điều luật khác nhau). Nếu 1 Điều tự nó đã dài hơn chunk_size, mới chia nhỏ tiếp
    NỘI BỘ Điều đó (không lấn sang Điều bên cạnh)."""
    pieces = re.split(r"\n(?=Điều\s+\d+)", text)
    pieces = [p.strip() for p in pieces if p.strip()]

    if len(pieces) <= 1:
        # Văn bản không có cấu trúc "Điều X" nào tách được (ví dụ hợp đồng, công văn...)
        # -> rơi về tách theo Chương/Mục/câu như bình thường.
        return _split_text_with_regex(text, chunk_size, chunk_overlap, SESSION_DOC_INNER_SEPARATORS)

    chunks = []
    for piece in pieces:
        if len(piece) <= chunk_size:
            chunks.append(piece)
        else:
            # 1 Điều đơn lẻ quá dài -> chia nhỏ NỘI BỘ điều này, không dồn sang Điều khác
            chunks.extend(_split_text_with_regex(piece, chunk_size, chunk_overlap, SESSION_DOC_INNER_SEPARATORS))
    return chunks


def _chunk_text_simple(text: str, chunk_size: int = 1800, overlap: int = 200) -> List[str]:
    """Chia văn bản người dùng tải lên thành các đoạn theo ranh giới Điều luật (không cắt
    ngang câu/Điều, không gộp 2 Điều khác nhau vào chung 1 đoạn). chunk_size mặc định
    1800 ký tự — đủ chứa trọn hầu hết 1 Điều luật, tương đồng PARENT_CHUNK_SIZE=2000 mà
    kho admin đang dùng."""
    text = re.sub(r'[ \t]+', ' ', text).strip()
    if not text:
        return []
    return _split_by_article_boundaries(text, chunk_size, overlap)


def _extract_pdf_text(file_path: Path) -> str:
    """Trích xuất text từ PDF. Thử pypdf trước (nhanh, đã có sẵn); nếu kết quả rỗng
    hoặc quá ít ký tự (dấu hiệu pypdf đọc không ra dù PDF có chữ thật), thử lại
    bằng pdfplumber — thư viện xử lý được nhiều kiểu encode/font nhúng mà pypdf bỏ sót.
    Nếu cả 2 đều rỗng, khả năng cao đây là PDF dạng ảnh/scan, cần OCR (chưa hỗ trợ).
    """
    text_parts = []
    try:
        reader = pypdf.PdfReader(str(file_path))
        for page in reader.pages:
            page_text = page.extract_text() or ""
            text_parts.append(page_text)
    except Exception as e:
        print(f"[Upload] pypdf extraction failed for {file_path.name}: {e}")

    combined = "\n".join(text_parts).strip()

    if len(combined) < 30:  # gần như rỗng -> thử phương án dự phòng
        try:
            import pdfplumber # type: ignore
            fallback_parts = []
            with pdfplumber.open(str(file_path)) as pdf:
                for page in pdf.pages:
                    fallback_parts.append(page.extract_text() or "")
            fallback_text = "\n".join(fallback_parts).strip()
            if len(fallback_text) > len(combined):
                print(f"[Upload] pypdf trích được quá ít ({len(combined)} ký tự), "
                      f"dùng kết quả pdfplumber ({len(fallback_text)} ký tự) cho {file_path.name}.")
                return fallback_text
        except ImportError:
            print("[Upload] pdfplumber chưa được cài (pip install pdfplumber) — bỏ qua phương án dự phòng.")
        except Exception as e:
            print(f"[Upload] pdfplumber extraction failed for {file_path.name}: {e}")

    return combined


def _process_session_document_for_rag(sessionId: str, filename: str, file_path: Path, ext: str) -> bool:
    """Trích xuất + chia nhỏ + embed nội dung tài liệu người dùng vừa tải lên trong 1 phiên chat,
    để phục vụ tính năng 'Chat theo phạm vi tài liệu' (không đụng tới kho luật chung).
    Chỉ hỗ trợ .pdf và .txt hiện tại. Lỗi ở bước này KHÔNG được làm fail request upload.
    Trả về True nếu xử lý + lưu chunk thành công, False nếu thất bại."""
    if not sessionId:
        return False
    try:
        if ext == '.pdf':
            raw_text = _extract_pdf_text(file_path)
        elif ext == '.txt':
            raw_text = file_path.read_text(encoding='utf-8', errors='ignore')
        else:
            return False

        chunks = _chunk_text_simple(raw_text)
        if not chunks:
            print(f"[Upload] Không trích xuất được nội dung văn bản từ {filename}, bỏ qua scoped-RAG.")
            return False

        r = get_retriever()
        embeddings = r.embed_texts(chunks)
        chunks_with_emb = [{'text': c, 'embedding': e} for c, e in zip(chunks, embeddings)]
        db.save_session_document_chunks(sessionId, filename, chunks_with_emb)
        print(f"[Upload] Đã xử lý '{filename}' cho scoped-RAG: {len(chunks)} chunks.")
        return True
    except Exception as e:
        print(f"[Upload] Lỗi xử lý scoped-RAG cho '{filename}': {e}")
        return False


@app.post('/api/upload')
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    sessionId: Optional[str] = Form(None),
    userId: Optional[str] = Form(None),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Định dạng tệp {ext} không được hỗ trợ.")

    unique_name = f'{uuid.uuid4().hex[:12]}{ext}'
    file_path = UPLOADS_DIR / unique_name

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Kích thước tệp vượt quá giới hạn tối đa (20MB).")

    with open(file_path, 'wb') as buffer:
        buffer.write(content)

    file_size = len(content)
    size_str = f'{file_size / 1024:.1f} KB' if file_size < 1024 * 1024 else f'{file_size / (1024 * 1024):.1f} MB'

    file_type = 'pdf' if ext == '.pdf' else \
                'doc' if ext in ['.doc', '.docx'] else \
                'excel' if ext in ['.xls', '.xlsx'] else \
                'image' if ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp'] else 'pdf'

    file_url = f'/uploads/{unique_name}'
    effective_user_id = current_user["id"] if current_user else userId

    # Save to SQLite
    attachment = db.save_attachment(sessionId, effective_user_id, file.filename, size_str, file_type, file_url)

    # Xử lý nội dung file cho tính năng "Chat theo phạm vi tài liệu" (PDF/TXT)
    scoped_ready = False
    scoped_error = None
    if sessionId:
        if ext in ('.pdf', '.txt'):
            scoped_ready = _process_session_document_for_rag(sessionId, file.filename, file_path, ext)
            if not scoped_ready:
                scoped_error = (
                    "Không trích xuất được nội dung văn bản từ tệp này (có thể là PDF dạng ảnh/scan "
                    "không có lớp chữ). Chat sẽ KHÔNG bị giới hạn theo tệp này."
                )
        else:
            scoped_error = (
                f"Định dạng {ext} chưa hỗ trợ 'Chat theo phạm vi tài liệu'. "
                f"Hiện chỉ hỗ trợ .pdf và .txt. Chat sẽ KHÔNG bị giới hạn theo tệp này."
            )

    return JSONResponse({
        'success': True,
        'file': attachment,
        'scopedRagEnabled': scoped_ready,
        'scopedRagError': scoped_error,
    })


# ═══════════════════════════════════════════════════════════════════
# SETTINGS API — User Isolated Settings
# ═══════════════════════════════════════════════════════════════════

@app.get('/api/settings')
async def get_settings(
    userId: Optional[str] = 'default_user',
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    effective_user_id = current_user["id"] if current_user else (userId or 'default_user')
    settings = db.get_user_settings(effective_user_id)
    return JSONResponse(settings)


@app.put('/api/settings')
async def update_settings(
    req: SettingsIn,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    effective_user_id = current_user["id"] if current_user else (req.userId or 'default_user')
    updated = db.update_user_settings(
        effective_user_id,
        auto_cite=req.autoCite if req.autoCite is not None else True,
        law_database=req.lawDatabase or '2023-2024',
        font_size=req.fontSize or 'medium'
    )
    return JSONResponse({'success': True, 'settings': updated})


# ═══════════════════════════════════════════════════════════════════
# PDF EXPORT API — UTF-8 Professional Legal Summary
# ═══════════════════════════════════════════════════════════════════

@app.post('/api/export/pdf')
async def export_pdf(req: PdfExportIn):
    """Generate and return a beautifully styled, print-ready UTF-8 legal summary report."""
    content = req.content or 'Nội dung tóm tắt pháp lý sẽ được hiển thị tại đây.'
    title = req.title or 'Bản tóm tắt quy định Hải quan & Thuế suất'
    now_date = datetime.now().strftime('%d/%m/%Y %H:%M')
    doc_id = f"LOGI-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    taxes_html = ''
    if req.taxes:
        taxes_html = """
        <div class="section-box">
            <div class="section-title">📊 Biểu thuế suất áp dụng</div>
            <table class="tax-table">
                <thead>
                    <tr>
                        <th>Loại thuế</th>
                        <th>Thuế suất</th>
                        <th>Căn cứ pháp lý</th>
                    </tr>
                </thead>
                <tbody>
        """
        for t in req.taxes:
            label = t.get('label', '')
            rate = t.get('rate', '')
            cite = t.get('citationCode', 'Theo Biểu thuế hiện hành')
            taxes_html += f"<tr><td><strong>{label}</strong></td><td class='rate'>{rate}</td><td>{cite}</td></tr>"
        taxes_html += "</tbody></table></div>"

    citations_html = ''
    if req.citations:
        citations_html = """
        <div class="section-box">
            <div class="section-title">📋 Danh mục văn bản pháp luật tham chiếu & Căn cứ</div>
            <ul class="citation-list">
        """
        for cite in req.citations:
            code = cite.get("code", "")
            cite_title = cite.get("title", "")
            summary = cite.get("summary", "")
            citations_html += f"""
            <li class="citation-item">
                <span class="cite-code">{code}</span>
                <span class="cite-title">{cite_title}</span>
                {f'<div class="cite-summary">{summary}</div>' if summary else ''}
            </li>
            """
        citations_html += "</ul></div>"

    html = f"""<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} — {doc_id}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #f8fafc;
            padding: 40px 20px;
            line-height: 1.6;
        }}
        .document-container {{
            max-width: 850px;
            margin: 0 auto;
            background: #ffffff;
            padding: 48px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
            border: 1px solid #e2e8f0;
        }}
        .header {{
            text-align: center;
            border-bottom: 2px solid #00236f;
            padding-bottom: 24px;
            margin-bottom: 28px;
        }}
        .country-title {{ font-size: 15px; font-weight: 700; color: #00236f; letter-spacing: 0.5px; text-transform: uppercase; }}
        .motto {{ font-size: 13px; font-weight: 500; color: #475569; margin-top: 4px; }}
        .doc-meta {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            color: #64748b;
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px dashed #cbd5e1;
        }}
        .main-title {{
            font-size: 22px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 16px;
            line-height: 1.3;
        }}
        .content-box {{
            background: #f8fafc;
            border-left: 4px solid #2563eb;
            padding: 20px;
            border-radius: 0 8px 8px 0;
            font-size: 14.5px;
            color: #334155;
            margin-bottom: 24px;
            line-height: 1.6;
        }}
        .content-box p {{ margin-bottom: 12px; }}
        .content-box p:last-child {{ margin-bottom: 0; }}
        .content-box ul {{ margin-top: 0; margin-bottom: 12px; padding-left: 20px; }}
        .content-box li {{ margin-bottom: 4px; }}
        .content-box strong {{ font-weight: 700; color: #0f172a; }}
        .content-box h1, .content-box h2, .content-box h3 {{ color: #00236f; margin-top: 16px; margin-bottom: 8px; }}
        .content-box h3 {{ font-size: 15px; }}
        .section-box {{
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
        }}
        .section-title {{
            font-size: 16px;
            font-weight: 700;
            color: #00236f;
            margin-bottom: 12px;
        }}
        .tax-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 13.5px;
            margin-top: 8px;
        }}
        .tax-table th {{
            background: #f1f5f9;
            color: #334155;
            text-align: left;
            padding: 10px 14px;
            font-weight: 600;
            border: 1px solid #cbd5e1;
        }}
        .tax-table td {{
            padding: 10px 14px;
            border: 1px solid #e2e8f0;
            color: #334155;
        }}
        .tax-table td.rate {{
            font-weight: 700;
            color: #2563eb;
        }}
        .citation-list {{ list-style: none; }}
        .citation-item {{
            padding: 12px 16px;
            margin-bottom: 8px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 13.5px;
        }}
        .cite-code {{
            display: inline-block;
            background: #dbeafe;
            color: #1e40af;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 12px;
            margin-right: 8px;
        }}
        .cite-title {{ font-weight: 600; color: #0f172a; }}
        .cite-summary {{ color: #64748b; font-size: 12.5px; margin-top: 4px; }}
        .footer {{
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 11.5px;
            color: #94a3b8;
            text-align: center;
        }}
        .print-btn {{
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2563eb;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }}
        @media print {{
            body {{ background: white; padding: 0; }}
            .document-container {{ box-shadow: none; border: none; padding: 0; max-width: 100%; }}
            .print-btn {{ display: none; }}
        }}
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">🖨️ In / Lưu file PDF</button>
    <div class="document-container">
        <div class="header">
            <div class="country-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div class="motto">Độc lập - Tự do - Hạnh phúc</div>
            <div class="doc-meta">
                <span>Mã tài liệu: <strong>{doc_id}</strong></span>
                <span>Ngày trích xuất: <strong>{now_date}</strong></span>
                <span>Hệ thống: <strong>LogiChat Legal AI</strong></span>
            </div>
        </div>

        <h1 class="main-title">{title}</h1>
        {f'<div style="margin-bottom: 12px;"><span style="background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 13px;">🏷️ Mã HS xác định: {req.hsCode}</span></div>' if req.hsCode else ''}

        <div class="content-box">{markdown.markdown(content) if content else ''}</div>

        {taxes_html}
        {citations_html}

        <div class="footer">
            <p>* Bản tóm tắt pháp lý này được tự động trích xuất từ cơ sở dữ liệu Quy định Hải quan & Thủ tục XNK hiện hành.</p>
            <p>Thông tin có giá trị tra cứu tham khảo nghiệp vụ, đối chiếu với cơ quan Hải quan khi làm thủ tục thông quan chính thức.</p>
        </div>
    </div>
</body>
</html>"""

    return HTMLResponse(html)


# ═══════════════════════════════════════════════════════════════════
# BLOCKCHAIN & SHA-256 HASH VERIFICATION API
# ═══════════════════════════════════════════════════════════════════

@app.get('/api/verify/integrity/{identifier}')
async def verify_integrity(identifier: str):
    """Verify SHA-256 integrity hash of a legal document or chunk."""
    result = db.verify_document_integrity(identifier)
    return JSONResponse(result)


# ═══════════════════════════════════════════════════════════════════
# CITATION DETAIL API
# ═══════════════════════════════════════════════════════════════════

@app.get('/api/citations/{code:path}')
async def get_citation_detail(code: str):
    r = get_retriever()
    parents, children = r.retrieve_parents(code, top_k=3)

    if not parents and not children:
        return JSONResponse({
            'error': f'Không tìm thấy văn bản pháp luật với mã: {code}'
        }, status_code=404)

    results = parents if parents else children
    full_texts = []
    for r in results:
        text = r.get('text', '')
        if text:
            full_texts.append(text)

    combined_text = '\n\n---\n\n'.join(full_texts)
    first_result = results[0] if results else {}

    return JSONResponse({
        'citation': {
            'code': code,
            'title': first_result.get('source', code),
            'status': 'active',
            'statusLabel': 'Đang có hiệu lực',
            'summary': combined_text[:500],
            'fullText': combined_text,
            'articleRefs': first_result.get('article_ids', []),
            'chapter': first_result.get('chapter'),
            'sha256': db.calculate_sha256(combined_text)
        }
    })


# ═══════════════════════════════════════════════════════════════════
# ADMIN API (Protected by require_admin_user)
# ═══════════════════════════════════════════════════════════════════

@app.get('/api/admin/users')
async def admin_get_users(admin: dict = Depends(require_admin_user)):
    try:
        users = db.get_all_users()
        return {"success": True, "users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/api/admin/users')
async def admin_create_user(req: AdminUserCreateReq, admin: dict = Depends(require_admin_user)):
    try:
        user = db.register_user(req.email, req.password, req.fullName, role=req.role or "user")
        return {"success": True, "user": user}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put('/api/admin/users/{user_id}')
async def admin_update_user(user_id: str, req: AdminUserUpdateReq, admin: dict = Depends(require_admin_user)):
    try:
        success = db.update_user(user_id, req.email, req.fullName, req.password, role=req.role)
        if success:
            return {"success": True}
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete('/api/admin/users/{user_id}')
async def admin_delete_user(user_id: str, admin: dict = Depends(require_admin_user)):
    try:
        success = db.delete_user(user_id)
        if success:
            return {"success": True}
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/admin/chunks')
async def admin_get_chunks(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    search: Optional[str] = None,
    admin: dict = Depends(require_admin_user)
):
    try:
        result = db.get_all_chunks(page=page, limit=limit, search=search)
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/api/admin/docs/hierarchy')
async def admin_get_docs_hierarchy(admin: dict = Depends(require_admin_user)):
    try:
        hierarchy = db.get_documents_hierarchy()
        return {"success": True, "hierarchy": hierarchy}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/api/admin/docs/{source:path}/chunks')
async def admin_get_source_chunks(
    source: str,
    admin: dict = Depends(require_admin_user)
):
    try:
        chunks = db.get_chunks_by_source(source)
        return {"success": True, "chunks": chunks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/api/admin/chunks/search')
async def admin_search_chunks(
    q: str = Query(...),
    admin: dict = Depends(require_admin_user)
):
    global retriever
    try:
        if not retriever:
            raise HTTPException(status_code=500, detail="Retriever not initialized.")
        
        # Use retriever to get chunks
        results = retriever.retrieve(q, top_k=20)
        chunks = []
        for r in results:
            pid = r.get("parent_id")
            if pid and pid in retriever.parent_chunks:
                p = retriever.parent_chunks[pid]
                chunks.append({
                    "parent_id": pid,
                    "source": p.get("source", ""),
                    "chapter": p.get("chapter", ""),
                    "article_ids": p.get("article_ids", []),
                    "text": p.get("text", ""),
                    "score": r.get("score", 0)
                })
        return {"success": True, "chunks": chunks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete('/api/admin/docs/{source:path}')
async def admin_delete_document(
    source: str,
    background_tasks: BackgroundTasks,
    admin: dict = Depends(require_admin_user)
):
    global retriever
    try:
        # 1. Delete from DB
        success = db.delete_document_by_source(source)
        if not success:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu này trong cơ sở dữ liệu.")
            
        # 2. Update memory and JSON
        if retriever:
            retriever.remove_source_from_memory(source)
            
        # 3. Rebuild faiss index in background
        def rebuild_faiss_bg():
            try:
                global retriever
                if retriever:
                    retriever.rebuild_faiss_index()
                else:
                    get_retriever()
            except Exception as e:
                print(f"Warning: Failed to rebuild FAISS after deletion: {e}")
                
        background_tasks.add_task(rebuild_faiss_bg)
            
        return {"success": True, "message": f"Đã xóa tài liệu '{source}' và các điều khoản liên quan thành công. Hệ thống đang đồng bộ AI ngầm."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/api/admin/chunks')
async def admin_create_chunk(
    req: AdminChunkCreateReq,
    admin: dict = Depends(require_admin_user)
):
    global retriever
    try:
        parent_id = f"chunk_{uuid.uuid4().hex[:8]}"
        chapter = req.chapter or "Không phân chương"
        
        # 1. Insert into SQLite
        db.insert_chunk(parent_id, req.source, req.text, chapter, req.article_ids)
        
        # 2. Update JSON
        chunks_path = Path.cwd() / 'faiss_index_local' / 'parent_chunks.json'
        if not chunks_path.exists():
            chunks_path = Path.cwd() / 'out' / 'parent_chunks.json'
            
        if chunks_path.exists():
            with open(chunks_path, 'r', encoding='utf-8') as f:
                json_chunks = json.load(f)
            
            json_chunks.append({
                "parent_id": parent_id,
                "source": req.source,
                "text": req.text,
                "chapter": chapter,
                "article_ids": req.article_ids
            })
            
            with open(chunks_path, 'w', encoding='utf-8') as f:
                json.dump(json_chunks, f, ensure_ascii=False, indent=2)

        # 3. Update memory
        if retriever:
            retriever.add_parent_chunk_memory(parent_id, req.source, req.text, chapter, req.article_ids)

        return {"success": True, "message": "Đã thêm chunk mới thành công.", "parent_id": parent_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete('/api/admin/chunks/{parent_id}')
async def admin_delete_chunk(
    parent_id: str,
    admin: dict = Depends(require_admin_user)
):
    global retriever
    try:
        # 1. Delete from SQLite
        db.delete_chunk(parent_id)
        
        # 2. Update JSON
        chunks_path = Path.cwd() / 'faiss_index_local' / 'parent_chunks.json'
        if not chunks_path.exists():
            chunks_path = Path.cwd() / 'out' / 'parent_chunks.json'
            
        if chunks_path.exists():
            with open(chunks_path, 'r', encoding='utf-8') as f:
                json_chunks = json.load(f)
            
            json_chunks = [c for c in json_chunks if c.get('parent_id') != parent_id]
            
            with open(chunks_path, 'w', encoding='utf-8') as f:
                json.dump(json_chunks, f, ensure_ascii=False, indent=2)

        # 3. Update memory
        if retriever:
            retriever.delete_parent_chunk_memory(parent_id)

        return {"success": True, "message": "Đã xóa chunk thành công."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put('/api/admin/chunks/{parent_id}')
async def admin_update_chunk(
    parent_id: str,
    req: AdminChunkUpdateReq,
    admin: dict = Depends(require_admin_user)
):
    global retriever
    try:
        # 1. Update in SQLite with SHA-256 recalculation
        db.update_chunk(parent_id, req.text, req.chapter or "", req.article_ids)
            
        # 2. Update in JSON for FAISS synchronization
        chunks_path = Path.cwd() / 'faiss_index_local' / 'parent_chunks.json'
        if not chunks_path.exists():
            chunks_path = Path.cwd() / 'out' / 'parent_chunks.json'
            
        if chunks_path.exists():
            with open(chunks_path, 'r', encoding='utf-8') as f:
                json_chunks = json.load(f)
            
            for chunk in json_chunks:
                if chunk.get('parent_id') == parent_id:
                    chunk['text'] = req.text
                    chunk['article_ids'] = req.article_ids
                    chunk['chapter'] = req.chapter
                    break
            
            with open(chunks_path, 'w', encoding='utf-8') as f:
                json.dump(json_chunks, f, ensure_ascii=False, indent=2)

        # 3. Update in-memory LocalRetriever immediately
        if retriever:
            retriever.update_parent_chunk_memory(parent_id, req.text, req.chapter, req.article_ids)

        return {"success": True, "message": "Đã cập nhật và đồng bộ chunk thành công."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def process_document_background(filename: str, file_path: str, base_dir: Path):
    import subprocess
    try:
        print(f"Background: Running pipeline for new file: {filename}")
        chatbot_script = base_dir / "Chatbot.py"
        seed_script = base_dir / "seed_db_from_json.py"
        
        # 1. Chunking
        subprocess.run([sys.executable, str(chatbot_script), "--file", str(file_path)], cwd=str(base_dir), check=True)
        # 2. Seed DB
        subprocess.run([sys.executable, str(seed_script)], cwd=str(base_dir), check=True)
        
        # 3. Build FAISS index in-memory
        global retriever
        if retriever:
            retriever.rebuild_faiss_index()
        else:
            get_retriever()
            
        # 4. Update status
        db.update_document_status(filename, 'ready')
        print(f"Background: Completed pipeline for {filename}")
    except Exception as e:
        print(f"Background error processing {filename}:", e)
        db.update_document_status(filename, 'error')

@app.post('/api/admin/docs/upload')
def admin_upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = FastAPIFile(...),
    admin: dict = Depends(require_admin_user)
):
    import subprocess
    try:
        ext = Path(file.filename).suffix.lower()
        if ext != '.pdf':
            raise HTTPException(status_code=400, detail="Chỉ hỗ trợ nạp tài liệu định dạng PDF.")

        # Ensure we use the backend folder as base
        base_dir = Path(__file__).resolve().parent
        
        # Save to papers/
        papers_dir = base_dir.parent / 'papers'
        if not papers_dir.exists():
            papers_dir = base_dir / 'papers'
            
        papers_dir.mkdir(parents=True, exist_ok=True)
        file_path = papers_dir / file.filename
        
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
        # Insert document record to track status
        db.insert_admin_document(file.filename)
        
        # Add background task
        background_tasks.add_task(process_document_background, file.filename, str(file_path), base_dir)
            
        return {"success": True, "message": "Tải lên thành công, hệ thống đang xử lý phân tích AI ngầm."}
    except Exception as e:
        print("Upload error:", e)
        raise HTTPException(status_code=500, detail=str(e))

        source_name = f"papers/{file.filename}"
        return {"success": True, "message": "Đã thêm và xử lý tài liệu thành công.", "source": source_name}
    except subprocess.CalledProcessError as e:
        return JSONResponse(status_code=500, content={"success": False, "error": f"Pipeline processing failed: {e}"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


# ═══════════════════════════════════════════════════════════════════
# HOMEPAGE & SPA FALLBACK
# ═══════════════════════════════════════════════════════════════════

@app.get('/', response_class=HTMLResponse)
async def homepage(request: Request):
    index_file = Path.cwd() / 'frontend' / 'dist' / 'index.html'
    if not index_file.exists():
        index_file = Path.cwd() / 'frontend' / 'index.html'
    if index_file.exists():
        return FileResponse(index_file)
    return HTMLResponse('<h3>Index not found. Please ensure static/dist/index.html exists.</h3>')


@app.get('/{path:path}')
async def spa_fallback(request: Request, path: str):
    if path.startswith(('api/', 'uploads/')):
        return JSONResponse({'error': 'Not Found'}, status_code=404)
        
    dist_dir = Path.cwd() / 'frontend' / 'dist'
    file_path = dist_dir / path
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
        
    index_file = dist_dir / 'index.html'
    if not index_file.exists():
        index_file = Path.cwd() / 'frontend' / 'index.html'
    if index_file.exists():
        return FileResponse(index_file)
    return HTMLResponse('<h3>Not found</h3>', status_code=404)


if __name__ == '__main__':
    uvicorn.run('serve:app', host='127.0.0.1', port=8000, reload=False)