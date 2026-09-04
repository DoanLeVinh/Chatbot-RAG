"""
Module: Quiz & Assessment Service (AI Quiz Generator)
Tạo bài trắc nghiệm pháp lý / tài liệu tự động có trích dẫn căn cứ luật.
Hỗ trợ đa dạng chủ đề, trích xuất động từ 4,100+ điều luật trong DB và ngân hàng 40+ câu hỏi chuyên sâu.
"""

import os
import re
import json
import random
import logging
from typing import Optional, Dict, Any, Tuple, List

from db import create_quiz, get_connection
from llm_router import get_llm_router

logger = logging.getLogger("quiz_service")

QUIZ_INTENT_PATTERNS = [
    r"t[aạảãá]o.*(tr[aắặ]c\s*nghi[eệ]m|c[aâ]u\s*h[oỏ]i|b[aà]i\s*test|b[aà]i\s*thi|[đd][eề]\s*thi|quiz)",
    r"(l[aà]m|sinh|ra|cho\s*t[oô]i|kh[oở]i\s*t[aạ]o).*(tr[aắặ]c\s*nghi[eệ]m|quiz|b[aà]i\s*test|b[aà]i\s*thi|b[oộ]\s*c[aâ]u\s*h[oỏ]i)",
    r"(tr[aắặ]c\s*nghi[eệ]m|quiz).*(v[eề]|t[uừ]|lu[aậ]t|t[aà]i\s*li[eệ]u|file|b[aà]i)",
    r"ki[eể]m\s*tra\s*ki[eế]n\s*th[uứ]c.*(b[aằ]ng|qua|v[eề]|tr[aắặ]c\s*nghi[eệ]m)",
    r"multiple\s*choice|generate\s*quiz|create\s*quiz",
]

# 8 Chuyên đề nghiệp vụ hải quan xoay vòng để đảm bảo tính đa dạng tuyệt đối
CUSTOMS_TOPICS = [
    {
        "id": "valuation",
        "title": "Trị giá Hải quan & Điều chỉnh Incoterms",
        "keywords": ["trị giá", "tri gia", "incoterm", "fob", "cif", "điều chỉnh", "dieu chinh", "bản quyền", "hoa hồng"],
        "retrieval_query": "xác định trị giá hải quan trị giá tính thuế khoản điều chỉnh cộng trừ cif fob hoa hồng cước bảo hiểm thông tư 39 2015",
        "category": "Trị giá Hải quan"
    },
    {
        "id": "origin_co",
        "title": "Quy tắc Xuất xứ Hàng hóa (C/O)",
        "keywords": ["xuất xứ", "xuat xu", "c/o", "form e", "form vj", "form d", "bên thứ ba", "hóa đơn bên thứ ba", "wo", "rvc", "ctc"],
        "retrieval_query": "quy tắc xuất xứ hàng hóa chứng nhận xuất xứ co form e form vj form d xuất xứ thuần túy ctc chuyển đổi mã số rvc thông tư 33 2023",
        "category": "Xuất xứ Hàng hóa"
    },
    {
        "id": "hs_code",
        "title": "Phân loại Hàng hóa & 6 Quy tắc HS",
        "keywords": ["mã hs", "ma hs", "phân loại", "phan loai", "quy tắc", "quy tac", "chú giải", "chu giai", "biểu thuế"],
        "retrieval_query": "phân loại hàng hóa mã số hs 6 quy tắc tổng quát phân loại hàng hóa chú giải chương nhóm phân nhóm thông tư 14 2015",
        "category": "Mã số HS"
    },
    {
        "id": "customs_procedure",
        "title": "Thủ tục Hải quan Điện tử & Phân luồng",
        "keywords": ["thủ tục", "thu tuc", "tờ khai", "to khai", "vnaccs", "phân luồng", "phan luong", "luồng xanh", "luồng vàng", "luồng đỏ", "giải phóng hàng"],
        "retrieval_query": "thủ tục hải quan điện tử tờ khai vnaccs vcis phân luồng xanh vàng đỏ kiểm tra chi tiết hồ sơ thông quan giải phóng hàng thông tư 38 2015",
        "category": "Thủ tục Hải quan"
    },
    {
        "id": "post_audit",
        "title": "Kiểm tra Sau thông quan & Xử phạt Vi phạm",
        "keywords": ["sau thông quan", "sau thong quan", "xử phạt", "xu phat", "chậm nộp", "cham nop", "truy thu", "nghị định 128", "nghi dinh 128"],
        "retrieval_query": "kiểm tra sau thông quan tại trụ sở người khai hải quan ấn định thuế xử phạt vi phạm hành chính chậm nộp nghị định 128 2020 luật hải quan",
        "category": "Kiểm tra Sau thông quan"
    },
    {
        "id": "import_export_tax",
        "title": "Thuế Xuất nhập khẩu & Miễn giảm thuế",
        "keywords": ["thuế xnk", "thue xnk", "miễn thuế", "mien thue", "giảm thuế", "hoàn thuế", "luật thuế 107", "bảo lãnh thuế"],
        "retrieval_query": "thuế xuất khẩu thuế nhập khẩu luật thuế 107 2016 đối tượng chịu thuế miễn thuế giảm thuế hoàn thuế tạo tài sản cố định",
        "category": "Thuế Xuất nhập khẩu"
    },
    {
        "id": "special_regimes",
        "title": "Gia công, SXXK & Kho ngoại quan",
        "keywords": ["gia công", "gia cong", "sxxk", "sản xuất xuất khẩu", "chế xuất", "che xuat", "epe", "kho ngoại quan", "tạm nhập tái xuất"],
        "retrieval_query": "loại hình gia công sản xuất xuất khẩu doanh nghiệp chế xuất tạm nhập tái xuất kho ngoại quan báo cáo quyết toán nguyên vật liệu",
        "category": "Loại hình Đặc thù"
    },
    {
        "id": "trade_defense",
        "title": "Thuế Phòng vệ Thương mại (Chống bán phá giá)",
        "keywords": ["chống bán phá giá", "chong ban pha gia", "phòng vệ", "phong ve", "trợ cấp", "tự vệ", "thuế ad"],
        "retrieval_query": "biện pháp phòng vệ thương mại thuế chống bán phá giá thuế chống trợ cấp thuế tự vệ luật quản lý ngoại thương 2017",
        "category": "Phòng vệ Thương mại"
    }
]

def is_quiz_intent(prompt: str) -> bool:
    """Kiểm tra xem câu chat của người dùng có ý định yêu cầu tạo bài trắc nghiệm hay không."""
    if not prompt:
        return False
    text = prompt.strip().lower()
    for pattern in QUIZ_INTENT_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

def extract_quiz_params(prompt: str) -> Dict[str, Any]:
    """Trích xuất số lượng câu hỏi, độ khó và chủ đề mong muốn từ câu chat."""
    text = prompt.strip()
    
    # Extract number of questions (Mặc định: 10 câu, Tối thiểu: 10 câu nếu không yêu cầu cụ thể)
    num_match = re.search(r"(\d+)\s*(câu|cau|questions?|q)", text, re.IGNORECASE)
    if num_match:
        try:
            num_q = int(num_match.group(1))
            num_q = max(5, min(30, num_q))
        except ValueError:
            num_q = 10
    else:
        num_q = 10

    # Extract difficulty
    diff = "medium"
    lower = text.lower()
    if any(k in lower for k in ["khó", "nang cao", "nâng cao", "tình huống", "chuyên sâu", "hard"]):
        diff = "hard"
    elif any(k in lower for k in ["dễ", "de", "cơ bản", "co ban", "easy"]):
        diff = "easy"

    return {
        "total_questions": num_q,
        "difficulty": diff,
        "time_limit_minutes": max(10, num_q * 2)
    }

