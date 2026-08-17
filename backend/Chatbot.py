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
import uuid
import re

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


class LegalSemanticParser:
    def __init__(self, filepath: str):
        self.filepath = filepath
        self.filename = Path(filepath).name
        self.doc_number = self._extract_doc_number(self.filename)
        self.doc_type = self._extract_doc_type(self.filename)
        
        self.nodes = []
        self.active_nodes = {
            "chuong": None,
            "muc": None,
            "tieu_muc": None,
            "dieu": None,
            "khoan": None,
            "phu_luc": None,
            "mau_so": None
        }
        self.current_node = None

    def _extract_doc_number(self, filename: str) -> str:
        name = filename.replace(".pdf", "")
        match = re.search(r"(\d+)[-/](\d+)[-/]([A-ZĐ-]+)", name)
        if match:
            return f"{match.group(1)}/{match.group(2)}/{match.group(3)}"
        return name

    def _extract_doc_type(self, filename: str) -> str:
        name = filename.lower()
        if "nghị định" in name or "nd-cp" in name or "nđ-cp" in name:
            return "NGHI_DINH"
        if "thông tư" in name or "tt-" in name:
            return "THONG_TU"
        if "luật" in name:
            return "LUAT"
        if "quyết định" in name or "qd-" in name or "qđ-" in name:
            return "QUYET_DINH"
        if "vbhn" in name:
            return "VBHN"
        return "UNKNOWN"

    def _get_parent_id(self, level: str):
        hierarchy = ["chuong", "muc", "tieu_muc", "dieu", "khoan"]
        if level in ["phu_luc", "mau_so"]:
            return None
        
        idx = hierarchy.index(level)
        for i in range(idx - 1, -1, -1):
            parent = self.active_nodes[hierarchy[i]]
            if parent:
                return parent["id"]
        return None

    def _create_node(self, node_type: str, title: str):
        parent_id = self._get_parent_id(node_type)
        node = {
            "id": str(uuid.uuid4()),
            "parent_id": parent_id,
            "node_type": node_type,
            "title": title,
            "text_content": [],
            "source": f"papers/{self.filename}",
            "doc_number": self.doc_number,
            "doc_type": self.doc_type
        }
        self.nodes.append(node)
        self.active_nodes[node_type] = node
        self.current_node = node
        
        hierarchy = ["chuong", "muc", "tieu_muc", "dieu", "khoan"]
        if node_type in hierarchy:
            idx = hierarchy.index(node_type)
            for i in range(idx + 1, len(hierarchy)):
                self.active_nodes[hierarchy[i]] = None

    def parse(self, text: str):
        lines = text.split('\n')
        for line in lines:
            line_s = line.strip()
            if not line_s:
                continue

            m_chap = re.match(r"(?i)^(CHƯƠNG\s+[IVXLCDM\d]+)[\.\:\s]*(.*)", line_s)
            m_sec = re.match(r"(?i)^(Mục\s+\d+)[\.\:\s]*(.*)", line_s)
            m_subsec = re.match(r"(?i)^(Tiểu\s+mục\s+\d+)[\.\:\s]*(.*)", line_s)
            m_art = re.match(r"(?i)^(Điều\s+\d+[A-Za-z]?)\.[\s]*(.*)", line_s)
            m_clause = re.match(r"^(\d+)\.\s+(.*)", line_s)
            m_app = re.match(r"(?i)^(Phụ\s+lục\s+[A-Za-z\d]+)[\.\:\s]*(.*)", line_s)
            m_form = re.match(r"(?i)^(Mẫu\s+số\s+[A-Za-z\d]+)[\.\:\s]*(.*)", line_s)

            matched = True
            if m_chap:
                self._create_node("chuong", m_chap.group(1).upper() + (f": {m_chap.group(2)}" if m_chap.group(2) else ""))
            elif m_sec:
                self._create_node("muc", m_sec.group(1).title() + (f": {m_sec.group(2)}" if m_sec.group(2) else ""))
            elif m_subsec:
                self._create_node("tieu_muc", m_subsec.group(1).title() + (f": {m_subsec.group(2)}" if m_subsec.group(2) else ""))
            elif m_art:
                self._create_node("dieu", m_art.group(1).title() + (f": {m_art.group(2)}" if m_art.group(2) else ""))
            elif m_clause and not self.active_nodes["phu_luc"] and not self.active_nodes["mau_so"]:
                self._create_node("khoan", f"Khoản {m_clause.group(1)}" + (f": {m_clause.group(2)}" if m_clause.group(2) else ""))
            elif m_app:
                self._create_node("phu_luc", m_app.group(1).title() + (f": {m_app.group(2)}" if m_app.group(2) else ""))
            elif m_form:
                self._create_node("mau_so", m_form.group(1).title() + (f": {m_form.group(2)}" if m_form.group(2) else ""))
            else:
                matched = False

            if not matched:
                if self.current_node:
                    self.current_node["text_content"].append(line_s)
                else:
                    node = {
                        "id": str(uuid.uuid4()),
                        "parent_id": None,
                        "node_type": "text",
                        "title": "",
                        "text_content": [line_s],
                        "source": f"papers/{self.filename}",
                        "doc_number": self.doc_number,
                        "doc_type": self.doc_type
                    }
                    self.nodes.append(node)
                    self.current_node = node
                    
        for n in self.nodes:
            n["text_content"] = "\n".join(n["text_content"])
            n["sha256_hash"] = "" # calculated in seed DB
            
        return self.nodes

