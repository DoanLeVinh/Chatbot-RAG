"""RAG Quantitative Evaluation & Ablation Study Benchmark for LogiChat.

Evaluates 4 retrieval configurations on a 30-item Vietnamese customs dataset:
1. BM25 Only (Lexical Search)
2. Dense FAISS Only (BGE-M3 Vector Embedding)
3. Hybrid Search (BM25 + Dense RRF Fusion)
4. Hybrid Search + Cross-Encoder Re-ranker (LogiChat Two-Tier Production Pipeline)

Measures:
- Hit Rate@3 (%)
- Hit Rate@5 (%)
- Mean Reciprocal Rank (MRR@5)
- Context Precision@5 (%)
- Average Retrieval Latency (ms)

Generates:
- backend/data/benchmark_report.json
- Formatted Markdown summary table for Thesis Report & Slides
"""
import sys
import os
import time
import json
from pathlib import Path
from typing import List, Dict, Any

# Setup path and UTF-8 encoding
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

from retriever_local import LocalRetriever

DATASET_FILE = BACKEND_DIR / "data" / "rag_benchmark_dataset.json"
OUTPUT_REPORT_FILE = BACKEND_DIR / "data" / "benchmark_report.json"

def check_hit(retrieved_items: List[Dict[str, Any]], expected_sources: List[str], expected_articles: List[str]) -> int:
    """
    Returns rank (1-indexed) of first relevant chunk matching expected sources or articles.
    Returns 0 if no match found.
    """
    for rank, item in enumerate(retrieved_items, start=1):
        source = str(item.get("source", "")).lower()
        text = str(item.get("text", "")).lower()
        parent_id = str(item.get("parent_id", "")).lower()
        chapter = str(item.get("chapter", "")).lower()
        article_ids = " ".join([str(a) for a in item.get("article_ids", [])]).lower()
        combined = f"{source} {text} {parent_id} {chapter} {article_ids}"

        # Match by expected source name (e.g. 54/2014, 38/2015, Luật Hải quan...)
        for src in expected_sources:
            norm_src = src.lower().replace("/", " ").replace("-", " ").replace("_", " ")
            norm_combined = combined.replace("/", " ").replace("-", " ").replace("_", " ")
            if src.lower() in combined or norm_src in norm_combined:
                return rank

        # Match by article ID
        for art in expected_articles:
            if art.lower() in combined:
                return rank

    return 0

def retrieve_bm25_only(retriever, query: str, top_k: int = 5):
    """Retrieve using only BM25 lexical token matching."""
    tokenized_q = query.lower().split()
    if not hasattr(retriever, 'bm25') or retriever.bm25 is None:
        return []
    import numpy as np
    scores = retriever.bm25.get_scores(tokenized_q)
    top_indices = np.argsort(scores)[::-1][:top_k]
    results = []
    for idx in top_indices:
        if scores[idx] > 0 and 0 <= idx < len(retriever.chunks):
            c = dict(retriever.chunks[idx])
            c["score"] = float(scores[idx])
            results.append(c)
    return results

def retrieve_dense_only(retriever, query: str, top_k: int = 5):
    """Retrieve using only FAISS vector cosine similarity."""
    emb = retriever.embed_query(query)
    D, I = retriever.index.search(emb, top_k)
    results = []
    for idx, score in zip(I[0].tolist(), D[0].tolist()):
        if 0 <= idx < len(retriever.chunks):
            c = dict(retriever.chunks[idx])
            c["score"] = float(score)
            results.append(c)
    return results

def retrieve_hybrid_no_rerank(retriever, query: str, top_k: int = 5):
    """Retrieve using BM25 + Dense RRF fusion, skipping cross-encoder reranking."""
    emb = retriever.embed_query(query)
    D, I = retriever.index.search(emb, 30)
    vector_candidates = [(idx, score) for idx, score in zip(I[0].tolist(), D[0].tolist()) if 0 <= idx < len(retriever.chunks)]

    tokenized_q = query.lower().split()
    import numpy as np
    bm25_scores = retriever.bm25.get_scores(tokenized_q)
    top_bm25_idx = np.argsort(bm25_scores)[::-1][:30]
    bm25_candidates = [(idx, float(bm25_scores[idx])) for idx in top_bm25_idx if bm25_scores[idx] > 0]

    rrf_scores = {}
    k_rrf = 60
    for rank, (idx, _) in enumerate(vector_candidates):
        rrf_scores[idx] = rrf_scores.get(idx, 0.0) + 1.0 / (k_rrf + rank + 1)
    for rank, (idx, _) in enumerate(bm25_candidates):
        rrf_scores[idx] = rrf_scores.get(idx, 0.0) + 1.0 / (k_rrf + rank + 1)

    sorted_idx = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)[:top_k]
    return [retriever.chunks[i] for i in sorted_idx]