def _clean_json_response(raw_text: str) -> Optional[dict]:
    """Trích xuất và parse an toàn JSON từ kết quả của LLM."""
    if not raw_text:
        return None
    cleaned = raw_text.strip()
    
    # Remove markdown code fences if any
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
    if fence_match:
        cleaned = fence_match.group(1).strip()
        
    # Attempt direct parse
    try:
        data = json.loads(cleaned)
        if isinstance(data, dict) and "questions" in data:
            return data
    except Exception:
        pass

    # Find first { and last }
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        try:
            data = json.loads(cleaned[first_brace:last_brace+1])
            if isinstance(data, dict) and "questions" in data:
                return data
        except Exception:
            pass

    return None

# ─── Smart Scoped NLP Parser & Dynamic Distractor Engine ─────────────

NOISE_HEADER_PATTERNS = [
    r"cộng\s*hòa\s*xã\s*hội\s*chủ\s*nghĩa\s*việt\s*nam",
    r"độc\s*lập\s*-\s*tự\s*do\s*-\s*hạnh\s*phúc",
    r"^(chính\s*phủ|bộ\s+[a-zà-ỹ\s]+|tổng\s*cục\s+[a-zà-ỹ\s]+|quốc\s*hội|thủ\s*tướng)\s*$",
    r"^(số\s*:\s*[\d\w\/\-]+|hà\s*nội,\s*ngày|tp\.?\s*hồ\s*chí\s*minh,\s*ngày)",
    r"^(nghị\s*định|thông\s*tư|luật|quyết\s*định)\s+số\s+[\d\w\/\-]+",
    r"^điều\s+\d+[\.\:]\s*([^\n]{1,45})$",
    r"^(chương|mục|phần)\s+[ivxlcdm\d]+",
    r"^(trang\s+\d+|\d+\s*\/\s*\d+|mục\s*lục)",
    r"^(kính\s*gửi|nơi\s*nhận)\s*[:\:]"
]

DYNAMIC_DISTRACTOR_POOL = {
    "authority": [
        "Doanh nghiệp tự ý quyết định và áp dụng mà không cần thông báo cho cơ quan quản lý nhà nước",
        "Ủy ban nhân dân cấp xã có thẩm quyền trực tiếp ra quyết định xử lý và áp dụng biện pháp",
        "Cơ quan Hải quan tự động hủy bỏ mọi biện pháp mà không cần ý kiến của cơ quan điều tra",
        "Toàn bộ thẩm quyền điều tra thuộc về tổ chức trọng tài thương mại quốc tế ngoài nước",
        "Hiệp hội ngành hàng tự ban hành quyết định điều tra mà không thông qua Bộ quản lý chuyên ngành",
        "Chi cục Thuế địa phương có toàn quyền quyết định thông quan hàng hóa xuất nhập khẩu",
        "Cơ quan Công an giao thông tỉnh trực tiếp ban hành quyết định kiểm tra sau thông quan"
    ],
    "timeline": [
        "Thời hạn giải quyết không bị giới hạn và có thể kéo dài vô thời hạn tùy theo ý chí của bên yêu cầu",
        "Mọi thủ tục phải hoàn thành bắt buộc trong vòng 24 giờ kể từ khi tiếp nhận hồ sơ",
        "Chỉ tiếp nhận hồ sơ trong 01 ngày làm việc duy nhất của mỗi quý theo thông báo",
        "Thời hạn điều tra tự động gia hạn thêm 05 năm mà không cần bất kỳ căn cứ pháp lý nào",
        "Không quy định thời hạn cụ thể, việc thực hiện hoàn toàn phụ thuộc vào thỏa thuận nội bộ",
        "Trong thời hạn 10 ngày làm việc kể từ ngày tàu rời cảng xuất khẩu",
        "Sau 90 ngày kể từ ngày đăng ký tờ khai mà không cần xin phép cơ quan hải quan"
    ],
    "evidence": [
        "Không cần xuất trình chứng cứ hay tài liệu chứng minh khi nộp đơn yêu cầu xử lý",
        "Mọi thông tin trong hồ sơ đều phải giữ bí mật tuyệt đối và không được cung cấp cho bất kỳ bên liên quan nào",
        "Chỉ chấp nhận chứng cứ bằng văn bản giấy có công chứng, không chấp nhận dữ liệu điện tử",
        "Bên yêu cầu có quyền từ chối cung cấp chứng cứ nhưng vẫn được chấp thuận toàn bộ yêu cầu",
        "Chỉ sử dụng thông tin do bên bị điều tra tự khai mà không tiến hành thẩm tra, xác minh",
        "Không cần lưu trữ chứng từ kế toán, sổ sách sau khi tờ khai đã được thông quan",
        "Chỉ cần tờ khai photo không cần chứng thực hoặc chữ ký số doanh nghiệp"
    ],
    "obligations": [
        "Người thực hiện không cần lưu trữ hồ sơ hay thực hiện bất kỳ nghĩa vụ theo dõi nào sau thông quan",
        "Tự động miễn trừ toàn bộ trách nhiệm bồi thường và nghĩa vụ pháp lý liên quan trong mọi trường hợp",
        "Bên bị điều tra có quyền từ chối hợp tác mà không phải chịu bất kỳ bất lợi pháp lý nào",
        "Không phải chịu trách nhiệm trước pháp luật đối với các số liệu, tài liệu cung cấp sai lệch",
        "Được phép tự ý sửa đổi hồ sơ sau khi đã có quyết định chính thức của cơ quan có thẩm quyền",
        "Được phép tự ý tiêu thụ hàng hóa đang trong diện tạm giải phóng chờ kết quả giám định",
        "Tự ý thay đổi niêm phong hải quan khi hàng hóa đang trên đường vận chuyển"
    ],
    "general": [
        "Chỉ áp dụng đối với hàng hóa lưu thông nội địa không chịu sự quản lý của cơ quan chức năng",
        "Quy định áp dụng đối với tất cả hàng hóa tiêu dùng cá nhân phi thương mại",
        "Không áp dụng đối với bất kỳ tổ chức, cá nhân nào tham gia hoạt động xuất nhập khẩu",
        "Miễn trừ toàn bộ nghĩa vụ kiểm tra chuyên ngành cho các doanh nghiệp có vốn đầu tư nước ngoài",
        "Quy định chỉ mang tính chất khuyến nghị và không có hiệu lực bắt buộc thi hành",
        "Áp dụng thuế suất 0% cho tất cả hàng hóa tiêu dùng không phân biệt xuất xứ",
        "Chỉ cần nộp thuế sau 01 năm kể từ thời điểm hàng hóa được thông quan"
    ]
}

def _is_administrative_or_noise(text: str) -> bool:
    """Kiểm tra xem dòng văn bản có phải là tiêu đề hành chính, số trang hoặc rác không mang giá trị quy phạm."""
    if not text or len(text.strip()) < 25:
        return True
    cleaned = text.strip().lower()
    for pattern in NOISE_HEADER_PATTERNS:
        if re.search(pattern, cleaned):
            return True
    return False

