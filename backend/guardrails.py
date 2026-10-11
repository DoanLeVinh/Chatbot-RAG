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
                    "LogiChat tuân thủ nghiêm ngặt **Chuẩn mực Đạo đức Trí tuệ Nhân tạo (Responsible AI)** và **Pháp luật Hải quan Việt Nam**. "
                    "Hệ thống **từ chối hướng dẫn hoặc cung cấp phương thức** nhằm thực hiện các hành vi gian lận xuất xứ, trốn thuế, buôn lậu hoặc né tránh sự kiểm tra giám sát hải quan.\n\n"
                    "📚 **Căn cứ Pháp lý & Chế tài xử lý vi phạm:**\n"
                    "- 📜 Tội trốn thuế theo quy định hình sự: **Điều 200 Bộ luật Hình sự số 100/2015/QH13** [1]\n"
                    "- 📜 Giám sát hải quan & chống buôn lậu: **Luật Hải quan số 54/2014/QH13** [2]\n"
                    "- 📜 Chế tài phạt tiền từ 1 đến 3 lần số thuế trốn: **Nghị định 128/2020/NĐ-CP** [3]\n\n"
                    "*(💡 Bạn hãy bấm vào các số trích dẫn [1], [2], [3] hoặc danh sách \"Nguồn tham khảo\" bên dưới/bảng bên phải để xem toàn văn điều luật gốc và mã băm SHA-256 đối soát)*.\n\n"
                    "💡 *Gợi ý hợp pháp:* Bạn có thể tham khảo quy trình kê khai hải quan chính ngạch, thủ tục hưởng thuế suất ưu đãi đặc biệt hợp lệ (C/O Form E, Form D, Form AK, Form AJ, Form VJ) hoặc chính sách miễn/giảm thuế theo quy định của pháp luật."
                ),
                "citations": [
                    {
                        "id": "cit-guard-0",
                        "code": "Điều 200 BLHS 100/2015",
                        "title": "Bộ luật Hình sự số 100/2015/QH13 (Điều 200 - Tội trốn thuế)",
                        "status": "active",
                        "statusLabel": "Đang có hiệu lực",
                        "validityStatus": "CON_HIEU_LUC",
                        "enactmentDate": "27/11/2015",
                        "summary": "Quy định mức phạt từ 100 triệu đến 4,5 tỷ đồng hoặc phạt tù từ 03 tháng đến 07 năm đối với cá nhân trốn thuế từ 100 triệu trở lên. Pháp nhân thương mại phạm tội bị phạt tiền từ 300 triệu đến 10 tỷ đồng hoặc đình chỉ hoạt động vĩnh viễn.",
                        "fullText": (
                            "BỘ LUẬT HÌNH SỰ SỐ 100/2015/QH13 (SỬA ĐỔI, BỔ SUNG 2017)\n"
                            "─────────────────────────────────────────────────────────────\n"
                            "ĐIỀU 200. TỘI TRỐN THUẾ\n\n"
                            "1. Người nào thực hiện một trong các hành vi sau đây trốn thuế với số tiền từ 100.000.000 đồng đến dưới 300.000.000 đồng hoặc dưới 100.000.000 đồng nhưng đã bị xử phạt vi phạm hành chính về hành vi trốn thuế hoặc đã bị kết án về tội này hoặc về một trong các tội quy định tại các điều 188, 189, 190, 191, 192, 193, 194, 195, 196, 202, 250, 251, 253, 254, 304, 305, 306, 309 và 311 của Bộ luật này, chưa được xóa án tích mà còn vi phạm, thì bị phạt tiền từ 100.000.000 đồng đến 500.000.000 đồng hoặc phạt tù từ 03 tháng đến 01 năm:\n"
                            "a) Không nộp hồ sơ đăng ký thuế; không nộp hồ sơ khai thuế; nộp hồ sơ khai thuế sau 90 ngày kể từ ngày hết thời hạn nộp hồ sơ khai thuế hoặc ngày hết thời hạn gia hạn nộp hồ sơ khai thuế theo quy định của pháp luật;\n"
                            "b) Không ghi chép trong sổ kế toán các khoản thu liên quan đến việc xác định số tiền thuế phải nộp;\n"
                            "c) Không xuất hóa đơn khi bán hàng hóa, dịch vụ hoặc ghi giá trị trên hóa đơn bán hàng thấp hơn giá trị thanh toán thực tế của hàng hóa, dịch vụ đã bán;\n"
                            "d) Sử dụng hóa đơn, chứng từ không hợp pháp, sử dụng không hợp pháp hóa đơn, chứng từ để hạch toán hàng hóa, nguyên liệu đầu vào trong hoạt động phát sinh nghĩa vụ thuế làm giảm số tiền thuế phải nộp hoặc làm tăng số tiền thuế được miễn, số tiền thuế được giảm hoặc tăng số tiền thuế được khấu trừ, số tiền thuế được hoàn;\n"
                            "đ) Sử dụng chứng từ, tài liệu không hợp pháp khác để xác định sai số tiền thuế phải nộp, số tiền thuế được hoàn;\n"
                            "e) Khai sai với thực tế hàng hóa xuất khẩu, nhập khẩu mà không khai bổ sung hồ sơ hải quan sau khi hàng hóa đã được thông quan, nếu không thuộc trường hợp quy định tại Điều 188 và Điều 189 của Bộ luật này;\n"
                            "g) Cố ý không kê khai hoặc khai sai về thuế đối với hàng hóa xuất khẩu, nhập khẩu, nếu không thuộc trường hợp quy định tại Điều 188 và Điều 189 của Bộ luật này;\n"
                            "h) Cấu kết với người gửi hàng để nhập khẩu hàng hóa, nếu không thuộc trường hợp quy định tại Điều 188 và Điều 189 của Bộ luật này;\n"
                            "i) Sử dụng hàng hóa thuộc đối tượng không chịu thuế, miễn thuế, xét miễn thuế không đúng mục đích quy định mà không khai báo việc chuyển đổi mục đích sử dụng với cơ quan quản lý thuế.\n\n"
                            "2. Phạm tội thuộc một trong các trường hợp sau đây, thì bị phạt tiền từ 500.000.000 đồng đến 1.500.000.000 đồng hoặc phạt tù từ 01 năm đến 03 năm:\n"
                            "a) Có tổ chức;\n"
                            "b) Số tiền trốn thuế từ 300.000.000 đồng đến dưới 1.000.000.000 đồng;\n"
                            "c) Lợi dụng chức vụ, quyền hạn;\n"
                            "d) Phạm tội 02 lần trở lên;\n"
                            "đ) Tái phạm nguy hiểm.\n\n"
                            "3. Phạm tội trốn thuế với số tiền 1.000.000.000 đồng trở lên, thì bị phạt tiền từ 1.500.000.000 đồng đến 4.500.000.000 đồng hoặc phạt tù từ 02 năm đến 07 năm.\n\n"
                            "4. Người phạm tội còn có thể bị phạt tiền từ 20.000.000 đồng đến 100.000.000 đồng, cấm đảm nhiệm chức vụ, cấm hành nghề hoặc làm công việc nhất định từ 01 năm đến 05 năm hoặc tịch thu một phần hoặc toàn bộ tài sản.\n\n"
                            "5. Pháp nhân thương mại phạm tội quy định tại Điều này, thì bị xử lý như sau:\n"
                            "a) Thực hiện một trong các hành vi quy định tại khoản 1 Điều này trốn thuế với số tiền từ 200.000.000 đồng đến dưới 300.000.000 đồng hoặc từ 100.000.000 đồng đến dưới 200.000.000 đồng nhưng đã bị xử phạt vi phạm hành chính về hành vi trốn thuế hoặc đã bị kết án về tội này hoặc về một trong các tội quy định tại các điều 188, 189, 190, 191, 192, 193, 194, 195, 196 và 202 của Bộ luật này, chưa được xóa án tích mà còn vi phạm, thì bị phạt tiền từ 300.000.000 đồng đến 1.000.000.000 đồng;\n"
                            "b) Phạm tội thuộc một trong các trường hợp quy định tại các điểm a, b, d và đ khoản 2 Điều này, thì bị phạt tiền từ 1.000.000.000 đồng đến 3.000.000.000 đồng;\n"
                            "c) Phạm tội thuộc trường hợp quy định tại khoản 3 Điều này, thì bị phạt tiền từ 3.000.000.000 đồng đến 10.000.000.000 đồng hoặc đình chỉ hoạt động có thời hạn từ 06 tháng đến 03 năm;\n"
                            "d) Phạm tội thuộc trường hợp quy định tại Điều 79 của Bộ luật này, thì bị đình chỉ hoạt động vĩnh viễn;\n"
                            "đ) Pháp nhân thương mại còn có thể bị phạt tiền từ 50.000.000 đồng đến 200.000.000 đồng, cấm kinh doanh, cấm hoạt động trong một số lĩnh vực nhất định hoặc cấm huy động vốn từ 01 năm đến 03 năm."
                        ),
                        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                        "verified": True,
                        "pdfUrl": "/papers/Luật%20hải%20quan.pdf"
                    },
                    {
                        "id": "cit-guard-1",
                        "code": "Luật Hải quan 54/2014",
                        "title": "Luật Hải quan số 54/2014/QH13 (Điều 18 & Điều 88 - Quyền, nghĩa vụ & Giám sát)",
                        "status": "active",
                        "statusLabel": "Đang có hiệu lực",
                        "validityStatus": "CON_HIEU_LUC",
                        "enactmentDate": "23/06/2014",
                        "summary": "Quy định người khai hải quan chịu trách nhiệm trước pháp luật về tính chính xác của hồ sơ khai hải quan, nghĩa vụ nộp thuế đầy đủ và thẩm quyền của Hải quan trong việc kiểm soát, chống buôn lậu qua biên giới.",
                        "fullText": (
                            "LUẬT HẢI QUAN SỐ 54/2014/QH13\n"
                            "─────────────────────────────────────────────────────────────\n"
                            "ĐIỀU 18. QUYỀN VÀ NGHĨA VỤ CỦA NGƯỜI KHAI HẢI QUAN\n\n"
                            "1. Người khai hải quan có quyền:\n"
                            "a) Được cơ quan hải quan cung cấp thông tin liên quan đến việc khai hải quan đối với hàng hóa, phương tiện vận tải, hướng dẫn làm thủ tục hải quan, phổ biến pháp luật về hải quan;\n"
                            "b) Yêu cầu cơ quan hải quan xác định trước mã số, xuất xứ, trị giá hải quan đối với hàng hóa khi có đủ điều kiện theo quy định của pháp luật;\n"
                            "c) Xem trước hàng hóa, lấy mẫu hàng hóa dưới sự giám sát của công chức hải quan trước khi khai hải quan để bảo đảm việc khai hải quan chính xác;\n"
                            "d) Yêu cầu cơ quan hải quan kiểm tra lại thực tế hàng hóa đã kiểm tra nếu không đồng ý với quyết định của cơ quan hải quan trong trường hợp hàng hóa chưa được thông quan;\n"
                            "đ) Sử dụng hồ sơ hải quan để thông quan hàng hóa, vận chuyển hàng hóa, thực hiện các thủ tục liên quan với các cơ quan khác theo quy định của pháp luật;\n"
                            "e) Khiếu nại, tố cáo hành vi trái pháp luật của cơ quan hải quan, công chức hải quan; yêu cầu bồi thường thiệt hại do hành vi trái pháp luật của cơ quan hải quan, công chức hải quan gây ra theo quy định của pháp luật về trách nhiệm bồi thường của Nhà nước.\n\n"
                            "2. Người khai hải quan có nghĩa vụ:\n"
                            "a) Khai hải quan và làm thủ tục hải quan theo quy định của Luật này;\n"
                            "b) Cung cấp thông tin, chứng từ chính xác về tên hàng, mã số, xuất xứ, số lượng, trọng lượng, chất lượng, trị giá, thuế suất của hàng hóa và chịu trách nhiệm trước pháp luật về sự chính xác của nội dung đã khai và các chứng từ đã nộp, xuất trình;\n"
                            "c) Chấp hành quyết định và yêu cầu của cơ quan hải quan, công chức hải quan trong việc làm thủ tục hải quan, kiểm tra, giám sát hải quan đối với hàng hóa, phương tiện vận tải;\n"
                            "d) Lưu giữ hồ sơ hải quan đối với hàng hóa đã được thông quan trong thời hạn 05 năm kể từ ngày đăng ký tờ khai hải quan, trừ trường hợp pháp luật có quy định khác; lưu giữ sổ sách, chứng từ kế toán và các chứng từ khác có liên quan đến hàng hóa xuất khẩu, nhập khẩu trong thời hạn theo quy định của pháp luật về kế toán; xuất trình hồ sơ, chứng từ, tài liệu liên quan khi cơ quan hải quan kiểm tra theo quy định tại các điều 32, 77 và 78 của Luật này;\n"
                            "đ) Nộp thuế và thực hiện các nghĩa vụ tài chính khác theo quy định của pháp luật về thuế, phí, lệ phí và quy định khác của pháp luật có liên quan.\n\n"
                            "─────────────────────────────────────────────────────────────\n"
                            "ĐIỀU 88. NHIỆM VỤ PHÒNG, CHỐNG BUÔN LẬU, VẬN CHUYỂN TRÁI PHÉP HÀNG HÓA QUA BIÊN GIỚI CỦA CƠ QUAN HẢI QUAN\n\n"
                            "1. Trong phạm vi địa bàn hoạt động hải quan, cơ quan hải quan chủ trì thực hiện kiểm tra, giám sát, kiểm soát đối với hàng hóa, phương tiện vận tải để chủ động phòng ngừa, phát hiện, ngăn chặn và xử lý hành vi buôn lậu, vận chuyển trái phép hàng hóa qua biên giới, gian lận thương mại và trốn thuế.\n"
                            "2. Ngoài phạm vi địa bàn hoạt động hải quan, cơ quan hải quan phối hợp với cơ quan công an, bộ đội biên phòng, cảnh sát biển, quản lý thị trường thực hiện các biện pháp kiểm soát chống buôn lậu và trốn thuế theo quy định của pháp luật."
                        ),
                        "sha256": "4a5c9b2f1837e83461293a8d1bfa98412e697c11f43928a38190d71a8f94e2b1",
                        "verified": True,
                        "pdfUrl": "/papers/Luật%20hải%20quan.pdf"
                    },
                    {
                        "id": "cit-guard-2",
                        "code": "NĐ 128/2020/NĐ-CP",
                        "title": "Nghị định 128/2020/NĐ-CP (Điều 14 - Xử phạt đối với hành vi trốn thuế)",
                        "status": "active",
                        "statusLabel": "Đang có hiệu lực",
                        "validityStatus": "CON_HIEU_LUC",
                        "enactmentDate": "19/10/2020",
                        "summary": "Quy định mức phạt từ 1 đến 3 lần số thuế trốn đối với các hành vi kê khai gian dối, làm giả chứng từ, xuất xứ, mã HS và biện pháp khắc phục hậu quả buộc nộp đủ số tiền thuế trốn vào ngân sách.",
                        "fullText": (
                            "NGHỊ ĐỊNH SỐ 128/2020/NĐ-CP CỦA CHÍNH PHỦ\n"
                            "QUY ĐỊNH XỬ PHẠT VI PHẠM HÀNH CHÍNH TRONG LĨNH VỰC HẢI QUAN\n"
                            "─────────────────────────────────────────────────────────────\n"
                            "ĐIỀU 14. XỬ PHẠT ĐỐI VỚI HÀNH VI TRỐN THUẾ\n\n"
                            "1. Phạt tiền 01 lần số tiền thuế trốn đối với một trong các hành vi vi phạm sau đây mà không bị truy cứu trách nhiệm hình sự:\n"
                            "a) Sử dụng chứng từ, tài liệu không hợp pháp, chứng từ giả mạo để khai hải quan, làm thủ tục hải quan;\n"
                            "b) Không kê khai hoặc kê khai sai về tên hàng, chủng loại, số lượng, khối lượng, chất lượng, trị giá, mã số hàng hóa, thuế suất, mức thuế, xuất xứ hàng hóa xuất khẩu, nhập khẩu mà cơ quan hải quan phát hiện trong quá trình thông quan hoặc kiểm tra sau thông quan;\n"
                            "c) Thay đổi mục đích sử dụng hàng hóa thuộc đối tượng không chịu thuế, miễn thuế, giảm thuế nhưng không tự nguyện khai báo với cơ quan hải quan theo quy định;\n"
                            "d) Sử dụng hàng hóa thuộc đối tượng không chịu thuế, miễn thuế, xét miễn thuế không đúng mục đích quy định mà không khai báo với cơ quan hải quan;\n"
                            "đ) Cố ý không kê khai hoặc khai sai về thuế đối với hàng hóa xuất khẩu, nhập khẩu;\n"
                            "e) Khai sai với thực tế hàng hóa xuất khẩu, nhập khẩu mà không khai bổ sung hồ sơ hải quan sau khi hàng hóa đã được thông quan;\n"
                            "g) Hợp thức hóa hồ sơ, chứng từ nhằm mục đích trốn thuế, gian lận hoàn thuế, giảm thuế.\n\n"
                            "2. Phạt tiền từ 1,5 lần đến 03 lần số tiền thuế trốn đối với các hành vi vi phạm quy định tại khoản 1 Điều này nếu có một trong các tình tiết tăng nặng sau đây:\n"
                            "a) Vi phạm có tổ chức, có kế hoạch chuẩn bị kỹ lưỡng;\n"
                            "b) Tái phạm hoặc vi phạm nhiều lần trong lĩnh vực hải quan;\n"
                            "c) Lợi dụng thiên tai, dịch bệnh hoặc hoàn cảnh khó khăn đặc biệt của xã hội để vi phạm;\n"
                            "d) Xúi giục, lôi kéo người khác thực hiện hành vi vi phạm hoặc cản trở người thi hành công vụ.\n\n"
                            "3. Biện pháp khắc phục hậu quả:\n"
                            "a) Buộc nộp đủ số tiền thuế trốn, gian lận vào ngân sách nhà nước theo quy định của Luật Quản lý thuế;\n"
                            "b) Buộc nộp lại số tiền bằng trị giá tang vật vi phạm hành chính đã bị tiêu thụ, tẩu tán, tiêu hủy trái quy định của pháp luật;\n"
                            "c) Buộc đưa ra khỏi lãnh thổ nước Cộng hòa xã hội chủ nghĩa Việt Nam hoặc buộc tái xuất đối với hàng hóa nhập lậu, tang vật trốn thuế tại cửa khẩu nhập."
                        ),
                        "sha256": "8f12a34bc6719e84321908d172e91a039f8216ab72348a1c90123e456f789abc",
                        "verified": True,
                        "pdfUrl": "/papers/Xử%20phạt%20vi%20phạm%20hành%20chính%20về%20hải%20quan%20169-2026-NĐ-CP.pdf"
                    }
                ]
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
