"""LLM Client for RAG Generation with Multi-Provider Support."""

import os
import sys
from typing import List
from dotenv import load_dotenv

# Ensure backend directory is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from llm_router import get_llm_router

load_dotenv()

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
    Sinh câu trả lời RAG thông qua LLMRouter (tự động luân phiên OpenRouter, Gemini, Ollama).
    
    Args:
        user_query: Câu hỏi của người dùng.
        context_chunks: Danh sách các đoạn văn bản (context) tìm được từ retriever.
        max_retries: Số lần thử lại (được quản lý tự động bởi Router).
        
    Returns:
        Câu trả lời sinh ra từ mô hình.
    """
    router = get_llm_router()
    
    # Định dạng ngữ cảnh thành chuỗi
    context_text = "\n\n".join([str(chunk) for chunk in context_chunks])
    user_prompt = f"[Tài liệu ngữ cảnh]:\n{context_text}\n\n[Câu hỏi của người dùng]:\n{user_query}"
    
    res = router.generate(AGENT_SYSTEM_PROMPT, user_prompt, max_tokens=3500, temperature=0.2)
    if res:
        answer, provider = res
        return answer
    
    return "Xin lỗi, hiện tại tất cả các mô hình AI đều đang bận hoặc quá tải. Vui lòng thử lại sau ít phút."


if __name__ == "__main__":
    sample_query = "Thủ tục hải quan đối với hàng hóa nhập khẩu gồm những gì?"
    sample_context = [
        "Thủ tục hải quan bao gồm nộp tờ khai hải quan, kiểm tra thực tế hàng hóa, và nộp thuế.",
        "Người khai hải quan phải chịu trách nhiệm về tính chính xác của hồ sơ."
    ]
    
    print("Đang gọi LLM Router...")
    response = generate_rag_response(sample_query, sample_context)
    print("\n[AI Output]:\n", response)
