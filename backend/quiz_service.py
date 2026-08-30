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
    
    # Extract number of questions (default: 5, min: 3, max: 15)
    num_match = re.search(r"(\d+)\s*(câu|cau|questions?|q)", text, re.IGNORECASE)
    if num_match:
        try:
            num_q = int(num_match.group(1))
            num_q = max(3, min(15, num_q))
        except ValueError:
            num_q = 5
    else:
        num_q = 5

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
        "time_limit_minutes": max(5, num_q * 2)
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

def generate_quiz(prompt: str, session_id: Optional[str] = None, user_id: Optional[str] = None,
                  scoped_chunks: Optional[List[dict]] = None, retriever: Any = None,
                  ai_model: str = "logi_fast") -> Tuple[str, Optional[Dict[str, Any]]]:
    """Sinh bộ câu hỏi trắc nghiệm từ kho luật hoặc tài liệu tải lên."""
    params = extract_quiz_params(prompt)
    num_q = params["total_questions"]
    diff = params["difficulty"]
    time_limit = params["time_limit_minutes"]

    source_type = "document_upload" if scoped_chunks else "law_database"
    source_name = "Tài liệu đính kèm" if scoped_chunks else "Kho văn bản pháp luật Hải quan"

    context_text = ""
    if scoped_chunks:
        # Lấy ngữ cảnh từ tài liệu người dùng tải lên
        source_name = scoped_chunks[0].get("source") or scoped_chunks[0].get("filename") or "Tài liệu đính kèm"
        combined_texts = []
        for c in scoped_chunks[:8]:
            combined_texts.append(c.get("text", ""))
        context_text = "\n\n---\n\n".join(combined_texts)[:4000]
    else:
        # Lấy ngữ cảnh từ kho luật
        if retriever and hasattr(retriever, "retrieve_parents"):
            parents, _ = retriever.retrieve_parents(prompt, top_k=4)
        elif retriever and hasattr(retriever, "retrieve"):
            parents = retriever.retrieve(prompt, top_k=4)
        else:
            parents = []
            
        if parents:
            combined_texts = [p.get("text", "") for p in parents if p.get("text")]
            context_text = "\n\n---\n\n".join(combined_texts)[:4000]
            if parents[0].get("source"):
                source_name = parents[0].get("source")
        
        # Nếu chưa đủ ngữ cảnh, nạp mẫu từ document_nodes
        if not context_text:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT title, text_content, source FROM document_nodes
                    WHERE text_content IS NOT NULL AND LENGTH(text_content) > 100
                    ORDER BY RANDOM() LIMIT 5;
                """)
                rows = cursor.fetchall()
                if rows:
                    source_name = rows[0]["source"] or "Luật Hải quan & Quản lý Thuế"
                    context_text = "\n\n---\n\n".join([f"[{r['title']}]: {r['text_content']}" for r in rows])[:4000]

    system_prompt = f"""Bạn là Chuyên gia Khảo thí và Giảng viên Pháp luật Hải quan cao cấp.
Nhiệm vụ của bạn là tạo một bộ đề thi trắc nghiệm khách quan gồm chính xác {num_q} câu hỏi (4 lựa chọn A, B, C, D) dựa trên tài liệu/ngữ cảnh pháp luật được cung cấp.

YÊU CẦU NGHIÊM NGẶT:
1. Độ khó: {diff} (câu hỏi rõ ràng, bám sát các điều khoản luật, định nghĩa, thời hạn, biểu thuế, thủ tục hoặc tình huống hải quan).
2. Mỗi câu hỏi PHẢI có 4 lựa chọn A, B, C, D độc lập, trong đó chỉ có DUY NHẤT 1 đáp án đúng.
3. Đáp án đúng (correct_option) PHẢI là một trong 4 ký tự: "A", "B", "C", hoặc "D".
4. Phải có giải thích (explanation) chi tiết, chỉ rõ tại sao đáp án đó đúng và trích dẫn căn cứ pháp lý cụ thể (citation_code, ví dụ: "Điều 29 Luật Hải quan 2014" hoặc tên mục trong tài liệu).
5. ĐỊNH DẠNG ĐẦU RA: BẮT BUỘC chỉ trả về duy nhất 1 chuỗi JSON hợp lệ theo đúng cấu trúc sau (không kèm lời chào hay markdown thừa):

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
        max_tokens=1800,
        temperature=0.2,
        ai_model=ai_model
    )

    if not gen_result:
        logger.warning("LLM Router returned empty or timed out, constructing fallback legal quiz.")
        data = {
            "title": f"Trắc nghiệm: {source_name}",
            "topic": "Pháp luật Hải quan & Tài liệu đính kèm",
            "difficulty": diff,
            "questions": [
                {
                    "question": f"Theo quy định trong tài liệu '{source_name}', đối tượng nào sau đây chịu sự kiểm tra, giám sát chuyên ngành?",
                    "options": {
                        "A": "Hàng hóa xuất khẩu, nhập khẩu, quá cảnh và phương tiện vận tải xuất nhập cảnh",
                        "B": "Hàng hóa tiêu dùng nội địa không qua biên giới",
                        "C": "Phương tiện vận tải lưu thông nội bộ tỉnh",
                        "D": "Hàng hóa nông sản lưu thông giữa các chợ truyền thống"
                    },
                    "correct_option": "A",
                    "explanation": f"Căn cứ vào các điều khoản quy định hiện hành trong {source_name}.",
                    "citation_code": f"{source_name}"
                }
            ]
        }
    else:
        raw_text, provider = gen_result
        data = _clean_json_response(raw_text)

    if not data or "questions" not in data or not data["questions"]:
        logger.warning(f"Failed to parse LLM JSON quiz response, using robust fallback parsing.")
        data = {
            "title": f"Trắc nghiệm {source_name}",
            "topic": "Pháp luật Hải quan & Xuất nhập khẩu",
            "difficulty": diff,
            "questions": [
                {
                    "question": f"Theo quy định hiện hành về {source_name}, đối tượng nào sau đây chịu sự kiểm tra, giám sát hải quan?",
                    "options": {
                        "A": "Hàng hóa xuất khẩu, nhập khẩu, quá cảnh; phương tiện vận tải xuất cảnh, nhập cảnh, quá cảnh",
                        "B": "Hàng hóa tiêu dùng nội địa không qua biên giới",
                        "C": "Phương tiện vận tải lưu thông nội tỉnh",
                        "D": "Hàng hóa nông sản lưu thông giữa các chợ truyền thống"
                    },
                    "correct_option": "A",
                    "explanation": "Theo Điều 3 Luật Hải quan, đối tượng kiểm tra hải quan gồm hàng hóa và phương tiện vận tải xuất nhập khẩu, xuất nhập cảnh.",
                    "citation_code": "Điều 3 Luật Hải quan 2014"
                }
            ]
        }

    quiz_title = data.get("title") or f"Trắc nghiệm: {source_name}"
    quiz_topic = data.get("topic") or "Pháp luật Hải quan"
    questions_list = data.get("questions", [])

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
