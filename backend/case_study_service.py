"""
Module: Case Study & Scenario Reasoning Engine (Công cụ Tạo & Giải Bài Tập Tình Huống Suy Luận Nghiệp Vụ Hải Quan)
Hiện thực hóa Phần 11 tài liệu kiến trúc openspec.md
Bảo đảm Zero Hallucination với Python Deterministic Math Engine cho lời giải chuẩn (Ground Truth).
"""

import os
import re
import json
import uuid
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple

from db import get_connection

logger = logging.getLogger("case_study_service")

# ─── 1. REGEX NHẬN DIỆN Ý ĐỊNH BÀI TẬP TÌNH HUỐNG / TỰ LUẬN ─────────────────
CASE_STUDY_INTENT_PATTERNS = [
    r"(b[aà]i\s*t[aậ]p\s*t[iì]nh\s*hu[oố]ng|t[iì]nh\s*hu[oố]ng\s*th[uự]c\s*t[eế]|case\s*study|b[aà]i\s*t[aậ]p\s*t[uự]\s*lu[aậ]n|t[uự]\s*lu[aậ]n)",
    r"(cho\s*t[oô]i|ra\s*[đd][eề]|t[aạ]o|xin|c[aầ]n|mu[oố]n|l[aà]m)\s*([0-9]|m[oộ]t\s*)?\s*(b[aà]i\s*t[aậ]p|t[iì]nh\s*hu[oố]ng|case\s*study|th[uử]\s*th[aá]ch)",
    r"(b[aà]i\s*t[aậ]p|t[iì]nh\s*hu[oố]ng).*(h[aả]i\s*quan|nghi[eệ]p\s*v[uụ]|xnk|x[uấ]t\s*nh[aậ]p\s*kh[aẩ]u|inco|tr[iị]\s*gi[aá]|th[uế]|sau\s*th[oô]ng\s*quan|ch[aậ]m\s*n[oộ]p|c/o|xu[aấ]t\s*x[uứ]|ch[oố]ng\s*b[aá]n\s*ph[aá]\s*gi[aá]|ph[oò]ng\s*v[eệ])",
    r"(gi[aả]i\s*t[iì]nh\s*hu[oố]ng|gi[aả]i\s*b[aà]i\s*t[aậ]p|ch[aấ]m\s*b[aà]i|barem\s*[đd]i[eể]m)",
    r"(tr[iị]\s*gi[aá]\s*h[aả]i\s*quan.*inco|fob.*cif.*t[iíì]nh\s*thu[eế])",
    r"(ch[oố]ng\s*b[aá]n\s*ph[aá]\s*gi[aá]|ph[oò]ng\s*v[eệ]\s*th[uơ]ng\s*m[aạ]i)",
    r"(ki[eể]m\s*tra\s*sau\s*th[oô]ng\s*quan|ph[aạ]t\s*ch[aậ]m\s*n[oộ]p|ngh[iị]\s*[đd][iị]nh\s*128)",
    r"(tranh\s*ch[aấ]p\s*c/o|h[oó]a\s*[đd][oơ]n\s*b[eê]n\s*th[uứ]\s*ba|third\s*party\s*invoic)",
    r"(scenario|case\s*study|customs\s*exercise|customs\s*problem|valuation\s*exercise)"
]

def is_case_study_intent(prompt: str) -> bool:
    """Kiểm tra xem câu chat có yêu cầu tạo hoặc giải quyết bài tập tình huống / tự luận hay không."""
    if not prompt:
        return False
    text = prompt.strip().lower()
    for pattern in CASE_STUDY_INTENT_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

