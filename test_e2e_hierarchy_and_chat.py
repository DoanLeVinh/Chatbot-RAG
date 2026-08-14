import urllib.request
import urllib.parse
import json
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_URL = "http://127.0.0.1:8000"

def test_api():
    print("=== 1. Testing Chat Endpoint (Auto-Recovery & Structured Response) ===")
    payload = {
        "prompt": "Thủ tục hải quan đối với hàng hóa nhập khẩu gồm những gì?",
        "sessionId": "test-session-recovery-uuid"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/api/chat",
        data=json.dumps(payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as response:
        assert response.status == 200, f"Chat API returned {response.status}"
        data = json.loads(response.read().decode('utf-8'))
        print(f" Chat API OK. Provider: {data.get('provider')}")
        print(f" Reply preview: {data.get('reply')[:150]}...")
        print(f" Citations found: {len(data.get('citations') or [])}")

    print("\n=== 2. Testing Admin Login ===")
    login_payload = {
        "email": "admin@logichat.vn",
        "password": "Admin@123456"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/login",
        data=json.dumps(login_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as response:
        assert response.status == 200
        auth_data = json.loads(response.read().decode('utf-8'))
        token = auth_data.get("token")
        print(f" Admin Login OK. User: {auth_data.get('user', {}).get('fullName')}")

    print("\n=== 3. Testing Admin Document Hierarchy API (Level 1 & 2) ===")
    req = urllib.request.Request(
        f"{BASE_URL}/api/admin/docs/hierarchy",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as response:
        assert response.status == 200
        hier_data = json.loads(response.read().decode('utf-8'))
        hierarchy = hier_data.get("hierarchy", [])
        print(f" Documents (PDFs) found: {len(hierarchy)}")
        for doc in hierarchy:
            print(f"  📁 PDF: '{doc.get('source')}' - Total chunks: {doc.get('total_chunks')} - Chapters: {len(doc.get('chapters', []))}")
            for ch in doc.get('chapters', [])[:2]:
                print(f"    📑 Chapter: '{ch.get('chapter')}' ({ch.get('chunk_count')} chunks)")

    if hierarchy and hierarchy[0].get('chapters'):
        source = hierarchy[0]['source']
        first_chap = hierarchy[0]['chapters'][0]['chapter']
        print(f"\n=== 4. Testing Admin Chunks API (Level 3 for '{source}' -> '{first_chap}') ===")
        encoded_source = urllib.parse.quote(source)
        encoded_chapter = urllib.parse.quote(first_chap)
        req = urllib.request.Request(
            f"{BASE_URL}/api/admin/docs/{encoded_source}/chunks?chapter={encoded_chapter}",
            headers={"Authorization": f"Bearer {token}"}
        )
        with urllib.request.urlopen(req) as response:
            assert response.status == 200
            chunks_data = json.loads(response.read().decode('utf-8'))
            chunks = chunks_data.get("chunks", [])
            print(f" Chunks loaded: {len(chunks)}")
            if chunks:
                first_chunk = chunks[0]
                print(f"    - Article ID: {first_chunk.get('article_ids')}")
                print(f"    - SHA-256: {first_chunk.get('sha256_hash')}")
                print(f"    - Text preview: {first_chunk.get('text')[:100]}...")

    print("\n ALL BACKEND & ADMIN HIERARCHY TESTS PASSED 100%!")

if __name__ == "__main__":
    test_api()
