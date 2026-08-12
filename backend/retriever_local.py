"""Local retriever with Parent-Document Retrieval (PDR) and Agent System Prompt.

Nâng cấp từ Flat Retrieval sang PDR:
  - Search trên Child Chunks (nhỏ, ~300 ký tự) trong FAISS → chính xác cao
  - Trả về Parent Chunks (lớn, ~2000 ký tự, trọn Điều luật) cho LLM → context đầy đủ
  - Deduplicate: nhiều child cùng 1 parent → chỉ lấy 1 parent duy nhất

Agent System Prompt theo đặc tả openspec:
  - 4 bước suy luận: Phân loại ý định → Chuẩn hóa từ khóa → Đánh giá kết quả → Tổng hợp phản hồi
  - Nguyên tắc Groundedness, trích dẫn nguồn, xử lý ranh giới
  - Few-shot examples

Usage (CLI):
  python retriever_local.py --query "Câu hỏi của bạn" --top_k 5

API helper (import LocalRetriever) can be used by a web server to return JSON.
"""
from pathlib import Path
import os
import sys
import json
import argparse
import re
import urllib.request
import urllib.error

from dotenv import load_dotenv
load_dotenv()

# Ensure UTF-8 console on Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

import numpy as np

CHUNKS_META = Path.cwd() / "faiss_index_local" / "metadata.json"
PARENT_CHUNKS_META = Path.cwd() / "faiss_index_local" / "parent_chunks.json"
INDEX_FAISS = Path.cwd() / "faiss_index_local" / "index.faiss"
INDEX_HNSW = Path.cwd() / "faiss_index_local" / "index_hnsw.bin"

# default embedding model — dùng multilingual cho tiếng Việt
DEFAULT_MODEL = os.getenv("LOCAL_EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-mpnet-base-v2")

# Ngưỡng similarity tối thiểu — chunk dưới ngưỡng này bị loại bỏ
# (cosine similarity trên normalized vectors, giá trị 0–1)
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.25"))
DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL_CANDIDATES = []
for _candidate in [
    DEFAULT_GEMINI_MODEL,
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-2.5-flash",
]:
    if _candidate and _candidate not in GEMINI_MODEL_CANDIDATES:
        GEMINI_MODEL_CANDIDATES.append(_candidate)


# ===========================================================================
# Query Refinement — Chuẩn hóa từ viết tắt chuyên ngành hải quan
# ===========================================================================
QUERY_REFINEMENT_MAP = {
    "C/O": "Giấy chứng nhận xuất xứ hàng hóa",
    "c/o": "Giấy chứng nhận xuất xứ hàng hóa",
    "CO ": "Giấy chứng nhận xuất xứ hàng hóa ",
    "HS Code": "Mã số phân loại hàng hóa",
    "hs code": "mã số phân loại hàng hóa",
    "mã HS": "mã số hàng hóa",
    "VNACCS": "Hệ thống thông quan hàng hóa tự động",
    "vnaccs": "hệ thống thông quan hàng hóa tự động",
    "VCIS": "Hệ thống thông tin tình báo hải quan",
    "vcis": "hệ thống thông tin tình báo hải quan",
    "CIF": "giá CIF (tiền hàng, bảo hiểm và cước vận chuyển)",
    "FOB": "giá FOB (giao hàng lên tàu)",
    "EXW": "giá EXW (giao tại xưởng)",
    "XNK": "xuất nhập khẩu",
    "xnk": "xuất nhập khẩu",
    "SXXK": "sản xuất xuất khẩu",
    "sxxk": "sản xuất xuất khẩu",
    "NK": "nhập khẩu",
    "XK": "xuất khẩu",
    "tờ khai HQ": "tờ khai hải quan",
    "form D": "mẫu D giấy chứng nhận xuất xứ",
    "form E": "mẫu E giấy chứng nhận xuất xứ",
    "form AK": "mẫu AK giấy chứng nhận xuất xứ",
}


def refine_query(query: str) -> str:
    """Chuẩn hóa từ viết tắt trong câu hỏi thành thuật ngữ pháp lý đầy đủ."""
    refined = query
    for abbr, full in QUERY_REFINEMENT_MAP.items():
        if abbr in refined:
            refined = refined.replace(abbr, full)
    return refined