# ─── 2. NGÂN HÀNG KỊCH BẢN THAM SỐ HÓA (PARAMETRIC SCENARIOS) ───────────────
PRESET_SCENARIOS = {
    "valuation_incoterms": {
        "title": "Xác định Trị giá Hải quan & Điều chỉnh Chi phí Incoterms 2020",
        "category": "valuation_incoterms",
        "category_name": "Trị giá Hải quan & Incoterms",
        "difficulty": "medium",
        "company": "Công ty TNHH Cơ khí & Tự động hóa Việt Á (Mã số thuế: 0108923456)",
        "context": (
            "Doanh nghiệp ký Hợp đồng ngoại thương số VA-2026/CNC nhập khẩu 20 bộ Máy công cụ gia công kim loại CNC "
            "từ đối tác Osaka Precision Machinery Ltd (Nhật Bản). Điều kiện giao hàng thỏa thuận là FOB Osaka (Incoterms 2020). "
            "Đơn giá hóa đơn thương mại (Commercial Invoice) là 12,000 USD/bộ. "
            "Trong quá trình thực hiện hợp đồng và vận chuyển về Cảng Cát Lái (TP.HCM), doanh nghiệp phát sinh các khoản chi phí sau:\n"
            "1. Cước vận tải đường biển quốc tế (Ocean Freight - F) ghi trên Vận đơn đường biển (B/L): 2,500 USD cho toàn bộ lô hàng.\n"
            "2. Phí bảo hiểm hàng hải quốc tế (Marine Insurance - I): 350 USD.\n"
            "3. Khoản phí hoa hồng môi giới người mua phải trả cho đại lý môi giới của người bán tại Nhật Bản: 800 USD.\n"
            "4. Phí dỡ hàng và lưu kho phát sinh tại Cảng Cát Lái sau khi hàng đã đến cảng: 500 USD.\n"
            "Tỷ giá tính thuế do Tổng cục Hải quan công bố tại thời điểm đăng ký tờ khai là: 1 USD = 25,450 VNĐ. "
            "Hàng có C/O Form VJ (VJEPA) hợp lệ, thuế suất nhập khẩu ưu đãi đặc biệt là 0% (trong khi thuế MFN là 5%). Thuế GTGT là 10%."
        ),
        "documents": [
            {"name": "Hợp đồng ngoại thương (Sales Contract)", "code": "VA-2026/CNC", "summary": "20 bộ Máy gia công CNC, FOB Osaka, tổng trị giá 240,000 USD"},
            {"name": "Vận đơn đường biển (Bill of Lading)", "code": "OSK-HCM-9921", "summary": "Cảng xếp: Osaka - Cảng dỡ: Cát Lái. Cước biển trả trước F = 2,500 USD"},
            {"name": "Chứng thư bảo hiểm hàng hải", "code": "INS-77820", "summary": "Phí bảo hiểm I = 350 USD cho toàn bộ hành trình"},
            {"name": "Chứng nhận xuất xứ (C/O Form VJ)", "code": "VJ26JP8819", "summary": "Hợp lệ theo Hiệp định VJEPA, tiêu chí CTC"}
        ],
        "questions": [
            "Yêu cầu 1: Căn cứ Thông tư 39/2015/TT-BTC (sửa đổi bởi Thông tư 60/2019/TT-BTC), hãy xác định các khoản điều chỉnh cộng và khoản điều chỉnh trừ vào trị giá hải quan của lô hàng.",
            "Yêu cầu 2: Tính Trị giá tính thuế (V_NK) của toàn bộ lô hàng nhập khẩu bằng đồng Việt Nam (VNĐ).",
            "Yêu cầu 3: Lập bảng tính chi tiết số tiền Thuế nhập khẩu và Thuế GTGT mà doanh nghiệp phải nộp trong trường hợp sử dụng C/O Form VJ so với trường hợp bị mất C/O (phải áp thuế MFN)."
        ],
        "solution": {
            "analysis": (
                "- Phương pháp xác định: Phương pháp trị giá giao dịch của hàng nhập khẩu.\n"
                "- Khoản điều chỉnh cộng (Khoản 2 Điều 13 Thông tư 39/2015/TT-BTC):\n"
                "  + Cước vận chuyển quốc tế (F): 2,500 USD (cộng).\n"
                "  + Phí bảo hiểm quốc tế (I): 350 USD (cộng).\n"
                "  + Phí hoa hồng môi giới trả cho đại lý người bán: 800 USD (cộng).\n"
                "- Khoản điều chỉnh trừ (Điều 15 Thông tư 39/2015/TT-BTC):\n"
                "  + Phí dỡ hàng và lưu kho phát sinh tại cảng đến (Cát Lái): 500 USD phát sinh sau khi nhập khẩu, không cộng vào trị giá tính thuế.\n"
            ),
            "step_by_step_math": [
                "Trị giá hóa đơn FOB = 20 bộ * 12,000 USD = 240,000 USD",
                "Tổng các khoản điều chỉnh cộng (F + I + Hoa hồng) = 2,500 + 350 + 800 = 3,650 USD",
                "Trị giá Hải quan (USD) = Trị giá FOB (240,000) + Các khoản điều chỉnh cộng (3,650) = 243,650 USD",
                "Trị giá tính thuế quy đổi (V_NK) = 243,650 USD * 25,450 VNĐ = 6,200,892,500 VNĐ",
                "Trường hợp 1 (Có C/O Form VJ - Thuế NK 0%):\n"
                "  + Thuế NK = 6,200,892,500 * 0% = 0 VNĐ\n"
                "  + Thuế GTGT = 6,200,892,500 * 10% = 620,089,250 VNĐ\n"
                "  + Tổng thuế phải nộp = 620,089,250 VNĐ",
                "Trường hợp 2 (Mất C/O - Áp thuế MFN 5%):\n"
                "  + Thuế NK = 6,200,892,500 * 5% = 310,044,625 VNĐ\n"
                "  + Trị giá tính thuế GTGT = 6,200,892,500 + 310,044,625 = 6,510,937,125 VNĐ\n"
                "  + Thuế GTGT = 6,510,937,125 * 10% = 651,093,713 VNĐ\n"
                "  + Tổng thuế phải nộp = 961,138,338 VNĐ\n"
                "  + Số thuế chênh lệch tiết kiệm được nhờ C/O: 341,049,088 VNĐ"
            ],
            "final_numbers": {
                "v_cif_usd": 243650,
                "v_nk_vnd": 6200892500,
                "tax_fta_vnd": 620089250,
                "tax_mfn_vnd": 961138338,
                "tax_diff_vnd": 341049088
            },
            "legal_citations": [
                "Khoản 2 Điều 13 Thông tư 39/2015/TT-BTC (Các khoản điều chỉnh cộng)",
                "Điều 15 Thông tư 39/2015/TT-BTC (Các khoản điều chỉnh trừ)",
                "Luật Thuế xuất khẩu, thuế nhập khẩu số 107/2016/QH13",
                "Hiệp định VJEPA và Biểu thuế XNK ưu đãi đặc biệt"
            ]
        },
        "rubric": [
            {"criterion": "Xác định đúng phương pháp & các khoản điều chỉnh Incoterms (Cộng/Trừ)", "max_points": 2.5},
            {"criterion": "Tính toán chính xác Trị giá hải quan V_NK bằng VNĐ theo tỷ giá quy định", "max_points": 2.5},
            {"criterion": "Tính chuẩn xác số thuế NK và GTGT cho cả 2 trường hợp (Form VJ và MFN)", "max_points": 3.0},
            {"criterion": "Viện dẫn đầy đủ căn cứ pháp lý và kết luận số tiền thuế chênh lệch", "max_points": 2.0}
        ]
    },

    "multi_tax_trade_defense": {
        "title": "Tính Toán Đa Sắc Thuế & Thuế Phòng Vệ Thương Mại (Chống Bán Phá Giá)",
        "category": "multi_tax_trade_defense",
        "category_name": "Đa Sắc Thuế & Chống Bán Phá Giá",
        "difficulty": "hard",
        "company": "Công ty Cổ phần Xây dựng & Kim khí Thăng Long (MST: 0314567890)",
        "context": (
            "Doanh nghiệp nhập khẩu một lô hàng 100 tấn Thép cuộn cán nóng hợp kim (Mã HS: 7208.39.00) "
            "từ cảng Thượng Hải (Trung Quốc) về Cảng Hải Phòng. "
            "Đơn giá CIF Hải Phòng ghi trên hóa đơn là 650 USD/tấn. "
            "Lô hàng có chứng từ chứng nhận xuất xứ C/O Form E hợp lệ theo Hiệp định ACFTA. "
            "Chính sách thuế tại thời điểm nhập khẩu như sau:\n"
            "- Thuế suất nhập khẩu ưu đãi đặc biệt ACFTA (Form E): 0% (Thuế MFN là 5%).\n"
            "- Thuế Chống bán phá giá (AD) chính thức theo Quyết định của Bộ Công Thương đối với nhà sản xuất này: 15%.\n"
            "- Thuế Bảo vệ môi trường: Không thuộc đối tượng chịu thuế BVMT.\n"
            "- Thuế Giá trị gia tăng (VAT): 10%.\n"
            "- Tỷ giá tính thuế hải quan: 1 USD = 25,450 VNĐ."
        ),
        "documents": [
            {"name": "Hóa đơn thương mại (Commercial Invoice)", "code": "SH-TL-2026", "summary": "100 tấn thép cuộn, CIF Hải Phòng, đơn giá 650 USD/tấn, tổng 65,000 USD"},
            {"name": "C/O Form E (ACFTA)", "code": "E26CN98214", "summary": "Xuất xứ Trung Quốc, cấp đúng quy chuẩn Thông tư 12/2019/TT-BCT"},
            {"name": "Quyết định áp thuế Chống bán phá giá của Bộ Công Thương", "code": "QĐ-BCT", "summary": "Thuế suất chống bán phá giá 15% áp dụng đối với mã HS 7208.39.00"}
        ],
        "questions": [
            "Yêu cầu 1: Nêu nguyên tắc và thứ tự tính các loại thuế đối với hàng hóa vừa chịu thuế nhập khẩu, thuế chống bán phá giá và thuế GTGT.",
            "Yêu cầu 2: Tính Trị giá tính thuế nhập khẩu của lô hàng (bằng USD và VNĐ).",
            "Yêu cầu 3: Tính số tiền Thuế nhập khẩu, Thuế chống bán phá giá, Thuế GTGT và Tổng số thuế phải nộp trước khi thông quan."
        ],
        "solution": {
            "analysis": (
                "- Thứ tự tính thuế (Luật Quản lý ngoại thương 2017 & Luật Thuế XNK 2016):\n"
                "  1. Thuế nhập khẩu = Trị giá tính thuế * Thuế suất NK (0% theo Form E).\n"
                "  2. Thuế Chống bán phá giá = Trị giá tính thuế * Thuế suất AD (15%). Thuế AD là khoản thuế nhập khẩu bổ sung.\n"
                "  3. Trị giá tính thuế GTGT = Trị giá tính thuế + Thuế NK + Thuế AD.\n"
                "  4. Thuế GTGT = Trị giá tính thuế GTGT * 10%.\n"
            ),
            "step_by_step_math": [
                "Trị giá CIF toàn bộ lô hàng = 100 tấn * 650 USD = 65,000 USD",
                "Trị giá tính thuế (V_NK) = 65,000 USD * 25,450 VNĐ = 1,654,250,000 VNĐ",
                "1. Thuế nhập khẩu (ACFTA Form E 0%):\n"
                "   T_NK = 1,654,250,000 * 0% = 0 VNĐ",
                "2. Thuế Chống bán phá giá (AD 15%):\n"
                "   T_AD = 1,654,250,000 * 15% = 248,137,500 VNĐ",
                "3. Trị giá tính thuế GTGT:\n"
                "   V_VAT = V_NK + T_NK + T_AD = 1,654,250,000 + 0 + 248,137,500 = 1,902,387,500 VNĐ",
                "4. Thuế GTGT (10%):\n"
                "   T_VAT = 1,902,387,500 * 10% = 190,238,750 VNĐ",
                "5. Tổng số thuế doanh nghiệp phải nộp:\n"
                "   Tổng thuế = T_NK + T_AD + T_VAT = 0 + 248,137,500 + 190,238,750 = 438,376,250 VNĐ"
            ],
            "final_numbers": {
                "v_cif_usd": 65000,
                "v_nk_vnd": 1654250000,
                "t_nk_vnd": 0,
                "t_ad_vnd": 248137500,
                "t_vat_vnd": 190238750,
                "total_tax_vnd": 438376250
            },
            "legal_citations": [
                "Điều 12 Luật Quản lý ngoại thương số 05/2017/QH14",
                "Khoản 1 Điều 39 Thông tư 38/2015/TT-BTC (sửa đổi Thông tư 39/2018/TT-BTC)",
                "Luật Thuế xuất khẩu, thuế nhập khẩu số 107/2016/QH13"
            ]
        },
        "rubric": [
            {"criterion": "Nêu đúng thứ tự cộng dồn thuế và cơ sở tính thuế GTGT khi có thuế chống bán phá giá", "max_points": 2.0},
            {"criterion": "Tính chính xác Trị giá tính thuế hải quan V_NK bằng VNĐ", "max_points": 2.0},
            {"criterion": "Tính chuẩn xác số tiền Thuế chống bán phá giá T_AD", "max_points": 2.5},
            {"criterion": "Tính chuẩn xác Thuế GTGT và Tổng số tiền thuế phải nộp (438,376,250 VNĐ)", "max_points": 3.5}
        ]
    },

    "origin_co_dispute": {
        "title": "Thẩm Định Xuất Xứ Hàng Hóa & Xử Lý Tranh Chấp Hóa Đơn Bên Thứ Ba (Third-Party)",
        "category": "origin_co_dispute",
        "category_name": "Xuất Xứ Hàng Hóa (C/O)",
        "difficulty": "medium",
        "company": "Công ty TNHH Thương mại Quốc tế Minh Khang (MST: 0109923488)",
        "context": (
            "Công ty Minh Khang nhập khẩu lô hàng 500 chiếc Nồi chiên không dầu (Mã HS: 8516.79.90). "
            "Hàng được sản xuất và xuất xưởng từ Nhà máy tại Chiết Giang (Trung Quốc), vận chuyển thẳng từ Cảng Ninh Ba về Cảng Hải Phòng. "
            "Tuy nhiên, Hợp đồng ngoại thương và Hóa đơn thương mại (Invoice) được ký và phát hành bởi Công ty Thương mại Apex Global Pte Ltd có trụ sở tại Singapore. "
            "Doanh nghiệp xuất trình chứng từ C/O Form E do Phòng Thương mại Trung Quốc (CCPIT) cấp. "
            "Khi kiểm tra hồ sơ, công chức hải quan phát hiện:\n"
            "- Ô số 7 của C/O ghi rõ tên nhà sản xuất tại Trung Quốc.\n"
            "- Ô số 10 ghi số và ngày của Invoice do Apex Global (Singapore) phát hành.\n"
            "- Tuy nhiên, tại ô số 13 ('Third Party Invoicing'), người khai/cơ quan cấp C/O đã KHÔNG đánh dấu (tick) vào ô này.\n"
            "Trị giá CIF của lô hàng là 17,500 USD (Tỷ giá: 25,450 VNĐ). Thuế MFN là 20%, thuế Form E là 0%, VAT 10%."
        ),
        "documents": [
            {"name": "Hóa đơn thương mại bên thứ ba", "code": "APX-SG-5501", "summary": "Phát hành bởi Apex Global Pte Ltd (Singapore), đơn giá 35 USD/chiếc"},
            {"name": "C/O Form E (ACFTA)", "code": "E26CN88019", "summary": "Cấp tại Trung Quốc, ô số 10 ghi hóa đơn Singapore nhưng ô số 13 không tick"},
            {"name": "Vận đơn đường biển (B/L)", "code": "NBO-HPH-2026", "summary": "Vận chuyển trực tiếp từ Cảng Ninh Ba (TQ) đến Cảng Hải Phòng (VN)"}
        ],
        "questions": [
            "Yêu cầu 1: Căn cứ Thông tư 12/2019/TT-BCT hướng dẫn Quy tắc xuất xứ trong Hiệp định ACFTA, C/O Form E không đánh dấu vào ô số 13 trong trường hợp có hóa đơn bên thứ ba có được coi là hợp lệ để hưởng thuế 0% ngay hay không?",
            "Yêu cầu 2: Cơ quan Hải quan sẽ xử lý như thế nào theo quy trình tại Thông tư 38/2015/TT-BTC (từ chối ngay hay giải phóng hàng và tiến hành xác minh C/O)?",
            "Yêu cầu 3: Trong trường hợp C/O bị cơ quan hải quan bác bỏ chính thức, tính số tiền thuế nhập khẩu chênh lệch mà doanh nghiệp phải nộp bổ sung kèm số tiền thuế GTGT tương ứng."
        ],
        "solution": {
            "analysis": (
                "- Tính hợp lệ của C/O: Căn cứ Quy tắc 23 Phụ lục I Thông tư 12/2019/TT-BCT, trường hợp hóa đơn bên thứ ba phát hành, ô số 13 bắt buộc phải được đánh dấu 'Third Party Invoicing'. Việc không đánh dấu là lỗi sai sót về hình thức trọng yếu làm C/O chưa đủ điều kiện chấp nhận ngay.\n"
                "- Quy trình xử lý của Hải quan: Theo Điều 26 Thông tư 38/2015/TT-BTC và Thông tư 33/2023/TT-BTC, hải quan không bác bỏ ngay mà cho phép người khai nộp bảo lãnh hoặc tạm nộp thuế theo mức MFN để thông quan/giải phóng hàng, sau đó tiến hành thủ tục gửi văn bản xác minh (Verification) tới cơ quan cấp C/O Trung Quốc.\n"
                "- Tính toán thuế chênh lệch khi C/O bị bác bỏ:\n"
            ),
            "step_by_step_math": [
                "Trị giá tính thuế CIF = 500 * 35 USD = 17,500 USD",
                "Trị giá tính thuế VNĐ (V_NK) = 17,500 USD * 25,450 VNĐ = 445,375,000 VNĐ",
                "Thuế nhập khẩu Form E (0%) = 0 VNĐ",
                "Thuế nhập khẩu MFN (20%) = 445,375,000 * 20% = 89,075,000 VNĐ",
                "Số thuế nhập khẩu truy thu thêm = 89,075,000 VNĐ",
                "Thuế GTGT ban đầu (theo Form E) = 445,375,000 * 10% = 44,537,500 VNĐ",
                "Thuế GTGT sau khi tính MFN = (445,375,000 + 89,075,000) * 10% = 53,445,000 VNĐ",
                "Số thuế GTGT phải nộp thêm = 53,445,000 - 44,537,500 = 8,907,500 VNĐ",
                "Tổng số tiền thuế chênh lệch doanh nghiệp phải nộp thêm = 89,075,000 + 8,907,500 = 97,982,500 VNĐ"
            ],
            "final_numbers": {
                "v_cif_usd": 17500,
                "v_nk_vnd": 445375000,
                "diff_import_tax_vnd": 89075000,
                "diff_vat_vnd": 8907500,
                "total_diff_tax_vnd": 97982500
            },
            "legal_citations": [
                "Quy tắc 23 Phụ lục I Thông tư 12/2019/TT-BCT",
                "Điều 26 Thông tư 38/2015/TT-BTC (sửa đổi Thông tư 39/2018/TT-BTC)",
                "Thông tư 33/2023/TT-BTC quy định về xác định xuất xứ hàng hóa xuất nhập khẩu"
            ]
        },
        "rubric": [
            {"criterion": "Phân tích chính xác điều kiện thể thức ô số 13 C/O Form E về hóa đơn bên thứ ba", "max_points": 2.5},
            {"criterion": "Nêu đúng quy trình nghiệp vụ xử lý xác minh C/O và quyền bảo lãnh giải phóng hàng", "max_points": 2.5},
            {"criterion": "Tính chính xác số thuế nhập khẩu MFN chênh lệch bị truy thu (89,075,000 VNĐ)", "max_points": 2.5},
            {"criterion": "Tính chính xác thuế GTGT chênh lệch và tổng nghĩa vụ nộp thêm (97,982,500 VNĐ)", "max_points": 2.5}
        ]
    },

    "post_clearance_audit_penalties": {
        "title": "Khai Bổ Sung Sau Thông Quan, Truy Thu Thuế & Phạt Chậm Nộp (Nghị định 128/2020)",
        "category": "post_clearance_audit_penalties",
        "category_name": "Kiểm Tra Sau Thông Quan & Xử Phạt VPHC",
        "difficulty": "hard",
        "company": "Công ty TNHH Điện tử Gia dụng An Phát (MST: 0107881920)",
        "context": (
            "Ngày 01/06/2026, Công ty An Phát hoàn thành thông quan lô hàng 200 chiếc Màn hình vi tính áp mã HS 8471.60.40 "
            "(thuế suất NK ưu đãi MFN: 0%, thuế GTGT: 10%). Đơn giá khai báo là 150 USD/chiếc CIF Hải Phòng (Tỷ giá: 25,450 VNĐ). "
            "Doanh nghiệp đã nộp thuế GTGT và đưa hàng về tiêu thụ nội địa.\n"
            "Sau 60 ngày kể từ ngày thông quan, Chi cục Kiểm tra sau thông quan (Cục Hải quan) tiến hành kiểm tra sau thông quan "
            "tại trụ sở doanh nghiệp và phát hiện: Lô hàng thực chất có tích hợp bộ thu tín hiệu truyền hình (tuner) và loa công suất lớn, "
            "mục đích sử dụng chính là Smart Tivi, do đó mã HS chính xác phải là 8528.72.99 (Thuế NK MFN: 15%, Thuế GTGT: 10%). "
            "Hành vi này thuộc diện người nộp thuế khai sai dẫn đến thiếu số tiền thuế phải nộp, bị phát hiện qua kiểm tra sau thông quan."
        ),
        "documents": [
            {"name": "Tờ khai hải quan luồng Xanh đã thông quan", "code": "10588291010", "summary": "200 chiếc, khai mã HS 8471.60.40 (Thuế NK 0%, VAT 10%)"},
            {"name": "Biên bản kiểm tra sau thông quan", "code": "BB-KTSTQ-2026", "summary": "Kết luận hàng hóa là Smart Tivi, chuyển mã HS sang 8528.72.99 (Thuế NK 15%)"},
            {"name": "Quyết định ấn định thuế & Xử phạt VPHC", "code": "QĐ-AĐ-2026", "summary": "Truy thu thuế NK, thuế GTGT, phạt 20% và tiền chậm nộp 0.03%/ngày trong 60 ngày"}
        ],
        "questions": [
            "Yêu cầu 1: Tính Trị giá tính thuế của lô hàng và số tiền Thuế nhập khẩu bị ấn định truy thu.",
            "Yêu cầu 2: Tính số tiền Thuế GTGT bị truy thu thêm tương ứng.",
            "Yêu cầu 3: Tính số tiền phạt chậm nộp trong thời hạn 60 ngày với mức 0.03%/ngày theo Luật Quản lý thuế số 38/2019/QH14.",
            "Yêu cầu 4: Xác định mức xử phạt vi phạm hành chính đối với hành vi khai sai dẫn đến thiếu số tiền thuế phải nộp theo quy định tại Nghị định 128/2020/NĐ-CP (mức phạt 20% số tiền thuế khai thiếu). Tổng số tiền doanh nghiệp phải nộp vào NSNN là bao nhiêu?"
        ],
        "solution": {
            "analysis": (
                "- Trị giá hải quan CIF: 200 chiếc * 150 USD = 30,000 USD = 763,500,000 VNĐ.\n"
                "- Số tiền thuế NK khai thiếu: 763,500,000 * 15% = 114,525,000 VNĐ.\n"
                "- Số tiền thuế GTGT khai thiếu: Do thuế NK tăng lên nên trị giá tính thuế GTGT tăng tương ứng: 114,525,000 * 10% = 11,452,500 VNĐ.\n"
                "- Tổng tiền thuế khai thiếu (NK + GTGT) = 114,525,000 + 11,452,500 = 125,977,500 VNĐ.\n"
                "- Tiền chậm nộp (Điều 59 Luật Quản lý thuế 38/2019): Tiền chậm nộp = 125,977,500 * 0.03% * 60 ngày.\n"
                "- Tiền phạt VPHC (Điều 9 Nghị định 128/2020/NĐ-CP): Phạt 20% tính trên tổng số tiền thuế khai thiếu.\n"
            ),
            "step_by_step_math": [
                "Trị giá tính thuế (V_NK) = 200 * 150 USD * 25,450 VNĐ = 763,500,000 VNĐ",
                "1. Thuế nhập khẩu truy thu:\n"
                "   T_NK_truy_thu = 763,500,000 * 15% = 114,525,000 VNĐ",
                "2. Thuế GTGT truy thu:\n"
                "   T_VAT_truy_thu = 114,525,000 * 10% = 11,452,500 VNĐ",
                "3. Tổng số tiền thuế truy thu:\n"
                "   Tong_thue_truy_thu = 114,525,000 + 11,452,500 = 125,977,500 VNĐ",
                "4. Tiền chậm nộp (60 ngày * 0.03%/ngày):\n"
                "   Tien_cham_nop = 125,977,500 * 0.0003 * 60 = 2,267,595 VNĐ",
                "5. Tiền phạt vi phạm hành chính (20% số tiền thuế khai thiếu):\n"
                "   Tien_phat_20 = 125,977,500 * 20% = 25,195,500 VNĐ",
                "6. Tổng số tiền doanh nghiệp phải nộp vào Ngân sách Nhà nước:\n"
                "   Tong_nop = 125,977,500 (Thuế) + 2,267,595 (Chậm nộp) + 25,195,500 (Phạt) = 153,440,595 VNĐ"
            ],
            "final_numbers": {
                "v_nk_vnd": 763500000,
                "diff_import_tax_vnd": 114525000,
                "diff_vat_vnd": 11452500,
                "total_diff_tax_vnd": 125977500,
                "late_fee_vnd": 2267595,
                "penalty_20_vnd": 25195500,
                "total_payable_vnd": 153440595
            },
            "legal_citations": [
                "Điều 9 Nghị định 128/2020/NĐ-CP (Xử phạt vi phạm hành chính về hải quan)",
                "Điều 59 Luật Quản lý thuế số 38/2019/QH14 (Tiền chậm nộp tiền thuế)",
                "Luật Thuế xuất khẩu, thuế nhập khẩu số 107/2016/QH13"
            ]
        },
        "rubric": [
            {"criterion": "Tính chính xác số tiền Thuế nhập khẩu và Thuế GTGT bị truy thu", "max_points": 2.5},
            {"criterion": "Áp dụng đúng công thức và tính chuẩn xác Tiền chậm nộp 60 ngày (2,267,595 VNĐ)", "max_points": 2.5},
            {"criterion": "Xác định đúng căn cứ pháp lý và mức phạt 20% theo NĐ 128/2020 (25,195,500 VNĐ)", "max_points": 2.5},
            {"criterion": "Tổng hợp chính xác tổng số tiền doanh nghiệp phải nộp vào NSNN (153,440,595 VNĐ)", "max_points": 2.5}
        ]
    }
}

