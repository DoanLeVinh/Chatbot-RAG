import time
import sys
from pathlib import Path
import json

backend_dir = Path(__file__).parent
if str(backend_dir) not in sys.path:
    sys.path.append(str(backend_dir))

from retriever_local import LocalRetriever, refine_query, AGENT_SYSTEM_PROMPT
from llm_router import LLMRouter

def main():
    print("--- Bắt đầu Trace & Benchmark ---")
    
    t0 = time.time()
    r = LocalRetriever()
    t_init = time.time() - t0
    print(f"[1] Khởi tạo mô hình (SentenceTransformer, FAISS, BM25, Reranker): {t_init:.2f}s")
    
    q = "Thủ tục xuất khẩu gạo"
    
    t0 = time.time()
    refined_q = refine_query(q)
    emb = r.embed_query(refined_q)
    t_emb = time.time() - t0
    print(f"[2] Embedding câu hỏi: {t_emb:.2f}s")
    
    t0 = time.time()
    candidates = r.retrieve(q, top_k=2)
    t_ret = time.time() - t0
    print(f"[3] Retrieval (FAISS + BM25 + Reranker): {t_ret:.2f}s")
    
    t0 = time.time()
    parents, children = r.retrieve_parents(q, top_k=2)
    t_parent = time.time() - t0
    print(f"[4] Retrieve Parents: {t_parent:.2f}s")
    
    # Try Ollama directly
    router = LLMRouter()
    
    # Force test Ollama
    from retriever_local import _format_parent_context
    context = _format_parent_context(parents, max_items=2)
    prompt = f"[Ngữ cảnh]: {context}\n[Câu hỏi]: {q}"
    
    print("\n[5] Gửi yêu cầu tới Ollama...")
    t0 = time.time()
    res = router._call_ollama(AGENT_SYSTEM_PROMPT, prompt, max_tokens=300)
    t_llm = time.time() - t0
    
    if res:
        print(f"✅ Ollama sinh chữ thành công trong {t_llm:.2f}s")
        print(f"Nội dung:\n{res[0][:200]}...")
    else:
        print(f"❌ Ollama thất bại hoặc không phản hồi trong {t_llm:.2f}s")

if __name__ == "__main__":
    main()
