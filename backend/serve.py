"""FastAPI backend for LogiChat — Trợ lý Pháp lý Hải quan & XNK AI.

Provides full REST API with SQLite database integration, user authentication (isolated history),
RAG vector retrieval (Parent-Document Retrieval), and PDF export.

Run:
  python serve.py
"""
from fastapi import FastAPI, Request, UploadFile, File as FastAPIFile, Header, HTTPException, Depends
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
from pathlib import Path
import sys
import os
import json
import re
import uuid
import shutil
from datetime import datetime
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Ensure UTF-8 output
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

# Import SQLite Database Layer
import db

app = FastAPI(title='LogiChat — Trợ lý Pháp lý Hải quan & XNK AI (SQLite Backend)')

# ─── Data directory setup ───────────────────────────────────────────
DATA_DIR = Path.cwd() / 'data'
DATA_DIR.mkdir(exist_ok=True)
UPLOADS_DIR = DATA_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

# ─── Mount static assets ───────────────────────────────────────────
static_dir = Path.cwd() / 'frontend' / 'dist'
if not static_dir.exists():
    static_dir = Path.cwd() / 'frontend'

assets_dir = static_dir / 'assets'
if assets_dir.exists():
    app.mount('/assets', StaticFiles(directory=str(assets_dir)), name='assets')

# Mount uploads for download
app.mount('/uploads', StaticFiles(directory=str(UPLOADS_DIR)), name='uploads')
app.mount('/frontend', StaticFiles(directory=str(static_dir)), name='frontend')

# ─── Import local retriever ────────────────────────────────────────
from retriever_local import LocalRetriever

