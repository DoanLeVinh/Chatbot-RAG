"""
End-to-End Test Suite for HS Code & Customs Tax Estimator (Tính thuế XNK & Tra cứu mã HS)
Bao quát 100% các kịch bản: API tính thuế, tìm kiếm biểu thuế, SSE stream hook, DB persistence, và Non-regression.
"""

import pytest
import json
import uuid
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from serve import app
import db
import tariff_service

client = TestClient(app)


def test_01_api_calculate_tariff_mfn():
    """Kiểm tra API POST /api/tariff/calculate với kịch bản MFN."""
    payload = {
        "hsCode": "8516.79.90",
        "productName": "Nồi chiên không dầu",
        "quantity": 100,
        "unitPrice": 35,
        "currency": "USD",
        "coForm": "MFN",
        "customExchangeRate": 25450.0
    }
    response = client.post("/api/tariff/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["hsCode"] == "8516.79.90"
    assert data["vNk"] == 89075000
    assert data["tNk"] == 17815000
    assert data["tVat"] == 10689000
    assert data["totalTax"] == 28504000


def test_02_api_calculate_tariff_fta_form_e():
    """Kiểm tra API POST /api/tariff/calculate với C/O Form E (ACFTA 0%)."""
    payload = {
        "hsCode": "8516.79.90",
        "productName": "Nồi chiên không dầu",
        "quantity": 100,
        "unitPrice": 35,
        "currency": "USD",
        "coForm": "Form E",
        "customExchangeRate": 25450.0
    }
    response = client.post("/api/tariff/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["tNk"] == 0
    assert data["importTaxRate"] == 0.0
    assert data["totalTax"] == 8907500


def test_03_api_calculate_tariff_special_consumption():
    """Kiểm tra tính toán mặt hàng chịu thuế TTĐB (Rượu vang 65% TTĐB)."""
    payload = {
        "hsCode": "2204.21.11",
        "productName": "Rượu vang nho",
        "quantity": 100,
        "unitPrice": 20,
        "currency": "EUR",
        "coForm": "Form EUR.1",
        "customExchangeRate": 27200.0
    }
    response = client.post("/api/tariff/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["ttdbRate"] == 65.0
    assert data["tTtdb"] == 42432000
    assert data["totalTax"] == 64083200


def test_04_api_search_tariff():
    """Kiểm tra API GET /api/tariff/search tìm kiếm đúng nhóm hàng."""
    # Tìm kiếm theo từ khóa 'máy giặt'
    res = client.get("/api/tariff/search?q=máy giặt")
    assert res.status_code == 200
    data = res.json()
    assert len(data["results"]) >= 1
    assert any("8450" in item["hs_code"] for item in data["results"])

    # Tìm kiếm theo mã HS '8516'
    res_code = client.get("/api/tariff/search?q=8516")
    assert res_code.status_code == 200
    data_code = res_code.json()
    assert len(data_code["results"]) >= 1


def test_05_chat_stream_tax_estimator_flow():
    """Kiểm tra SSE stream /api/chat/stream phát sinh bảng tính thuế tự động khi người dùng chat."""
    session_id = f"test-tax-sess-{uuid.uuid4().hex[:8]}"
    prompt = "Tính thuế nhập khẩu 100 chiếc nồi chiên không dầu từ Trung Quốc có C/O Form E đơn giá 35 USD"

    with client.stream("POST", "/api/chat/stream", json={"prompt": prompt, "sessionId": session_id}) as response:
        assert response.status_code == 200
        events = []
        for line in response.iter_lines():
            if line.startswith("data: "):
                raw_json = line[6:]
                try:
                    events.append(json.loads(raw_json))
                except Exception:
                    pass

        # Kiểm tra sự kiện stages
        stages = [e.get("stage") for e in events if e.get("stage")]
        assert any("mã HS" in s or "biểu thuế" in s for s in stages)

        # Kiểm tra payload kết thúc có chứa dữ liệu tax_calc
        final_events = [e for e in events if e.get("done") is True]
        assert len(final_events) == 1
        final_event = final_events[0]
        assert "tax" in final_event
        assert final_event["tax"]["hsCode"] == "8516.79.90"
        assert final_event["tax"]["totalTax"] > 0

    # Kiểm tra tin nhắn và bảng tính đã được lưu vào SQLite DB
    session_data = db.get_session_detail(session_id)
    assert session_data is not None
    messages = session_data["messages"]
    assert len(messages) == 2  # 1 user + 1 ai
    ai_msg = messages[1]
    assert ai_msg["tax"] is not None
    assert ai_msg["tax"]["hsCode"] == "8516.79.90"


def test_06_non_regression_quiz_generator():
    """Kiểm tra không phá vỡ tính năng Quiz Generator (10 câu hỏi tối thiểu)."""
    session_id = f"test-quiz-regress-{uuid.uuid4().hex[:8]}"
    prompt = "Tạo bài trắc nghiệm 10 câu về Luật Hải quan 2014"

    with client.stream("POST", "/api/chat/stream", json={"prompt": prompt, "sessionId": session_id}) as response:
        assert response.status_code == 200
        events = []
        for line in response.iter_lines():
            if line.startswith("data: "):
                raw_json = line[6:]
                try:
                    events.append(json.loads(raw_json))
                except Exception:
                    pass

        final_events = [e for e in events if e.get("done") is True]
        assert len(final_events) == 1
        quiz_data = final_events[0].get("quiz")
        assert quiz_data is not None
        assert quiz_data["totalQuestions"] >= 10