def _extract_smart_normative_clauses(scoped_chunks: List[dict], max_clauses: int = 25) -> List[Dict[str, Any]]:
    """Bóc tách các mệnh đề quy phạm hoàn chỉnh, giàu ý nghĩa pháp lý từ tài liệu Scoped PDF hoặc Database."""
    clauses: List[Dict[str, Any]] = []
    seen_texts = set()

    regulatory_keywords = [
        "phải", "có trách nhiệm", "thẩm quyền", "trong thời hạn", "không được", "bị cấm",
        "được phép", "được miễn", "áp dụng", "bao gồm", "là việc", "chứng cứ", "thiệt hại",
        "phòng vệ", "thuế", "hồ sơ", "quyết định", "điều tra", "nguyên tắc", "điều kiện",
        "thủ tục", "cung cấp", "công bố", "tiếp nhận", "xử lý", "ấn định", "chậm nộp"
    ]

    for chunk in scoped_chunks:
        txt = chunk.get("text", "").strip()
        if not txt:
            continue
        
        # Tách theo dấu chấm câu hoặc xuống dòng
        raw_sentences = re.split(r'(?<=[.!?;\n])\s+', txt)
        for s in raw_sentences:
            s_clean = s.strip()
            s_clean = re.sub(r'\s+', ' ', s_clean)
            
            if len(s_clean) < 40 or len(s_clean) > 220:
                continue
            if _is_administrative_or_noise(s_clean):
                continue
            if s_clean.lower() in seen_texts:
                continue

            s_lower = s_clean.lower()
            score = sum(1 for kw in regulatory_keywords if kw in s_lower)
            if score > 0:
                clause_type = "general"
                if any(w in s_lower for w in ["thẩm quyền", "bộ ", "cơ quan", "chính phủ", "tổng cục", "thủ tướng", "cục trưởng"]):
                    clause_type = "authority"
                elif any(w in s_lower for w in ["thời hạn", "ngày", "tháng", "năm", "trình tự", "thời điểm", "giờ"]):
                    clause_type = "timeline"
                elif any(w in s_lower for w in ["chứng cứ", "hồ sơ", "tài liệu", "thông tin", "cung cấp", "công khai", "tờ khai"]):
                    clause_type = "evidence"
                elif any(w in s_lower for w in ["nghĩa vụ", "trách nhiệm", "phải", "không được", "bị cấm", "hợp tác", "phạt"]):
                    clause_type = "obligations"

                seen_texts.add(s_lower)
                clauses.append({
                    "text": s_clean,
                    "type": clause_type,
                    "score": score,
                    "source": chunk.get("source", "")
                })

    clauses.sort(key=lambda x: x["score"], reverse=True)
    return clauses[:max_clauses]

def _shuffle_question_options(q: Dict[str, Any]) -> Dict[str, Any]:
    """Xáo trộn ngẫu nhiên 4 lựa chọn A, B, C, D để vị trí đáp án đúng luôn biến thiên."""
    raw_opts = q.get("options", {})
    correct_key = str(q.get("correct_option") or q.get("correctOption") or "A").strip().upper()

    pairs = []
    if isinstance(raw_opts, dict):
        for k, v in raw_opts.items():
            pairs.append((str(v), str(k).upper() == correct_key))
    elif isinstance(raw_opts, list):
        for idx, item in enumerate(raw_opts):
            if isinstance(item, dict):
                text = item.get("text") or item.get("value") or ""
                key = str(item.get("key") or chr(65 + idx)).upper()
                pairs.append((str(text), key == correct_key))
            else:
                pairs.append((str(item), chr(65 + idx) == correct_key))
    else:
        for slot in ["a", "b", "c", "d"]:
            val = q.get(f"option_{slot}") or q.get(f"option{slot.upper()}") or ""
            pairs.append((str(val), slot.upper() == correct_key))

    if not pairs:
        return q

    while len(pairs) < 4:
        pairs.append(("", False))

    pairs = pairs[:4]
    random.shuffle(pairs)

    new_options = {}
    new_correct_slot = "A"
    for idx, slot in enumerate(["A", "B", "C", "D"]):
        val, is_corr = pairs[idx]
        new_options[slot] = val
        if is_corr:
            new_correct_slot = slot

    res = dict(q)
    res["options"] = new_options
    res["correct_option"] = new_correct_slot
    return res