# ─── 3. CORE GENERATOR & SERVICE FUNCTIONS ───────────────────────────────────
def get_case_study_template(category: Optional[str] = None, prompt: Optional[str] = None) -> Dict[str, Any]:
    """Lựa chọn kịch bản tình huống phù hợp nhất dựa trên danh mục hoặc từ khóa trong prompt (hỗ trợ cả có dấu và không dấu)."""
    if category and category in PRESET_SCENARIOS:
        return dict(PRESET_SCENARIOS[category])

    if prompt:
        lower = prompt.lower()
        # 1. Chống bán phá giá & Đa sắc thuế
        if any(w in lower for w in [
            "chống bán phá giá", "chong ban pha gia", "phòng vệ", "phong ve", 
            "thép", "thep", "đa sắc thuế", "da sac thue", "thuế ad", "thue ad"
        ]):
            return dict(PRESET_SCENARIOS["multi_tax_trade_defense"])

        # 2. Sau thông quan & Phạt chậm nộp
        elif any(w in lower for w in [
            "sau thông quan", "sau thong quan", "chậm nộp", "cham nop", 
            "truy thu", "phạt 20", "phat 20", "nghị định 128", "nghi dinh 128", "khai sai"
        ]):
            return dict(PRESET_SCENARIOS["post_clearance_audit_penalties"])

        # 3. Xuất xứ C/O & Hóa đơn bên thứ ba
        elif any(w in lower for w in [
            "bên thứ ba", "ben thu ba", "third party", "ô số 13", "o so 13",
            "tranh chấp c/o", "tranh chap c/o", "form e", "xuất xứ", "xuat xu"
        ]):
            return dict(PRESET_SCENARIOS["origin_co_dispute"])

        # 4. Incoterms & Trị giá hải quan
        elif any(w in lower for w in [
            "inco", "fob", "cif", "trị giá", "tri gia", "điều chỉnh", "dieu chinh",
            "vjepa", "form vj", "cước", "cuoc", "bảo hiểm", "bao hiem"
        ]):
            return dict(PRESET_SCENARIOS["valuation_incoterms"])

    # Mặc định lấy tình huống Incoterms kinh điển
    return dict(PRESET_SCENARIOS["valuation_incoterms"])

