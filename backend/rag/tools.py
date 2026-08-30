import json
from typing import List, Dict, Any

# ==========================================
# TOOL SCHEMAS FOR LLM (OPENAI FORMAT)
# ==========================================

AVAILABLE_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "lookup_hs_code",
            "description": "Tra cứu mã HS của một loại hàng hóa hải quan.",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {
                        "type": "string",
                        "description": "Tên hoặc mô tả của hàng hóa cần tra cứu mã HS."
                    }
                },
                "required": ["keyword"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_exchange_rate",
            "description": "Lấy tỷ giá tính thuế hải quan ngoại tệ mới nhất.",
            "parameters": {
                "type": "object",
                "properties": {
                    "currency_code": {
                        "type": "string",
                        "description": "Mã tiền tệ (ví dụ: USD, EUR, JPY)."
                    }
                },
                "required": ["currency_code"]
            }
        }
    }
]

# ==========================================
# TOOL EXECUTIONS
# ==========================================

def lookup_hs_code(keyword: str) -> str:
    """Mock HS Code API - In production, this would call a real database or API."""
    keyword_lower = keyword.lower()
    
    # Mock data for demonstration
    mock_db = {
        "máy tính": "84713020 - Máy xử lý dữ liệu tự động, xách tay",
        "điện thoại": "85171300 - Điện thoại thông minh (Smartphones)",
        "gạo": "100630 - Gạo đã xát toàn bộ hoặc sơ bộ",
        "cà phê": "090111 - Cà phê, chưa rang, chưa khử chất cafein",
        "ô tô": "8703 - Ô tô và các loại xe có động cơ khác"
    }
    
    for key, value in mock_db.items():
        if key in keyword_lower:
            return json.dumps({"status": "success", "keyword": keyword, "hs_code_info": value}, ensure_ascii=False)
            
    return json.dumps({"status": "not_found", "message": f"Không tìm thấy mã HS phổ biến cho '{keyword}'."}, ensure_ascii=False)

def get_exchange_rate(currency_code: str) -> str:
    """Mock Exchange Rate API."""
    currency_code = currency_code.upper()
    
    mock_rates = {
        "USD": "25,450 VND",
        "EUR": "27,200 VND",
        "JPY": "165.5 VND",
        "CNY": "3,500 VND"
    }
    
    if currency_code in mock_rates:
        return json.dumps({"status": "success", "currency": currency_code, "rate": mock_rates[currency_code]}, ensure_ascii=False)
        
    return json.dumps({"status": "error", "message": f"Không có dữ liệu tỷ giá cho đồng {currency_code}."}, ensure_ascii=False)

# ==========================================
# TOOL DISPATCHER MAP
# ==========================================

TOOL_DISPATCH_MAP = {
    "lookup_hs_code": lookup_hs_code,
    "get_exchange_rate": get_exchange_rate
}