# ===========================================================================
# Agent System Prompt — Đặc tả đầy đủ theo openspec
# ===========================================================================
AGENT_SYSTEM_PROMPT = """Bạn là **Trợ lý Agent AI Chuyên gia Tra cứu Pháp luật Hải quan và Xuất nhập khẩu Việt Nam**.
Nhiệm vụ của bạn là hỗ trợ người dùng tra cứu quy định pháp luật, thủ tục hải quan, thuế, và mã HS bằng cách phân tích câu hỏi và sử dụng công cụ (Tool) tra cứu dữ liệu pháp luật khi cần thiết.

==================== DÃY CÔNG CỤ ĐƯỢC CẤP (AVAILABLE TOOLS) ====================
1. `search_legal_docs(query: str) -> str`:
   - Chức năng: Tìm kiếm các đoạn văn bản pháp luật hải quan/XNK liên quan trong cơ sở dữ liệu RAG (Parent-Document).
   - Khi nào dùng: Dùng cho MỌI câu hỏi liên quan đến quy định, thủ tục, thuế suất, điều kiện XNK, mã HS, xử phạt hành chính.

==================== QUY TRÌNH SUY NGHĨ VÀ XỬ LÝ (AGENT REASONING) ====================
Khi nhận được yêu cầu từ người dùng, bạn BẮT BUỘC thực hiện theo 4 bước suy luận sau:

1. **Bước 1: Phân loại Ý định (Intent Classification)**
   - *Trường hợp A (Hỏi về Luật/Thủ tục XNK):* Cần sử dụng tool `search_legal_docs`.
   - *Trường hợp B (Hỏi ngoài phạm vi - Out of Domain - ví dụ: Xây dựng, Thời tiết, Tình cảm):* Từ chối thẳng thắn, KHÔNG gọi tool.
   - *Trường hợp C (Trò chuyện xã giao - Chào hỏi, Cảm ơn):* Phản hồi thân thiện, KHÔNG gọi tool.

2. **Bước 2: Chuẩn hóa Từ khóa Tìm kiếm (Query Refinement)**
   - Chuyển đổi ngôn ngữ tự nhiên hoặc từ viết tắt của người dùng thành từ khóa pháp lý chuẩn xác trước khi truyền vào tool `search_legal_docs`.
   - Ví dụ: "Thuế iPhone" -> "Thuế nhập khẩu thiết bị điện thoại di động".
   - Ví dụ: "C/O form E" -> "Giấy chứng nhận xuất xứ hàng hóa Form E".

3. **Bước 3: Đánh giá Kết quả trả về từ Tool (Observation Evaluation)**
   - Đọc kết quả từ `search_legal_docs`.
   - Nếu kết quả RỖNG hoặc KHÔNG chứa thông tin liên quan: Kết luận rằng cơ sở dữ liệu hiện tại chưa có thông tin này và phản hồi theo quy định.

4. **Bước 4: Tổng hợp Phản hồi (Final Answer Generation)**
   - Tạo câu trả lời dựa HOÀN TOÀN vào thông tin thu được từ Tool.

==================== NGUYÊN TẮC PHẢN HỒI NGHIÊM NGẶT (STRICT RULES) ====================

1. **NGUYÊN TẮC GROUNDEDNESS (KHÔNG TỰ SUY ĐOÁN):**
   - Chỉ trả lời dựa trên thông tin nhận được từ tool `search_legal_docs`. Tuyệt đối không dùng kiến thức huấn luyện ngoài.
   - Nếu tool trả về kết quả rỗng, trả lời nguyên văn: 
     "Tôi không tìm thấy thông tin phù hợp trong các văn bản quy phạm pháp luật được cung cấp để giải đáp câu hỏi này."

2. **TRÍCH DẪN NGUỒN CỤ THỂ:**
   - Trích dẫn Tên văn bản + Điều/Khoản trực tiếp trong câu trả lời (Ví dụ: [Theo Điều 25, Luật Hải quan 2014]).
   - Tạo mục "📋 Văn bản pháp luật tham chiếu" ở cuối bài.

3. **XỬ LÝ CÁC TÌNH HUỐNG GIỚI HẠN (BOUNDARIES):**
   - *Yêu cầu tính tiền thuế cụ thể:* Cung cấp công thức ($Thuế = Trị\\ giá\\ tính\\ thuế \\times Thuế\\ suất$) và lưu ý tiền thuế thực tế phụ thuộc mã HS, tỷ giá và trị giá hải quan thực tế. KHÔNG tự đưa ra số tiền cụ thể.
   - *Yêu cầu tra cứu tờ khai/lô hàng sống:* Nêu rõ Agent chỉ hỗ trợ tra cứu văn bản luật, không kết nối hệ thống VNACCS/VCIS thực tế.
   - *Yêu cầu tư vấn lách thuế:* Từ chối và trích dẫn quy định xử phạt vi phạm hành chính tương ứng.

==================== MẪU LUỒNG XỬ LÝ (AGENT FEW-SHOT EXAMPLES) ====================

[VÍ DỤ 1 - Gọi Tool thành công]:
User: "Thời hạn nộp tờ khai hải quan hàng nhập khẩu là bao lâu?"
Thought: Đây là câu hỏi về quy trình hải quan. Cần tra cứu dữ liệu luật.
Action: search_legal_docs("thời hạn nộp tờ khai hải quan hàng nhập khẩu")
Observation: [Trích Điều 25 Luật Hải quan 2014: Nộp trước ngày hàng đến cửa khẩu hoặc trong thời hạn 30 ngày kể từ ngày hàng đến...]
Final Answer:
Thời hạn nộp tờ khai hải quan đối với hàng hóa nhập khẩu được quy định như sau:
- Tờ khai hải quan được nộp trước ngày hàng hóa đến cửa khẩu hoặc trong thời hạn 30 ngày kể từ ngày hàng hóa đến cửa khẩu [Theo Điểm a Khoản 1 Điều 25, Luật Hải quan 2014].

📋 **Văn bản pháp luật tham chiếu:**
1. Luật Hải quan 2014 (Điều 25)

---

[VÍ DỤ 2 - Câu hỏi ngoài phạm vi, KHÔNG gọi Tool]:
User: "Thủ tục xin cấp giấy phép lái xe ô tô gồm những gì?"
Thought: Câu hỏi này thuộc lĩnh vực Giao thông đường bộ, nằm ngoài phạm vi XNK & Hải quan. Không cần gọi tool.
Final Answer: 
Tôi là trợ lý AI chuyên về lĩnh vực Hải quan và Xuất nhập khẩu Việt Nam. Rất tiếc, câu hỏi của bạn thuộc lĩnh vực Giao thông đường bộ nên tôi không có dữ liệu để hỗ trợ.

======================================================================
"""