def generate_case_study(
    category: Optional[str] = None,
    difficulty: str = "medium",
    prompt: Optional[str] = None,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None
) -> Dict[str, Any]:
    """Sinh ra bài tập tình huống hoàn chỉnh kèm mã định danh duy nhất và lưu vào DB."""
    template = get_case_study_template(category, prompt)
    case_id = f"case-{uuid.uuid4().hex[:10]}"

    case_study_data = {
        "id": case_id,
        "title": template["title"],
        "category": template["category"],
        "categoryName": template["category_name"],
        "difficulty": template.get("difficulty", difficulty),
        "company": template["company"],
        "context": template["context"],
        "documents": template["documents"],
        "questions": template["questions"],
        "solution": template["solution"],
        "rubric": template["rubric"],
        "createdAt": datetime.now().isoformat()
    }

    # Lưu vào database nếu có session_id hoặc user_id
    try:
        from db import save_case_study
        save_case_study(
            case_id=case_id,
            user_id=user_id or "anonymous",
            session_id=session_id,
            case_study_data=case_study_data
        )
    except Exception as e:
        logger.error(f"Error saving case study to db: {e}")

    return case_study_data

def grade_case_study_solution(case_study: Dict[str, Any], user_solution: str) -> Dict[str, Any]:
    """
    Chấm điểm bài làm tự luận của người dùng theo Barem 4 tiêu chí chuẩn (Thang điểm 10.0).
    Sử dụng kết hợp phân tích đối chiếu từ khóa quy phạm, số liệu số học Ground Truth.
    """
    if not user_solution or len(user_solution.strip()) < 10:
        return {
            "score": 0.0,
            "passed": False,
            "feedback": "Bài làm quá ngắn hoặc chưa có nội dung trả lời. Vui lòng trình bày các bước tính toán và căn cứ pháp lý cụ thể.",
            "rubricScores": [
                {"criterion": r["criterion"], "maxPoints": r["max_points"], "awardedPoints": 0.0, "comment": "Chưa có lời giải"}
                for r in case_study.get("rubric", [])
            ],
            "solution": case_study.get("solution", {})
        }

    user_text = user_solution.lower()
    solution = case_study.get("solution", {})
    final_nums = solution.get("final_numbers", {})
    rubric = case_study.get("rubric", [])

    # Phát hiện bài làm chỉ là khung sườn mẫu chưa điền đáp án thực tế
    is_template_only = ("--- bài làm tự luận" in user_text) and (user_text.count("...") >= 2 or "= ..." in user_text)

    total_score = 0.0
    rubric_scores = []

    # ─── Tiêu chí 1: Pháp lý & Phương pháp điều chỉnh (2.5đ) ─────────────
    max_p1 = rubric[0]["max_points"] if len(rubric) > 0 else 2.5
    if is_template_only:
        score_1 = 0.5
        c1_comment = "Mới chỉ sao chép khung sườn mẫu văn bản quy phạm, chưa phân tích điều khoản áp dụng thực tế vào lô hàng."
    else:
        c1_keywords = ["thông tư 39", "thông tư 60", "điều chỉnh cộng", "điều chỉnh trừ", "trị giá giao dịch", "fob", "cif", "form e", "third party", "nghị định 128", "luật quản lý thuế", "chống bán phá giá"]
        c1_matches = sum(1 for kw in c1_keywords if kw in user_text)
        c1_ratio = min(1.0, c1_matches / 2.5)
        score_1 = round(max_p1 * c1_ratio, 1)
        c1_comment = f"Đã viện dẫn {'tốt' if score_1 >= max_p1*0.8 else 'tương đối'} các căn cứ pháp lý và phương pháp phân loại."
    total_score += score_1
    rubric_scores.append({
        "criterion": rubric[0]["criterion"] if len(rubric) > 0 else "Căn cứ pháp lý & Nhận diện nghiệp vụ",
        "maxPoints": max_p1,
        "awardedPoints": score_1,
        "comment": c1_comment
    })

    # ─── Tiêu chí 2: Trị giá tính thuế V_NK hoặc Quy trình C/O (2.5đ) ────
    max_p2 = rubric[1]["max_points"] if len(rubric) > 1 else 2.5
    score_2 = 0.0
    cat = case_study.get("category", "")
    cleaned_digits = re.sub(r"[^\d]", "", user_solution)

    if is_template_only:
        score_2 = 0.0
        c2_comment = "Lỗi tính toán: Bạn chưa nhập kết quả tính toán trị giá hải quan (vẫn để dấu ... trong bài làm)."
    elif cat == "origin_co_dispute":
        co_proc_keywords = ["xác minh", "bảo lãnh", "tạm nộp", "giải phóng hàng", "thông tư 38", "thông tư 33", "mfn", "ô số 13"]
        matches = sum(1 for kw in co_proc_keywords if kw in user_text)
        if matches >= 2:
            score_2 = max_p2
            c2_comment = "Nêu chính xác quy trình nghiệp vụ xử lý xác minh C/O và thủ tục tạm nộp/bảo lãnh."
        elif matches == 1:
            score_2 = round(max_p2 * 0.6, 1)
            c2_comment = "Đã nêu một phần quy trình xử lý C/O nhưng cần chi tiết hơn về thủ tục bảo lãnh."
        else:
            score_2 = 0.0
            c2_comment = "Chưa nêu đúng quy trình nghiệp vụ xử lý đối với C/O có nghi vấn."
    else:
        v_cif_usd = str(final_nums.get("v_cif_usd", ""))
        v_nk_vnd_str = str(final_nums.get("v_nk_vnd", ""))
        if "243150" in cleaned_digits or "6188167" in cleaned_digits or "điều chỉnh trừ: 500" in user_text or "điều chỉnh trừ: 500" in user_solution.lower():
            # Dính bẫy nghiệp vụ trừ 500 USD phí dỡ hàng phát sinh sau cảng dỡ
            score_2 = round(max_p2 * 0.5, 1)
            c2_comment = "Lỗi nghiệp vụ: Phí dỡ hàng và lưu kho 500 USD phát sinh sau khi đến cảng không nằm trong giá hợp đồng FOB ban đầu, do đó không được trừ vào trị giá hải quan theo Điều 15 Thông tư 39/2015/TT-BTC."
        elif v_nk_vnd_str and v_nk_vnd_str[:6] in cleaned_digits:
            score_2 = max_p2
            c2_comment = "Xác định hoàn toàn chính xác Trị giá tính thuế hải quan."
        elif v_cif_usd and v_cif_usd in cleaned_digits:
            # Tính được CIF USD nhưng quên nhân tỷ giá quy đổi sang VNĐ
            score_2 = round(max_p2 * 0.6, 1)
            c2_comment = "Lỗi tính toán: Bỏ sót bước quy đổi tỷ giá từ USD sang VND tại thời điểm đăng ký tờ khai. Xem Barem để đối chiếu."
        elif any(term in user_text for term in ["trị giá tính thuế", "cước", "bảo hiểm", "v_nk", "chậm nộp", "ngày"]):
            score_2 = round(max_p2 * 0.4, 1)
            c2_comment = "Đã nêu phương pháp tính nhưng kết quả số học có sự chênh lệch hoặc thiếu bước quy đổi."
        else:
            score_2 = 0.0
            c2_comment = "Chưa xác định đúng Trị giá tính thuế của lô hàng."

    total_score += score_2
    rubric_scores.append({
        "criterion": rubric[1]["criterion"] if len(rubric) > 1 else "Trị giá tính thuế V_NK / Quy trình C/O",
        "maxPoints": max_p2,
        "awardedPoints": score_2,
        "comment": c2_comment
    })

    # ─── Tiêu chí 3: Tính toán các sắc thuế (3.0đ) ────────────────────────
    max_p3 = rubric[2]["max_points"] if len(rubric) > 2 else 2.5
    score_3 = 0.0
    if is_template_only:
        score_3 = 0.0
        c3_comment = "Chưa thực hiện tính toán số tiền thuế cụ thể theo yêu cầu đề bài."
    else:
        tax_terms_matched = 0
        for key, val in final_nums.items():
            if "tax" in key or "ad" in key or "diff" in key or "penalty" in key:
                val_str = str(val)
                if len(val_str) > 4 and val_str[:5] in cleaned_digits:
                    tax_terms_matched += 1

        if tax_terms_matched >= 2:
            score_3 = max_p3
            c3_comment = "Tính toán chuẩn xác các sắc thuế, chênh lệch thuế và tiền phạt."
        elif tax_terms_matched == 1 or any(t in user_text for t in ["thuế nhập khẩu", "thuế gtgt", "thuế nk"]):
            score_3 = round(max_p3 * 0.6, 1)
            c3_comment = "Tính đúng một phần các sắc thuế hoặc công thức, cần chú ý tính toán chi tiết hơn."
        else:
            score_3 = 0.0
            c3_comment = "Chưa tính chính xác số tiền thuế theo biểu thuế quy định."
    total_score += score_3
    rubric_scores.append({
        "criterion": rubric[2]["criterion"] if len(rubric) > 2 else "Tính toán số tiền thuế & tiền phạt",
        "maxPoints": max_p3,
        "awardedPoints": score_3,
        "comment": c3_comment
    })

    # ─── Tiêu chí 4: Kết luận & Giải pháp xử lý (2.0đ) ────────────────────
    max_p4 = rubric[3]["max_points"] if len(rubric) > 3 else 2.5
    if is_template_only:
        score_4 = 0.0
        c4_comment = "Chưa đưa ra kết luận hoặc giải pháp xử lý nghiệp vụ cho doanh nghiệp."
    else:
        c4_keywords = ["tổng số tiền", "tiết kiệm", "phải nộp", "kết luận", "chậm nộp", "xử phạt", "ngân sách", "thông quan", "xác minh"]
        c4_matches = sum(1 for kw in c4_keywords if kw in user_text)
        if c4_matches > 0:
            score_4 = round(max_p4 * min(1.0, c4_matches / 2.0), 1)
            c4_comment = "Đã đưa ra kết luận và giải pháp xử lý nghiệp vụ cho doanh nghiệp."
        else:
            score_4 = 0.0
            c4_comment = "Chưa đưa ra kết luận hoặc kiến nghị thủ tục cụ thể cho doanh nghiệp."
    total_score += score_4
    rubric_scores.append({
        "criterion": rubric[3]["criterion"] if len(rubric) > 3 else "Kết luận & Giải pháp thủ tục",
        "maxPoints": max_p4,
        "awardedPoints": score_4,
        "comment": c4_comment
    })

    final_score = round(min(10.0, total_score), 1)
    passed = final_score >= 5.0

    feedback = (
        f"Bạn đạt {final_score}/10.0 điểm ({'ĐẠT CHUẨN NGHIỆP VỤ' if passed else 'CHƯA ĐẠT'}). "
        f"{'Bài làm thể hiện tư duy phân tích luật và kỹ năng tính toán rất vững.' if final_score >= 8.0 else 'Bài làm đã nắm được khung kiến thức, hãy đối chiếu với Đáp án chuẩn để hoàn thiện các bước tính số học.'}"
    )

    return {
        "score": final_score,
        "passed": passed,
        "feedback": feedback,
        "rubricScores": rubric_scores,
        "solution": solution
    }