def run_benchmark(max_queries: int = 30):
    print("=" * 80)
    print("LOGICHAT RAG QUANTITATIVE BENCHMARK & ABLATION STUDY")
    print("Evaluating 4 Retrieval Strategies on Vietnamese Customs Legal Corpus")
    print("=" * 80)

    if not DATASET_FILE.exists():
        print(f"Error: Dataset not found at {DATASET_FILE}")
        return

    with open(DATASET_FILE, "r", encoding="utf-8") as f:
        dataset = json.load(f)[:max_queries]

    print(f"Loaded {len(dataset)} evaluation questions.")
    print("Initializing LocalRetriever (FAISS + BM25 + Cross-Encoder)...")
    retriever = LocalRetriever()

    # Pre-warm models
    _ = retriever.retrieve("thủ tục hải quan nhập khẩu", top_k=2)

    modes = [
        {"id": "bm25_only", "name": "1. BM25 Only (Lexical Keyword)"},
        {"id": "dense_only", "name": "2. Dense Vector Only (FAISS BGE-M3)"},
        {"id": "hybrid_no_rerank", "name": "3. Hybrid Search (BM25 + Dense RRF)"},
        {"id": "hybrid_rerank", "name": "4. Hybrid + Re-ranker (Production Pipeline)"}
    ]

    all_results = {}

    for mode_cfg in modes:
        mode = mode_cfg["id"]
        mode_name = mode_cfg["name"]
        print(f"\nEvaluating: {mode_name} ...")

        hits_at_3 = 0
        hits_at_5 = 0
        mrr_sum = 0.0
        latencies = []
        precision_sum = 0.0

        for idx, item in enumerate(dataset):
            query = item["query"]
            exp_sources = item.get("expected_sources", [])
            exp_articles = item.get("expected_articles", [])

            t0 = time.perf_counter()

            if mode == "bm25_only":
                retrieved = retrieve_bm25_only(retriever, query, top_k=5)
            elif mode == "dense_only":
                retrieved = retrieve_dense_only(retriever, query, top_k=5)
            elif mode == "hybrid_no_rerank":
                retrieved = retrieve_hybrid_no_rerank(retriever, query, top_k=5)
            else: # hybrid_rerank (Full Two-Tier PDR)
                parents, _ = retriever.retrieve_parents(query, top_k=5)
                retrieved = parents[:5]

            latency_ms = (time.perf_counter() - t0) * 1000.0
            latencies.append(latency_ms)

            # Evaluate Metrics
            rank = check_hit(retrieved, exp_sources, exp_articles)
            if rank > 0:
                if rank <= 3:
                    hits_at_3 += 1
                if rank <= 5:
                    hits_at_5 += 1
                mrr_sum += 1.0 / rank

            # Calculate Precision@5
            match_count = sum(1 for r in retrieved if check_hit([r], exp_sources, exp_articles) > 0)
            precision_sum += (match_count / max(1, len(retrieved)))

        n = len(dataset)
        hit_rate_3 = round((hits_at_3 / n) * 100, 1)
        hit_rate_5 = round((hits_at_5 / n) * 100, 1)
        mrr_5 = round(mrr_sum / n, 3)
        avg_precision = round((precision_sum / n) * 100, 1)
        avg_latency = round(sum(latencies) / n, 1)

        all_results[mode] = {
            "name": mode_name,
            "hit_rate_at_3": hit_rate_3,
            "hit_rate_at_5": hit_rate_5,
            "mrr_at_5": mrr_5,
            "precision_at_5": avg_precision,
            "avg_latency_ms": avg_latency
        }

        print(f"  -> Hit@3: {hit_rate_3}% | Hit@5: {hit_rate_5}% | MRR@5: {mrr_5} | Latency: {avg_latency}ms")

    # Export report to JSON
    report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_queries": len(dataset),
        "corpus_nodes": 9228,
        "corpus_parent_chunks": 1081,
        "results": all_results
    }
    with open(OUTPUT_REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"\n[OK] Benchmark report saved to: {OUTPUT_REPORT_FILE}")

    # Print Formatted Markdown Table
    print("\n" + "=" * 80)
    print("BẢNG BÁO CÁO THỰC NGHIỆM ĐÁNH GIÁ ĐỊNH LƯỢNG RAG (ABLATION STUDY)")
    print("=" * 80)
    print("| Chiến lược Truy xuất (Retrieval Mode) | Hit Rate@3 (%) | Hit Rate@5 (%) | MRR@5 | Context Precision@5 (%) | Độ trễ (ms) |")
    print("| :------------------------------------ | :------------: | :------------: | :---: | :---------------------: | :---------: |")
    for mode_id, res in all_results.items():
        print(f"| **{res['name']}** | **{res['hit_rate_at_3']}%** | **{res['hit_rate_at_5']}%** | **{res['mrr_at_5']}** | **{res['precision_at_5']}%** | **{res['avg_latency_ms']} ms** |")
    print("=" * 80)

if __name__ == "__main__":
    run_benchmark(30)