# ─── NGÂN HÀNG CÂU HỎI PHÁP LUẬT HẢI QUAN CHUYÊN SÂU (40+ CÂU HỎI ĐA DẠNG) ─────
EXPANDED_LEGAL_BANK = [
    # NHÓM 1: ĐỐI TƯỢNG, ĐỊA ĐIỂM & QUYỀN NGHĨA VỤ
    {
        "question": "Theo Luật Hải quan 2014, đối tượng nào sau đây chịu sự kiểm tra, giám sát hải quan?",
        "options": {
            "A": "Hàng hóa xuất khẩu, nhập khẩu, quá cảnh; phương tiện vận tải xuất cảnh, nhập cảnh, quá cảnh",
            "B": "Hàng hóa tiêu dùng nội địa lưu thông giữa các tỉnh không qua biên giới",
            "C": "Phương tiện vận tải công cộng hoạt động trong phạm vi nội đô",
            "D": "Hàng hóa nông sản lưu thông giữa các chợ truyền thống trong nước"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 3 Luật Hải quan 2014, đối tượng kiểm tra, giám sát hải quan gồm hàng hóa xuất khẩu, nhập khẩu, quá cảnh và phương tiện vận tải xuất cảnh, nhập cảnh, quá cảnh.",
        "citation_code": "Điều 3 Luật Hải quan 2014",
        "category": "Thủ tục Hải quan"
    },
    {
        "question": "Thời hạn người khai hải quan phải nộp tờ khai hải quan đối với hàng hóa nhập khẩu là bao lâu?",
        "options": {
            "A": "Nộp trước ngày hàng hóa đến cửa khẩu hoặc trong thời hạn 30 ngày kể từ ngày hàng hóa đến cửa khẩu",
            "B": "Bắt buộc phải nộp sau khi hàng hóa đã vào kho nội địa 15 ngày",
            "C": "Chỉ được nộp tờ khai sau khi đã hoàn thành nộp thuế 60 ngày",
            "D": "Không quy định thời hạn nộp tờ khai hải quan"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 25 Luật Hải quan 2014, đối với hàng hóa nhập khẩu, tờ khai hải quan được nộp trước ngày hàng hóa đến cửa khẩu hoặc trong thời hạn 30 ngày kể từ ngày hàng hóa đến cửa khẩu.",
        "citation_code": "Điều 25 Luật Hải quan 2014",
        "category": "Thủ tục Hải quan"
    },
    {
        "question": "Theo quy định của Luật Hải quan, người khai hải quan có quyền nào sau đây?",
        "options": {
            "A": "Được cơ quan hải quan cung cấp thông tin liên quan đến việc khai hải quan và xem trước hàng hóa dưới sự giám sát của hải quan",
            "B": "Tự ý thay đổi niêm phong hải quan khi phương tiện đang trên đường vận chuyển",
            "C": "Từ chối nộp thuế và các khoản phải nộp theo quy định của pháp luật",
            "D": "Tự ý thông quan hàng hóa khi chưa có quyết định của cơ quan hải quan"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 18 Luật Hải quan 2014, người khai có quyền được cung cấp thông tin, xem trước hàng hóa, lấy mẫu hàng hóa trước khi khai hải quan.",
        "citation_code": "Điều 18 Luật Hải quan 2014",
        "category": "Thủ tục Hải quan"
    },
    {
        "question": "Tờ khai hải quan được phân luồng Xanh có ý nghĩa gì đối với việc thông quan hàng hóa?",
        "options": {
            "A": "Hàng hóa được chấp nhận thông quan trên cơ sở thông tin khai hải quan điện tử, miễn kiểm tra chi tiết hồ sơ và miễn kiểm tra thực tế hàng hóa",
            "B": "Bắt buộc phải kiểm tra thực tế toàn bộ 100% lô hàng bằng phương pháp thủ công",
            "C": "Phải xuất trình toàn bộ chứng từ giấy bản gốc tại Chi cục Hải quan mới được thông quan",
            "D": "Hàng hóa bị tạm giữ để trưng cầu giám định chuyên ngành bắt buộc"
        },
        "correct_option": "A",
        "explanation": "Theo Thông tư 38/2015/TT-BTC, tờ khai luồng Xanh được hệ thống tự động chấp nhận thông quan mà không kiểm tra chi tiết hồ sơ giấy và thực tế hàng hóa.",
        "citation_code": "Thông tư 38/2015/TT-BTC & Điều 32 Luật Hải quan",
        "category": "Thủ tục Hải quan"
    },
    {
        "question": "Tờ khai hải quan phân luồng Vàng đòi hỏi người khai hải quan phải thực hiện bước nào sau đây?",
        "options": {
            "A": "Nộp hoặc xuất trình hồ sơ hải quan điện tử để cơ quan hải quan kiểm tra chi tiết hồ sơ, miễn kiểm tra thực tế hàng hóa",
            "B": "Đưa toàn bộ hàng hóa vào kiểm tra thực tế 100% qua máy soi container",
            "C": "Hàng hóa được thông quan tự động ngay mà không cần công chức hải quan duyệt hồ sơ",
            "D": "Bắt buộc phải xin ý kiến chấp thuận bằng văn bản của Bộ Tài chính"
        },
        "correct_option": "A",
        "explanation": "Luồng Vàng là hình thức kiểm tra chi tiết hồ sơ hải quan (chứng từ điện tử/giấy) nhưng được miễn kiểm tra thực tế hàng hóa.",
        "citation_code": "Điều 32 Luật Hải quan 2014",
        "category": "Thủ tục Hải quan"
    },

    # NHÓM 2: TRỊ GIÁ HẢI QUAN & INCOTERMS
    {
        "question": "Theo Thông tư 39/2015/TT-BTC, khoản chi phí nào sau đây PHẢI CỘNG vào trị giá tính thuế nhập khẩu nếu chưa có trong giá mua?",
        "options": {
            "A": "Chi phí hoa hồng bán hàng và phí môi giới bán hàng",
            "B": "Chi phí hoa hồng mua hàng trả cho đại lý của bên mua",
            "C": "Chi phí dỡ hàng và xếp dỡ phát sinh sau khi hàng đã đến cảng dỡ Việt Nam",
            "D": "Các khoản thuế nội địa đã nộp tại Việt Nam (như thuế GTGT)"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Khoản 2 Điều 13 Thông tư 39/2015/TT-BTC, hoa hồng bán hàng là khoản điều chỉnh cộng bắt buộc. Hoa hồng mua hàng không phải cộng.",
        "citation_code": "Điều 13 Thông tư 39/2015/TT-BTC",
        "category": "Trị giá Hải quan"
    },
    {
        "question": "Khoản chi phí nào sau đây ĐƯỢC PHÉP TRỪ khỏi trị giá tính thuế nếu tách riêng trên chứng từ hóa đơn theo Thông tư 39/2015/TT-BTC?",
        "options": {
            "A": "Chi phí xây dựng, lắp đặt, bảo dưỡng hoặc hỗ trợ kỹ thuật thực hiện sau khi nhập khẩu",
            "B": "Cước vận chuyển quốc tế từ cảng xuất về cảng nhập Việt Nam",
            "C": "Phí bảo hiểm hàng hải quốc tế cho lô hàng",
            "D": "Phí bản quyền mà người mua phải trả như một điều kiện của hợp đồng mua bán"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 15 Thông tư 39/2015/TT-BTC, chi phí lắp đặt, vận hành, bảo dưỡng thực hiện sau nhập khẩu được trừ nếu tách riêng trên hóa đơn.",
        "citation_code": "Điều 15 Thông tư 39/2015/TT-BTC",
        "category": "Trị giá Hải quan"
    },
    {
        "question": "Theo Incoterms 2020, điều kiện giao hàng FOB (Free on Board) quy định trách nhiệm thuê tàu và mua bảo hiểm chặng quốc tế thuộc về ai?",
        "options": {
            "A": "Người mua chịu trách nhiệm thuê phương tiện vận chuyển và mua bảo hiểm (nếu có)",
            "B": "Người bán bắt buộc phải thuê tàu và mua bảo hiểm loại A cho người mua",
            "C": "Cơ quan hải quan chỉ định đơn vị vận tải vận chuyển hàng hóa",
            "D": "Người bán chịu mọi chi phí và rủi ro cho đến khi hàng giao tại kho người mua"
        },
        "correct_option": "A",
        "explanation": "Trong điều kiện FOB Incoterms 2020, người bán giao hàng lên tàu tại cảng bốc; người mua chịu cước vận chuyển quốc tế (F) và bảo hiểm (I).",
        "citation_code": "Incoterms 2020 - ICC",
        "category": "Trị giá Hải quan"
    },
    {
        "question": "Khi xác định trị giá hải quan theo phương pháp trị giá giao dịch, điều kiện tiên quyết nào sau đây phải được thỏa mãn?",
        "options": {
            "A": "Người mua không bị hạn chế quyền định đoạt, sử dụng hàng hóa và giá cả không phụ thuộc vào điều kiện không xác định được giá trị",
            "B": "Người mua và người bán bắt buộc phải là công ty mẹ - con cùng tập đoàn",
            "C": "Hàng hóa phải được thanh toán 100% bằng tiền mặt trước khi ký hợp đồng",
            "D": "Lô hàng bắt buộc phải có chứng nhận xuất xứ ưu đãi C/O Form E"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 6 Thông tư 39/2015/TT-BTC, phương pháp trị giá giao dịch chỉ được áp dụng khi không có hạn chế quyền sử dụng và giá cả không bị chi phối bởi điều kiện bất định.",
        "citation_code": "Điều 6 Thông tư 39/2015/TT-BTC",
        "category": "Trị giá Hải quan"
    },

    # NHÓM 3: XUẤT XỨ HÀNG HÓA & C/O
    {
        "question": "Tiêu chí xuất xứ 'WO' (Wholly Obtained) trên Giấy chứng nhận xuất xứ hàng hóa (C/O) có ý nghĩa gì?",
        "options": {
            "A": "Hàng hóa có xuất xứ thuần túy hoặc được sản xuất toàn bộ tại một quốc gia thành viên",
            "B": "Hàng hóa có hàm lượng giá trị khu vực đạt tối thiểu 40%",
            "C": "Hàng hóa có sự chuyển đổi mã số phân loại ở cấp 4 số (CTH)",
            "D": "Hàng hóa được sản xuất từ 100% nguyên liệu nhập khẩu ngoài khối"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Nghị định 31/2018/NĐ-CP, tiêu chí WO (Wholly Obtained) áp dụng cho hàng hóa có xuất xứ thuần túy (như nông sản, khoáng sản khai thác tại nước thành viên).",
        "citation_code": "Điều 6 Nghị định 31/2018/NĐ-CP",
        "category": "Xuất xứ Hàng hóa"
    },
    {
        "question": "Trong C/O Form E (Hiệp định ACFTA), trường hợp hóa đơn thương mại do bên thứ ba (Third Party Invoicing) phát hành thì phải xử lý ô số nào?",
        "options": {
            "A": "Phải đánh dấu (tick) vào ô số 13 'Third Party Invoicing' và ghi rõ tên, nước của công ty phát hành hóa đơn tại ô số 7 hoặc ô số 10",
            "B": "Bắt buộc phải bỏ trống ô số 13 và chỉ nộp hóa đơn của nhà sản xuất",
            "C": "C/O Form E không chấp nhận hóa đơn bên thứ ba trong mọi trường hợp",
            "D": "Phải xin chữ ký của Bộ Ngoại giao nước thứ ba tại ô số 12"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Quy tắc 23 Phụ lục I Thông tư 12/2019/TT-BCT, trường hợp hóa đơn bên thứ ba thì ô số 13 phải được đánh dấu 'Third Party Invoicing'.",
        "citation_code": "Thông tư 12/2019/TT-BCT",
        "category": "Xuất xứ Hàng hóa"
    },
    {
        "question": "Theo Thông tư 33/2023/TT-BTC, thời hạn nộp chứng từ chứng nhận xuất xứ hàng hóa (C/O) để áp dụng thuế suất ưu đãi đặc biệt là khi nào?",
        "options": {
            "A": "Nộp tại thời điểm làm thủ tục hải quan hoặc nộp bổ sung trong thời hạn 30 ngày kể từ ngày đăng ký tờ khai hải quan",
            "B": "Bắt buộc phải nộp trước 01 năm kể từ ngày ký hợp đồng ngoại thương",
            "C": "Chỉ được nộp sau khi doanh nghiệp đã quyết toán thuế cuối năm",
            "D": "Không được nộp bổ sung C/O sau khi đã truyền tờ khai hải quan"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 12 Thông tư 33/2023/TT-BTC, người khai nộp C/O tại thời điểm làm thủ tục hoặc khai báo nợ C/O và nộp bổ sung trong vòng 30 ngày.",
        "citation_code": "Điều 12 Thông tư 33/2023/TT-BTC",
        "category": "Xuất xứ Hàng hóa"
    },

    # NHÓM 4: MÃ SỐ HS & PHÂN LOẠI
    {
        "question": "Quy tắc 1 trong 6 Quy tắc tổng quát giải thích việc phân loại hàng hóa theo Danh mục HS quy định điều gì?",
        "options": {
            "A": "Tên các phần, chương và phân chương chỉ để thuận tiện cho việc tra cứu; phân loại phải căn cứ vào nội dung nhóm hàng và các chú giải",
            "B": "Hàng hóa chưa hoàn chỉnh luôn được phân loại vào nhóm phế liệu",
            "C": "Hàng hóa đóng gói cùng nhau luôn áp mã số có mức thuế suất cao nhất",
            "D": "Bắt buộc phải gửi mẫu đi giám định trước khi áp mã số HS"
        },
        "correct_option": "A",
        "explanation": "Quy tắc 1 khẳng định giá trị pháp lý tối cao của nội dung nhóm hàng và chú giải Phần/Chương; tiêu đề phần/chương chỉ mang tính tra cứu.",
        "citation_code": "Thông tư 14/2015/TT-BTC & Thông tư 65/2017/TT-BTC",
        "category": "Mã số HS"
    },
    {
        "question": "Theo Quy tắc 2(a) của Hệ thống phân loại HS, hàng hóa ở dạng nào sau đây được phân loại như hàng hóa đã hoàn chỉnh?",
        "options": {
            "A": "Hàng hóa chưa hoàn chỉnh hoặc chưa hoàn thiện nhưng đã có đặc trưng cơ bản của hàng hóa đã hoàn chỉnh",
            "B": "Hàng hóa chỉ là nguyên liệu thô chưa trải qua bất kỳ công đoạn gia công nào",
            "C": "Hàng hóa bị hư hỏng hoàn toàn không còn khả năng phục hồi công năng",
            "D": "Hàng hóa dạng hỗn hợp nhiều chất lỏng không thể tách rời"
        },
        "correct_option": "A",
        "explanation": "Quy tắc 2(a) quy định một mặt hàng chưa hoàn chỉnh nhưng đã mang đặc trưng cơ bản của sản phẩm hoàn chỉnh thì phân loại như sản phẩm hoàn chỉnh.",
        "citation_code": "Quy tắc 2(a) - 6 Quy tắc tổng quát HS",
        "category": "Mã số HS"
    },
    {
        "question": "Hồ sơ đề nghị xác định trước mã số HS, xuất xứ, trị giá hải quan phải gửi đến Tổng cục Hải quan trước khi xuất nhập khẩu tối thiểu bao lâu?",
        "options": {
            "A": "Ít nhất 60 ngày trước khi xuất khẩu, nhập khẩu lô hàng",
            "B": "Ngay tại thời điểm tàu cập cảng",
            "C": "Sau khi hàng hóa đã được thông quan và bán ra thị trường",
            "D": "Trong thời hạn 03 ngày kể từ ngày nộp tờ khai hải quan"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 28 Luật Hải quan 2014 và Nghị định 08/2015/NĐ-CP, hồ sơ xác định trước phải nộp trước ít nhất 60 ngày trước ngày xuất nhập khẩu.",
        "citation_code": "Điều 28 Luật Hải quan 2014",
        "category": "Mã số HS"
    },

    # NHÓM 5: KIỂM TRA SAU THÔNG QUAN & XỬ PHẠT
    {
        "question": "Thời hạn kiểm tra sau thông quan tại trụ sở người khai hải quan là trong vòng bao lâu kể từ ngày đăng ký tờ khai?",
        "options": {
            "A": "Trong thời hạn 05 năm kể từ ngày đăng ký tờ khai hải quan",
            "B": "Trong thời hạn 01 tháng kể từ ngày hàng hóa rời cảng",
            "C": "Trong thời hạn 10 năm đối với mọi loại hàng hóa",
            "D": "Không quá 24 giờ sau khi thông quan hàng hóa"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 77 Luật Hải quan 2014, kiểm tra sau thông quan được thực hiện trong thời hạn 05 năm kể từ ngày đăng ký tờ khai hải quan.",
        "citation_code": "Điều 77 Luật Hải quan 2014",
        "category": "Kiểm tra Sau thông quan"
    },
    {
        "question": "Theo Nghị định 128/2020/NĐ-CP, hành vi khai sai dẫn đến thiếu số tiền thuế phải nộp bị xử phạt như thế nào?",
        "options": {
            "A": "Phạt 20% tính trên số tiền thuế khai thiếu hoặc số tiền thuế được miễn, giảm, hoàn cao hơn quy định cùng với việc nộp đủ tiền thuế và tiền chậm nộp",
            "B": "Chỉ bị nhắc nhở bằng văn bản mà không phải nộp bù tiền thuế",
            "C": "Bị tịch thu toàn bộ tài sản của doanh nghiệp",
            "D": "Phạt cố định 1.000.000 đồng bất kể số tiền thuế khai thiếu là bao nhiêu"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 9 Nghị định 128/2020/NĐ-CP, hành vi khai sai dẫn đến thiếu số tiền thuế phải nộp bị phạt 20% số thuế khai thiếu kèm nộp đủ thuế và tiền chậm nộp.",
        "citation_code": "Điều 9 Nghị định 128/2020/NĐ-CP",
        "category": "Kiểm tra Sau thông quan"
    },
    {
        "question": "Mức tính tiền chậm nộp tiền thuế đối với hàng hóa xuất nhập khẩu theo Luật Quản lý thuế số 38/2019/QH14 là bao nhiêu?",
        "options": {
            "A": "0.03%/ngày tính trên số tiền thuế chậm nộp",
            "B": "0.05%/ngày tính trên tổng trị giá lô hàng",
            "C": "1.0%/ngày tính trên số tiền phạt vi phạm hành chính",
            "D": "Cố định 100.000 đồng mỗi ngày không phân biệt số tiền nợ thuế"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 59 Luật Quản lý thuế số 38/2019/QH14, mức tính tiền chậm nộp là 0.03%/ngày tính trên số tiền thuế chậm nộp.",
        "citation_code": "Điều 59 Luật Quản lý thuế số 38/2019/QH14",
        "category": "Kiểm tra Sau thông quan"
    },

    # NHÓM 6: THUẾ XNK & MIỄN GIẢM THUẾ
    {
        "question": "Theo Luật Thuế xuất khẩu, thuế nhập khẩu số 107/2016/QH13, trường hợp nào sau đây được MIỄN thuế nhập khẩu?",
        "options": {
            "A": "Hàng hóa nhập khẩu để gia công cho thương nhân nước ngoài; hàng hóa nhập khẩu tạo tài sản cố định của dự án ưu đãi đầu tư",
            "B": "Hàng hóa tiêu dùng xa xỉ nhập khẩu kinh doanh nội địa",
            "C": "Ô tô chở người dưới 9 chỗ ngồi phục vụ kinh doanh thông thường",
            "D": "Hàng hóa kinh doanh phân phối thông thường trên sàn thương mại điện tử"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 16 Luật Thuế XNK 107/2016, hàng hóa gia công xuất khẩu và hàng hóa tạo tài sản cố định dự án ưu đãi đầu tư thuộc đối tượng miễn thuế.",
        "citation_code": "Điều 16 Luật Thuế XNK số 107/2016/QH13",
        "category": "Thuế Xuất nhập khẩu"
    },
    {
        "question": "Trường hợp doanh nghiệp nhập khẩu hàng hóa được bảo lãnh nộp thuế bởi tổ chức tín dụng, thời hạn bảo lãnh tối đa là bao lâu?",
        "options": {
            "A": "Thời hạn bảo lãnh tối đa là 30 ngày kể từ ngày đăng ký tờ khai hải quan và phải nộp tiền chậm nộp",
            "B": "Tối đa 05 năm mà không phải nộp tiền chậm nộp",
            "C": "Vô thời hạn cho đến khi doanh nghiệp bán hết hàng",
            "D": "Chỉ được bảo lãnh trong vòng 24 giờ sau thông quan"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Luật Thuế XNK 107/2016 và Luật Quản lý thuế, trường hợp được bảo lãnh, thời hạn bảo lãnh tối đa là 30 ngày và phải nộp tiền chậm nộp theo quy định.",
        "citation_code": "Luật Thuế XNK 107/2016",
        "category": "Thuế Xuất nhập khẩu"
    },

    # NHÓM 7: LOẠI HÌNH ĐẶC THÙ & QUẢN LÝ
    {
        "question": "Thời hạn lưu giữ hàng hóa trong kho ngoại quan tại Việt Nam theo Luật Hải quan 2014 là bao lâu?",
        "options": {
            "A": "Không quá 12 tháng kể từ ngày gửi vào kho; trường hợp có lý do chính đáng được gia hạn 01 lần không quá 12 tháng",
            "B": "Tối đa 30 ngày kể từ khi dỡ hàng vào kho",
            "C": "Vô thời hạn mà không cần bất kỳ thủ tục gia hạn nào",
            "D": "Không quá 60 ngày đối với mọi loại hàng hóa"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 61 Luật Hải quan 2014, hàng hóa gửi kho ngoại quan được lưu giữ không quá 12 tháng, được Cục trưởng Cục Hải quan gia hạn 01 lần không quá 12 tháng.",
        "citation_code": "Điều 61 Luật Hải quan 2014",
        "category": "Loại hình Đặc thù"
    },
    {
        "question": "Hàng hóa kinh doanh tạm nhập, tái xuất có thời hạn lưu lại tại Việt Nam tối đa là bao lâu theo quy định hiện hành?",
        "options": {
            "A": "Không quá 60 ngày kể từ ngày hoàn thành thủ tục tạm nhập; được gia hạn tối đa 02 lần, mỗi lần không quá 30 ngày",
            "B": "Không quá 10 ngày kể từ ngày cập cảng",
            "C": "Tự động chuyển tiêu thụ nội địa sau 15 ngày",
            "D": "Không giới hạn thời gian tái xuất"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 13 Nghị định 69/2018/NĐ-CP, hàng kinh doanh tạm nhập tái xuất lưu tại Việt Nam không quá 60 ngày, gia hạn không quá 2 lần, mỗi lần tối đa 30 ngày.",
        "citation_code": "Điều 13 Nghị định 69/2018/NĐ-CP",
        "category": "Loại hình Đặc thù"
    },
    {
        "question": "Thời hạn nộp Báo cáo quyết toán tình hình sử dụng nguyên liệu, vật tư nhập khẩu gia công, SXXK theo Thông tư 39/2018/TT-BTC là khi nào?",
        "options": {
            "A": "Chậm nhất là ngày thứ 90 kể từ ngày kết thúc năm tài chính",
            "B": "Ngay tại thời điểm thông quan từng tờ khai nhập khẩu nguyên liệu",
            "C": "Sau khi hết hợp đồng gia công 10 năm",
            "D": "Vào ngày đầu tiên của mỗi tháng dương lịch"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 60 Thông tư 38/2015/TT-BTC (sửa đổi Thông tư 39/2018/TT-BTC), tổ chức, cá nhân nộp báo cáo quyết toán chậm nhất ngày thứ 90 kể từ ngày kết thúc năm tài chính.",
        "citation_code": "Thông tư 39/2018/TT-BTC",
        "category": "Loại hình Đặc thù"
    },

    # NHÓM 8: PHÒNG VỆ THƯƠNG MẠI
    {
        "question": "Thuế chống bán phá giá (AD) được áp dụng trong trường hợp nào theo Luật Quản lý ngoại thương 2017?",
        "options": {
            "A": "Hàng hóa nhập khẩu được bán phá giá vào Việt Nam và gây ra hoặc đe dọa gây ra thiệt hại đáng kể cho ngành sản xuất trong nước",
            "B": "Tất cả hàng hóa có giá bán thấp hơn hàng hóa sản xuất tại Mỹ",
            "C": "Áp dụng bắt buộc đối với mọi loại hàng hóa có xuất xứ từ châu Âu",
            "D": "Khi doanh nghiệp trong nước tự ý yêu cầu mà không qua điều tra"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 77 Luật Quản lý ngoại thương số 05/2017/QH14, thuế chống bán phá giá áp dụng khi hàng nhập khẩu bán phá giá gây thiệt hại đáng kể cho ngành sản xuất nội địa.",
        "citation_code": "Điều 77 Luật Quản lý ngoại thương 2017",
        "category": "Phòng vệ Thương mại"
    },
    {
        "question": "Thời hạn áp dụng thuế chống bán phá giá, thuế chống trợ cấp chính thức theo quy định tối đa là bao lâu?",
        "options": {
            "A": "Không quá 05 năm kể từ ngày quyết định áp dụng có hiệu lực (có thể được rà soát gia hạn)",
            "B": "Vô thời hạn cho đến khi doanh nghiệp xuất khẩu phá sản",
            "C": "Tối đa 120 ngày kể từ ngày ban hành quyết định",
            "D": "Chỉ áp dụng trong vòng 30 ngày rồi tự động hủy bỏ"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Luật Quản lý ngoại thương 2017, thời hạn áp dụng thuế phòng vệ chính thức không quá 5 năm, trừ trường hợp được gia hạn sau rà soát hoàng hôn.",
        "citation_code": "Điều 82 Luật Quản lý ngoại thương 2017",
        "category": "Phòng vệ Thương mại"
    },
    {
        "question": "Cơ sở tính thuế Giá trị gia tăng (VAT) đối với hàng hóa nhập khẩu chịu cả thuế Nhập khẩu và thuế Chống bán phá giá là gì?",
        "options": {
            "A": "Trị giá tính thuế nhập khẩu + Thuế nhập khẩu + Thuế chống bán phá giá",
            "B": "Chỉ tính trên Trị giá FOB của lô hàng",
            "C": "Chỉ tính trên số tiền Thuế chống bán phá giá",
            "D": "Trị giá tính thuế nhập khẩu trừ đi thuế nhập khẩu"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Luật Thuế GTGT và Luật Thuế XNK, giá tính thuế GTGT của hàng nhập khẩu = Trị giá tính thuế NK + Thuế NK + Thuế phòng vệ thương mại (nếu có).",
        "citation_code": "Luật Thuế GTGT & Thông tư 38/2015/TT-BTC",
        "category": "Phòng vệ Thương mại"
    }
]

from curated_quiz_bank import CURATED_CUSTOMS_QUIZ_BANK

def _generate_rich_fallback_questions(source_name: str, diff: str, num_q: int, 
                                     scoped_chunks: Optional[List[dict]] = None,
                                     preferred_topic: Optional[str] = None) -> List[Dict[str, Any]]:
    """Tạo bộ câu hỏi trắc nghiệm chuyên sâu, bám sát 100% nghiệp vụ Hải quan & XNK chuẩn xác."""
    questions: List[Dict[str, Any]] = []

    # 1. NẾU KHÔNG CÓ FILE TẢI LÊN RIÊNG -> ƯU TIÊN TUYỆT ĐỐI NGÂN HÀNG CÂU HỎI NGHIỆP VỤ CHUẨN
    if not scoped_chunks:
        matched_pool = []
        other_pool = []
        for item in CURATED_CUSTOMS_QUIZ_BANK:
            if preferred_topic and item.get("category") == preferred_topic:
                matched_pool.append(item)
            else:
                other_pool.append(item)

        random.shuffle(matched_pool)
        random.shuffle(other_pool)

        # Lấy từ chuyên đề khớp trước
        selected = list(matched_pool[:num_q])
        # Nếu chuyên đề chưa đủ số lượng yêu cầu, lấy thêm từ các chuyên đề XNK liên quan khác
        if len(selected) < num_q:
            needed = num_q - len(selected)
            selected.extend(other_pool[:needed])

        for q in selected:
            questions.append(_shuffle_question_options(dict(q)))

        random.shuffle(questions)
        return questions[:num_q]

    # 2. NẾU NGƯỜI DÙNG CÓ UPLOAD FILE TÀI LIỆU RIÊNG (scoped_chunks):
    working_chunks = scoped_chunks
    if working_chunks:
        normative_clauses = _extract_smart_normative_clauses(working_chunks, max_clauses=max(num_q * 2, 25))
        distractor_keys = ["authority", "timeline", "evidence", "obligations", "general"]
        random.shuffle(normative_clauses)

        for idx, clause in enumerate(normative_clauses):
            correct_text = clause["text"]
            c_type = clause["type"]

            if len(correct_text) > 140:
                opt_correct = correct_text[:135].rsplit(" ", 1)[0] + "..."
            else:
                opt_correct = correct_text

            words = correct_text.split()
            topic_snippet = " ".join(words[:6]) if len(words) >= 6 else correct_text[:35]
            topic_snippet = topic_snippet.rstrip(",.:;")

            clause_src = clause.get("source") or source_name or "Tài liệu đính kèm"
            clean_src = clause_src.replace("papers/", "").replace("papers\\", "").strip()
            if clean_src.lower().endswith(".pdf"):
                clean_src = clean_src[:-4]
            if not clean_src:
                clean_src = "Tài liệu đính kèm"

            if c_type == "authority":
                q_text = f"Theo quy định tại tài liệu '{clean_src}', cơ quan hoặc chủ thể có thẩm quyền/trách nhiệm đối với nội dung liên quan đến '{topic_snippet}' được quy định như thế nào?"
            elif c_type == "timeline":
                q_text = f"Quy định về thời hạn, thời điểm hoặc trình tự thực hiện liên quan đến '{topic_snippet}' theo tài liệu '{clean_src}' là gì?"
            elif c_type == "evidence":
                q_text = f"Theo tài liệu '{clean_src}', quy định về hồ sơ, chứng cứ hoặc tính công khai liên quan đến '{topic_snippet}' được xác định như thế nào?"
            elif c_type == "obligations":
                q_text = f"Theo quy định tại tài liệu '{clean_src}', quyền và nghĩa vụ hoặc trách nhiệm pháp lý liên quan đến '{topic_snippet}' được quy định như thế nào?"
            else:
                q_text = f"Theo nội dung tài liệu '{clean_src}', nhận định nào sau đây phản ánh chính xác quy định liên quan đến '{topic_snippet}'?"

            distractors: List[str] = []
            pool_category_order = [k for k in distractor_keys if k != c_type] + [c_type]
            random.shuffle(pool_category_order)
            for cat in pool_category_order:
                cat_pool = DYNAMIC_DISTRACTOR_POOL.get(cat, DYNAMIC_DISTRACTOR_POOL["general"])
                sampled = random.sample(cat_pool, min(2, len(cat_pool)))
                for d_item in sampled:
                    if d_item not in distractors and d_item != opt_correct:
                        distractors.append(d_item)
                    if len(distractors) == 3:
                        break
                if len(distractors) == 3:
                    break

            while len(distractors) < 3:
                cand = random.choice(DYNAMIC_DISTRACTOR_POOL["general"])
                if cand not in distractors and cand != opt_correct:
                    distractors.append(cand)

            raw_q = {
                "question": q_text,
                "options": {
                    "A": opt_correct,
                    "B": distractors[0],
                    "C": distractors[1],
                    "D": distractors[2]
                },
                "correct_option": "A",
                "explanation": f"Căn cứ vào nội dung được nêu rõ trong tài liệu '{clean_src}': '{correct_text}'",
                "citation_code": f"Tài liệu: {clean_src}"
            }
            questions.append(_shuffle_question_options(raw_q))

            if len(questions) >= num_q:
                break

    # Nếu file tài liệu upload quá ngắn không đủ câu, bổ sung từ ngân hàng chuẩn
    if len(questions) < num_q:
        extra = [q for q in CURATED_CUSTOMS_QUIZ_BANK if not any(existing.get("question") == q.get("question") for existing in questions)]
        random.shuffle(extra)
        for q in extra[:num_q - len(questions)]:
            questions.append(_shuffle_question_options(dict(q)))

    random.shuffle(questions)
    return questions[:num_q]

def generate_quiz(prompt: str, session_id: Optional[str] = None, user_id: Optional[str] = None,
                  scoped_chunks: Optional[List[dict]] = None, retriever: Any = None,
                  ai_model: str = "logi_fast") -> Tuple[str, Optional[Dict[str, Any]]]:
    """Sinh bộ câu hỏi trắc nghiệm đa dạng, không lặp lại từ kho luật hoặc tài liệu tải lên."""
    params = extract_quiz_params(prompt)
    num_q = max(10, params["total_questions"])
    diff = params["difficulty"]
    time_limit = params["time_limit_minutes"]

    source_type = "document_upload" if scoped_chunks else "law_database"
    source_name = "Tài liệu đính kèm" if scoped_chunks else "Kho văn bản pháp luật Hải quan"

    # Nhận diện hoặc lựa chọn ngẫu nhiên 1 trong 8 chuyên đề nghiệp vụ để tăng tính đa dạng
    matched_topic = None
    lower_prompt = prompt.lower()
    for t in CUSTOMS_TOPICS:
        if any(kw in lower_prompt for kw in t["keywords"]):
            matched_topic = t
            break

    # Nếu người dùng chỉ nói chung chung 'tạo bài trắc nghiệm' -> chọn ngẫu nhiên 1 chuyên đề
    if not matched_topic and not scoped_chunks:
        matched_topic = random.choice(CUSTOMS_TOPICS)

    chosen_title = matched_topic["title"] if matched_topic else "Pháp luật Hải quan & Nghiệp vụ XNK"
    chosen_category = matched_topic["category"] if matched_topic else "Nghiệp vụ Hải quan"

    context_text = ""
    if scoped_chunks:
        source_name = scoped_chunks[0].get("source") or scoped_chunks[0].get("filename") or "Tài liệu đính kèm"
        combined_texts = []
        for c in scoped_chunks[:12]:
            combined_texts.append(c.get("text", ""))
        context_text = "\n\n---\n\n".join(combined_texts)[:5000]
    else:
        # Truy vấn retriever bằng từ khóa chuyên đề mục tiêu
        retrieval_query = matched_topic["retrieval_query"] if matched_topic else prompt
        parents = []
        if retriever and hasattr(retriever, "retrieve_parents"):
            parents, _ = retriever.retrieve_parents(retrieval_query, top_k=6)
        elif retriever and hasattr(retriever, "retrieve"):
            parents = retriever.retrieve(retrieval_query, top_k=6)
            
        if parents:
            combined_texts = [p.get("text", "") for p in parents if p.get("text")]
            context_text = "\n\n---\n\n".join(combined_texts)[:5000]
            if parents[0].get("source"):
                source_name = parents[0].get("source")
        
        # Nếu chưa đủ ngữ cảnh, nạp mẫu ngẫu nhiên từ document_nodes
        if not context_text:
            try:
                with get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        SELECT title, text_content, source FROM document_nodes
                        WHERE text_content IS NOT NULL AND LENGTH(text_content) > 100
                        ORDER BY RANDOM() LIMIT 10;
                    """)
                    rows = cursor.fetchall()
                    if rows:
                        source_name = rows[0]["source"] or chosen_title
                        context_text = "\n\n---\n\n".join([f"[{r['title']}]: {r['text_content']}" for r in rows])[:5000]
            except Exception as e:
                logger.warning(f"Failed to query random nodes: {e}")

    system_prompt = f"""Bạn là Chuyên gia Khảo thí và Giảng viên Pháp luật Hải quan cao cấp.
Nhiệm vụ của bạn là tạo một bộ đề thi trắc nghiệm khách quan gồm CHÍNH XÁC {num_q} CÂU HỎI (mỗi câu 4 lựa chọn A, B, C, D) dựa trên chủ đề '{chosen_title}'.

YÊU CẦU NGHIÊM NGẶT:
1. SỐ LƯỢNG: Phải tạo đủ {num_q} câu hỏi độc lập, nội dung phong phú, đa dạng, không trùng lặp.
2. Độ khó: {diff} (bám sát các điều khoản luật, định nghĩa, thời hạn, biểu thuế, thủ tục hải quan).
3. Mỗi câu hỏi PHẢI có 4 lựa chọn A, B, C, D, trong đó có DUY NHẤT 1 đáp án đúng.
4. Đáp án đúng (correct_option) PHẢI là một trong 4 ký tự: "A", "B", "C", hoặc "D". Vị trí đáp án đúng phải phân bổ ngẫu nhiên, không được để toàn bộ là một ký tự.
5. Phải có giải thích (explanation) chi tiết kèm căn cứ pháp lý cụ thể (citation_code).
6. ĐỊNH DẠNG ĐẦU RA: BẮT BUỘC chỉ trả về duy nhất 1 chuỗi JSON hợp lệ (không kèm lời chào hay markdown thừa):

{{
  "title": "Trắc nghiệm: {chosen_title}",
  "topic": "{chosen_category}",
  "difficulty": "{diff}",
  "questions": [
    {{
      "question": "Nội dung câu hỏi?",
      "options": {{
        "A": "Lựa chọn A",
        "B": "Lựa chọn B",
        "C": "Lựa chọn C",
        "D": "Lựa chọn D"
      }},
      "correct_option": "A",
      "explanation": "Giải thích chi tiết căn cứ...",
      "citation_code": "Điều ... Luật Hải quan"
    }}
  ]
}}
"""

    user_prompt = f"""CHỦ ĐỀ KHẢO SÁT: {chosen_title}
NGUỒN DỮ LIỆU ĐÍNH KÈM / TÀI LIỆU PHÁP LUẬT:
{context_text if context_text else 'Nội dung quy phạm pháp luật Hải quan, biểu thuế và thủ tục xuất nhập khẩu Việt Nam.'}

Hãy tạo chính xác {num_q} câu hỏi trắc nghiệm dạng JSON phong phú, độc đáo:"""

    router = get_llm_router()
    gen_result = router.generate(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=1800,
        temperature=0.7,
        ai_model=ai_model
    )

    data = None
    if gen_result:
        raw_text, provider = gen_result
        data = _clean_json_response(raw_text)

    # Nếu LLM không trả về kết quả hoặc JSON lỗi -> Sử dụng engine fallback đa dạng
    if not data or "questions" not in data or not isinstance(data["questions"], list) or len(data["questions"]) == 0:
        logger.warning("Constructing comprehensive rich randomized legal quiz fallback.")
        fallback_qs = _generate_rich_fallback_questions(source_name, diff, num_q, scoped_chunks, chosen_category)
        data = {
            "title": f"Trắc nghiệm: {chosen_title}",
            "topic": chosen_category,
            "difficulty": diff,
            "questions": fallback_qs
        }
    else:
        # Nếu LLM tạo thiếu số lượng câu hỏi so với yêu cầu num_q
        current_qs = data.get("questions", [])
        if len(current_qs) < num_q:
            logger.info(f"LLM generated {len(current_qs)} questions, augmenting with randomized legal bank to reach {num_q} questions.")
            extra_qs = _generate_rich_fallback_questions(source_name, diff, num_q - len(current_qs), scoped_chunks, chosen_category)
            data["questions"] = current_qs + extra_qs

    quiz_title = data.get("title") or f"Trắc nghiệm: {chosen_title}"
    quiz_topic = data.get("topic") or chosen_category
    questions_list = data.get("questions", [])

    # Đảm bảo chắc chắn có tối thiểu num_q câu
    if len(questions_list) < num_q:
        questions_list = _generate_rich_fallback_questions(source_name, diff, num_q, scoped_chunks, chosen_category)

    # Xáo trộn vị trí đáp án của từng câu một lần nữa để triệt tiêu mọi sự cố định
    questions_list = [_shuffle_question_options(q) for q in questions_list]

    # Lưu vào SQLite
    quiz_id = create_quiz(
        session_id=session_id,
        user_id=user_id,
        title=quiz_title,
        topic=quiz_topic,
        source_type=source_type,
        source_name=source_name,
        total_questions=len(questions_list),
        time_limit_minutes=time_limit,
        difficulty=diff,
        questions=questions_list
    )

    quiz_summary = {
        "id": quiz_id,
        "title": quiz_title,
        "topic": quiz_topic,
        "sourceType": source_type,
        "sourceName": source_name,
        "totalQuestions": len(questions_list),
        "timeLimitMinutes": time_limit,
        "difficulty": diff
    }

    reply_text = (
        f"Tôi đã tạo thành công bộ đề thi trắc nghiệm gồm **{len(questions_list)} câu hỏi** "
        f"chuyên đề **{quiz_title}** ({'Tài liệu đính kèm' if source_type == 'document_upload' else 'Hệ thống Văn bản Pháp luật Hải quan & XNK'}).\n\n"
        f"⏱️ **Thời gian làm bài**: {time_limit} phút | 📊 **Mức độ**: {diff.upper()} | 🎯 **Chủ đề**: {quiz_topic}\n\n"
        f"Bạn hãy bấm vào thẻ bên dưới để bắt đầu làm bài và kiểm tra kiến thức nhé! Chúc bạn đạt kết quả thật tốt!"
    )

    return reply_text, quiz_summary
