"""
Unit test suite for backend/tariff_service.py
Kiểm tra các hàm nhận diện ý định, trích xuất tham số, và công thức tính thuế XNK chính xác từng đồng VNĐ.
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import tariff_service


def test_01_is_tax_intent_detection():
    """Kiểm tra nhận diện chính xác các câu hỏi có ý định tra cứu mã HS & tính thuế."""
    positive_prompts = [
        "Tính thuế nhập khẩu 100 nồi chiên không dầu từ Trung Quốc có C/O Form E đơn giá 35 USD",
        "Tra cứu mã HS cho máy giặt lồng ngang 9kg nhập từ Hàn Quốc",
        "Nhập 500 chai rượu vang từ Pháp trị giá 20 EUR/chai tính thuế hết bao nhiêu?",
        "Mã HS của máy tính xách tay và thuế nhập khẩu là bao nhiêu?",
        "Ước tính bảng thuế xuất nhập khẩu xe ô tô 5 chỗ",
        "Áp mã HS và tính thuế cho lô hàng son môi",
        "Thuế suất MFN và Form D của bia lon",
        "Calculate customs import tax for laptop"
    ]
    for p in positive_prompts:
        assert tariff_service.is_tax_intent(p) is True, f"Failed to detect tax intent for: {p}"

    negative_prompts = [
        "Quy định về khai hải quan điện tử tại Điều 25 Luật Hải quan",
        "Thủ tục cấp Giấy chứng nhận xuất xứ hàng hóa C/O",
        "Tạo bài trắc nghiệm về Luật Hải quan 2014",
        "Xin chào bạn, hôm nay thời tiết thế nào?"
    ]
    for p in negative_prompts:
        assert tariff_service.is_tax_intent(p) is False, f"False positive tax intent for: {p}"


def test_02_extract_tax_params():
    """Kiểm tra trích xuất chính xác số lượng, đơn giá, ngoại tệ, C/O và xuất xứ."""
    # Test case 1: Nồi chiên không dầu + Form E + USD
    p1 = "Tính thuế nhập 100 chiếc nồi chiên không dầu đơn giá 35 USD từ Trung Quốc có C/O Form E"
    res1 = tariff_service.extract_tax_params(p1)
    assert res1["quantity"] == 100.0
    assert res1["unit_price"] == 35.0
    assert res1["currency"] == "USD"
    assert res1["co_form"] == "Form E"

    # Test case 2: Rượu vang + EUR + Form EUR.1
    p2 = "Ước tính thuế cho 500 chai rượu vang từ Pháp giá 20 EUR có C/O Form EUR.1"
    res2 = tariff_service.extract_tax_params(p2)
    assert res2["quantity"] == 500.0
    assert res2["unit_price"] == 20.0
    assert res2["currency"] == "EUR"
    assert res2["co_form"] == "Form EUR.1"

    # Test case 3: Máy giặt + Hàn Quốc + Form VK
    p3 = "Nhập khẩu 50 máy giặt từ Hàn Quốc có C/O đơn giá 250 USD"
    res3 = tariff_service.extract_tax_params(p3)
    assert res3["quantity"] == 50.0
    assert res3["unit_price"] == 250.0
    assert res3["currency"] == "USD"
    assert res3["co_form"] == "Form VK"


def test_03_hs_code_matching():
    """Kiểm tra tìm kiếm đúng mã HS từ cơ sở dữ liệu biểu thuế."""
    item_fryer = tariff_service.match_hs_and_tariff("nồi chiên không dầu")
    assert item_fryer["hs_code"] == "8516.79.90"

    item_washer = tariff_service.match_hs_and_tariff("máy giặt lồng ngang 9kg")
    assert item_washer["hs_code"] == "8450.11.10"

    item_wine = tariff_service.match_hs_and_tariff("rượu vang nho đỏ pháp")
    assert item_wine["hs_code"] == "2204.21.11"
    assert item_wine["special_consumption_rate"] == 65.0

    item_car = tariff_service.match_hs_and_tariff("ô tô con 5 chỗ 2000cc")
    assert item_car["hs_code"] == "8703.23.90"
    assert item_car["special_consumption_rate"] == 50.0


def test_04_exact_tax_calculation_mfn_vs_fta():
    """Kiểm tra tính toán số học chuẩn xác từng đồng VNĐ theo Luật Thuế XNK 107/2016/QH13."""
    commodity = {
        "hs_code": "8516.79.90",
        "name_vi": "Nồi chiên không dầu",
        "unit": "Chiếc",
        "mfn_rate": 20.0,
        "vat_rate": 10.0,
        "special_consumption_rate": 0.0,
        "environmental_tax_rate": 0.0,
        "fta_rates": {
            "Form E": { "rate": 0.0, "agreement": "ACFTA", "co_form": "Form E" }
        }
    }

    # Kịch bản 1: Thuế MFN (20% NK + 10% VAT, tỷ giá 25.450)
    # Lô hàng: 100 chiếc × 35 USD = 3.500 USD
    # V_NK = 3.500 × 25.450 = 89.075.000 VNĐ
    # T_NK = 89.075.000 × 20% = 17.815.000 VNĐ
    # V_VAT = 89.075.000 + 17.815.000 = 106.890.000 VNĐ
    # T_VAT = 106.890.000 × 10% = 10.689.000 VNĐ
    # Tổng thuế = 17.815.000 + 10.689.000 = 28.504.000 VNĐ
    calc_mfn = tariff_service.calculate_customs_tax(
        quantity=100,
        unit_price=35,
        currency="USD",
        commodity=commodity,
        co_form="MFN",
        custom_exchange_rate=25450.0
    )
    assert calc_mfn["vNk"] == 89075000
    assert calc_mfn["tNk"] == 17815000
    assert calc_mfn["tTtdb"] == 0
    assert calc_mfn["tVat"] == 10689000
    assert calc_mfn["totalTax"] == 28504000

    # Kịch bản 2: Có C/O Form E hưởng thuế NK 0%
    # T_NK = 0 VNĐ
    # V_VAT = 89.075.000 VNĐ
    # T_VAT = 89.075.000 × 10% = 8.907.500 VNĐ
    # Tổng thuế = 8.907.500 VNĐ
    calc_fta = tariff_service.calculate_customs_tax(
        quantity=100,
        unit_price=35,
        currency="USD",
        commodity=commodity,
        co_form="Form E",
        custom_exchange_rate=25450.0
    )
    assert calc_fta["tNk"] == 0
    assert calc_fta["tVat"] == 8907500
    assert calc_fta["totalTax"] == 8907500


def test_05_special_consumption_tax_calculation():
    """Kiểm tra tính toán hàng hóa chịu thuế Tiêu thụ đặc biệt (Rượu vang TTĐB 65%)."""
    wine_commodity = {
        "hs_code": "2204.21.11",
        "name_vi": "Rượu vang nho",
        "unit": "Chai",
        "mfn_rate": 50.0,
        "special_consumption_rate": 65.0,
        "vat_rate": 10.0,
        "environmental_tax_rate": 0.0,
        "fta_rates": {
            "Form EUR.1": { "rate": 20.0, "agreement": "EVFTA", "co_form": "Form EUR.1" }
        }
    }

    # Lô hàng: 100 chai × 20 EUR, tỷ giá 27.200 đ
    # CIF = 2.000 EUR
    # V_NK = 2.000 × 27.200 = 54.400.000 VNĐ
    # Có Form EUR.1 (Thuế NK 20%): T_NK = 54.400.000 × 20% = 10.880.000 VNĐ
    # Giá tính TTĐB = V_NK + T_NK = 54.400.000 + 10.880.000 = 65.280.000 VNĐ
    # T_TTDB = 65.280.000 × 65% = 42.432.000 VNĐ
    # Giá tính VAT = V_NK + T_NK + T_TTDB = 65.280.000 + 42.432.000 = 107.712.000 VNĐ
    # T_VAT = 107.712.000 × 10% = 10.771.200 VNĐ
    # Tổng thuế = 10.880.000 + 42.432.000 + 10.771.200 = 64.083.200 VNĐ
    calc_wine = tariff_service.calculate_customs_tax(
        quantity=100,
        unit_price=20,
        currency="EUR",
        commodity=wine_commodity,
        co_form="Form EUR.1",
        custom_exchange_rate=27200.0
    )
    assert calc_wine["vNk"] == 54400000
    assert calc_wine["tNk"] == 10880000
    assert calc_wine["tTtdb"] == 42432000
    assert calc_wine["tVat"] == 10771200
    assert calc_wine["totalTax"] == 64083200
