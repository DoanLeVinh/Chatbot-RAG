import sys
import json
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
from retriever_local import LocalRetriever

r = LocalRetriever()
queries = [
    "Kiểm tra hải quan là gì?",
    "Hồ sơ hải quan gồm những gì?",
    "Kho ngoại quan là gì?",
]

for q in queries:
    print(f"\n--- {q} ---")
    res = r.retrieve(q, top_k=20, threshold=0.0)
    for i, x in enumerate(res):
        text_preview = x['text'][:50].replace('\n', ' ')
        print(f"[{i:2d}] score={x['score']:.4f} articles={x['article_ids']} text={text_preview}")
