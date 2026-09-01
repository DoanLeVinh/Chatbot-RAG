"""
Module: Quiz & Assessment Service (AI Quiz Generator)
Tạo bài trắc nghiệm pháp lý / tài liệu tự động có trích dẫn căn cứ luật.
"""

import os
import re
import json
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
        "Hiệp hội ngành hàng tự ban hành quyết định điều tra mà không thông qua Bộ quản lý chuyên ngành"
    ],
    "timeline": [
        "Thời hạn giải quyết không bị giới hạn và có thể kéo dài vô thời hạn tùy theo ý chí của bên yêu cầu",
        "Mọi thủ tục phải hoàn thành bắt buộc trong vòng 24 giờ kể từ khi tiếp nhận hồ sơ",
        "Chỉ tiếp nhận hồ sơ trong 01 ngày làm việc duy nhất của mỗi quý theo thông báo",
        "Thời hạn điều tra tự động gia hạn thêm 05 năm mà không cần bất kỳ căn cứ pháp lý nào",
        "Không quy định thời hạn cụ thể, việc thực hiện hoàn toàn phụ thuộc vào thỏa thuận nội bộ"
    ],
    "evidence": [
        "Không cần xuất trình chứng cứ hay tài liệu chứng minh khi nộp đơn yêu cầu xử lý",
        "Mọi thông tin trong hồ sơ đều phải giữ bí mật tuyệt đối và không được cung cấp cho bất kỳ bên liên quan nào",
        "Chỉ chấp nhận chứng cứ bằng văn bản giấy có công chứng, không chấp nhận dữ liệu điện tử",
        "Bên yêu cầu có quyền từ chối cung cấp chứng cứ nhưng vẫn được chấp thuận toàn bộ yêu cầu",
        "Chỉ sử dụng thông tin do bên bị điều tra tự khai mà không tiến hành thẩm tra, xác minh"
    ],
    "obligations": [
        "Người thực hiện không cần lưu trữ hồ sơ hay thực hiện bất kỳ nghĩa vụ theo dõi nào sau thông quan",
        "Tự động miễn trừ toàn bộ trách nhiệm bồi thường và nghĩa vụ pháp lý liên quan trong mọi trường hợp",
        "Bên bị điều tra có quyền từ chối hợp tác mà không phải chịu bất kỳ bất lợi pháp lý nào",
        "Không phải chịu trách nhiệm trước pháp luật đối với các số liệu, tài liệu cung cấp sai lệch",
        "Được phép tự ý sửa đổi hồ sơ sau khi đã có quyết định chính thức của cơ quan có thẩm quyền"
    ],
    "general": [
        "Chỉ áp dụng đối với hàng hóa lưu thông nội địa không chịu sự quản lý của cơ quan chức năng",
        "Quy định áp dụng đối với tất cả hàng hóa tiêu dùng cá nhân phi thương mại",
        "Không áp dụng đối với bất kỳ tổ chức, cá nhân nào tham gia hoạt động xuất nhập khẩu",
        "Miễn trừ toàn bộ nghĩa vụ kiểm tra chuyên ngành cho các doanh nghiệp có vốn đầu tư nước ngoài",
        "Quy định chỉ mang tính chất khuyến nghị và không có hiệu lực bắt buộc thi hành"
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
    """Bóc tách các mệnh đề quy phạm hoàn chỉnh, giàu ý nghĩa pháp lý từ tài liệu Scoped PDF."""
    clauses: List[Dict[str, Any]] = []
    seen_texts = set()

    regulatory_keywords = [
        "phải", "có trách nhiệm", "thẩm quyền", "trong thời hạn", "không được", "bị cấm",
        "được phép", "được miễn", "áp dụng", "bao gồm", "là việc", "chứng cứ", "thiệt hại",
        "phòng vệ", "thuế", "hồ sơ", "quyết định", "điều tra", "nguyên tắc", "điều kiện",
        "thủ tục", "cung cấp", "công bố", "tiếp nhận", "xử lý"
    ]

    for chunk in scoped_chunks:
        txt = chunk.get("text", "").strip()
        if not txt:
            continue
        
        # Tách theo dấu chấm câu hoặc xuống dòng
        raw_sentences = re.split(r'(?<=[.!?;\n])\s+', txt)
        for s in raw_sentences:
            s_clean = s.strip()
            # Chuẩn hóa khoảng trắng thừa
            s_clean = re.sub(r'\s+', ' ', s_clean)
            
            if len(s_clean) < 40 or len(s_clean) > 220:
                continue
            if _is_administrative_or_noise(s_clean):
                continue
            if s_clean.lower() in seen_texts:
                continue

            # Tính điểm độ giàu thông tin pháp lý
            s_lower = s_clean.lower()
            score = sum(1 for kw in regulatory_keywords if kw in s_lower)
            if score > 0:
                # Phân loại ngữ nghĩa câu
                clause_type = "general"
                if any(w in s_lower for w in ["thẩm quyền", "bộ ", "cơ quan", "chính phủ", "tổng cục", "thủ tướng"]):
                    clause_type = "authority"
                elif any(w in s_lower for w in ["thời hạn", "ngày", "tháng", "năm", "trình tự", "thời điểm"]):
                    clause_type = "timeline"
                elif any(w in s_lower for w in ["chứng cứ", "hồ sơ", "tài liệu", "thông tin", "cung cấp", "công khai"]):
                    clause_type = "evidence"
                elif any(w in s_lower for w in ["nghĩa vụ", "trách nhiệm", "phải", "không được", "bị cấm", "hợp tác"]):
                    clause_type = "obligations"

                seen_texts.add(s_lower)
                clauses.append({
                    "text": s_clean,
                    "type": clause_type,
                    "score": score
                })

    # Sắp xếp ưu tiên các câu giàu ngữ nghĩa pháp lý nhất
    clauses.sort(key=lambda x: x["score"], reverse=True)
    return clauses[:max_clauses]

def _generate_rich_fallback_questions(source_name: str, diff: str, num_q: int, scoped_chunks: Optional[List[dict]] = None) -> List[Dict[str, Any]]:
    """Tạo bộ câu hỏi trắc nghiệm phong phú, chuẩn xác (tối thiểu 10 câu) khi LLM không phản hồi hoặc trả về thiếu câu."""
    questions: List[Dict[str, Any]] = []

    # 1. Nếu có tài liệu người dùng tải lên (Scoped Chunks), áp dụng Smart NLP Extractor
    if scoped_chunks:
        normative_clauses = _extract_smart_normative_clauses(scoped_chunks, max_clauses=max(num_q * 2, 25))
        distractor_keys = ["authority", "timeline", "evidence", "obligations", "general"]

        for idx, clause in enumerate(normative_clauses):
            correct_text = clause["text"]
            c_type = clause["type"]

            # Cắt ngắn vừa vặn nếu quá dài
            if len(correct_text) > 140:
                opt_correct = correct_text[:135].rsplit(" ", 1)[0] + "..."
            else:
                opt_correct = correct_text

            # Rút trích chủ đề ngắn gọn để gắn vào câu hỏi
            words = correct_text.split()
            topic_snippet = " ".join(words[:6]) if len(words) >= 6 else correct_text[:35]
            topic_snippet = topic_snippet.rstrip(",.:;")

            # 5 Mẫu câu hỏi biến thiên theo ngữ cảnh
            if c_type == "authority":
                q_text = f"Theo quy định tại văn bản '{source_name}', cơ quan hoặc chủ thể có thẩm quyền/trách nhiệm đối với nội dung liên quan đến '{topic_snippet}' được quy định như thế nào?"
            elif c_type == "timeline":
                q_text = f"Quy định về thời hạn, thời điểm hoặc trình tự thực hiện liên quan đến '{topic_snippet}' theo văn bản '{source_name}' là gì?"
            elif c_type == "evidence":
                q_text = f"Theo văn bản '{source_name}', quy định về hồ sơ, chứng cứ hoặc tính công khai liên quan đến '{topic_snippet}' được xác định như thế nào?"
            elif c_type == "obligations":
                q_text = f"Theo quy định tại văn bản '{source_name}', quyền và nghĩa vụ hoặc trách nhiệm pháp lý liên quan đến '{topic_snippet}' được quy định như thế nào?"
            else:
                q_text = f"Theo nội dung văn bản '{source_name}', nhận định nào sau đây phản ánh chính xác quy định pháp luật liên quan đến '{topic_snippet}'?"

            # Lấy 3 phương án nhiễu khác loại và đảo vòng để tránh trùng lặp
            distractors: List[str] = []
            pool_category_order = [k for k in distractor_keys if k != c_type] + [c_type]
            for cat_idx, cat in enumerate(pool_category_order):
                cat_pool = DYNAMIC_DISTRACTOR_POOL.get(cat, DYNAMIC_DISTRACTOR_POOL["general"])
                d_item = cat_pool[(idx + cat_idx) % len(cat_pool)]
                if d_item not in distractors and d_item != opt_correct:
                    distractors.append(d_item)
                if len(distractors) == 3:
                    break

            while len(distractors) < 3:
                fallback_d = DYNAMIC_DISTRACTOR_POOL["general"][(idx + len(distractors)) % len(DYNAMIC_DISTRACTOR_POOL["general"])]
                if fallback_d not in distractors:
                    distractors.append(fallback_d)

            # Phân bổ vị trí đáp án đúng ngẫu nhiên giữa A, B, C, D
            correct_slot = ["A", "B", "C", "D"][idx % 4]
            distractor_iter = iter(distractors)
            opts = {}
            for slot in ["A", "B", "C", "D"]:
                if slot == correct_slot:
                    opts[slot] = opt_correct
                else:
                    opts[slot] = next(distractor_iter)

            questions.append({
                "question": q_text,
                "options": opts,
                "correct_option": correct_slot,
                "explanation": f"Căn cứ vào nội dung được nêu rõ trong tài liệu '{source_name}': '{correct_text}'",
                "citation_code": f"Tài liệu: {source_name}"
            })

            if len(questions) >= num_q:
                break

    # 2. Ngân hàng câu hỏi chuẩn nghiệp vụ Pháp luật Hải quan (15 câu hỏi cốt lõi)
    legal_bank = [
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
            "citation_code": "Điều 3 Luật Hải quan 2014"
        },
        {
            "question": "Thời hạn người khai hải quan phải nộp tờ khai hải quan đối với hàng hóa nhập khẩu là bao lâu?",
            "options": {
                "A": "Bắt buộc phải nộp sau khi hàng hóa đã vào kho nội địa 15 ngày",
                "B": "Nộp trước ngày hàng hóa đến cửa khẩu hoặc trong thời hạn 30 ngày kể từ ngày hàng hóa đến cửa khẩu",
                "C": "Chỉ được nộp tờ khai sau khi đã hoàn thành nộp thuế 60 ngày",
                "D": "Không quy định thời hạn nộp tờ khai hải quan"
            },
            "correct_option": "B",
            "explanation": "Căn cứ Điều 25 Luật Hải quan 2014, đối với hàng hóa nhập khẩu, tờ khai hải quan được nộp trước ngày hàng hóa đến cửa khẩu hoặc trong thời hạn 30 ngày kể từ ngày hàng hóa đến cửa khẩu.",
            "citation_code": "Điều 25 Luật Hải quan 2014"
        },
        {
            "question": "Theo quy định của Luật Hải quan, người khai hải quan có quyền nào sau đây?",
            "options": {
                "A": "Tự ý thay đổi niêm phong hải quan khi phương tiện đang trên đường vận chuyển",
                "B": "Từ chối nộp thuế và các khoản phải nộp theo quy định của pháp luật",
                "C": "Được cơ quan hải quan cung cấp thông tin liên quan đến việc khai hải quan và xem trước hàng hóa dưới sự giám sát của hải quan",
                "D": "Tự ý thông quan hàng hóa khi chưa có quyết định của cơ quan hải quan"
            },
            "correct_option": "C",
            "explanation": "Căn cứ Điều 18 Luật Hải quan 2014 quy định về quyền của người khai hải quan, người khai có quyền được cơ quan hải quan cung cấp thông tin, xem trước hàng hóa, lấy mẫu hàng hóa trước khi khai hải quan.",
            "citation_code": "Điều 18 Luật Hải quan 2014"
        },
        {
            "question": "Địa điểm làm thủ tục hải quan theo Luật Hải quan được quy định tại đâu?",
            "options": {
                "A": "Bất kỳ trụ sở ủy ban nhân dân cấp xã, phường nào nơi doanh nghiệp đăng ký kinh doanh",
                "B": "Tại trụ sở của cơ quan Công an giao thông tỉnh",
                "C": "Tại nhà riêng của chủ sở hữu phương tiện vận tải",
                "D": "Trụ sở Chi cục Hải quan, địa điểm làm thủ tục ngoài cửa khẩu hoặc địa điểm kiểm tra tập trung theo quy định"
            },
            "correct_option": "D",
            "explanation": "Căn cứ Điều 22 Luật Hải quan 2014, địa điểm làm thủ tục hải quan là trụ sở Chi cục Hải quan, địa điểm làm thủ tục hải quan ngoài cửa khẩu hoặc địa điểm kiểm tra tập trung do cơ quan có thẩm quyền quyết định.",
            "citation_code": "Điều 22 Luật Hải quan 2014"
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
            "explanation": "Theo quy định quản lý rủi ro và Thông tư 38/2015/TT-BTC, tờ khai luồng Xanh được hệ thống chấp nhận thông quan tự động mà không phải kiểm tra chi tiết hồ sơ giấy và thực tế hàng hóa.",
            "citation_code": "Thông tư 38/2015/TT-BTC & Điều 32 Luật Hải quan"
        },
        {
            "question": "Thời hạn kiểm tra sau thông quan tại trụ sở người khai hải quan là trong vòng bao lâu kể từ ngày đăng ký tờ khai?",
            "options": {
                "A": "Trong thời hạn 01 tháng kể từ ngày hàng hóa rời cảng",
                "B": "Trong thời hạn 05 năm kể từ ngày đăng ký tờ khai hải quan",
                "C": "Trong thời hạn 10 năm đối với mọi loại hàng hóa",
                "D": "Không quá 24 giờ sau khi thông quan hàng hóa"
            },
            "correct_option": "B",
            "explanation": "Căn cứ Điều 77 Luật Hải quan 2014, kiểm tra sau thông quan được thực hiện trong thời hạn 05 năm kể từ ngày đăng ký tờ khai hải quan đối với hàng hóa đã được thông quan.",
            "citation_code": "Điều 77 Luật Hải quan 2014"
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
            "explanation": "Căn cứ Điều 28 Luật Hải quan 2014 và Nghị định 08/2015/NĐ-CP, tổ chức, cá nhân đề nghị xác định trước mã số, xuất xứ, trị giá hải quan phải nộp hồ sơ trước ít nhất 60 ngày trước ngày xuất khẩu, nhập khẩu lô hàng.",
            "citation_code": "Điều 28 Luật Hải quan 2014"
        },
        {
            "question": "Hàng hóa tạm nhập, tái xuất có thời hạn lưu lại tại Việt Nam theo quy định tối đa là bao lâu?",
            "options": {
                "A": "Vô thời hạn mà không cần bất kỳ thủ tục gia hạn nào",
                "B": "Tối đa 10 ngày kể từ khi nhập khẩu",
                "C": "Không quá thời hạn ghi trong hợp đồng và không quá thời hạn quy định (mặc định không quá 120 ngày đối với kinh doanh tạm nhập tái xuất)",
                "D": "Bắt buộc phải tiêu thụ nội địa sau 30 ngày"
            },
            "correct_option": "C",
            "explanation": "Căn cứ Điều 48 - 55 Luật Hải quan 2014 và Luật Quản lý Ngoại thương, hàng hóa tạm nhập tái xuất phải chịu sự giám sát hải quan và tái xuất đúng thời hạn quy định.",
            "citation_code": "Điều 48 Luật Hải quan 2014"
        },
        {
            "question": "Hành vi không khai hoặc khai sai dẫn đến thiếu số tiền thuế phải nộp thì người nộp thuế bị xử phạt như thế nào?",
            "options": {
                "A": "Bị phạt 20% tính trên số tiền thuế khai thiếu hoặc số tiền thuế được miễn, giảm, hoàn cao hơn quy định cùng với việc nộp đủ tiền thuế và tiền chậm nộp",
                "B": "Chỉ bị nhắc nhở bằng văn bản mà không phải nộp bù tiền thuế",
                "C": "Bị tịch thu toàn bộ tài sản của doanh nghiệp mà không cần quyết định xử phạt",
                "D": "Bị phạt 100% giá trị toàn bộ lô hàng trong mọi trường hợp"
            },
            "correct_option": "A",
            "explanation": "Căn cứ Nghị định 128/2020/NĐ-CP và Luật Quản lý Thuế số 38/2019/QH14, hành vi khai sai dẫn đến thiếu số tiền thuế phải nộp bị xử phạt 20% số tiền thuế khai thiếu cùng tiền chậm nộp.",
            "citation_code": "Nghị định 128/2020/NĐ-CP & Luật Quản lý Thuế 2019"
        },
        {
            "question": "Trường hợp nào sau đây hàng hóa xuất nhập khẩu được xét miễn thuế nhập khẩu theo Luật Thuế XNK số 107/2016/QH13?",
            "options": {
                "A": "Hàng hóa tiêu dùng xa xỉ nhập khẩu phục vụ mục đích thương mại thông thường",
                "B": "Hàng hóa nhập khẩu để gia công cho thương nhân nước ngoài; hàng hóa nhập khẩu tạo tài sản cố định của dự án ưu đãi đầu tư",
                "C": "Hàng hóa nhập khẩu kinh doanh phân phối tự do trên thị trường nội địa",
                "D": "Ô tô nguyên chiếc dưới 9 chỗ ngồi nhập khẩu phục vụ cá nhân"
            },
            "correct_option": "B",
            "explanation": "Căn cứ Điều 16 Luật Thuế xuất khẩu, thuế nhập khẩu số 107/2016/QH13, hàng hóa nhập khẩu để gia công xuất khẩu và hàng hóa tạo tài sản cố định của dự án thuộc ngành nghề ưu đãi đầu tư thuộc đối tượng miễn thuế.",
            "citation_code": "Điều 16 Luật Thuế XNK số 107/2016/QH13"
        },
        {
            "question": "Theo quy định, niêm phong hải quan được áp dụng trong trường hợp nào sau đây?",
            "options": {
                "A": "Áp dụng đối với hàng hóa chịu sự giám sát hải quan đang vận chuyển giữa các địa điểm làm thủ tục hải quan hoặc hàng hóa quá cảnh",
                "B": "Áp dụng bắt buộc cho tất cả các loại hàng hóa tiêu dùng đã được thông quan và bán ra thị trường",
                "C": "Chỉ áp dụng khi có lệnh khám xét khẩn cấp của Tòa án nhân dân tối cao",
                "D": "Áp dụng đối với bưu phẩm cá nhân không chịu thuế"
            },
            "correct_option": "A",
            "explanation": "Căn cứ Điều 34 Luật Hải quan 2014, niêm phong hải quan được sử dụng để bảo đảm nguyên trạng hàng hóa trong quá trình vận chuyển chịu sự giám sát của cơ quan hải quan.",
            "citation_code": "Điều 34 Luật Hải quan 2014"
        },
        {
            "question": "Nguyên tắc cơ bản khi thực hiện thủ tục hải quan điện tử là gì?",
            "options": {
                "A": "Phải nộp trực tiếp hồ sơ giấy cho công chức hải quan tiếp nhận trước khi khai điện tử",
                "B": "Chỉ được phép khai điện tử trong giờ hành chính từ thứ Hai đến thứ Sáu",
                "C": "Khai báo và tiếp nhận, xử lý thông tin thông qua Hệ thống xử lý dữ liệu điện tử hải quan 24/7; người khai chịu trách nhiệm trước pháp luật về tính chính xác của dữ liệu",
                "D": "Không cần chữ ký số hoặc tài khoản định danh khi gửi tờ khai lên hệ thống"
            },
            "correct_option": "C",
            "explanation": "Căn cứ Điều 17 Nghị định 08/2015/NĐ-CP và Điều 29 Luật Hải quan 2014, thủ tục hải quan điện tử thực hiện qua hệ thống VNACCS/VCIS 24/7 với chữ ký số xác thực.",
            "citation_code": "Điều 29 Luật Hải quan 2014"
        }
    ]

    # Ghép từ legal bank để luôn đảm bảo đủ ít nhất num_q câu hỏi
    for item in legal_bank:
        if len(questions) >= num_q:
            break
        if not any(q.get("question") == item["question"] for q in questions):
            questions.append(item)

    while len(questions) < num_q:
        idx = len(questions) % len(legal_bank)
        questions.append(dict(legal_bank[idx]))

    return questions[:num_q]

