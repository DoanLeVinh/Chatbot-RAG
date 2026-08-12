"""Chunking pipeline Parent-Child cho văn bản pháp luật hải quan / XNK.

Đọc PDF từ ./papers, chia nhỏ theo 2 tầng (Two-Tier):
  - Parent Chunks (~2000 ký tự): chứa trọn vẹn 1 Điều luật, dùng làm context cho LLM
  - Child Chunks (~300 ký tự): chứa Khoản/Điểm cụ thể, dùng để embed vào FAISS cho vector search

Mỗi Child chunk có parent_id trỏ về Parent chunk tương ứng.
Output:
  - ./out/chunks.json       (Child Chunks — dùng cho FAISS embedding)
  - ./out/parent_chunks.json (Parent Chunks — dùng cho LLM context)

Usage:
    python Chatbot.py
"""

from langchain_community.document_loaders import DirectoryLoader, UnstructuredFileLoader
import sys
import os
import json
import re
import uuid

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

from langchain_text_splitters import RecursiveCharacterTextSplitter
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# 1. Load PDF documents
# ---------------------------------------------------------------------------
loaders = DirectoryLoader(
    path="./papers",
    glob="**/*.pdf",
    loader_cls=UnstructuredFileLoader,
    show_progress=True,
    use_multithreading=True,
)

docs = loaders.load()

print(f"[load] Đã nạp {len(docs)} tài liệu PDF từ ./papers")

if not docs:
    print("[ERROR] Không tìm thấy file PDF nào trong ./papers. Vui lòng thêm văn bản pháp luật vào thư mục papers/ trước khi chạy lại.")
    sys.exit(1)

# ---------------------------------------------------------------------------
# 2. Cấu hình chunking từ .env (hoặc giá trị mặc định)
# ---------------------------------------------------------------------------
PARENT_CHUNK_SIZE = int(os.getenv("PARENT_CHUNK_SIZE", "2000"))
PARENT_CHUNK_OVERLAP = int(os.getenv("PARENT_CHUNK_OVERLAP", "200"))
CHILD_CHUNK_SIZE = int(os.getenv("CHILD_CHUNK_SIZE", "300"))
CHILD_CHUNK_OVERLAP = int(os.getenv("CHILD_CHUNK_OVERLAP", "50"))

# ---------------------------------------------------------------------------
# 3. Separator tối ưu cho văn bản pháp luật Việt Nam
# ---------------------------------------------------------------------------

# Parent separators: ưu tiên cắt tại ranh giới Điều > Chương > Mục > Phần
PARENT_SEPARATORS = [
    "\nĐiều ",            # Ranh giới Điều (ưu tiên cao nhất)
    "\nCHƯƠNG ",          # Ranh giới Chương
    "\nMục ",             # Ranh giới Mục
    "\nPHẦN ",            # Ranh giới Phần
    "\n\n",               # Đoạn văn (2 dòng trống)
    "\n",                 # Dòng đơn
    ". ",                 # Câu (dấu chấm + khoảng trắng)
    " ",                  # Từ
    "",                   # Ký tự (fallback cuối cùng)
]

# Child separators: cắt chi tiết hơn theo Khoản/Điểm
CHILD_SEPARATORS = [
    "\nĐiều ",            # Ranh giới Điều (nếu parent chứa nhiều Điều)
    "\n1. ",              # Khoản 1
    "\n2. ",              # Khoản 2
    "\n3. ",              # Khoản 3
    "\n4. ",              # Khoản 4
    "\n5. ",              # Khoản 5
    "\n6. ",              # Khoản 6
    "\n7. ",              # Khoản 7
    "\n8. ",              # Khoản 8
    "\n9. ",              # Khoản 9
    "\na) ",              # Điểm a
    "\nb) ",              # Điểm b
    "\nc) ",              # Điểm c
    "\nd) ",              # Điểm d
    "\nđ) ",              # Điểm đ
    "\ne) ",              # Điểm e
    "\n\n",               # Đoạn văn
    "\n",                 # Dòng đơn
    ". ",                 # Câu
    " ",                  # Từ
    "",                   # Ký tự (fallback)
]

# ---------------------------------------------------------------------------
# 4. Khởi tạo 2 tầng Splitter
# ---------------------------------------------------------------------------
parent_splitter = RecursiveCharacterTextSplitter(
    chunk_size=PARENT_CHUNK_SIZE,
    chunk_overlap=PARENT_CHUNK_OVERLAP,
    add_start_index=True,
    strip_whitespace=True,
    separators=PARENT_SEPARATORS,
)

child_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHILD_CHUNK_SIZE,
    chunk_overlap=CHILD_CHUNK_OVERLAP,
    add_start_index=True,
    strip_whitespace=True,
    separators=CHILD_SEPARATORS,
)

# ---------------------------------------------------------------------------
# 5. Hàm trích xuất metadata Điều/Khoản từ nội dung chunk
# ---------------------------------------------------------------------------
def extract_article_metadata(text: str) -> dict:
    """Trích xuất số Điều và các Khoản xuất hiện trong chunk.

    Returns:
        dict với các key:
        - article_ids: list[str] — các Điều xuất hiện (ví dụ ["Điều 1", "Điều 2"])
        - clause_ids: list[str] — các Khoản xuất hiện (ví dụ ["1", "2", "3"])
        - chapter: str|None — Chương nếu có (ví dụ "CHƯƠNG II")
    """
    # Tìm tất cả Điều
    article_matches = re.findall(r"Điều\s+(\d+[A-Za-z]?)", text or "")
    # Loại trùng, giữ thứ tự
    seen = set()
    article_ids = []
    for m in article_matches:
        key = f"Điều {m}"
        if key not in seen:
            seen.add(key)
            article_ids.append(key)

    # Tìm Khoản (pattern: số + dấu chấm ở đầu dòng hoặc sau xuống dòng)
    clause_matches = re.findall(r"(?:^|\n)\s*(\d+)\.\s", text or "")
    clause_ids = []
    seen_clauses = set()
    for c in clause_matches:
        if c not in seen_clauses:
            seen_clauses.add(c)
            clause_ids.append(c)

    # Tìm Chương
    chapter_match = re.search(r"(CHƯƠNG\s+[IVXLCDM\d]+)", text or "")
    chapter = chapter_match.group(1) if chapter_match else None

    return {
        "article_ids": article_ids,
        "clause_ids": clause_ids,
        "chapter": chapter,
    }


