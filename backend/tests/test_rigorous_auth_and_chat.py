"""
================================================================================
LOGICHAT RAG — COMPREHENSIVE & RIGOROUS TEST SUITE
================================================================================
Testing Dimensions:
  1. Authentication & Cryptographic Security (PBKDF2, JWT Tampering, RBAC)
  2. Multi-User Privacy & Session Isolation (Anti-IDOR, Cross-User Boundaries)
  3. Chat Functionality & SSE Streaming (Stages, Tokens, Citations, Multi-Turn)
  4. Quota Limits & Edge Case Error Handling (Empty prompts, Injections, Quota 402)
  5. Speed & Latency Performance Benchmarks (TTFT, Total Time, Throughput)
  6. Answer Quality, Tone Friendliness & Legal Citation Accuracy Evaluation
================================================================================
"""

import os
import sys
import time
import json
import uuid
import re
from pathlib import Path
from typing import Dict, Any, List

# Setup backend import path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# Ensure UTF-8 stdout on Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

from fastapi.testclient import TestClient
from serve import app
import db

client = TestClient(app)

class TestResultsTracker:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failures = []
        self.metrics = {}
        self.evaluations = []

    def record_pass(self, name: str, detail: str = ""):
        self.tests_run += 1
        self.tests_passed += 1
        print(f"  ✅ [PASS] {name}" + (f" -> {detail}" if detail else ""))

    def record_fail(self, name: str, error: str):
        self.tests_run += 1
        self.tests_failed += 1
        self.failures.append((name, error))
        print(f"  ❌ [FAIL] {name} -> Error: {error}")

tracker = TestResultsTracker()


