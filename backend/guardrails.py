"""Responsible AI Guardrails & Domain Boundary Filter for LogiChat.

Provides ultra-fast (<2ms), deterministic intent matching for:
1. Anti-Illicit / Prohibited Customs Inquiries (buôn lậu, trốn thuế, làm giả C/O).
2. Out-of-Domain Inquiries (thơ ca, lập trình ngoài ngành, giải toán, chính trị...).

Ensures responsible AI compliance while saving RAG retrieval & LLM inference costs.
"""
import re
from typing import Optional, Dict, Any

# Patterns indicative of illicit customs activities or fraudulent advice requests
ILLICIT_PATTERNS = [
    r'\b(?:cách|làm sao|làm thế nào|hướng dẫn|mẹo|chiêu|bày|chỉ)?\s*(?:để\s+)?(?:trốn|né|lách|gian lận|giảm lậu)\s+thuế\b',
    r'\b(?:buôn lậu|vận chuyển lậu|tuồn hàng|đưa lậu|đi chui)\b',
    r'\b(?:làm giả|mua bán giả|khai khống|khống chỉ)\s+(?:chứng từ|hóa đơn|c\/o|co|giấy chứng nhận xuất xứ)\b',
    r'\b(?:hối lộ|đút lót|bôi trơn|chi tiền cho|chạy chọt)\s+(?:hải quan|công chức|chi cục)\b',
    r'\b(?:nhập lậu|xuất lậu|gian lận xuất xứ|mượn danh xuất xứ|rửa xuất xứ)\b',
    r'\b(?:qua mặt|đối phó|che giấu|giấu nhẹm)\s+(?:hải quan|kiểm hóa|soi chiếu)\b',
    r'\b(?:nhập khẩu|mang|vận chuyển)\s+(?:trái phép\s+)?(?:ma túy|chất cấm|súng|vũ khí quân dụng|pháo nổ)\b',
]

# Legitimate inquiries about sanctions/penalties for violations should NOT be blocked
PENALTY_INQUIRY_TERMS = [
    'mức phạt', 'hình phạt', 'xử phạt', 'xử lý', 'chế tài', 'tội danh', 
    'tội trốn thuế', 'tội buôn lậu', 'ngăn chặn', 'chống trốn', 'quy định xử phạt'
]

# Patterns purely out of customs & foreign trade domain
OUT_OF_DOMAIN_PATTERNS = [
    r'\b(?:làm|viết|sáng tác)?\s*(?:một\s+)?(?:bài\s+)?(?:thơ|văn|truyện|bài hát|kịch bản phim)\b',
    r'\b(?:thơ|bài thơ)\s+(?:về|tặng|cho)\b',
    r'\b(?:giải phương trình|tính đạo hàm|tích phân|hình học không gian|hóa hữu cơ)\b',
    r'\b(?:viết code|lập trình|viết chương trình)\s+(?:game|web game|hacker|virus|trojan)\b',
    r'\b(?:tình yêu|tỏ tình|tâm sự chuyện tình cảm|xem bói|tử vi|bói toán|phong thủy cá nhân)\b',
    r'\b(?:lật đổ|bầu cử|chính trị quốc gia|đảng phái|tôn giáo cực đoan)\b',
]

# Domain keywords that keep borderline questions inside scope
DOMAIN_ALLOWLIST = [
    'hải quan', 'xuất khẩu', 'nhập khẩu', 'xnk', 'thuế', 'hs', 'mã hs',
    'c/o', 'co form', 'thông quan', 'tờ khai', 'vnaccs', 'vcis', 'inco',
    'incoterms', 'cước', 'bill', 'vận đơn', 'cont', 'container', 'kiểm hóa',
    'luồng xanh', 'luồng vàng', 'luồng đỏ', 'kiểm tra sau thông quan',
    'chứng nhận xuất xứ', 'chuyên ngành', 'kiểm dịch', 'an toàn thực phẩm'
]

