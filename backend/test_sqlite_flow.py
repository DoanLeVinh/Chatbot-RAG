"""Automated Integration & Verification Test for LogiChat SQLite Backend."""
import os
import sys
import uuid
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import db

# Ensure UTF-8 output on Windows terminal
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

def test_full_sqlite_flow():
    print("=== TEST 1: Database Initialization ===")
    db.init_db()
    assert Path(db.DB_PATH).exists(), "Database file logichat.db should exist"
    print("[OK] SQLite database initialized successfully at:", db.DB_PATH)

    print("\n=== TEST 2: User Registration & PBKDF2 Password Hashing ===")
    test_run_id = uuid.uuid4().hex[:6]
    user1_email = f"user1_{test_run_id}@logichat.vn"
    user1_pwd = "Password123!"
    user1_name = "Công ty XNK A"

    reg1 = db.register_user(user1_email, user1_pwd, user1_name)
    assert reg1["email"] == user1_email
    assert reg1["fullName"] == user1_name
    print("[OK] Registered User 1 successfully:", reg1)

    # Test duplicate registration rejection
    try:
        db.register_user(user1_email, user1_pwd, user1_name)
        assert False, "Should have failed on duplicate email"
    except ValueError as e:
        print("[OK] Successfully rejected duplicate email:", e)

    # Register User 2 for user isolation test
    user2_email = f"user2_{test_run_id}@logichat.vn"
    user2_pwd = "Password456!"
    user2_name = "Công ty XNK B"
    reg2 = db.register_user(user2_email, user2_pwd, user2_name)
    print("[OK] Registered User 2 successfully:", reg2)

    print("\n=== TEST 3: User Login Authentication ===")
    login1 = db.login_user(user1_email, user1_pwd)
    assert login1["id"] == reg1["id"]
    print("[OK] User 1 authenticated successfully:", login1)

    try:
        db.login_user(user1_email, "WrongPassword!")
        assert False, "Should have failed on wrong password"
    except ValueError as e:
        print("[OK] Successfully rejected invalid password:", e)

    print("\n=== TEST 4: User Session Creation & Strict Isolation ===")
    # Create session for User 1
    s1 = db.create_session(user_id=reg1["id"], title="Tư vấn nhập khẩu vi mạch A", category_tag="Linh kiện điện tử")
    # Create session for User 2
    s2 = db.create_session(user_id=reg2["id"], title="Tư vấn xuất khẩu gạo B", category_tag="Thuế xuất khẩu")

    # Fetch User 1 sessions — must NOT contain User 2's session
    u1_sessions = db.get_user_sessions(user_id=reg1["id"])["sessions"]
    u1_ids = [s["id"] for s in u1_sessions]
    assert s1["id"] in u1_ids, "User 1 should see session 1"
    assert s2["id"] not in u1_ids, "User 1 MUST NOT see User 2's session"
    print("[OK] User 1 session list verified (isolated):", [s["title"] for s in u1_sessions])

    # Fetch User 2 sessions — must NOT contain User 1's session
    u2_sessions = db.get_user_sessions(user_id=reg2["id"])["sessions"]
    u2_ids = [s["id"] for s in u2_sessions]
    assert s2["id"] in u2_ids, "User 2 should see session 2"
    assert s1["id"] not in u2_ids, "User 2 MUST NOT see User 1's session"
    print("[OK] User 2 session list verified (isolated):", [s["title"] for s in u2_sessions])

    print("\n=== TEST 5: Message Addition & Structured Data Storage ===")
    msg_id = db.add_message(
        session_id=s1["id"],
        sender="user",
        text="Thuế nhập khẩu linh kiện 8542.31 từ Nhật Bản?",
        timestamp="10:00"
    )
    assert msg_id.startswith("user-")

    ai_msg_id = db.add_message(
        session_id=s1["id"],
        sender="ai",
        text="Mặt hàng mã HS 8542.31 có thuế nhập khẩu ưu đãi VJEPA là 0%.",
        timestamp="10:01",
        hs_code="8542.31",
        taxes=[{"label": "Thuế VJEPA", "rate": "0%", "citationCode": "NĐ 119/2022/NĐ-CP"}],
        citations=[{"code": "NĐ 119/2022/NĐ-CP", "title": "Nghị định 119/2022/NĐ-CP"}]
    )
    assert ai_msg_id.startswith("ai-")

    detail = db.get_session_detail(s1["id"], user_id=reg1["id"])
    assert len(detail["messages"]) >= 2
    assert detail["messages"][-1]["hsCode"] == "8542.31"
    print("[OK] Messages and structured response persisted successfully in SQLite!")

    print("\n=== TEST 6: File Upload & Attachment Persistence ===")
    att = db.save_attachment(
        session_id=s1["id"],
        user_id=reg1["id"],
        file_name="ToKhaiHaiQuan.pdf",
        file_size="150 KB",
        file_type="pdf",
        file_url="/uploads/sample.pdf"
    )
    assert att["name"] == "ToKhaiHaiQuan.pdf"
    print("[OK] Attachment saved to SQLite:", att)

    print("\n=== TEST 7: Settings Persistence ===")
    set1 = db.get_user_settings(reg1["id"])
    assert set1["autoCite"] == True

    updated_set = db.update_user_settings(reg1["id"], auto_cite=False, law_database="2023-2024", font_size="large")
    assert updated_set["autoCite"] == False
    assert updated_set["fontSize"] == "large"
    print("[OK] Settings updated in SQLite:", updated_set)

    # Cleanup test data
    db.delete_user(reg1["id"])
    db.delete_user(reg2["id"])
    print("[OK] Test users cleaned up.")

    print("\n=== ALL TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    test_full_sqlite_flow()
