"""
Module: Customs Tariff & Tax Estimator Service (Tra cứu Mã HS & Tính Thuế XNK)
Hiện thực hóa Nhóm 1 (Mã HS) & Nhóm 3 (Thuế XNK) tuân thủ 100% tài liệu openspec.md
"""

import os
import re
import json
import logging
from typing import Optional, Dict, Any, Tuple, List

from db import get_connection

logger = logging.getLogger("tariff_service")

# Đường dẫn file cơ sở dữ liệu biểu thuế
TARIFF_DB_PATH = os.path.join(os.path.dirname(__file__), "data", "tariff_database.json")

# Regex nhận diện ý định tra cứu mã HS & tính thuế
TAX_INTENT_PATTERNS = [
    r"(t[iíì]nh|u[oớ]c\s*t[iíì]nh|d[uự]\s*to[aá]n|b[aả]ng\s*t[iíì]nh|t[iíì]nh\s*to[aá]n).*(thu[eế]|ti[eề]n\s*thu[eế])",
    r"(tra\s*c[uứ]u|t[iì]m|g[oợ]i\s*[yý]|áp|x[aá]c\s*[đd][iị]nh).*(m[aã]\s*hs|hs\s*code|m[aã]\s*s[oố]\s*h[aà]ng)",
    r"m[aã]\s*hs\s*(c[uủ]a|cho)\s+[a-z0-9\s]+",
    r"thu[eế]\s*su[aấ]t.*(mfn|fta|form\s*[a-z0-9\.]+|ưu\s*đãi|nh[aậ]p\s*kh[aẩ]u|xu[aấ]t\s*kh[aẩ]u)",
    r"thu[eế]\s*su[aấ]t\s*(c[uủ]a|cho)\s+[a-z0-9\s]+",
    r"(calculate|estimate|customs).*(tax|duty|tariff|rate|hs\s*code)",
    r"\b(customs\s*duty|import\s*tax|export\s*tax|tariff\s*rate)\b"
]