# ---------------------------------------------------------------------------
# 6. Chia nhỏ theo 2 tầng: Parent → Child
# ---------------------------------------------------------------------------
try:
    # Bước 1: Chia thành Parent Chunks
    parent_docs = parent_splitter.split_documents(docs)
    print(f"[parent_split] Đã chia thành {len(parent_docs)} Parent Chunks (trọn Điều luật)")

    # Bước 2: Với mỗi Parent Chunk, chia tiếp thành Child Chunks
    parent_chunks = []
    child_chunks = []

    for p_idx, parent_doc in enumerate(parent_docs):
        parent_text = getattr(parent_doc, "page_content", None) or ""
        parent_meta = getattr(parent_doc, "metadata", {}) or {}
        parent_id = str(uuid.uuid4())  # UUID duy nhất cho mỗi parent

        # Trích xuất metadata Điều/Khoản/Chương cho Parent
        legal_meta = extract_article_metadata(parent_text)

        parent_chunk = {
            "parent_id": parent_id,
            "parent_index": p_idx,
            "source": parent_meta.get("source"),
            "start_index": parent_meta.get("start_index"),
            "length": len(parent_text),
            "article_ids": legal_meta["article_ids"],
            "clause_ids": legal_meta["clause_ids"],
            "chapter": legal_meta["chapter"],
            "text": parent_text,
        }
        parent_chunks.append(parent_chunk)

        # Chia Parent thành các Child Chunks
        child_texts = child_splitter.split_text(parent_text)

        for c_idx, child_text in enumerate(child_texts):
            child_legal_meta = extract_article_metadata(child_text)
            child_chunk = {
                "chunk_id": len(child_chunks),  # global child chunk ID
                "parent_id": parent_id,         # liên kết với Parent
                "parent_index": p_idx,
                "child_index": c_idx,
                "source": parent_meta.get("source"),
                "start_index": parent_meta.get("start_index"),
                "length": len(child_text),
                "article_ids": child_legal_meta["article_ids"],
                "clause_ids": child_legal_meta["clause_ids"],
                "chapter": child_legal_meta["chapter"] or legal_meta["chapter"],
                "text": child_text,
            }
            child_chunks.append(child_chunk)

    # ---------------------------------------------------------------------------
    # 7. Lưu output
    # ---------------------------------------------------------------------------
    out_dir = os.path.join(os.getcwd(), "out")
    os.makedirs(out_dir, exist_ok=True)

    # Child chunks → dùng cho FAISS embedding
    chunks_path = os.path.join(out_dir, "chunks.json")
    with open(chunks_path, "w", encoding="utf-8") as f:
        json.dump(child_chunks, f, ensure_ascii=False, indent=2)

    # Parent chunks → dùng cho LLM context retrieval
    parent_path = os.path.join(out_dir, "parent_chunks.json")
    with open(parent_path, "w", encoding="utf-8") as f:
        json.dump(parent_chunks, f, ensure_ascii=False, indent=2)

    print(f"[split] Đã tạo {len(parent_chunks)} Parent Chunks -> {len(child_chunks)} Child Chunks")
    print(f"[save] Child chunks  -> {chunks_path}")
    print(f"[save] Parent chunks -> {parent_path}")

    # Thống kê nhanh
    total_parent_with_article = sum(1 for s in parent_chunks if s["article_ids"])
    total_child_with_article = sum(1 for s in child_chunks if s["article_ids"])
    avg_parent_len = sum(s["length"] for s in parent_chunks) / len(parent_chunks) if parent_chunks else 0
    avg_child_len = sum(s["length"] for s in child_chunks) / len(child_chunks) if child_chunks else 0

    print(f"[stats] Parent: {total_parent_with_article}/{len(parent_chunks)} có metadata Điều luật, avg length={avg_parent_len:.0f}")
    print(f"[stats] Child:  {total_child_with_article}/{len(child_chunks)} có metadata Điều luật, avg length={avg_child_len:.0f}")

    # Print mẫu 3 child chunks đầu tiên
    print("\n--- Mẫu 3 Child Chunks đầu tiên ---")
    for s in child_chunks[:3]:
        print(
            f"  chunk_id={s['chunk_id']} parent_id={s['parent_id'][:8]}... "
            f"source={s['source']} length={s['length']} "
            f"articles={s['article_ids']} chapter={s['chapter']}"
        )
        print(f"  text (100 chars): {s['text'][:100]}...")
        print()

except Exception as e:
    import traceback
    tb = traceback.format_exc()
    # Save full traceback to a UTF-8 file for inspection
    error_log = os.path.join(os.getcwd(), "chunking_error_log.txt")
    with open(error_log, "w", encoding="utf-8") as f:
        f.write(tb)
    print(f"[ERROR] Lỗi khi chia chunk. Xem chi tiết tại: {error_log}")
    print(tb)
    sys.exit(1)
