"""High-speed Two-Tier Parent-Child Chunking Pipeline for Legal Documents.

Reads PDF documents from ./papers (or a specific file via --file <path>),
extracts legal structural metadata (Chương, Điều, Khoản), and outputs:
  - ./out/chunks.json        (Child Chunks ~300 chars for FAISS vector embeddings)
  - ./out/parent_chunks.json  (Parent Chunks ~2000 chars for LLM context retrieval)

Usage:
    python backend/Chatbot.py
    python backend/Chatbot.py --file "papers/Luật hải quan.pdf"
"""

import sys
import os
import json
import re
import uuid
import argparse
from pathlib import Path
import pypdf
from dotenv import load_dotenv

try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

load_dotenv()

PARENT_CHUNK_SIZE = int(os.getenv("PARENT_CHUNK_SIZE", "2000"))
PARENT_CHUNK_OVERLAP = int(os.getenv("PARENT_CHUNK_OVERLAP", "200"))
CHILD_CHUNK_SIZE = int(os.getenv("CHILD_CHUNK_SIZE", "300"))
CHILD_CHUNK_OVERLAP = int(os.getenv("CHILD_CHUNK_OVERLAP", "50"))

PARENT_SEPARATORS = [
    r"\n(?=Điều\s+\d+)",
    r"\n(?=CHƯƠNG\s+[IVXLCDM\d]+)",
    r"\n(?=Chương\s+[IVXLCDM\d]+)",
    r"\n(?=Mục\s+\d+)",
    r"\n(?=PHẦN\s+[IVXLCDM\d]+)",
    r"\n\n+",
    r"\n",
    r"\.\s+",
    r"\s+",
]