def load_tariff_db() -> Dict[str, Any]:
    """Nạp cơ sở dữ liệu biểu thuế chuẩn từ file JSON."""
    if os.path.exists(TARIFF_DB_PATH):
        try:
            with open(TARIFF_DB_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading tariff database: {e}")
    return {"exchange_rates": {"USD": 25450, "EUR": 27200, "CNY": 3520, "VND": 1}, "commodities": []}

def is_tax_intent(prompt: str) -> bool:
    """Kiểm tra xem câu chat có ý định tra cứu mã HS hoặc tính thuế xuất nhập khẩu cho mặt hàng cụ thể hay không."""
    if not prompt:
        return False
    text = prompt.strip().lower()

    # 1. Các câu hỏi lý thuyết, phân loại sắc thuế hoặc thủ tục pháp lý chung (KHÔNG PHẢI TÍNH THUẾ CHO ĐƠN HÀNG)
    # Ví dụ: "khi xuất khẩu thì sẽ có những loại thuế gì", "hàng xuất khẩu chịu thuế gì", "thuế xuất khẩu là gì"
    conceptual_patterns = [
        r"(c[oó]\s*(nh[uữ]ng)?\s*(lo[aạ]i|s[aắ]c)?\s*thu[eế]\s*(g[iì]|n[aà]o))",
        r"(g[oồ]m\s*(nh[uữ]ng)?\s*(lo[aạ]i|s[aắ]c)?\s*thu[eế]\s*(g[iì]|n[aà]o))",
        r"(c[aá]c\s*(lo[aạ]i|s[aắ]c)\s*thu[eế])",
        r"(thu[eế]\s*(xu[aấ]t|nh[aậ]p)\s*kh[aẩ]u\s*l[aà]\s*g[iì])",
        r"(\b(l[aà]\s*g[iì]|nh[uư]\s*th[eế]\s*n[aà]o|quy\s*[đd][iị]nh\s*v[eề]|ch[ií]nh\s*s[aá]ch\s*v[eề]|th[uủ]\s*t[uụ]c\s*(ho[aà]n|mi[eễ]n|gi[aả]m)?\s*thu[eế]|nguy[eê]n\s*t[aắ]c|ph[uư][oơ]ng\s*ph[aá]p\s*t[iíì]nh\s*thu[eế]\s*theo\s*lu[aậ]t|[đd][oố]i\s*t[uư][oợ]ng\s*ch[iị]u\s*thu[eế]|[đd][oố]i\s*t[uư][oợ]ng\s*mi[eễ]n\s*thu[eế])\b)",
    ]
    # Nếu khớp câu hỏi lý thuyết và không chứa số lượng/đơn giá cụ thể để tính toán
    has_order_calc = any(re.search(p, text, re.IGNORECASE) for p in [
        r"(t[iíì]nh|u[oớ]c\s*t[iíì]nh|d[uự]\s*to[aá]n|b[aả]ng\s*t[iíì]nh).*(l[oô]\s*h[aà]ng|chi[eế]c|c[aá]i|kg|t[aấ]n|usd|eur|cho\s+m[aặ]t\s*h[aà]ng)",
        r"\b\d+\s*(chi[eế]c|c[aá]i|kg|t[aấ]n|lon|chai|h[oộ]p|pcs|units?)\b",
        r"\b\d+\s*(usd|\$|eur|€|cny)\b"
    ])
    
    for cp in conceptual_patterns:
        if re.search(cp, text, re.IGNORECASE) and not has_order_calc:
            return False

    # 2. Kiểm tra các mẫu ý định tính toán / tra cứu cụ thể
    for pattern in TAX_INTENT_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

def extract_tax_params(prompt: str) -> Dict[str, Any]:
    """Trích xuất các thông số mặt hàng, số lượng, đơn giá, ngoại tệ, xuất xứ và C/O từ câu chat."""
    text = prompt.strip()
    lower = text.lower()

    # 1. Trích xuất số lượng (Quantity)
    quantity = 100.0
    qty_match = re.search(r"(\d+(?:[\.,]\d+)?)\s*(?:chiếc|cái|lon|chai|kg|tấn|hộp|lít|bộ|thùng|pcs|units?|sets?)", lower)
    if qty_match:
        try:
            raw_qty = qty_match.group(1).replace(",", ".")
            quantity = float(raw_qty)
        except ValueError:
            quantity = 100.0
    else:
        # Tìm số nguyên đứng trước từ 'nồi', 'máy', 'chai', 'áo', 'xe'
        num_standalone = re.search(r"(?:nhập|mua|nhập khẩu|có)\s+(\d+)\s+", lower)
        if num_standalone:
            try:
                quantity = float(num_standalone.group(1))
            except ValueError:
                quantity = 100.0

    # 2. Trích xuất đơn giá & ngoại tệ (Unit price & Currency)
    unit_price = 50.0
    currency = "USD"
    
    # Tìm theo cụm "đơn giá 35 usd" hoặc "giá 20 eur" hoặc "35 usd/chiếc"
    price_match = re.search(r"(?:đơn\s*giá|giá|trị\s*giá)?\s*(\d+(?:[\.,]\d+)?)\s*(usd|\$|eur|€|cny|tệ|¥|jpy|yen|krw|vnd|đ|đồng)", lower)
    if price_match:
        try:
            unit_price = float(price_match.group(1).replace(",", "."))
            curr_raw = price_match.group(2)
            if curr_raw in ["usd", "$"]:
                currency = "USD"
            elif curr_raw in ["eur", "€"]:
                currency = "EUR"
            elif curr_raw in ["cny", "tệ", "¥"]:
                currency = "CNY"
            elif curr_raw in ["jpy", "yen"]:
                currency = "JPY"
            elif curr_raw in ["krw"]:
                currency = "KRW"
            elif curr_raw in ["vnd", "đ", "đồng"]:
                currency = "VND"
        except ValueError:
            unit_price = 50.0
    else:
        # Thử tìm số tiền USD/EUR độc lập
        raw_price = re.search(r"(\d+(?:[\.,]\d+)?)\s*\$", lower)
        if raw_price:
            try:
                unit_price = float(raw_price.group(1).replace(",", "."))
                currency = "USD"
            except ValueError:
                pass

    # 3. Trích xuất Form C/O
    co_form = "MFN"
    if re.search(r"\b(form\s*eur(?:\.1)?|evfta)\b", lower):
        co_form = "Form EUR.1"
    elif re.search(r"\b(form\s*vk|vkfta)\b", lower):
        co_form = "Form VK"
    elif re.search(r"\b(form\s*ak|akfta)\b", lower):
        co_form = "Form AK"
    elif re.search(r"\b(form\s*d|atiga|asean)\b", lower):
        co_form = "Form D"
    elif re.search(r"\b(form\s*cptpp|cptpp)\b", lower):
        co_form = "Form CPTPP"
    elif re.search(r"\b(form\s*vj|vjepa)\b", lower):
        co_form = "Form VJ"
    elif re.search(r"\b(form\s*aanz|aanzfta)\b", lower):
        co_form = "Form AANZ"
    elif re.search(r"\b(form\s*e|acfta)\b", lower):
        co_form = "Form E"

    # 4. Trích xuất xuất xứ (Origin)
    origin = "Trung Quốc"
    if any(k in lower for k in ["hàn quốc", "korea", "hàn"]):
        origin = "Hàn Quốc"
        if co_form == "MFN" and "c/o" in lower:
            co_form = "Form VK"
    elif any(k in lower for k in ["nhật bản", "japan", "nhật"]):
        origin = "Nhật Bản"
        if co_form == "MFN" and "c/o" in lower:
            co_form = "Form VJ"
    elif any(k in lower for k in ["pháp", "france", "đức", "germany", "ý", "italy", "châu âu", "eu"]):
        origin = "Liên minh Châu Âu (EU)"
        if co_form == "MFN" and "c/o" in lower:
            co_form = "Form EUR.1"
    elif any(k in lower for k in ["thái lan", "thailand", "malaysia", "indonesia", "singapore"]):
        origin = "ASEAN"
        if co_form == "MFN" and "c/o" in lower:
            co_form = "Form D"
    elif any(k in lower for k in ["mỹ", "usa", "hoa kỳ", "úc", "australia"]):
        origin = "Mỹ / Úc"
        if "úc" in lower and co_form == "MFN" and "c/o" in lower:
            co_form = "Form AANZ"

    return {
        "quantity": quantity,
        "unit_price": unit_price,
        "currency": currency,
        "co_form": co_form,
        "origin": origin,
        "raw_prompt": prompt
    }

def match_hs_and_tariff(prompt: str, db_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Tìm kiếm mã HS và biểu thuế suất tương ứng dựa trên câu mô tả mặt hàng."""
    if not db_data:
        db_data = load_tariff_db()

    commodities = db_data.get("commodities", [])
    lower = prompt.lower()

    # 1. Tìm khớp trực tiếp theo mã HS cụ thể (ví dụ 8516.79.90 hoặc 85167990)
    for item in commodities:
        clean_code = item["hs_code"].replace(".", "")
        if item["hs_code"] in lower or clean_code in lower:
            return item

    # 2. Tìm khớp theo từ khóa chuyên ngành
    best_item = None
    max_matches = 0
    for item in commodities:
        match_count = 0
        for kw in item.get("keywords", []):
            if kw in lower:
                match_count += len(kw)  # Ưu tiên từ khóa dài và khớp chính xác hơn
        if match_count > max_matches:
            max_matches = match_count
            best_item = item

    if best_item:
        return best_item

    # 3. Fallback mặc định khi không tìm thấy tên mặt hàng: Hàng hóa thông dụng
    return {
        "id": "generic_goods",
        "hs_code": "8516.79.90",
        "name_vi": "Hàng hóa thông dụng / Thiết bị tiêu dùng",
        "name_en": "General goods / Common commodities",
        "unit": "Chiếc",
        "general_rate": 30.0,
        "mfn_rate": 20.0,
        "vat_rate": 10.0,
        "special_consumption_rate": 0.0,
        "environmental_tax_rate": 0.0,
        "fta_rates": {
            "Form E": { "rate": 0.0, "agreement": "ACFTA (Việt Nam - Trung Quốc)", "co_form": "Form E" },
            "Form D": { "rate": 0.0, "agreement": "ATIGA (ASEAN)", "co_form": "Form D" },
            "Form VK": { "rate": 0.0, "agreement": "VKFTA (Việt Nam - Hàn Quốc)", "co_form": "Form VK" }
        },
        "gir_rule": "Áp dụng Quy tắc 1 và 6 (GIR): Phân loại theo công dụng và chức năng chính của sản phẩm.",
        "import_conditions": "Kiểm tra chất lượng an toàn theo QCVN; Dán nhãn hàng hóa nhập khẩu đầy đủ theo Nghị định 43/2017/NĐ-CP.",
        "legal_reference": "Nghị định 26/2023/NĐ-CP."
    }

def calculate_customs_tax(
    quantity: float,
    unit_price: float,
    currency: str,
    commodity: Dict[str, Any],
    co_form: str = "MFN",
    custom_exchange_rate: Optional[float] = None
) -> Dict[str, Any]:
    """
    Thực hiện phép tính thuế Xuất Nhập Khẩu số học chính xác tuyệt đối theo Luật Thuế XNK 107/2016/QH13.
    """
    db_data = load_tariff_db()
    rates_table = db_data.get("exchange_rates", {})
    exchange_rate = custom_exchange_rate or rates_table.get(currency.upper(), 25450.0)

    # 1. Trị giá tính thuế NK (V_NK)
    cif_foreign = quantity * unit_price
    v_nk = round(cif_foreign * exchange_rate)

    # 2. Xác định thuế suất Nhập khẩu áp dụng
    fta_rates = commodity.get("fta_rates", {})
    import_tax_rate = commodity.get("mfn_rate", 10.0)
    rate_applied_label = "Thuế Nhập khẩu Ưu đãi (MFN)"

    if co_form and co_form != "MFN" and co_form in fta_rates:
        import_tax_rate = fta_rates[co_form]["rate"]
        rate_applied_label = f"Thuế NK Ưu đãi đặc biệt ({fta_rates[co_form]['agreement']} - {co_form})"
    elif co_form == "GENERAL":
        import_tax_rate = commodity.get("general_rate", import_tax_rate * 1.5)
        rate_applied_label = "Thuế Nhập khẩu Thông thường"

    # 3. Tiền Thuế Nhập Khẩu (T_NK)
    t_nk = round(v_nk * (import_tax_rate / 100.0))

    # 4. Tiền Thuế Tiêu thụ đặc biệt (T_TTDB)
    ttdb_rate = commodity.get("special_consumption_rate", 0.0)
    v_ttdb = v_nk + t_nk
    t_ttdb = round(v_ttdb * (ttdb_rate / 100.0)) if ttdb_rate > 0 else 0

    # 5. Tiền Thuế Bảo vệ Môi trường (T_BVMT)
    bvmt_unit_rate = commodity.get("environmental_tax_rate", 0.0)
    t_bvmt = round(quantity * bvmt_unit_rate)

    # 6. Trị giá tính thuế GTGT (V_VAT) & Tiền Thuế GTGT (T_VAT)
    vat_rate = commodity.get("vat_rate", 10.0)
    v_vat = v_nk + t_nk + t_ttdb + t_bvmt
    t_vat = round(v_vat * (vat_rate / 100.0))

    # 7. Tổng số tiền thuế phải nộp
    total_tax = t_nk + t_ttdb + t_bvmt + t_vat

    return {
        "hsCode": commodity.get("hs_code", "8516.79.90"),
        "productName": commodity.get("name_vi", "Hàng hóa nhập khẩu"),
        "unit": commodity.get("unit", "Chiếc"),
        "quantity": quantity,
        "unitPrice": unit_price,
        "currency": currency.upper(),
        "exchangeRate": exchange_rate,
        "cifForeign": cif_foreign,
        "vNk": v_nk,
        "coForm": co_form,
        "importTaxRate": import_tax_rate,
        "importTaxLabel": rate_applied_label,
        "tNk": t_nk,
        "ttdbRate": ttdb_rate,
        "tTtdb": t_ttdb,
        "bvmtRate": bvmt_unit_rate,
        "tBvmt": t_bvmt,
        "vVat": v_vat,
        "vatRate": vat_rate,
        "tVat": t_vat,
        "totalTax": total_tax,
        "girRule": commodity.get("gir_rule", ""),
        "importConditions": commodity.get("import_conditions", ""),
        "legalReference": commodity.get("legal_reference", "Nghị định 26/2023/NĐ-CP"),
        "availableFta": list(fta_rates.keys())
    }

def format_vnd(amount: float) -> str:
    """Format số tiền VNĐ dễ đọc."""
    return f"{amount:,.0f}".replace(",", ".") + " VNĐ"

def generate_tax_estimation(
    prompt: str,
    session_id: Optional[str] = None,
    user_id: Optional[str] = None,
    ai_model: str = "logi_fast"
) -> Tuple[str, Dict[str, Any]]:
    """
    Sinh bảng phân tích mã HS và ước tính tiền thuế XNK tự động.
    Trả về Tuple (reply_text, tax_summary_payload).
    """
    params = extract_tax_params(prompt)
    commodity = match_hs_and_tariff(prompt)
    calc_res = calculate_customs_tax(
        quantity=params["quantity"],
        unit_price=params["unit_price"],
        currency=params["currency"],
        commodity=commodity,
        co_form=params["co_form"]
    )

    hs_code = calc_res["hsCode"]
    prod_name = calc_res["productName"]
    qty = calc_res["quantity"]
    unit = calc_res["unit"]
    price = calc_res["unitPrice"]
    curr = calc_res["currency"]
    rate = calc_res["exchangeRate"]
    co = calc_res["coForm"]

    # Lưu vào database nếu có session_id
    if session_id:
        try:
            from db import save_tax_calculation
            save_tax_calculation(
                session_id=session_id,
                user_id=user_id,
                product_name=prod_name,
                hs_code=hs_code,
                quantity=qty,
                unit_price=price,
                currency=curr,
                exchange_rate=rate,
                co_form=co,
                total_tax_vnd=calc_res["totalTax"],
                breakdown=calc_res
            )
        except Exception as e:
            logger.warning(f"Could not save tax calculation to db: {e}")

    # Xây dựng câu phản hồi Markdown chuyên nghiệp
    reply_lines = [
        f"Chào bạn, tôi đã tra cứu Danh mục hàng hóa XNK và lập bảng dự toán thuế cho mặt hàng **{prod_name}** như sau:\n",
        f"### 🏷️ 1. Phân loại & Mã HS Khuyến Nghị:",
        f"- **Mã HS**: `{hs_code}`",
        f"- **Mô tả hàng hóa**: {prod_name}",
        f"- **Căn cứ phân loại (GIR)**: {calc_res['girRule']}\n",
        f"### 📊 2. Biểu Thuế Suất Áp Dụng:",
        f"- **Thuế Nhập khẩu Thông thường**: {commodity.get('general_rate', 30)}%",
        f"- **Thuế Nhập khẩu Ưu đãi (MFN)**: {commodity.get('mfn_rate', 20)}%",
    ]

    for fta_name, fta_info in commodity.get("fta_rates", {}).items():
        applied_mark = " *(Đang áp dụng)*" if fta_name == co else ""
        reply_lines.append(f"- **Ưu đãi {fta_info['agreement']} ({fta_name})**: **{fta_info['rate']}%**{applied_mark}")

    reply_lines.extend([
        f"- **Thuế Giá trị Gia tăng (VAT)**: {calc_res['vatRate']}%",
    ])
    if calc_res['ttdbRate'] > 0:
        reply_lines.append(f"- **Thuế Tiêu thụ Đặc biệt (TTĐB)**: {calc_res['ttdbRate']}%")

    reply_lines.extend([
        f"\n### 🧮 3. Bảng Tính Thuế Chi Tiết (Lô hàng {qty:,.0f} {unit} × {price:,.2f} {curr}):",
        f"- **Trị giá hải quan (V_NK)**: {calc_res['cifForeign']:,.2f} {curr} × {rate:,.0f} = **{format_vnd(calc_res['vNk'])}**",
        f"- **Tiền Thuế Nhập Khẩu ({calc_res['importTaxRate']}%)**: **{format_vnd(calc_res['tNk'])}**",
    ])

    if calc_res['tTtdb'] > 0:
        reply_lines.append(f"- **Tiền Thuế TTĐB ({calc_res['ttdbRate']}%)**: **{format_vnd(calc_res['tTtdb'])}**")
    if calc_res['tBvmt'] > 0:
        reply_lines.append(f"- **Tiền Thuế BVMT**: **{format_vnd(calc_res['tBvmt'])}**")

    reply_lines.extend([
        f"- **Tiền Thuế GTGT ({calc_res['vatRate']}%)**: **{format_vnd(calc_res['tVat'])}**",
        f"- 💰 **TỔNG TIỀN THUẾ PHẢI NỘP**: **{format_vnd(calc_res['totalTax'])}**\n",
        f"### ⚠️ 4. Lưu ý Thủ tục & Kiểm tra Chuyên ngành:",
        f"{calc_res['importConditions']}\n",
        f"*Căn cứ pháp lý: {calc_res['legalReference']}*"
    ])

    reply_text = "\n".join(reply_lines)
    return reply_text, calc_res
