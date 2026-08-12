import sys
import json
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

from retriever_local import LocalRetriever, synthesize_from_retrieved
r = LocalRetriever()

query = "Kiểm tra hải quan là gì?"
retrieved = r.retrieve(query, top_k=5)
print("RETRIEVED CHUNKS:")
for idx, c in enumerate(retrieved):
    print(f"[{idx}] {c['source']} {c['article_ids']}")

print("\nSYNTHESIZING...")
import numpy as np
from retriever_local import _sent_tokenize_legal, _is_heading_like, _normalize_words

candidates = []
for idx, x in enumerate(retrieved):
    sents = _sent_tokenize_legal(x['text'])
    for s_idx, s in enumerate(sents):
        if _is_heading_like(s):
            continue
        candidates.append({
            'text': s,
            'source': x.get('source'),
            'start_index': x.get('start_index'),
            'order': idx,
            's_idx': s_idx
        })

sent_embs = r.model.encode([c['text'] for c in candidates], convert_to_numpy=True, normalize_embeddings=True)
q_emb = r.embed_query(query)
sims = (sent_embs @ q_emb.T).squeeze(axis=1)

q_lower = query.lower().strip(" ?.")
core_phrase = q_lower.replace("là gì", "").replace("gồm những gì", "").replace("như thế nào", "").strip()

scores = []
for idx, cand in enumerate(candidates):
    text_lower = cand['text'].lower()
    sent_terms = set(t for t in _normalize_words(cand['text']) if len(t) > 2)
    query_terms = set(t for t in _normalize_words(query) if len(t) > 2)
    overlap = len(query_terms & sent_terms) / float(len(query_terms)) if query_terms else 0.0
    
    score = float(sims[idx]) * 0.6 + overlap * 0.4
    if core_phrase and len(core_phrase) > 3:
        if core_phrase in text_lower:
            score += 0.2
        if f"{core_phrase} là" in text_lower or f"{core_phrase} bao gồm" in text_lower or f"{core_phrase} gồm" in text_lower:
            score += 1.5
    scores.append(score)

idxs = np.argsort(scores)[::-1]
print(f"CORE: '{core_phrase}'")
for idx in idxs[:15]:
    cand = candidates[idx]
    print(f"[{idx}] score={scores[idx]:.4f} sim={float(sims[idx]):.4f} text={cand['text'][:60]}...")