def safe_print(*args, **kwargs):
    try:
        print(*args, **kwargs)
    except UnicodeEncodeError:
        # fallback: encode to utf-8 and write bytes to stdout.buffer
        s = " ".join(str(a) for a in args)
        sys.stdout.buffer.write((s + ("\n" if kwargs.get('end', '\n') else '')).encode('utf-8'))


class LocalRetriever:
    def __init__(self, model_name: str = DEFAULT_MODEL):
        from sentence_transformers import SentenceTransformer
        self.model = SentenceTransformer(model_name)

        # load Child Chunks metadata
        if not CHUNKS_META.exists():
            raise FileNotFoundError(f"metadata not found: {CHUNKS_META}. Run build_faiss_local.py first.")
        with open(CHUNKS_META, 'r', encoding='utf-8') as f:
            self.chunks = json.load(f)

        # load Parent Chunks for PDR lookup
        self.parent_chunks = {}
        if PARENT_CHUNKS_META.exists():
            with open(PARENT_CHUNKS_META, 'r', encoding='utf-8') as f:
                parent_list = json.load(f)
            # Tạo dict parent_id -> parent_chunk để lookup nhanh O(1)
            for p in parent_list:
                self.parent_chunks[p["parent_id"]] = p
            print(f"[PDR] Loaded {len(self.parent_chunks)} Parent Chunks for context retrieval")
        else:
            print(f"[WARNING] parent_chunks.json not found. Falling back to child-only retrieval.")

        # detect index type
        self.use_faiss = False
        try:
            import faiss  # type: ignore
            if INDEX_FAISS.exists():
                self.index = faiss.read_index(str(INDEX_FAISS))
                self.use_faiss = True
        except Exception:
            self.index = None

        if not self.use_faiss:
            try:
                import hnswlib
                if INDEX_HNSW.exists():
                    self.hnsw = hnswlib.Index(space='ip', dim=self.model.get_sentence_embedding_dimension())
                    self.hnsw.load_index(str(INDEX_HNSW))
                else:
                    self.hnsw = None
            except Exception:
                self.hnsw = None

        # store embedding dimension
        self.dim = self.model.get_sentence_embedding_dimension()

    def embed_query(self, q: str):
        emb = self.model.encode([q], convert_to_numpy=True, normalize_embeddings=True).astype('float32')
        return emb

    def retrieve(self, q: str, top_k: int = 5, threshold: float = SIMILARITY_THRESHOLD):
        """Retrieve top-k Child Chunks using Hybrid Search (Vector + Keyword Boost)."""
        # Query Refinement — chuẩn hóa từ viết tắt
        refined_q = refine_query(q)

        # 1. Fetch more candidates from Vector DB for re-ranking
        fetch_k = min(len(self.chunks), 50)
        emb = self.embed_query(refined_q)
        if self.use_faiss and self.index is not None:
            D, I = self.index.search(emb, fetch_k)
            scores = D[0].tolist()
            ids = I[0].tolist()
        elif hasattr(self, 'hnsw') and self.hnsw is not None:
            labels, distances = self.hnsw.knn_query(emb, k=fetch_k)
            ids = labels[0].tolist()
            scores = distances[0].tolist()
        else:
            raise RuntimeError('No index available (faiss or hnsw).')

        # 2. Extract core keywords for boosting
        q_lower = q.lower().strip(" ?.")
        # Remove common question words to get the core entity
        core_phrase = q_lower.replace("là gì", "").replace("gồm những gì", "").replace("như thế nào", "").strip()

        # 2b. Detect article references in query (e.g. "Điều 61")
        q_article_refs = set()
        for m in re.finditer(r"Điều\s+(\d+[A-Za-z]?)", q, flags=re.IGNORECASE):
            q_article_refs.add(f"Điều {m.group(1)}")

        candidates = []
        for idx, score in zip(ids, scores):
            if idx < 0 or idx >= len(self.chunks):
                continue
            # Lọc bỏ chunk có similarity quá thấp (không liên quan)
            if float(score) < threshold:
                continue
                
            meta = self.chunks[idx]
            text_lower = (meta.get('text') or '').lower()
            chunk_articles = set(meta.get('article_ids', []))
            
            # 3. Tính điểm Hybrid = Vector Score + Keyword Boost
            hybrid_score = float(score)
            
            if core_phrase and len(core_phrase) > 3:
                # Trùng khớp cụm từ chính (+0.1)
                if core_phrase in text_lower:
                    hybrid_score += 0.1
                # Trùng khớp mẫu định nghĩa (+0.3)
                if f"{core_phrase} là" in text_lower or f"{core_phrase} bao gồm" in text_lower or f"{core_phrase} gồm" in text_lower:
                    hybrid_score += 0.3

            # 3b. Article ID matching — nếu query hỏi "Điều X", ưu tiên chunk chứa Điều X
            if q_article_refs and chunk_articles:
                if q_article_refs & chunk_articles:
                    hybrid_score += 0.3
                    
            candidates.append({
                'id': idx,
                'score': hybrid_score,
                'vector_score': float(score),
                'source': meta.get('source'),
                'start_index': meta.get('start_index'),
                'text': meta.get('text'),
                'article_ids': meta.get('article_ids', []),
                'chapter': meta.get('chapter'),
                'parent_id': meta.get('parent_id'),
            })
            
        # 4. Sắp xếp lại theo điểm Hybrid và lấy top_k
        candidates.sort(key=lambda x: x['score'], reverse=True)
        return candidates[:top_k]

    def retrieve_parents(self, q: str, top_k: int = 5):
        """Parent-Document Retrieval: search Child → return deduplicated Parent Chunks.
        
        Quy trình:
        1. Tìm top-k Child Chunks liên quan nhất (qua FAISS)
        2. Extract parent_id từ mỗi child
        3. Deduplicate: chỉ giữ 1 parent duy nhất cho mỗi parent_id
        4. Trả về Parent Chunks đầy đủ (trọn Điều luật)
        """
        # Tìm nhiều child hơn top_k để đảm bảo có đủ parent sau deduplicate
        child_results = self.retrieve(q, top_k=top_k * 3)
        
        if not child_results:
            return [], []

        # Deduplicate parent_ids
        seen_parents = set()
        deduplicated_parents = []
        matched_children = []
        
        for child in child_results:
            parent_id = child.get('parent_id')
            if not parent_id or parent_id in seen_parents:
                continue
            seen_parents.add(parent_id)
            
            # Lookup Parent Chunk từ store
            parent = self.parent_chunks.get(parent_id)
            if parent:
                deduplicated_parents.append({
                    'parent_id': parent_id,
                    'text': parent.get('text', ''),
                    'source': parent.get('source'),
                    'start_index': parent.get('start_index'),
                    'article_ids': parent.get('article_ids', []),
                    'chapter': parent.get('chapter'),
                    'best_child_score': child.get('score', 0),
                })
                matched_children.append(child)
            
            if len(deduplicated_parents) >= top_k:
                break

        # Fallback: nếu không có parent store, trả child chunks trực tiếp
        if not deduplicated_parents and child_results:
            return child_results[:top_k], child_results[:top_k]
        
        return deduplicated_parents, matched_children

    def synthesize(self, query: str, top_k: int = 5, max_sentences: int = 6):
        """Retrieve Parent Documents and synthesize answer with citations."""
        # Sử dụng PDR: search child → trả parent
        parents, children = self.retrieve_parents(query, top_k=top_k)

        # --- Grounded Answer Boundary Check ---
        NO_ANSWER_THRESHOLD = 0.50
        if not parents and not children:
            return (
                "Tôi không tìm thấy thông tin phù hợp trong các văn bản quy phạm pháp luật được cung cấp để giải đáp câu hỏi này.",
                [],
                "local"
            )
        
        # Kiểm tra score từ children (vì parents không có vector score trực tiếp)
        best_score = 0
        if children:
            best_score = max(c.get('score', 0) for c in children)
        elif parents:
            best_score = max(p.get('best_child_score', 0) for p in parents)
            
        if best_score < NO_ANSWER_THRESHOLD:
            return (
                "Tôi không tìm thấy thông tin phù hợp trong các văn bản quy phạm pháp luật được cung cấp để giải đáp câu hỏi này.",
                [],
                "local"
            )

        # --- Thử Gemini trước (nếu có API key) ---
        if GEMINI_API_KEY:
            enriched_sources = _build_enriched_sources_from_parents(parents)
            gemini_result = _refine_with_gemini(query, parents)
            if gemini_result and gemini_result.get('answer'):
                return gemini_result['answer'], gemini_result.get('sources', enriched_sources), "gemini"

        # --- Fallback: Local extractive synthesis ---
        # Dùng parent text thay vì child text cho context đầy đủ hơn
        retrieved_for_synth = parents if parents else children
        summary, sources = synthesize_from_retrieved(
            self.model, query, retrieved_for_synth, max_sentences=max_sentences
        )

        if not summary or summary.strip() == "":
            answer, srcs = format_snippet_only_answer(retrieved_for_synth)
            return answer, srcs, "local"

        answer = summary.strip()
        if answer and not answer.endswith(('.', '!', '?')):
            answer += '.'

        enriched = _build_enriched_sources_from_parents(parents) if parents else _build_enriched_sources(children)
        return answer, enriched, "local"