retriever = None


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
    inspection_keywords = ['kiểm tra chuyên ngành', 'kiểm tra chất lượng', 'giấy phép',
                          'hợp quy', 'chứng nhận', 'quản lý chuyên ngành']
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
    citations = []
    seen_sources = set()

    for i, src in enumerate(sources):
        source_name = src.get('source', '') or ''
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
        code = code_match.group(1) if code_match else source_name[:40]

        title = source_name
        if article_refs:
            title = f"{source_name} - {', '.join(article_refs[:3])}"

        citations.append({
            'id': f'cit-{i}-{uuid.uuid4().hex[:6]}',
            'code': code,
            'title': title[:80],
            'status': 'active',
            'statusLabel': 'Đang có hiệu lực',
            'enactmentDate': '',
            'summary': text_snippet[:300] if text_snippet else f'Trích dẫn từ {source_name}',
            'fullText': text_snippet[:1000] if text_snippet else None,
            'pdfUrl': '#',
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

class AdminUserUpdateReq(BaseModel):
    email: str
    fullName: str
    password: Optional[str] = None

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

class SettingsUpdateReq(BaseModel):
    userId: str
    autoCite: bool
    lawDatabase: str
    fontSize: str

class PdfExportIn(BaseModel):
    sessionId: Optional[str] = None
    title: Optional[str] = 'Bản tóm tắt pháp lý'
    content: Optional[str] = None
    citations: Optional[list] = None


# ─── Startup event ──────────────────────────────────────────────────

@app.on_event('startup')
async def startup_event():
    global retriever
    db.init_db()
    retriever = LocalRetriever()


# ═══════════════════════════════════════════════════════════════════
# CHAT API — Structured Response with SQLite Persistence & Isolation
# ═══════════════════════════════════════════════════════════════════

@app.post('/api/query')
async def api_query(q: QueryIn):
    answer, sources, provider = retriever.synthesize(q.query, top_k=q.top_k, max_sentences=6)
    return JSONResponse({'answer': answer, 'sources': sources, 'provider': provider})


@app.post('/api/chat')
async def api_chat(req: ChatIn):
    answer, sources, provider = retriever.synthesize(req.prompt, top_k=5, max_sentences=6)

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
        timestamp = datetime.now().strftime('%H:%M')
        # Add User Message to SQLite DB
        db.add_message(req.sessionId, 'user', req.prompt, timestamp)
        # Add AI Message to SQLite DB
        db.add_message(
            req.sessionId, 'ai', answer, timestamp,
            hs_code=hs_code, taxes=taxes, inspections=inspections,
            citations=citations, summary_pdf=summary_pdf
        )

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


# ═══════════════════════════════════════════════════════════════════
# AUTH API — SQLite Registration & Login
# ═══════════════════════════════════════════════════════════════════

@app.post('/api/auth/register')
async def auth_register(req: AuthIn):
    try:
        user_info = db.register_user(req.email, req.password, req.fullName)
        return JSONResponse({
            'success': True,
            'user': user_info
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
            'user': user_info
        })
    except ValueError as e:
        return JSONResponse({'error': str(e)}, status_code=401)
    except Exception as e:
        return JSONResponse({'error': f'Lỗi hệ thống: {str(e)}'}, status_code=500)


# ═══════════════════════════════════════════════════════════════════
# SESSION & HISTORY API — Isolated by User ID
# ═══════════════════════════════════════════════════════════════════

@app.get('/api/sessions')
async def get_sessions(
    userId: Optional[str] = None,
    search: Optional[str] = None,
    tag: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
):
    result = db.get_user_sessions(user_id=userId, search=search, tag=tag, page=page, limit=limit)
    return JSONResponse(result)


@app.post('/api/sessions')
async def create_session(req: SessionCreate):
    new_session = db.create_session(
        user_id=req.userId,
        title=req.title or "Hội thoại tư vấn mới",
        category_tag=req.categoryTag or "Tư vấn Hải quan"
    )
    return JSONResponse({'session': new_session})


@app.get('/api/sessions/{session_id}')
async def get_session(session_id: str, userId: Optional[str] = None):
    session = db.get_session_detail(session_id, user_id=userId)
    if not session:
        return JSONResponse({'error': 'Không tìm thấy phiên hội thoại hoặc không có quyền truy cập.'}, status_code=404)
    return JSONResponse({'session': session})


@app.delete('/api/sessions/{session_id}')
async def delete_session(session_id: str, userId: Optional[str] = None):
    success = db.delete_session(session_id, user_id=userId)
    if not success:
        return JSONResponse({'error': 'Không tìm thấy phiên hội thoại hoặc không có quyền truy cập.'}, status_code=404)
    return JSONResponse({'success': True, 'message': 'Đã xóa phiên hội thoại thành công.'})


# ═══════════════════════════════════════════════════════════════════
# FILE UPLOAD API — Attached to Session/User
# ═══════════════════════════════════════════════════════════════════

@app.post('/api/upload')
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    sessionId: Optional[str] = None,
    userId: Optional[str] = None
):
    ext = Path(file.filename).suffix
    unique_name = f'{uuid.uuid4().hex[:12]}{ext}'
    file_path = UPLOADS_DIR / unique_name

    with open(file_path, 'wb') as buffer:
        content = await file.read()
        buffer.write(content)

    file_size = len(content)
    size_str = f'{file_size / 1024:.1f} KB' if file_size < 1024 * 1024 else f'{file_size / (1024 * 1024):.1f} MB'

    ext_lower = ext.lower()
    file_type = 'pdf' if ext_lower == '.pdf' else \
                'doc' if ext_lower in ['.doc', '.docx'] else \
                'excel' if ext_lower in ['.xls', '.xlsx'] else \
                'image' if ext_lower in ['.jpg', '.jpeg', '.png', '.gif', '.webp'] else 'pdf'

    file_url = f'/uploads/{unique_name}'

    # Save to SQLite
    attachment = db.save_attachment(sessionId, userId, file.filename, size_str, file_type, file_url)

    return JSONResponse({
        'success': True,
        'file': attachment
    })


# ═══════════════════════════════════════════════════════════════════
# SETTINGS API — User Isolated Settings
# ═══════════════════════════════════════════════════════════════════

@app.get('/api/settings')
async def get_settings(userId: Optional[str] = 'default_user'):
    settings = db.get_user_settings(userId or 'default_user')
    return JSONResponse(settings)


@app.put('/api/settings')
async def update_settings(req: SettingsIn):
    user_id = req.userId or 'default_user'
    updated = db.update_user_settings(
        user_id,
        auto_cite=req.autoCite if req.autoCite is not None else True,
        law_database=req.lawDatabase or '2023-2024',
        font_size=req.fontSize or 'medium'
    )
    return JSONResponse({'success': True, 'settings': updated})


# ═══════════════════════════════════════════════════════════════════
# PDF EXPORT API
# ═══════════════════════════════════════════════════════════════════

@app.post('/api/export/pdf')
async def export_pdf(req: PdfExportIn):
    try:
        from fpdf import FPDF
    except ImportError:
        return _export_pdf_html_fallback(req)

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font('Helvetica', '', 14)

    # Header
    pdf.cell(0, 10, 'CONG HOA XA HOI CHU NGHIA VIET NAM', 0, 1, 'C')
    pdf.set_font_size(10)
    pdf.cell(0, 8, 'Doc lap - Tu do - Hanh phuc', 0, 1, 'C')
    pdf.ln(5)

    # Title
    pdf.set_font_size(13)
    title = req.title or 'Ban tom tat phap ly Hai quan & Thue suat nhap khau'
    pdf.cell(0, 10, title, 0, 1, 'C')
    pdf.ln(3)

    # Date
    pdf.set_font_size(9)
    pdf.cell(0, 6, f'Ngay trich xuat: {datetime.now().strftime("%d/%m/%Y")} | He thong LogiChat AI', 0, 1, 'L')
    pdf.ln(3)

    # Content
    pdf.set_font_size(10)
    content = req.content or 'Noi dung tom tat phap ly se duoc hien thi tai day.'
    safe_content = content.encode('latin-1', 'replace').decode('latin-1')
    pdf.multi_cell(0, 6, safe_content)

    # Citations
    if req.citations:
        pdf.ln(5)
        pdf.set_font_size(11)
        pdf.cell(0, 8, 'Van ban phap luat tham chieu:', 0, 1, 'L')
        pdf.set_font_size(9)
        for i, cite in enumerate(req.citations, 1):
            cite_text = f'{i}. {cite.get("code", "")} - {cite.get("title", "")}'
            safe_cite = cite_text.encode('latin-1', 'replace').decode('latin-1')
            pdf.cell(0, 6, safe_cite, 0, 1, 'L')

    pdf.ln(10)
    pdf.set_font_size(8)
    pdf.cell(0, 5, '* Van ban tom tat nay co gia tri tham khao tu van theo du lieu phap luat hien hanh.', 0, 1, 'L')

    pdf_bytes = pdf.output()

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type='application/pdf',
        headers={
            'Content-Disposition': f'attachment; filename="logichat_summary_{datetime.now().strftime("%Y%m%d_%H%M")}.pdf"'
        }
    )