def generate_quiz(prompt: str, session_id: Optional[str] = None, user_id: Optional[str] = None,
                  scoped_chunks: Optional[List[dict]] = None, retriever: Any = None,
                  ai_model: str = "logi_fast") -> Tuple[str, Optional[Dict[str, Any]]]:
    """Sinh bộ câu hỏi trắc nghiệm từ kho luật hoặc tài liệu tải lên (Đảm bảo tối thiểu 10 câu)."""
    params = extract_quiz_params(prompt)
    num_q = max(10, params["total_questions"])
    diff = params["difficulty"]
    time_limit = params["time_limit_minutes"]

    source_type = "document_upload" if scoped_chunks else "law_database"
    source_name = "Tài liệu đính kèm" if scoped_chunks else "Kho văn bản pháp luật Hải quan"

    context_text = ""
    if scoped_chunks:
        # Lấy ngữ cảnh từ tài liệu người dùng tải lên
        source_name = scoped_chunks[0].get("source") or scoped_chunks[0].get("filename") or "Tài liệu đính kèm"
        combined_texts = []
        for c in scoped_chunks[:12]:
            combined_texts.append(c.get("text", ""))
        context_text = "\n\n---\n\n".join(combined_texts)[:5000]
    else:
        # Lấy ngữ cảnh từ kho luật
        if retriever and hasattr(retriever, "retrieve_parents"):
            parents, _ = retriever.retrieve_parents(prompt, top_k=6)
        elif retriever and hasattr(retriever, "retrieve"):
            parents = retriever.retrieve(prompt, top_k=6)
        else:
            parents = []
            
        if parents:
            combined_texts = [p.get("text", "") for p in parents if p.get("text")]
            context_text = "\n\n---\n\n".join(combined_texts)[:5000]
            if parents[0].get("source"):
                source_name = parents[0].get("source")
        
        # Nếu chưa đủ ngữ cảnh, nạp mẫu từ document_nodes
        if not context_text:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT title, text_content, source FROM document_nodes
                    WHERE text_content IS NOT NULL AND LENGTH(text_content) > 100
                    ORDER BY RANDOM() LIMIT 8;
                """)
                rows = cursor.fetchall()
                if rows:
                    source_name = rows[0]["source"] or "Luật Hải quan & Quản lý Thuế"
                    context_text = "\n\n---\n\n".join([f"[{r['title']}]: {r['text_content']}" for r in rows])[:5000]

    system_prompt = f"""Bạn là Chuyên gia Khảo thí và Giảng viên Pháp luật Hải quan cao cấp.