def process_single_pdf(file_path: str):
    print(f"[process] Đang trích xuất nội dung từ: {file_path}")
    raw_text = extract_text_from_pdf(file_path)
    if not raw_text.strip():
        print(f"[warn] File {file_path} không có nội dung văn bản.")
        return []
        
    parser = LegalSemanticParser(file_path)
    nodes = parser.parse(raw_text)
    
    print(f"[success] {file_path}: {len(nodes)} Nodes (Hierarchical)")
    return nodes

def main():
    parser = argparse.ArgumentParser(description="Chunk legal PDFs with Hierarchical structure.")
    parser.add_argument("--file", type=str, default=None, help="Process a single PDF file only.")
    args = parser.parse_args()

    ROOT_DIR = Path(__file__).resolve().parent.parent
    out_dir = ROOT_DIR / "out"
    out_dir.mkdir(exist_ok=True)
    nodes_path = out_dir / "document_nodes.json"

    existing_nodes = []

    if args.file:
        target_file = Path(args.file)
        if not target_file.exists():
            print(f"[error] File không tồn tại: {target_file}")
            sys.exit(1)
        files_to_process = [str(target_file)]

        # Load existing data to merge
        if nodes_path.exists():
            with open(nodes_path, "r", encoding="utf-8") as f:
                existing_nodes = json.load(f)

        # Remove previous chunks for this source if present
        target_source = f"papers/{target_file.name}"
        existing_nodes = [n for n in existing_nodes if n.get("source") != target_source and Path(n.get("source", "")).name != target_file.name]
    else:
        papers_dir = ROOT_DIR / "papers"
        files_to_process = [str(p) for p in papers_dir.glob("*.pdf")]
        if not files_to_process:
            print("[warn] Không tìm thấy file PDF nào trong ./papers.")
            sys.exit(0)

    new_nodes = []

    for f_path in files_to_process:
        nodes = process_single_pdf(f_path)
        new_nodes.extend(nodes)

    final_nodes = existing_nodes + new_nodes

    with open(nodes_path, "w", encoding="utf-8") as f:
        json.dump(final_nodes, f, ensure_ascii=False, indent=2)

    print(f"\n[DONE] Tổng cộng: {len(final_nodes)} Hierarchical Nodes đã lưu vào ./out/")


if __name__ == "__main__":
    main()