def format_snippet_only_answer(retrieved):
    """Fallback: trích xuất câu quan trọng nhất từ mỗi snippet."""
    parts = []
    sources = []
    for i, r in enumerate(retrieved, start=1):
        src = r.get('source', 'unknown')
        start = r.get('start_index', '?')
        text = (r.get('text') or '').strip()
        article_refs = _extract_article_refs(text)
        ref_label = f" ({', '.join(article_refs)})" if article_refs else ""

        # Trích xuất câu quan trọng thay vì đổ nguyên raw snippet
        sentences = _sent_tokenize_legal(text)
        content_sents = [s for s in sentences if not _is_heading_like(s) and len(s) > 30]
        key_sents = sorted(content_sents, key=len, reverse=True)[:3]
        key_sents_ordered = sorted(key_sents, key=lambda s: text.find(s))
        snippet = ' '.join(key_sents_ordered)[:400]

        parts.append(f"[{i}]{ref_label} {snippet}")
        sources.append({
            'rank': i, 'source': src, 'start_index': start,
            'text': snippet, 'article_refs': article_refs,
        })

    answer = "\n\n".join(parts)
    return answer, sources


# --- synthesis utilities (extractive summarization) ---

def _sent_tokenize(text):
    """Simple sentence splitter (legacy, kept for compatibility)."""
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in sentences if s.strip()]