Nhiệm vụ của bạn là tạo một bộ đề thi trắc nghiệm khách quan gồm CHÍNH XÁC {num_q} CÂU HỎI (mỗi câu 4 lựa chọn A, B, C, D) dựa trên tài liệu/ngữ cảnh pháp luật được cung cấp.

YÊU CẦU NGHIÊM NGẶT:
1. SỐ LƯỢNG: Phải tạo đủ {num_q} câu hỏi độc lập, không được tạo thiếu.
2. Độ khó: {diff} (câu hỏi rõ ràng, bám sát các điều khoản luật, định nghĩa, thời hạn, biểu thuế, thủ tục hoặc tình huống hải quan).
3. Mỗi câu hỏi PHẢI có 4 lựa chọn A, B, C, D, trong đó có DUY NHẤT 1 đáp án đúng.
4. Đáp án đúng (correct_option) PHẢI là một trong 4 ký tự: "A", "B", "C", hoặc "D".
5. Phải có giải thích (explanation) chi tiết kèm căn cứ pháp lý cụ thể (citation_code, ví dụ: "Điều 29 Luật Hải quan 2014" hoặc tên mục trong tài liệu).
6. ĐỊNH DẠNG ĐẦU RA: BẮT BUỘC chỉ trả về duy nhất 1 chuỗi JSON hợp lệ theo đúng cấu trúc sau (không kèm lời chào hay markdown thừa):

