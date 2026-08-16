import os
import time
import json
import urllib.request
import urllib.error

# Khai báo hằng số
GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

AGENT_SYSTEM_PROMPT = """Bạn là Trợ lý AI thông minh phụ trách hệ thống hỏi đáp (RAG). 

Mục tiêu cốt lõi:
- Đưa ra câu trả lời chính xác, trọng tâm và súc tích.
- Duy trì tông giọng niềm nở, thân thiện, lịch sự và chuyên nghiệp.

Nguyên tắc xử lý:
1. TUYỆT ĐỐI KHÔNG BỊA ĐẶT (NO HALLUCINATION): Chỉ được phép sử dụng thông tin từ [Tài liệu ngữ cảnh]. Tuyệt đối không tự sáng tác thêm thông tin, số liệu, hay quy định pháp luật không có trong tài liệu gốc.
2. Độ chính xác & Trọng tâm: Tổng hợp thông tin từ [Tài liệu ngữ cảnh]. Tránh diễn giải lan man ngoài phạm vi câu hỏi. Nếu có thể, hãy trích dẫn nguồn văn bản (Điều khoản luật) từ ngữ cảnh.
3. Giọng điệu: Sử dụng xưng hô phù hợp, mở đầu tự nhiên, giải thích rõ ràng và có cấu trúc (gạch đầu dòng khi có nhiều ý).
4. Xử lý thiếu dữ liệu: Nếu [Tài liệu ngữ cảnh] không có thông tin để trả lời toàn bộ hoặc một phần câu hỏi, HÃY TỪ CHỐI TRẢ LỜI phần đó và nhẹ nhàng thông báo: "Xin lỗi bạn, hiện tại tài liệu hệ thống chưa có thông tin chi tiết về nội dung này..."
"""

def generate_rag_response(user_query: str, context_chunks: list, max_retries: int = 3) -> str:
    """
    Kết nối với Google Gemini API để sinh câu trả lời RAG.
    
    Args:
        user_query: Câu hỏi của người dùng.
        context_chunks: Danh sách các đoạn văn bản (context) tìm được từ retriever.
        max_retries: Số lần thử lại tối đa khi gặp lỗi Rate Limit (429).
        
    Returns:
        Câu trả lời sinh ra từ mô hình.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("Lỗi: Không tìm thấy biến môi trường GEMINI_API_KEY.")
    
    # Định dạng ngữ cảnh thành chuỗi
    context_text = "\n\n".join([str(chunk) for chunk in context_chunks])
    
    # Xây dựng prompt
    user_prompt = f"[Tài liệu ngữ cảnh]:\n{context_text}\n\n[Câu hỏi của người dùng]:\n{user_query}"
    
    payload = {
        "system_instruction": {"parts": [{"text": AGENT_SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 4096,
        },
    }
    
    data = json.dumps(payload).encode("utf-8")
    url = f"{GEMINI_API_URL}?key={api_key}"
    
    for attempt in range(max_retries + 1):
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw_response = resp.read().decode("utf-8")
                resp_json = json.loads(raw_response)
                
                # Trích xuất văn bản trả về
                if "candidates" in resp_json and len(resp_json["candidates"]) > 0:
                    content = resp_json["candidates"][0]["content"]["parts"][0]["text"]
                    return content.strip()
                else:
                    return "Xin lỗi, không có câu trả lời nào được tạo ra từ mô hình."
                    
        except urllib.error.HTTPError as exc:
            if exc.code == 429: # Rate Limit Error
                if attempt < max_retries:
                    sleep_time = 2 ** attempt # Exponential backoff: 1s, 2s, 4s...
                    print(f"[Warning] Gặp lỗi Rate Limit (429). Đang thử lại sau {sleep_time} giây (lần thử {attempt + 1}/{max_retries})...")
                    time.sleep(sleep_time)
                    continue
                else:
                    return "Hệ thống đang quá tải yêu cầu (Rate Limit). Vui lòng thử lại sau ít phút."
            else:
                error_body = exc.read().decode("utf-8")
                return f"Lỗi HTTP {exc.code} khi gọi API Gemini: {error_body}"
                
        except Exception as exc:
            return f"Lỗi không xác định khi gọi API Gemini: {str(exc)}"
    
    return "Lỗi: Không thể kết nối với API sau nhiều lần thử."

# Ví dụ cách sử dụng (có thể bỏ comment để test)
if __name__ == "__main__":
    # Test thử với API key giả định (hãy export biến môi trường này trước khi chạy)
    # os.environ["GEMINI_API_KEY"] = "YOUR_API_KEY"
    
    sample_query = "Thủ tục hải quan đối với hàng hóa nhập khẩu gồm những gì?"
    sample_context = [
        "Thủ tục hải quan bao gồm nộp tờ khai hải quan, kiểm tra thực tế hàng hóa, và nộp thuế.",
        "Người khai hải quan phải chịu trách nhiệm về tính chính xác của hồ sơ."
    ]
    
    print("Đang gọi API...")
    # response = generate_rag_response(sample_query, sample_context)
    # print("\n[AI Output]:\n", response)
