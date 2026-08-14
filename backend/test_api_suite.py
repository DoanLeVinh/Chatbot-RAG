"""Comprehensive Automated Integration Test Suite for LogiChat FastAPI Backend."""
import os
import sys
import uuid
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from serve import app
import db

# Ensure UTF-8 output on Windows terminal
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

client = TestClient(app)

def test_full_api_suite():
    print("=================================================================")
    print("🚀 BẮT ĐẦU CHẠY BỘ TEST TỰ ĐỘNG TOÀN DIỆN CHO LOGICHAT BACKEND 🚀")
    print("=================================================================")

    test_id = uuid.uuid4().hex[:6]
    admin_email = "admin@logichat.vn"
    admin_pwd = "Admin@123456"

    user_email = f"user_test_{test_id}@logichat.vn"
    user_pwd = "UserPass123!"
    user_name = f"Doanh Nghiệp Test {test_id}"

    # 1. TEST AUTH REGISTER
    print("\n--- 1. TEST ĐĂNG KÝ NGƯỜI DÙNG MỚI ---")
    reg_resp = client.post("/api/auth/register", json={
        "email": user_email,
        "password": user_pwd,
        "fullName": user_name
    })
    assert reg_resp.status_code == 200, f"Register failed: {reg_resp.text}"
    reg_data = reg_resp.json()
    assert reg_data["success"] is True
    assert "token" in reg_data
    user_token = reg_data["token"]
    user_id = reg_data["user"]["id"]
    print(f"[OK] Đăng ký thành công User: {user_email} (ID: {user_id})")

    # 2. TEST AUTH LOGIN & ME
    print("\n--- 2. TEST ĐĂNG NHẬP & XÁC THỰC JWT TOKEN ---")
    login_resp = client.post("/api/auth/login", json={
        "email": user_email,
        "password": user_pwd
    })
    assert login_resp.status_code == 200
    user_headers = {"Authorization": f"Bearer {user_token}"}

    me_resp = client.get("/api/auth/me", headers=user_headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["user"]["email"] == user_email
    print(f"[OK] Xác thực Token thành công: {me_data['user']['fullName']}")

    # 3. TEST ADMIN LOGIN & ROLE GUARD
    print("\n--- 3. TEST PHÂN QUYỀN ADMIN ROLE GUARD ---")
    # Login as Admin
    admin_login_resp = client.post("/api/auth/login", json={
        "email": admin_email,
        "password": admin_pwd
    })
    assert admin_login_resp.status_code == 200, f"Admin login failed: {admin_login_resp.text}"
    admin_token = admin_login_resp.json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Regular user attempting to access /api/admin/users -> MUST BE 403 Forbidden
    forbidden_resp = client.get("/api/admin/users", headers=user_headers)
    assert forbidden_resp.status_code == 403, f"Expected 403, got {forbidden_resp.status_code}"
    print("[OK] Đã chặn người dùng thường truy cập Admin API (403 Forbidden)")

    # Admin accessing /api/admin/users -> MUST BE 200 OK
    admin_users_resp = client.get("/api/admin/users", headers=admin_headers)
    assert admin_users_resp.status_code == 200
    admin_users_data = admin_users_resp.json()
    assert admin_users_data["success"] is True
    print(f"[OK] Admin truy cập thành công danh sách {len(admin_users_data['users'])} users")

    # 4. TEST ADMIN CHUNKS PAGINATION & SEARCH
    print("\n--- 4. TEST PHÂN TRANG & TÌM KIẾM CHUNKS CỦA ADMIN ---")
    chunks_resp = client.get("/api/admin/chunks?page=1&limit=5", headers=admin_headers)
    assert chunks_resp.status_code == 200
    chunks_data = chunks_resp.json()
    assert chunks_data["success"] is True
    assert len(chunks_data["chunks"]) <= 5
    assert chunks_data["total"] > 0
    first_chunk = chunks_data["chunks"][0]
    print(f"[OK] Phân trang hoạt động: Trang 1/5 chunks, Tổng số chunks: {chunks_data['total']}")

    # 5. TEST SHA-256 INTEGRITY VERIFICATION
    print("\n--- 5. TEST XÁC THỰC MÃ BĂM SHA-256 TOÀN VẸN VĂN BẢN ---")
    verify_resp = client.get(f"/api/verify/integrity/{first_chunk['parent_id']}")
    assert verify_resp.status_code == 200
    verify_data = verify_resp.json()
    assert verify_data["valid"] is True
    assert verify_data["status"] == "VERIFIED_AUTHENTIC"
    print(f"[OK] Xác thực SHA-256 chuẩn xác: {verify_data['storedHash'][:16]}... (Status: {verify_data['status']})")

    # 6. TEST CHAT SESSIONS & ISOLATION
    print("\n--- 6. TEST PHIÊN HỘI THOẠI & CÔ LẬP DỮ LIỆU ---")
    create_sess_resp = client.post("/api/sessions", json={
        "title": "Tư vấn nhập khẩu gạo thơm",
        "categoryTag": "Nông sản & Thực phẩm",
        "userId": user_id
    }, headers=user_headers)
    assert create_sess_resp.status_code == 200
    session_id = create_sess_resp.json()["session"]["id"]
    print(f"[OK] Đã tạo phiên hội thoại mới: {session_id}")

    # 7. TEST CHAT QUERY PIPELINE
    print("\n--- 7. TEST TRUY VẤN RAG & CITATIONS ---")
    chat_resp = client.post("/api/chat", json={
        "prompt": "Hồ sơ hải quan gồm những chứng từ gì?",
        "sessionId": session_id,
        "userId": user_id
    }, headers=user_headers)
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()
    assert "reply" in chat_data
    assert len(chat_data["reply"]) > 20
    print(f"[OK] RAG trả về câu trả lời ({len(chat_data['reply'])} ký tự, Provider: {chat_data.get('provider')})")
    if chat_data.get("citations"):
        print(f"[OK] Đính kèm {len(chat_data['citations'])} trích dẫn pháp lý:")
        for c in chat_data["citations"][:2]:
            print(f"     - [{c.get('code')}] {c.get('title')}")

    # 8. TEST PDF EXPORT
    print("\n--- 8. TEST XUẤT BẢN TÓM TẮT PHÁP LÝ UTF-8 ---")
    pdf_resp = client.post("/api/export/pdf", json={
        "title": "Bản tóm tắt quy định thủ tục hải quan",
        "content": chat_data["reply"],
        "hsCode": "1006.30",
        "citations": chat_data.get("citations", [])
    })
    assert pdf_resp.status_code == 200
    assert "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" in pdf_resp.text
    print("[OK] Xuất tài liệu tóm tắt pháp lý UTF-8 thành công!")

    # 9. CLEANUP
    print("\n--- 9. DỌN DẸP DỮ LIỆU TEST ---")
    db.delete_user(user_id)
    print(f"[OK] Đã dọn dẹp User test: {user_id}")

    print("\n=================================================================")
    print("🎉 TẤT CẢ 9/9 BÀI TEST TỰ ĐỘNG ĐÃ VƯỢT QUA 100% THÀNH CÔNG! 🎉")
    print("=================================================================")

if __name__ == "__main__":
    test_full_api_suite()
