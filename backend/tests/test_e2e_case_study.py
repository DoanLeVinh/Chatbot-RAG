"""
End-to-End Test Suite for Case Study & Scenario Reasoning Engine
Kiểm tra toàn diện các REST API: /api/case-study/generate, /api/case-study/{id}, /api/case-study/{id}/submit, /api/case-study/history.
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from serve import app
import db
import case_study_service

client = TestClient(app)

def test_01_api_generate_case_study():
    """Kiểm tra API POST /api/case-study/generate."""
    payload = {
        "category": "valuation_incoterms",
        "difficulty": "medium",
        "userId": "test-user-e2e"
    }
    response = client.post("/api/case-study/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "valuation_incoterms"
    assert "id" in data
    assert len(data["questions"]) >= 3
    assert len(data["documents"]) >= 3
    assert "solution" in data

def test_02_api_get_case_study_detail_masked_and_unmasked():
    """Kiểm tra API GET /api/case-study/{case_id} ẩn/hiện đáp án."""
    cs = case_study_service.generate_case_study(category="multi_tax_trade_defense")
    case_id = cs["id"]

    # 1. Mặc định: Không lộ đáp án trước khi yêu cầu
    res_masked = client.get(f"/api/case-study/{case_id}")
    assert res_masked.status_code == 200
    data_masked = res_masked.json()
    assert data_masked["id"] == case_id
    assert data_masked["solution"] is None

    # 2. Yêu cầu xem đáp án chuẩn
    res_unmasked = client.get(f"/api/case-study/{case_id}?include_solution=true")
    assert res_unmasked.status_code == 200
    data_unmasked = res_unmasked.json()
    assert data_unmasked["solution"] is not None
    assert "final_numbers" in data_unmasked["solution"]

def test_03_api_submit_and_grade_case_study():
    """Kiểm tra nộp bài tự luận và nhận kết quả chấm điểm."""
    cs = case_study_service.generate_case_study(category="origin_co_dispute")
    case_id = cs["id"]

    submission_payload = {
        "solution": (
            "Theo Quy tắc 23 Thông tư 12/2019/TT-BCT, trường hợp hóa đơn bên thứ ba phát hành, "
            "ô số 13 trên C/O Form E bắt buộc phải được đánh dấu. Cơ quan hải quan sẽ yêu cầu doanh nghiệp "
            "tạm nộp thuế theo mức MFN để thông quan hàng hóa và tiến hành gửi văn bản xác minh xuất xứ. "
            "Nếu bị bác bỏ, doanh nghiệp phải nộp thuế chênh lệch MFN 20% là 89,075,000 VNĐ "
            "và thuế GTGT chênh lệch 8,907,500 VNĐ. Tổng số tiền nộp thêm là 97,982,500 VNĐ."
        ),
        "userId": "test-student-1"
    }

    res = client.post(f"/api/case-study/{case_id}/submit", json=submission_payload)
    assert res.status_code == 200
    result = res.json()
    assert result["score"] >= 8.0
    assert result["passed"] is True
    assert len(result["rubricScores"]) == 4
    assert "submissionId" in result

def test_04_api_get_user_case_study_history():
    """Kiểm tra lấy lịch sử bài làm tự luận của người dùng."""
    res = client.get("/api/case-study/history?user_id=test-student-1")
    assert res.status_code == 200
    data = res.json()
    assert "history" in data
    assert len(data["history"]) >= 1
    item = data["history"][0]
    assert "score" in item
    assert "passed" in item