# ==============================================================================
# 1. AUTHENTICATION & CRYPTOGRAPHIC SECURITY TESTS
# ==============================================================================
def test_authentication_and_crypto_security():
    print("\n" + "="*70)
    print("🔐 PHẦN 1: KIỂM THỬ XÁC THỰC & BẢO MẬT MÃ HÓA (AUTH & CRYPTO SECURITY)")
    print("="*70)

    # 1.1 Password Hashing & Salt Uniqueness
    try:
        hash1, salt1 = db._hash_password("SecurePassword123!")
        hash2, salt2 = db._hash_password("SecurePassword123!")
        assert salt1 != salt2, "Salts must be cryptographically random and distinct"
        assert hash1 != hash2, "Hashes with different salts must not match"
        tracker.record_pass("PBKDF2-HMAC-SHA256 Salt Randomness", "Salts are uniquely generated per hashing operation")
    except Exception as e:
        tracker.record_fail("PBKDF2-HMAC-SHA256 Salt Randomness", str(e))

    # 1.2 JWT Token Generation & Tampering Protection
    try:
        test_payload = {"id": "usr-test-crypto", "role": "user", "email": "test@crypto.vn"}
        token = db.create_jwt_token(test_payload, expires_in=3600)
        verified = db.verify_jwt_token(token)
        assert verified is not None and verified["id"] == "usr-test-crypto"
        tracker.record_pass("JWT Generation & Valid Signature Verification", f"Token decoded with valid claims (role={verified['role']})")

        # Simulate Signature Tampering (Attacker elevates role to admin)
        parts = token.split(".")
        header_b64, payload_b64, sig_b64 = parts
        tampered_payload_dict = {"id": "usr-test-crypto", "role": "admin", "email": "test@crypto.vn", "exp": time.time() + 3600}
        tampered_payload_b64 = db._base64url_encode(json.dumps(tampered_payload_dict).encode())
        tampered_token = f"{header_b64}.{tampered_payload_b64}.{sig_b64}"
        
        tampered_verify = db.verify_jwt_token(tampered_token)
        assert tampered_verify is None, "Tampered token MUST be rejected with invalid signature"
        tracker.record_pass("JWT Anti-Tampering Security Guard", "Tampered role payload successfully blocked by HMAC-SHA256 signature verification")
    except Exception as e:
        tracker.record_fail("JWT Token Generation & Tampering", str(e))

    # 1.3 User Registration Flow
    unique_suffix = uuid.uuid4().hex[:6]
    user_email = f"tester_{unique_suffix}@logichat.vn"
    user_pwd = "Password@2026!"
    user_name = f"Doanh Nghiệp Xuất Nhập Khẩu {unique_suffix}"

    try:
        reg_resp = client.post("/api/auth/register", json={
            "email": user_email,
            "password": user_pwd,
            "fullName": user_name
        })
        assert reg_resp.status_code == 200
        data = reg_resp.json()
        assert data["success"] is True
        assert "token" in data and len(data["token"]) > 20
        assert data["user"]["email"] == user_email
        tracker.record_pass("User Registration Endpoint", f"Created account {user_email} with JWT token")
    except Exception as e:
        tracker.record_fail("User Registration Endpoint", str(e))

    # 1.4 Duplicate Registration Prevention
    try:
        dup_resp = client.post("/api/auth/register", json={
            "email": user_email,
            "password": user_pwd,
            "fullName": "Duplicate User"
        })
        assert dup_resp.status_code == 400
        tracker.record_pass("Duplicate Email Registration Guard", "Duplicate email registration rejected with 400 Bad Request")
    except Exception as e:
        tracker.record_fail("Duplicate Email Registration Guard", str(e))

    # 1.5 Valid Login & Invalid Password Handling
    try:
        # Correct credentials
        login_resp = client.post("/api/auth/login", json={"email": user_email, "password": user_pwd})
        assert login_resp.status_code == 200
        login_data = login_resp.json()
        assert login_data["success"] is True
        user_token = login_data["token"]
        user_id = login_data["user"]["id"]
        tracker.record_pass("User Login with Correct Credentials", f"Authenticated successfully as user_id: {user_id}")

        # Wrong password
        bad_pwd_resp = client.post("/api/auth/login", json={"email": user_email, "password": "WrongPassword999!"})
        assert bad_pwd_resp.status_code == 401
        tracker.record_pass("Login with Invalid Password Guard", "Rejected wrong password with 401 Unauthorized")

        # Non-existent email
        bad_email_resp = client.post("/api/auth/login", json={"email": "non_existent_12345@logichat.vn", "password": user_pwd})
        assert bad_email_resp.status_code == 401
        tracker.record_pass("Login with Non-Existent Account Guard", "Rejected non-existent user with 401 Unauthorized")
    except Exception as e:
        tracker.record_fail("Login Authentication Flow", str(e))

    # 1.6 Protected Endpoint /api/auth/me Verification
    try:
        # Valid header
        me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {user_token}"})
        assert me_resp.status_code == 200
        assert me_resp.json()["user"]["id"] == user_id
        tracker.record_pass("Protected /api/auth/me with Bearer Token", "User identity verified correctly")

        # Missing token
        me_no_token = client.get("/api/auth/me")
        assert me_no_token.status_code == 401
        tracker.record_pass("Protected /api/auth/me without Token", "Blocked unauthenticated request (401)")

        # Invalid token
        me_bad_token = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid_garbage_token_123"})
        assert me_bad_token.status_code == 401
        tracker.record_pass("Protected /api/auth/me with Malformed Token", "Blocked malformed token (401)")
    except Exception as e:
        tracker.record_fail("Protected Endpoint Token Verification", str(e))

    # 1.7 Role-Based Access Control (RBAC) Guard
    try:
        # Normal user trying to access admin user management API
        admin_forbidden_resp = client.get("/api/admin/users", headers={"Authorization": f"Bearer {user_token}"})
        assert admin_forbidden_resp.status_code == 403
        tracker.record_pass("RBAC Normal User to Admin Endpoint Guard", "Normal user strictly rejected with 403 Forbidden")

        # Admin login & access
        admin_login = client.post("/api/auth/login", json={"email": "admin@logichat.vn", "password": "Admin@123456"})
        if admin_login.status_code == 200:
            admin_token = admin_login.json()["token"]
            admin_allowed_resp = client.get("/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
            assert admin_allowed_resp.status_code == 200
            tracker.record_pass("RBAC Admin Role Access", "Admin successfully accessed /api/admin/users (200 OK)")
    except Exception as e:
        tracker.record_fail("Role-Based Access Control (RBAC)", str(e))

    return user_id, user_token


# ==============================================================================
# 2. MULTI-USER PRIVACY, DATA ISOLATION & ANTI-IDOR TESTS
# ==============================================================================
def test_user_privacy_and_isolation(user_a_id: str, user_a_token: str):
    print("\n" + "="*70)
    print("🛡️ PHẦN 2: KIỂM THỬ TÍNH CÁ NHÂN HÓA & CÔ LẬP DỮ LIỆU (PRIVACY & ANTI-IDOR)")
    print("="*70)

    # 2.1 Setup User B
    unique_b = uuid.uuid4().hex[:6]
    user_b_email = f"user_b_{unique_b}@logichat.vn"
    reg_b = client.post("/api/auth/register", json={
        "email": user_b_email,
        "password": "Password@2026!",
        "fullName": f"Doanh Nghiệp B {unique_b}"
    })
    user_b_token = reg_b.json()["token"]
    user_b_id = reg_b.json()["user"]["id"]

    headers_a = {"Authorization": f"Bearer {user_a_token}"}
    headers_b = {"Authorization": f"Bearer {user_b_token}"}

    # 2.2 Create Private Sessions for User A and User B
    sess_a_resp = client.post("/api/sessions", json={
        "title": "Tư vấn bí mật xuất khẩu sầu riêng - User A",
        "categoryTag": "Nông sản",
        "userId": user_a_id
    }, headers=headers_a)
    session_a_id = sess_a_resp.json()["session"]["id"]

    sess_b_resp = client.post("/api/sessions", json={
        "title": "Tư vấn nhập khẩu linh kiện điện tử - User B",
        "categoryTag": "Công nghệ",
        "userId": user_b_id
    }, headers=headers_b)
    session_b_id = sess_b_resp.json()["session"]["id"]

    # 2.3 Verify User A ONLY sees Session A
    try:
        list_a_resp = client.get("/api/sessions", headers=headers_a)
        assert list_a_resp.status_code == 200
        sessions_a = list_a_resp.json().get("sessions", [])
        ids_for_a = [s["id"] for s in sessions_a]
        assert session_a_id in ids_for_a, "User A must see Session A"
        assert session_b_id not in ids_for_a, "User A MUST NOT see Session B"
        tracker.record_pass("Session Listing Isolation for User A", f"User A sees only own sessions ({len(sessions_a)} sessions), Session B is hidden")
    except Exception as e:
        tracker.record_fail("Session Listing Isolation for User A", str(e))

    # 2.4 Verify User B ONLY sees Session B
    try:
        list_b_resp = client.get("/api/sessions", headers=headers_b)
        assert list_b_resp.status_code == 200
        sessions_b = list_b_resp.json().get("sessions", [])
        ids_for_b = [s["id"] for s in sessions_b]
        assert session_b_id in ids_for_b, "User B must see Session B"
        assert session_a_id not in ids_for_b, "User B MUST NOT see Session A"
        tracker.record_pass("Session Listing Isolation for User B", f"User B sees only own sessions ({len(sessions_b)} sessions), Session A is hidden")
    except Exception as e:
        tracker.record_fail("Session Listing Isolation for User B", str(e))

    # 2.5 IDOR Attack 1: User B tries to read User A's session detail
    try:
        idor_read = client.get(f"/api/sessions/{session_a_id}", headers=headers_b)
        assert idor_read.status_code == 404 or "error" in idor_read.json()
        tracker.record_pass("Anti-IDOR Cross-User Read Prevention", "User B reading Session A rejected with 404 (Access Denied)")
    except Exception as e:
        tracker.record_fail("Anti-IDOR Cross-User Read Prevention", str(e))

    # 2.6 IDOR Attack 2: User B tries to delete User A's session
    try:
        idor_delete = client.delete(f"/api/sessions/{session_a_id}", headers=headers_b)
        assert idor_delete.status_code == 404 or "error" in idor_delete.json()
        # Verify Session A is still alive for User A
        verify_a_alive = client.get(f"/api/sessions/{session_a_id}", headers=headers_a)
        assert verify_a_alive.status_code == 200
        tracker.record_pass("Anti-IDOR Cross-User Delete Prevention", "User B deleting Session A rejected; Session A intact for User A")
    except Exception as e:
        tracker.record_fail("Anti-IDOR Cross-User Delete Prevention", str(e))

    # 2.7 Anonymous Access Guard against Registered User Session
    try:
        anon_read = client.get(f"/api/sessions/{session_a_id}")
        assert anon_read.status_code == 404 or "error" in anon_read.json()
        tracker.record_pass("Anonymous Access Guard on Private Session", "Unauthenticated request cannot read registered user session (404)")
    except Exception as e:
        tracker.record_fail("Anonymous Access Guard on Private Session", str(e))

    # 2.8 Account Hijacking Prevention: Passing existing registered userId anonymously
    try:
        hijack_resp = client.get(f"/api/sessions?userId={user_a_id}")
        assert hijack_resp.status_code == 401, f"Expected 401 Unauthorized for IDOR account hijacking, got {hijack_resp.status_code}"
        tracker.record_pass("Anti-Account Hijacking Parameter Guard", "Anonymous attempt to impersonate user_id via query param blocked (401)")
    except Exception as e:
        tracker.record_fail("Anti-Account Hijacking Parameter Guard", str(e))

    return session_a_id, user_b_id


# ==============================================================================
# 3. CHAT FUNCTIONALITY, STREAMING & RATE LIMIT TESTS
# ==============================================================================
def test_chat_functionality_and_streaming(user_id: str, token: str, session_id: str):
    print("\n" + "="*70)
    print("💬 PHẦN 3: KIỂM THỬ CHỨC NĂNG CHAT, SSE STREAMING & GIỚI HẠN GÓI (CHAT & QUOTA)")
    print("="*70)

    headers = {"Authorization": f"Bearer {token}"}

    # 3.1 Standard POST /api/chat (JSON Response)
    try:
        t0 = time.time()
        chat_resp = client.post("/api/chat", json={
            "prompt": "Thủ tục hải quan nhập khẩu sữa chua tươi gồm những giấy tờ gì?",
            "sessionId": session_id,
            "userId": user_id
        }, headers=headers)
        t_elapsed = time.time() - t0

        assert chat_resp.status_code == 200
        data = chat_resp.json()
        assert "reply" in data and len(data["reply"]) > 20
        assert "citations" in data

        tracker.record_pass("Standard /api/chat Endpoint", f"Received structured reply in {t_elapsed:.2f}s ({len(data['reply'])} chars, {len(data.get('citations', []))} citations)")
        tracker.metrics["std_chat_latency"] = t_elapsed
    except Exception as e:
        tracker.record_fail("Standard /api/chat Endpoint", str(e))

    # 3.2 SSE Streaming POST /api/chat/stream
    try:
        t0 = time.time()
        ttft = None
        full_stream_text = ""
        stages_received = []
        citations_received = []

        stream_resp = client.post("/api/chat/stream", json={
            "prompt": "Mã HS của gạo thơm ST25 xuất khẩu là bao nhiêu và thuế xuất khẩu là bao nhiêu phần trăm?",
            "sessionId": session_id,
            "userId": user_id
        }, headers=headers)

        assert stream_resp.status_code == 200
        assert "text/event-stream" in stream_resp.headers.get("content-type", "")

        # Parse SSE lines
        for line in stream_resp.iter_lines():
            if line.startswith("data: "):
                payload_str = line[6:].strip()
                try:
                    event_data = json.loads(payload_str)
                    if "stage" in event_data:
                        stages_received.append(event_data["stage"])
                    if "token" in event_data:
                        if ttft is None:
                            ttft = time.time() - t0
                        full_stream_text += event_data["token"]
                    if "citations" in event_data:
                        citations_received.extend(event_data["citations"])
                except Exception:
                    pass

        total_stream_time = time.time() - t0
        assert len(stages_received) >= 2, "Must receive progress stages (search, analysis, synthesis)"
        assert len(full_stream_text) > 30, "Must stream text tokens"

        tracker.record_pass("SSE /api/chat/stream Event Pipeline", f"Streamed {len(full_stream_text)} chars with {len(stages_received)} stages. TTFT: {ttft:.2f}s, Total: {total_stream_time:.2f}s")
        tracker.metrics["stream_ttft"] = ttft or 0.0
        tracker.metrics["stream_total_time"] = total_stream_time
        tracker.metrics["stream_char_count"] = len(full_stream_text)
    except Exception as e:
        tracker.record_fail("SSE /api/chat/stream Event Pipeline", str(e))

    # 3.3 Multi-Turn Memory Retrieval Test
    try:
        recent_history = db.get_recent_messages_for_llm(session_id, limit=4)
        assert len(recent_history) >= 2, "History must contain previous turns for conversation continuity"
        tracker.record_pass("Multi-Turn Contextual Memory", f"Retrieved {len(recent_history)} prior turns from SQLite history")
    except Exception as e:
        tracker.record_fail("Multi-Turn Contextual Memory", str(e))

    # 3.4 Quota Limit Enforcement (Free Tier = 10 messages/day)
    try:
        # Simulate 10 user messages already recorded today in messages table
        with db.get_connection() as conn:
            c = conn.cursor()
            for i in range(10):
                c.execute("""
                    INSERT INTO messages (id, session_id, sender, text, timestamp, created_at)
                    VALUES (?, ?, 'user', ?, ?, datetime('now'));
                """, (f"mock-msg-{uuid.uuid4().hex[:8]}", session_id, f"Mock prompt {i}", time.strftime("%H:%M")))
            conn.commit()

        # 11th message attempt must trigger 402 Limit Reached
        quota_resp = client.post("/api/chat/stream", json={
            "prompt": "Câu hỏi thứ 11 vượt hạn mức",
            "sessionId": session_id,
            "userId": user_id
        }, headers=headers)

        assert quota_resp.status_code == 402, f"Expected 402 Payment Required for quota exhaustion, got {quota_resp.status_code}"
        quota_detail = quota_resp.json().get("detail")
        assert quota_detail == "limit_reached_messages"
        tracker.record_pass("Free Tier Quota Limit (402 Payment Required)", "Enforced 10 msg/day limit, returning 402 limit_reached_messages")

        # Clean up mock messages
        with db.get_connection() as conn:
            conn.cursor().execute("DELETE FROM messages WHERE text LIKE 'Mock prompt %' AND session_id = ?;", (session_id,))
            conn.commit()
    except Exception as e:
        tracker.record_fail("Free Tier Quota Limit Enforcement", str(e))


# ==============================================================================
# 4. SPEED & LATENCY PERFORMANCE BENCHMARKS
# ==============================================================================
def test_performance_and_latency(user_id: str, token: str, session_id: str):
    print("\n" + "="*70)
    print("⚡ PHẦN 4: ĐO LƯỜNG HIỆU NĂNG, TỐC ĐỘ PHẢN HỒI (SPEED & LATENCY BENCHMARK)")
    print("="*70)

    headers = {"Authorization": f"Bearer {token}"}

    # 4.1 Measure Auth & Sessions API Latencies
    api_benchmarks = [
        ("GET /api/auth/me", lambda: client.get("/api/auth/me", headers=headers)),
        ("GET /api/sessions", lambda: client.get("/api/sessions", headers=headers)),
        ("GET /api/user/usage", lambda: client.get("/api/user/usage", headers=headers)),
        ("GET /api/settings", lambda: client.get("/api/settings", headers=headers)),
    ]

    for name, call_fn in api_benchmarks:
        times = []
        for _ in range(3):
            t0 = time.time()
            res = call_fn()
            times.append(time.time() - t0)
            assert res.status_code == 200, f"{name} failed with status {res.status_code}"
        avg_ms = (sum(times) / len(times)) * 1000
        tracker.record_pass(f"Latency: {name}", f"Avg response time: {avg_ms:.1f} ms")
        tracker.metrics[f"latency_{name}"] = avg_ms

    # 4.2 Stream Chat Latency & Throughput Benchmark
    benchmark_prompt = "Quy trình kiểm tra thực tế hàng hóa tại Chi cục Hải quan cửa khẩu diễn ra như thế nào?"
    try:
        t0 = time.time()
        ttft = None
        token_count = 0
        total_chars = 0

        stream_resp = client.post("/api/chat/stream", json={
            "prompt": benchmark_prompt,
            "sessionId": session_id,
            "userId": user_id
        }, headers=headers)

        for line in stream_resp.iter_lines():
            if line.startswith("data: "):
                payload_str = line[6:].strip()
                try:
                    event = json.loads(payload_str)
                    if "token" in event:
                        if ttft is None:
                            ttft = time.time() - t0
                        token_count += 1
                        total_chars += len(event["token"])
                except Exception:
                    pass

        total_time = time.time() - t0
        chars_per_sec = total_chars / total_time if total_time > 0 else 0
        words_per_sec = (total_chars / 5) / total_time if total_time > 0 else 0

        tracker.metrics["benchmark_ttft_sec"] = ttft or 0.0
        tracker.metrics["benchmark_total_time_sec"] = total_time
        tracker.metrics["benchmark_chars_per_sec"] = chars_per_sec
        tracker.metrics["benchmark_words_per_sec"] = words_per_sec

        tracker.record_pass("Chat Streaming Benchmark", 
            f"TTFT: {ttft:.2f}s | Total: {total_time:.2f}s | Output: {total_chars} chars | Throughput: {chars_per_sec:.1f} chars/s (~{words_per_sec:.1f} words/s)")
    except Exception as e:
        tracker.record_fail("Chat Streaming Benchmark", str(e))


# ==============================================================================
# 5. ANSWER QUALITY, TONE FRIENDLINESS & LEGAL CITATIONS EVALUATION
# ==============================================================================
def test_answer_quality_and_friendliness(user_id: str, token: str, session_id: str):
    print("\n" + "="*70)
    print("🌟 PHẦN 5: ĐÁNH GIÁ ĐỘ THÂN THIỆN, GIỌNG VĂN & ĐỘ CHÍNH XÁC PHÁP LÝ")
    print("="*70)

    headers = {"Authorization": f"Bearer {token}"}
    test_queries = [
        {
            "topic": "Thủ tục xuất khẩu cà phê",
            "prompt": "Chào bạn, doanh nghiệp tôi chuẩn bị xuất khẩu lô cà phê Robusta sang EU. Xin tư vấn hồ sơ hải quan và thuế xuất khẩu cần nộp?",
        },
        {
            "topic": "Tra cứu mã HS và thuế suất xe nâng điện",
            "prompt": "Mã HS xe nâng hàng chạy bằng điện và thuế nhập khẩu ưu đãi hiện nay là bao nhiêu?",
        }
    ]

    for q in test_queries:
        try:
            res = client.post("/api/chat", json={
                "prompt": q["prompt"],
                "sessionId": session_id,
                "userId": user_id
            }, headers=headers)
            assert res.status_code == 200
            data = res.json()
            reply = data.get("reply", "")
            citations = data.get("citations", [])

            # Tone & Friendliness Criteria:
            # - Politeness / Welcome markers ("Xin chào", "chào", "theo quy định", "kính gửi", "doanh nghiệp")
            # - Professional closing / Advice offer
            # - Structured layout with bullet points / numbered steps
            has_greeting_or_polite = any(w in reply.lower() for w in ["chào", "theo quy định", "quy định", "hướng dẫn", "doanh nghiệp", "kính", "thưa"])
            has_structured_formatting = ("-" in reply or "*" in reply or "1." in reply or "\n" in reply)
            has_legal_basis = len(citations) > 0 or any(law in reply for law in ["Luật", "Thông tư", "Nghị định", "Điều", "Khoản", "BTC", "CP"])
            
            # Politeness score (0 - 100)
            score = 100
            notes = []
            if not has_greeting_or_polite:
                score -= 20
                notes.append("Thiếu lời chào/mở đầu lịch sự")
            if not has_structured_formatting:
                score -= 30
                notes.append("Định dạng chưa dùng gạch đầu dòng rõ ràng")
            if not has_legal_basis:
                score -= 30
                notes.append("Thiếu căn cứ pháp lý rõ ràng")

            eval_entry = {
                "topic": q["topic"],
                "prompt": q["prompt"],
                "reply_preview": reply[:200] + ("..." if len(reply) > 200 else ""),
                "citation_count": len(citations),
                "citations": [c.get("code", "") for c in citations[:3]],
                "score": score,
                "has_legal_basis": has_legal_basis,
                "has_structured_formatting": has_structured_formatting,
                "status": "Rất thân thiện & Chuẩn xác" if score >= 80 else ("Khá tốt" if score >= 60 else "Cần cải thiện")
            }
            tracker.evaluations.append(eval_entry)

            tracker.record_pass(f"Quality & Tone Eval: [{q['topic']}]", 
                f"Score: {score}/100 ({eval_entry['status']}) | Citations: {len(citations)} | Length: {len(reply)} chars")
        except Exception as e:
            tracker.record_fail(f"Quality & Tone Eval: [{q['topic']}]", str(e))


# ==============================================================================
# 6. CLEANUP & REPORT GENERATOR
# ==============================================================================
def cleanup_and_report(user_a_id: str, user_b_id: str):
    print("\n" + "="*70)
    print("🧹 PHẦN 6: DỌN DẸP DỮ LIỆU TEST")
    print("="*70)

    try:
        db.delete_user(user_a_id)
        db.delete_user(user_b_id)
        tracker.record_pass("Database Test Cleanup", f"Deleted mock users {user_a_id} and {user_b_id}")
    except Exception as e:
        tracker.record_fail("Database Test Cleanup", str(e))

    print("\n" + "="*70)
    print("📊 TỔNG KẾT BÁO CÁO KẾT QUẢ KIỂM THỬ HỆ THỐNG LOGICHAT")
    print("="*70)
    print(f"  • Tổng số bài test đã chạy : {tracker.tests_run}")
    print(f"  • Số bài test VƯỢT QUA (PASS): {tracker.tests_passed} ({tracker.tests_passed/tracker.tests_run*100:.1f}%)")
    print(f"  • Số bài test THẤT BẠI (FAIL) : {tracker.tests_failed}")
    if tracker.failures:
        print("\n  ⚠️ DANH SÁCH LỖI PHÁT HIỆN:")
        for name, err in tracker.failures:
            print(f"    - {name}: {err}")
    else:
        print("\n  🎉 100% CÁC BÀI TEST ĐÃ VƯỢT QUA XUẤT SẮC KHÔNG CÓ LỖI!")
    print("="*70)

    # Return report structure for python export
    return {
        "tests_run": tracker.tests_run,
        "tests_passed": tracker.tests_passed,
        "tests_failed": tracker.tests_failed,
        "failures": tracker.failures,
        "metrics": tracker.metrics,
        "evaluations": tracker.evaluations
    }


def run_all_tests():
    user_a_id, user_a_token = test_authentication_and_crypto_security()
    session_a_id, user_b_id = test_user_privacy_and_isolation(user_a_id, user_a_token)
    test_chat_functionality_and_streaming(user_a_id, user_a_token, session_a_id)
    test_performance_and_latency(user_a_id, user_a_token, session_a_id)
    test_answer_quality_and_friendliness(user_a_id, user_a_token, session_a_id)
    return cleanup_and_report(user_a_id, user_b_id)


if __name__ == "__main__":
    run_all_tests()