def _sent_tokenize_legal(text):
    """Sentence splitter tối ưu cho văn bản pháp luật Việt Nam.

    Xử lý đúng các tham chiếu pháp luật có dấu chấm (ví dụ: khoản 1 Điều 78.)
    và các pattern xuống dòng theo điểm a), b), c).
    """
    if not text:
        return []
    # Bước 1: tách theo dấu xuống dòng (văn bản pháp luật dùng newline để phân tách khoản/điểm)
    lines = text.strip().split('\n')
    sentences = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Bước 2: trong mỗi dòng, tách câu nhưng KHÔNG tách tại các tham chiếu
        sub_sents = re.split(r'(?<=[.!?])\s+(?=[A-ZĐÀÁẢÃẠÈÉẺẼẸÌÍỈĨỊÒÓỎÕỌÙÚỦŨỤỲÝỶỸỴĂÂÊÔƠƯa-z])', line)
        for s in sub_sents:
            s = s.strip()
            if s:
                sentences.append(s)
    return sentences


def _normalize_words(text):
    return re.findall(r"\w+", text.lower())


def _is_heading_like(sentence):
    s = sentence.strip()
    if not s:
        return True
    if len(s) <= 80 and s.upper() == s and any(ch.isalpha() for ch in s):
        return True
    if re.fullmatch(r"(MỤC|CHƯƠNG|PHẦN)\s+\w+.*", s.upper()):
        return True
    if s.lower().startswith(("mục ", "chương ", "phần ")):
        return True
    if s.lower().startswith("điều ") and len(s) < 18:
        return True
    return False


