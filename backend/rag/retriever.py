import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple
import numpy as np
import faiss
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def compute_rrf(faiss_ranks: Dict[int, int], bm25_ranks: Dict[int, int], k: int = 60) -> Dict[int, float]:
    """Compute Reciprocal Rank Fusion (RRF) scores."""
    rrf_scores = {}
    all_indices = set(faiss_ranks.keys()).union(set(bm25_ranks.keys()))
    
    for idx in all_indices:
        score = 0.0
        if idx in faiss_ranks:
            score += 1.0 / (k + faiss_ranks[idx] + 1)
        if idx in bm25_ranks:
            score += 1.0 / (k + bm25_ranks[idx] + 1)
        rrf_scores[idx] = score
        
    return rrf_scores

class AdvancedRetriever:
    """
    Advanced RAG Retriever handling Hybrid Search (FAISS + BM25) and Cross-Encoder Reranking.
    Implements true Two-Tier Parent-Child Context Retrieval.
    """
    def __init__(self, index_dir: str = "faiss_index_local"):
        # Robust path resolution
        resolved_dir = Path(index_dir)
        if not (resolved_dir / "index.faiss").exists():
            root_dir = Path(__file__).resolve().parent.parent.parent
            if (root_dir / index_dir / "index.faiss").exists():
                resolved_dir = root_dir / index_dir
            else:
                backend_dir = Path(__file__).resolve().parent.parent
                if (backend_dir / index_dir / "index.faiss").exists():
                    resolved_dir = backend_dir / index_dir

        self.index_dir = str(resolved_dir)
        self.index_path = str(resolved_dir / "index.faiss")
        self.meta_path = str(resolved_dir / "metadata.json")
        self.parent_chunks_path = str(resolved_dir / "parent_chunks.json")
        
        # Load embedding model (matching 768-dim index in faiss_index_local)
        if SentenceTransformer is None:
            raise ImportError("SentenceTransformer is not installed.")
        embedding_model_name = os.getenv("EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-mpnet-base-v2")
        logger.info(f"[ADVANCED RETRIEVER] Loading sentence-transformers model {embedding_model_name}...")
        self.embedding_model = SentenceTransformer(embedding_model_name)
        
        # Load reranker
        logger.info("[ADVANCED RETRIEVER] Loading Cross-Encoder BAAI/bge-reranker-base...")
        self.reranker = CrossEncoder('BAAI/bge-reranker-base')
        
        self.faiss_index = None
        self.chunks = []
        self.parent_chunks = {}
        self.bm25 = None
        
        self.load_index()

    def load_index(self):
        """Loads FAISS index, metadata, parent chunks, and initializes BM25."""
        if not os.path.exists(self.index_path) or not os.path.exists(self.meta_path):
            logger.warning(f"[ADVANCED RETRIEVER] FAISS index or metadata not found in {self.index_dir}.")
            return

        # Load FAISS
        self.faiss_index = faiss.read_index(self.index_path)
        
        # Load metadata child chunks
        with open(self.meta_path, 'r', encoding='utf-8') as f:
            self.chunks = json.load(f)

        # Load parent chunks
        self.parent_chunks = {}
        if os.path.exists(self.parent_chunks_path):
            with open(self.parent_chunks_path, 'r', encoding='utf-8') as f:
                p_list = json.load(f)
                self.parent_chunks = {p.get("parent_id", p.get("id")): p for p in p_list}
            
        logger.info(f"[ADVANCED RETRIEVER] Loaded FAISS index with {self.faiss_index.ntotal} vectors and {len(self.parent_chunks)} parent chunks.")
        
        # Build BM25
        if self.chunks:
            logger.info("[ADVANCED RETRIEVER] Building BM25 index from chunks...")
            tokenized_corpus = [chunk["text"].lower().split() for chunk in self.chunks]
            self.bm25 = BM25Okapi(tokenized_corpus)
            logger.info("[ADVANCED RETRIEVER] BM25 ready.")
            
    def embed_query(self, query: str) -> np.ndarray:
        """Generate vector embedding for a query."""
        vector = self.embedding_model.encode(query, normalize_embeddings=True)
        return np.array([vector]).astype('float32')

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate vector embeddings for a list of texts (used for scoped document RAG)."""
        if not texts:
            return []
        vectors = self.embedding_model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return [v.tolist() for v in vectors]

    def retrieve(self, query: str, top_k: int = 5, pre_fetch_k: int = 25) -> List[Dict[str, Any]]:
        """
        Hybrid Search Execution:
        1. FAISS Search -> top 25
        2. BM25 Search -> top 25
        3. RRF Fusion -> top 25
        4. Cross-Encoder Reranking -> top candidates
        5. Map to Parent Chunks for full context
        """
        if self.faiss_index is None or not self.chunks:
            logger.warning("[ADVANCED RETRIEVER] Index is empty, cannot retrieve.")
            return []

        # 1. FAISS Vector Search
        query_vector = self.embed_query(query)
        distances, faiss_indices = self.faiss_index.search(query_vector, pre_fetch_k)
        
        faiss_ranks = {}
        for rank, idx in enumerate(faiss_indices[0]):
            if idx != -1 and idx < len(self.chunks):
                faiss_ranks[idx] = rank
                
        # 2. BM25 Sparse Search
        bm25_ranks = {}
        if self.bm25:
            tokenized_q = query.lower().split()
            bm25_scores = self.bm25.get_scores(tokenized_q)
            top_bm25_idx = np.argsort(bm25_scores)[::-1][:pre_fetch_k]
            for rank, idx in enumerate(top_bm25_idx):
                if bm25_scores[idx] > 0:
                    bm25_ranks[idx] = rank
                    
        # 3. RRF Fusion
        rrf_scores = compute_rrf(faiss_ranks, bm25_ranks, k=60)
        sorted_rrf = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)[:pre_fetch_k]
        
        # 4. Cross-Encoder Reranking
        candidates = []
        candidate_texts = []
        for idx, _ in sorted_rrf:
            chunk = self.chunks[idx]
            candidates.append(chunk)
            candidate_texts.append(chunk["text"])
            
        if not candidates:
            return []
            
        # Form pairs [query, doc] for CrossEncoder
        pairs = [[query, text] for text in candidate_texts]
        rerank_scores = self.reranker.predict(pairs)
        
        for i, chunk in enumerate(candidates):
            chunk["rerank_score"] = float(rerank_scores[i])
            
        candidates.sort(key=lambda x: x["rerank_score"], reverse=True)

        # 5. Parent-Child Context Expansion
        results = []
        seen_parents = set()
        for chunk in candidates:
            pid = chunk.get("parent_id")
            if pid and pid in self.parent_chunks:
                if pid in seen_parents:
                    continue
                seen_parents.add(pid)
                p = self.parent_chunks[pid]
                results.append({
                    "id": pid,
                    "parent_id": pid,
                    "source": p.get("source") or chunk.get("source"),
                    "filename": p.get("filename") or chunk.get("filename") or p.get("source", ""),
                    "chapter": p.get("chapter") or chunk.get("chapter", ""),
                    "article_ids": p.get("article_ids") or chunk.get("article_ids", []),
                    "text": p.get("text", chunk.get("text", "")),
                    "rerank_score": chunk.get("rerank_score", 0.0)
                })
            if len(results) >= top_k:
                break

        return results

    def retrieve_parents(self, query: str, top_k: int = 3) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Backward-compatible helper returning (parents, matched_children)."""
        parents = self.retrieve(query, top_k=top_k)
        return parents, parents

