"""Quick test script to verify API quality after improvements."""
import urllib.request
import json
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

from dotenv import load_dotenv

# Load .env
load_dotenv()

API_URL = "http://127.0.0.1:8000/api/query"

TEST_QUERIES = [
    "Kiểm tra hải quan là gì?",
    "Hồ sơ hải quan gồm những gì?",
    "Kho ngoại quan là gì?",
    "Tính thuế nhập khẩu cho 100 tấn gạo",
]

for q in TEST_QUERIES:
    print("=" * 70)
    print(f"QUERY: {q}")
    print("=" * 70)

    body = json.dumps({"query": q, "top_k": 5}).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"ERROR: {e}")
        continue

    answer = data.get("answer", "")
    provider = data.get("provider", "?")
    sources = data.get("sources", [])

    print(f"\nPROVIDER: {provider}")
    print(f"\nANSWER ({len(answer)} chars):")
    print(answer[:1200])
    print(f"\nSOURCES ({len(sources)}):")
    for s in sources:
        refs = s.get("article_refs", [])
        print(f"  [{s.get('rank')}] {', '.join(refs) if refs else '(no refs)'}")
    print()