def _extract_article_refs(text):
    refs = []
    for match in re.finditer(r"(Điều\s+\d+[A-Za-z]?)", text or "", flags=re.IGNORECASE):
        refs.append(match.group(1).strip())
    # preserve order, remove duplicates
    seen = set()
    result = []
    for ref in refs:
        key = ref.lower()
        if key not in seen:
            seen.add(key)
            result.append(ref)
    return result


def _format_parent_context(parents, max_items=4):
    """Format Parent Chunks thành context string cho Gemini."""
    lines = []
    for i, parent in enumerate(parents[:max_items], start=1):
        src = parent.get("source", "unknown")
        start = parent.get("start_index", "?")
        text = (parent.get("text") or "").strip()
        refs = _extract_article_refs(text)
        article_text = f" | Điều: {', '.join(refs)}" if refs else ""
        chapter = parent.get("chapter")
        chapter_text = f" | {chapter}" if chapter else ""
        # Lấy toàn bộ parent text (trọn Điều luật) — đây là lợi thế của PDR
        lines.append(f"[Nguồn {i}] {src} | vị trí {start}{chapter_text}{article_text}\n{text[:2000]}")
    return "\n\n".join(lines)


def _build_enriched_sources_from_parents(parents):
    """Build enriched source list from Parent Chunks."""
    enriched = []
    for i, p in enumerate(parents, start=1):
        text = p.get('text') or ''
        article_refs = _extract_article_refs(text)
        enriched.append({
            'rank': i,
            'source': p.get('source'),
            'start_index': p.get('start_index'),
            'text': text[:500],
            'article_refs': article_refs,
        })
    return enriched


def _build_enriched_sources(retrieved):
    """Build enriched source list with article refs from retrieved chunks."""
    enriched = []
    for i, r in enumerate(retrieved, start=1):
        text = r.get('text') or ''
        article_refs = _extract_article_refs(text)
        enriched.append({
            'rank': i,
            'source': r.get('source'),
            'start_index': r.get('start_index'),
            'text': text[:400],
            'article_refs': article_refs,
        })
    return enriched