{{
  "title": "Trắc nghiệm: [Tên chủ đề ngắn gọn]",
  "topic": "[Chủ đề khảo sát]",
  "difficulty": "{diff}",
  "questions": [
    {{
      "question": "Nội dung câu hỏi số 1?",
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

    user_prompt = f"""YÊU CẦU CỦA NGƯỜI DÙNG: "{prompt}"
NGUỒN DỮ LIỆU ĐÍNH KÈM / TÀI LIỆU PHÁP LUẬT:
{context_text if context_text else 'Nội dung quy phạm pháp luật Hải quan, biểu thuế và thủ tục xuất nhập khẩu Việt Nam.'}

Hãy tạo chính xác {num_q} câu hỏi trắc nghiệm dạng JSON:"""

    router = get_llm_router()
    gen_result = router.generate(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=3500,
        temperature=0.2,
        ai_model=ai_model
    )

    data = None
    if gen_result:
        raw_text, provider = gen_result
        data = _clean_json_response(raw_text)

    # Nếu LLM không trả về kết quả hoặc JSON lỗi
    if not data or "questions" not in data or not isinstance(data["questions"], list) or len(data["questions"]) == 0:
        logger.warning("Constructing comprehensive rich legal quiz fallback.")
        fallback_qs = _generate_rich_fallback_questions(source_name, diff, num_q, scoped_chunks)
        data = {
            "title": f"Trắc nghiệm: {source_name}",
            "topic": "Pháp luật Hải quan & Nghiệp vụ Xuất nhập khẩu",
            "difficulty": diff,
            "questions": fallback_qs
        }
    else:
        # Nếu LLM tạo thiếu số lượng câu hỏi so với yêu cầu num_q (tối thiểu 10 câu)
        current_qs = data.get("questions", [])
        if len(current_qs) < num_q:
            logger.info(f"LLM generated {len(current_qs)} questions, augmenting with legal bank to reach {num_q} questions.")
            extra_qs = _generate_rich_fallback_questions(source_name, diff, num_q - len(current_qs), scoped_chunks)
            data["questions"] = current_qs + extra_qs

    quiz_title = data.get("title") or f"Trắc nghiệm: {source_name}"
    quiz_topic = data.get("topic") or "Pháp luật Hải quan"
    questions_list = data.get("questions", [])

    # Đảm bảo chắc chắn có tối thiểu num_q (>=10) câu
    if len(questions_list) < num_q:
        questions_list = _generate_rich_fallback_questions(source_name, diff, num_q, scoped_chunks)

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
        f"Tôi đã tạo thành công bộ câu hỏi trắc nghiệm gồm **{len(questions_list)} câu hỏi** "
        f"về **{quiz_title}** ({'Tài liệu bạn vừa tải lên' if source_type == 'document_upload' else 'Kho luật Hải quan hiện hành'}).\n\n"
        f"⏱️ **Thời gian làm bài**: {time_limit} phút | 📊 **Mức độ**: {diff.upper()}\n\n"
        f"Bạn hãy bấm vào thẻ bên dưới để bắt đầu làm bài và kiểm tra kiến thức nhé! Chúc bạn đạt kết quả cao!"
    )

    return reply_text, quiz_summary