CHILD_SEPARATORS = [
    r"\n(?=Điều\s+\d+)",
    r"\n(?=\d+\.\s)",
    r"\n(?=[a-zđ]\)\s)",
    r"\n\n+",
    r"\n",
    r"\.\s+",
    r"\s+",
]


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract all text pages from a PDF file quickly using pypdf."""
    reader = pypdf.PdfReader(pdf_path)
    pages_text = []
    for page in reader.pages:
        t = page.extract_text()
        if t:
            pages_text.append(t)
    return "\n".join(pages_text)


def split_text_with_regex(text: str, chunk_size: int, chunk_overlap: int, separators: list) -> list:
    """Recursive-style splitter using regex separators."""
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
                        sub_chunks = split_text_with_regex(s_clean, chunk_size, chunk_overlap, separators[1:])
                        chunks.extend(sub_chunks)
                        current = ""
                    else:
                        current = s_clean
            if current:
                chunks.append(current)
            return chunks

    # Fallback character slice
    chunks = []
    for i in range(0, len(text), chunk_size - chunk_overlap):
        chunk = text[i:i + chunk_size].strip()
        if chunk:
            chunks.append(chunk)
    return chunks


def process_single_pdf(file_path: str):
    """Process a single PDF into Parent and Child chunks with active Chapter tracking."""
    # Standardize source path to papers/filename.pdf
    filename = Path(file_path).name
    source_name = f"papers/{filename}"
    print(f"[process] Đang trích xuất nội dung từ: {source_name}")
    raw_text = extract_text_from_pdf(file_path)

    if not raw_text.strip():
        print(f"[warn] File {file_path} không có nội dung văn bản.")
        return [], []

    parent_texts = split_text_with_regex(raw_text, PARENT_CHUNK_SIZE, PARENT_CHUNK_OVERLAP, PARENT_SEPARATORS)

    parent_chunks = []
    child_chunks = []

    current_chapter = None

    for p_idx, p_text in enumerate(parent_texts):
        # Update current chapter if detected in this chunk
        chap_match = re.search(r"(?:^|\n)\s*((?:CHƯƠNG|Chương)\s+[IVXLCDM\d]+[^\n\.\:]*)", p_text, re.IGNORECASE)
        if chap_match:
            detected_chap = chap_match.group(1).strip()
            # Normalize to uppercase CHƯƠNG
            current_chapter = re.sub(r"^[Cc]hương", "CHƯƠNG", detected_chap)

        # Detect articles in this chunk
        article_matches = re.findall(r"Điều\s+(\d+[A-Za-z]?)", p_text)
        seen_articles = set()
        article_ids = []
        for a in article_matches:
            art_key = f"Điều {a}"
            if art_key not in seen_articles:
                seen_articles.add(art_key)
                article_ids.append(art_key)

        # Detect clauses
        clause_matches = re.findall(r"(?:^|\n)\s*(\d+)\.\s", p_text)
        clause_ids = list(dict.fromkeys(clause_matches))

        chapter_val = current_chapter if current_chapter else "Không phân chương"

        parent_id = str(uuid.uuid4())
        parent_chunk = {
            "parent_id": parent_id,
            "parent_index": p_idx,
            "source": source_name,
            "length": len(p_text),
            "article_ids": article_ids,
            "clause_ids": clause_ids,
            "chapter": chapter_val,
            "text": p_text,
        }
        parent_chunks.append(parent_chunk)

        # Child split
        child_texts = split_text_with_regex(p_text, CHILD_CHUNK_SIZE, CHILD_CHUNK_OVERLAP, CHILD_SEPARATORS)
        for c_idx, c_text in enumerate(child_texts):
            c_art_matches = re.findall(r"Điều\s+(\d+[A-Za-z]?)", c_text)
            c_articles = [f"Điều {a}" for a in dict.fromkeys(c_art_matches)]
            c_clauses = list(dict.fromkeys(re.findall(r"(?:^|\n)\s*(\d+)\.\s", c_text)))

            child_chunk = {
                "chunk_id": f"{parent_id[:8]}_{c_idx}",
                "parent_id": parent_id,
                "parent_index": p_idx,
                "child_index": c_idx,
                "source": source_name,
                "length": len(c_text),
                "article_ids": c_articles or article_ids,
                "clause_ids": c_clauses or clause_ids,
                "chapter": chapter_val,
                "text": c_text,
            }
            child_chunks.append(child_chunk)

    print(f"[success] {source_name}: {len(parent_chunks)} Parent Chunks -> {len(child_chunks)} Child Chunks")
    return parent_chunks, child_chunks


def main():
    parser = argparse.ArgumentParser(description="Chunk legal PDFs with Two-Tier Parent-Child structure.")
    parser.add_argument("--file", type=str, default=None, help="Process a single PDF file only.")
    args = parser.parse_args()

    out_dir = Path.cwd() / "out"
    out_dir.mkdir(exist_ok=True)
    chunks_path = out_dir / "chunks.json"
    parent_path = out_dir / "parent_chunks.json"

    existing_parents = []
    existing_children = []

    if args.file:
        target_file = Path(args.file)
        if not target_file.exists():
            print(f"[error] File không tồn tại: {target_file}")
            sys.exit(1)
        files_to_process = [str(target_file)]

        # Load existing data to merge
        if parent_path.exists():
            with open(parent_path, "r", encoding="utf-8") as f:
                existing_parents = json.load(f)
        if chunks_path.exists():
            with open(chunks_path, "r", encoding="utf-8") as f:
                existing_children = json.load(f)

        # Remove previous chunks for this source if present
        target_source = f"papers/{target_file.name}"
        existing_parents = [p for p in existing_parents if p.get("source") != target_source and Path(p.get("source", "")).name != target_file.name]
        existing_children = [c for c in existing_children if c.get("source") != target_source and Path(c.get("source", "")).name != target_file.name]
    else:
        papers_dir = Path.cwd() / "papers"
        files_to_process = [str(p) for p in papers_dir.glob("*.pdf")]
        if not files_to_process:
            print("[warn] Không tìm thấy file PDF nào trong ./papers.")
            sys.exit(0)

    new_parents = []
    new_children = []

    for f_path in files_to_process:
        p_chunks, c_chunks = process_single_pdf(f_path)
        new_parents.extend(p_chunks)
        new_children.extend(c_chunks)

    final_parents = existing_parents + new_parents
    final_children = existing_children + new_children

    for idx, c in enumerate(final_children):
        c["chunk_id"] = idx

    with open(parent_path, "w", encoding="utf-8") as f:
        json.dump(final_parents, f, ensure_ascii=False, indent=2)

    with open(chunks_path, "w", encoding="utf-8") as f:
        json.dump(final_children, f, ensure_ascii=False, indent=2)

    print(f"\n[DONE] Tổng cộng: {len(final_parents)} Parent Chunks, {len(final_children)} Child Chunks đã lưu vào ./out/")


if __name__ == "__main__":
    main()