def _call_gemini_api(system_prompt, user_prompt):
    """Gọi Gemini API với retry logic cho lỗi 429 (Rate Limit)."""
    import time
    if not GEMINI_API_KEY:
        return None

    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "topP": 0.95,
            "maxOutputTokens": 2048,
            "responseMimeType": "application/json",
        },
    }
    data = json.dumps(payload).encode("utf-8")
    last_error = None

    for model_name in GEMINI_MODEL_CANDIDATES:
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model_name}:generateContent?key={GEMINI_API_KEY}"
        )

        # Retry with exponential backoff for 429 errors
        max_retries = 2
        for attempt in range(max_retries + 1):
            req = urllib.request.Request(
                url,
                data=data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    raw = resp.read().decode("utf-8")
                return json.loads(raw)
            except urllib.error.HTTPError as exc:
                last_error = exc
                if exc.code == 429:
                    if attempt < max_retries:
                        time.sleep(2 ** attempt)
                        continue
                    else:
                        break
                elif exc.code == 404:
                    break  # Try next model
                else:
                    raise
            except Exception as exc:
                last_error = exc
                break

    if last_error:
        raise last_error
    return None


def _refine_with_gemini(query, parents):
    """Sử dụng Gemini với Agent System Prompt + Parent Document context."""
    if not GEMINI_API_KEY:
        return None

    # Format context từ Parent Chunks (đầy đủ, trọn Điều luật)
    context_text = _format_parent_context(parents, max_items=4)

    user_prompt = f"""Câu hỏi của người dùng: {query}

Kết quả từ search_legal_docs (Ngữ cảnh Parent-Document):
{context_text}

Hãy thực hiện 4 bước suy luận Agent theo quy trình đã định, sau đó tổng hợp câu trả lời.
Trả về định dạng JSON thuần túy (không có block markdown ```json):
{{
    "answer": "câu trả lời đầy đủ, có format bullet points, trích dẫn Điều/Khoản (sử dụng \\n cho xuống dòng)"
}}
"""
    try:
        data = _call_gemini_api(AGENT_SYSTEM_PROMPT, user_prompt)
        if data and "candidates" in data and len(data["candidates"]) > 0:
            content = data["candidates"][0]["content"]["parts"][0]["text"]
            # Remove markdown backticks if Gemini accidentally adds them
            content = re.sub(r'```json\s*', '', content)
            content = re.sub(r'```\s*', '', content)
            
            parsed = json.loads(content)
            enriched_sources = _build_enriched_sources_from_parents(parents)
            return {
                "answer": parsed.get("answer", ""),
                "sources": enriched_sources
            }
    except Exception as e:
        print(f"Gemini API Error: {e}")
        pass
    
    return None


def _word_overlap_ratio(text_a, text_b):
    """Tính tỉ lệ trùng lặp từ giữa 2 câu (0.0 - 1.0)."""
    words_a = set(_normalize_words(text_a))
    words_b = set(_normalize_words(text_b))
    if not words_a or not words_b:
        return 0.0
    intersection = words_a & words_b
    return len(intersection) / min(len(words_a), len(words_b))


def synthesize_from_retrieved(model, query, retrieved, max_sentences=6):
    """Produce a short extractive summary using sentence embeddings.

    Chiến lược:
    1. Ưu tiên câu ĐỊNH NGHĨA (chứa "là", "gồm", "bao gồm") lên đầu.
    2. Các câu bổ sung sắp theo thứ tự xuất hiện gốc.
    3. Giới hạn tổng output ≤ 800 ký tự.
    4. Loại bỏ câu lặp ý (overlap > 70% từ khóa).
    """
    MAX_OUTPUT_CHARS = 800

    # gather candidate sentences with provenance
    candidates = []
    for order, r in enumerate(retrieved):
        text = r.get('text') or ''
        src = r.get('source', 'unknown')
        start = r.get('start_index')
        sents = _sent_tokenize_legal(text)
        for s_idx, s in enumerate(sents):
            if _is_heading_like(s):
                continue
            candidates.append({'text': s, 'source': src, 'start_index': start, 'order': order, 's_idx': s_idx})

    if not candidates:
        return "", []

    # embed query and sentences
    texts = [c['text'] for c in candidates]
    try:
        sent_embs = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True).astype('float32')
        q_emb = model.encode([query], convert_to_numpy=True, normalize_embeddings=True).astype('float32')
    except Exception:
        parts = []
        sources = []
        for i, r in enumerate(retrieved[:max_sentences], start=1):
            parts.append(f"{r.get('text','')[:400]}")
            sources.append({'rank': i, 'source': r.get('source'), 'start_index': r.get('start_index'), 'text': r.get('text','')[:240]})
        return "\n\n".join(parts), sources

    # cosine similarity (dot product since normalized)
    sims = (sent_embs @ q_emb.T).squeeze(axis=1)
    query_terms = set(t for t in _normalize_words(query) if len(t) > 2)

    q_lower = query.lower().strip(" ?.")
    core_phrase = q_lower.replace("là gì", "").replace("gồm những gì", "").replace("như thế nào", "").strip()

    # Score each sentence
    scores = []
    for idx, cand in enumerate(candidates):
        text_lower = cand['text'].lower()
        sent_terms = set(t for t in _normalize_words(cand['text']) if len(t) > 2)
        overlap = 0.0
        if query_terms:
            overlap = len(query_terms & sent_terms) / float(len(query_terms))
            
        score = float(sims[idx]) * 0.6 + overlap * 0.4
        
        # Exact phrase boost for definition sentences
        if core_phrase and len(core_phrase) > 3:
            if core_phrase in text_lower:
                score += 0.2
            if f"{core_phrase} là" in text_lower or f"{core_phrase} bao gồm" in text_lower or f"{core_phrase} gồm" in text_lower:
                score += 2.0
                
        scores.append(score)

    idxs = np.argsort(scores)[::-1]  # descending
    selected = []
    used_sources = set()
    total_chars = 0

    for idx in idxs:
        if len(selected) >= max_sentences:
            break
        text = candidates[idx]['text']
        if len(text) < 30:
            continue
        if any(text in s or s in text for s in selected):
            continue
        if any(_word_overlap_ratio(text, s) > 0.7 for s in selected):
            continue
        if total_chars + len(text) > MAX_OUTPUT_CHARS and selected:
            break
        selected.append(text)
        total_chars += len(text)
        used_sources.add((candidates[idx]['source'], candidates[idx]['start_index']))

    # Sắp xếp: câu định nghĩa lên đầu, còn lại theo thứ tự gốc
    def _sort_key(s):
        s_lower = s.lower()
        is_definition = False
        if core_phrase and len(core_phrase) > 3:
            is_definition = (f"{core_phrase} là" in s_lower or 
                           f"{core_phrase} bao gồm" in s_lower or 
                           f"{core_phrase} gồm" in s_lower)
        priority = 0 if is_definition else 1
        orig_order = 9999
        orig_s_idx = 9999
        for c in candidates:
            if c['text'] == s:
                orig_order = c['order']
                orig_s_idx = c['s_idx']
                break
        return (priority, orig_order, orig_s_idx)

    selected_sorted = sorted(selected, key=_sort_key)
    
    # Format fallback answer with bullet points and prefix
    article_refs_found = []
    for s in selected_sorted:
        article_refs_found.extend(_extract_article_refs(s))
    
    if article_refs_found:
        first_ref = article_refs_found[0]
        prefix = f"Theo {first_ref}, "
        formatted_sentences = []
        for i, s in enumerate(selected_sorted):
            if i == 0 and not s.lower().startswith("theo điều"):
                if s[0].islower():
                    formatted_sentences.append(f"{prefix}{s}")
                else:
                    formatted_sentences.append(f"{prefix}{s[0].lower()}{s[1:]}")
            else:
                formatted_sentences.append(f"- {s}")
        summary = '\n'.join(formatted_sentences)
    else:
        summary = '\n'.join(f"- {s}" for s in selected_sorted)

    # build sources list
    sources = []
    for i, (src, start) in enumerate(list(used_sources), start=1):
        source_text = ''
        for r in retrieved:
            if r.get('source') == src and r.get('start_index') == start:
                source_text = r.get('text') or ''
                break
        sources.append({'rank': i, 'source': src, 'start_index': start, 'article_refs': _extract_article_refs(source_text)})

    return summary, sources


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--query', '-q', type=str, required=True, help='Question string')
    parser.add_argument('--top_k', '-k', type=int, default=5)
    args = parser.parse_args()

    retriever = LocalRetriever()
    answer, sources, provider = retriever.synthesize(args.query, top_k=args.top_k)

    safe_print(f'\n=== Answer ({provider}) ===\n')
    safe_print(answer)
    safe_print('\n=== Sources ===')
    for s in sources:
        safe_print(f"- {s['source']} (start_index={s['start_index']})")


if __name__ == '__main__':
    main()