def _export_pdf_html_fallback(req: PdfExportIn):
    content = req.content or 'Nội dung tóm tắt pháp lý sẽ được hiển thị tại đây.'
    citations_html = ''
    if req.citations:
        citations_html = '<h3>📋 Văn bản pháp luật tham chiếu:</h3><ul>'
        for cite in req.citations:
            citations_html += f'<li><strong>{cite.get("code", "")}</strong> — {cite.get("title", "")}</li>'
        citations_html += '</ul>'

    html = f"""<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>{req.title}</title>
<style>
body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }}
h1 {{ text-align: center; color: #00236f; }}
h2 {{ text-align: center; font-size: 14px; color: #444; }}
.content {{ line-height: 1.8; white-space: pre-wrap; }}
.footer {{ margin-top: 40px; font-size: 12px; color: #888; font-style: italic; }}
</style></head>
<body>
<h1>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h1>
<h2>Độc lập - Tự do - Hạnh phúc</h2>
<hr>
<h2>{req.title}</h2>
<p><em>Ngày trích xuất: {datetime.now().strftime('%d/%m/%Y')} | Hệ thống LogiChat AI</em></p>
<div class="content">{content}</div>
{citations_html}
<div class="footer">* Văn bản tóm tắt này có giá trị tham khảo tư vấn theo dữ liệu pháp luật hiện hành.</div>
</body></html>"""

    return HTMLResponse(html)


# ═══════════════════════════════════════════════════════════════════
# CITATION DETAIL API
# ═══════════════════════════════════════════════════════════════════

@app.get('/api/citations/{code:path}')
async def get_citation_detail(code: str):
    if not retriever:
        return JSONResponse({'error': 'Retriever chưa sẵn sàng.'}, status_code=503)

    parents, children = retriever.retrieve_parents(code, top_k=3)

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
        }
    })


# ─── Admin API Endpoints ──────────────────────────────────────────

@app.get('/api/admin/users')
async def admin_get_users():
    try:
        users = db.get_all_users()
        return {"success": True, "users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/api/admin/users')
async def admin_create_user(req: AdminUserCreateReq):
    try:
        user = db.register_user(req.email, req.password, req.fullName)
        return {"success": True, "user": user}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put('/api/admin/users/{user_id}')
async def admin_update_user(user_id: str, req: AdminUserUpdateReq):
    try:
        success = db.update_user(user_id, req.email, req.fullName, req.password)
        if success:
            return {"success": True}
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete('/api/admin/users/{user_id}')
async def admin_delete_user(user_id: str):
    try:
        success = db.delete_user(user_id)
        if success:
            return {"success": True}
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/api/admin/chunks')
async def admin_get_chunks():
    try:
        chunks = db.get_all_chunks()
        return {"success": True, "chunks": chunks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put('/api/admin/chunks/{parent_id}')
async def admin_update_chunk(parent_id: str, req: AdminChunkUpdateReq):
    try:
        # 1. Update in SQLite
        success = db.update_chunk(parent_id, req.text, req.chapter, req.article_ids)
        if not success:
            raise HTTPException(status_code=404, detail="Chunk not found in database")
            
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

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    if path.startswith(('api/', 'assets/', 'frontend/', 'uploads/')):
        return JSONResponse({'error': 'Not Found'}, status_code=404)
    index_file = Path.cwd() / 'frontend' / 'dist' / 'index.html'
    if not index_file.exists():
        index_file = Path.cwd() / 'frontend' / 'index.html'
    if index_file.exists():
        return FileResponse(index_file)
    return HTMLResponse('<h3>Not found</h3>', status_code=404)


if __name__ == '__main__':
    uvicorn.run('serve:app', host='127.0.0.1', port=8000, reload=False)