def check_query_guardrails(query: str) -> Optional[Dict[str, Any]]:
    """
    Check query against safety and domain guardrails.
    Returns None if query is safe and in-domain.
    Otherwise returns a refusal dict with category and response message.
    """
    if not query or not query.strip():
        return None

    clean_query = query.strip().lower()

    # 1. Check Anti-Illicit / Prohibited intent
    # If the user is asking about legal sanctions/penalties, allow it to be answered via RAG
    is_penalty_inquiry = any(term in clean_query for term in PENALTY_INQUIRY_TERMS)
    
    if not is_penalty_inquiry:
        # Check direct evasion phrasing
        if re.search(r'\b(?:trốn|lách|né|gian lận)\s+thuế\b', clean_query):
            is_illicit = True
        else:
            is_illicit = any(re.search(pattern, clean_query, re.IGNORECASE) for pattern in ILLICIT_PATTERNS)

        if is_illicit:
            return {
                "blocked": True,
                "category": "ILLICIT_CUSTOMS",
                "reason": "Yêu cầu vi phạm quy định quản lý hải quan hoặc có dấu hiệu gian lận thương mại.",
                "reply": (
                    "⚠️ **CẢNH BÁO TUÂN THỦ PHÁP LUẬT:**\n\n"
                    "LogiChat tuân thủ nghiêm ngặt **Chuẩn mực Đạo đức Trí tuệ Nhân tạo (Responsible AI)** và "
                    "**Pháp luật Hải quan Việt Nam** (quy định tại *Điều 200 Bộ luật Hình sự số 100/2015/QH13* về Tội trốn thuế, "
                    "*Luật Hải quan số 54/2014/QH13* và *Nghị định 128/2020/NĐ-CP* về xử phạt vi phạm hành chính).\n\n"
                    "Hệ thống **từ chối hướng dẫn hoặc cung cấp phương thức** nhằm thực hiện các hành vi gian lận xuất xứ, "
                    "trốn thuế, buôn lậu hoặc né tránh sự kiểm tra giám sát hải quan.\n\n"
                    "💡 *Gợi ý:* Bạn có thể tham khảo quy trình kê khai hải quan hợp pháp, thủ tục hưởng thuế suất ưu đãi đặc biệt "
                    "hợp lệ (Form C/O) hoặc chính sách miễn/giảm thuế theo quy định của Luật Thuế xuất khẩu, thuế nhập khẩu."
                )
            }

    # 2. Check Out-of-Domain intent
    # If the question contains domain allowlist words, do not block as out-of-domain
    has_domain_term = any(term in clean_query for term in DOMAIN_ALLOWLIST)
    if not has_domain_term:
        for pattern in OUT_OF_DOMAIN_PATTERNS:
            if re.search(pattern, clean_query, re.IGNORECASE):
                return {
                    "blocked": True,
                    "category": "OUT_OF_DOMAIN",
                    "reason": "Câu hỏi nằm ngoài phạm vi Pháp luật Hải quan & Xuất Nhập Khẩu.",
                    "reply": (
                        "ℹ️ **THÔNG BÁO PHẠM VI NGHIỆP VỤ:**\n\n"
                        "LogiChat là hệ sinh thái AI chuyên sâu phục vụ tra cứu **Quy định Hải quan, Biểu thuế XNK, "
                        "Thủ tục thông quan và Logistics Ngoại thương Việt Nam**.\n\n"
                        "Câu hỏi của bạn hiện nằm ngoài phạm vi nghiệp vụ được huấn luyện. "
                        "Bạn vui lòng đặt các câu hỏi liên quan đến:\n"
                        "- 📌 Quy trình và hồ sơ thủ tục hải quan điện tử (VNACCS/VCIS).\n"
                        "- 📌 Tra cứu phân loại mã số hàng hóa (HS Code).\n"
                        "- 📌 Tính thuế xuất khẩu, nhập khẩu, VAT, Tiêu thụ đặc biệt.\n"
                        "- 📌 Quy tắc xuất xứ và chứng nhận C/O ưu đãi hiệp định thương mại (FTA)."
                    )
                }

    return None
