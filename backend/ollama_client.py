"""Module kết nối Chatbot RAG với Ollama chạy cục bộ (Local LLM).

Cung cấp khả năng sinh câu trả lời ngoại tuyến (Offline) bảo mật và không tốn phí token,
sử dụng các mô hình gọn nhẹ như LLaMA 3.2, Qwen 2.5 với cấu hình tối ưu RAM & CPU.
"""

import os
import sys
from typing import Union, List, Optional
import httpx
from dotenv import load_dotenv

# Đảm bảo in tiếng Việt chuẩn trên console Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

# Tải biến môi trường
load_dotenv()

# Cấu hình mặc định
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

# System Prompt định vị vai trò trợ lý hải quan & thuế XNK
SYSTEM_PROMPT = """Bạn là Trợ lý ảo AI thông minh chuyên tư vấn pháp luật, thủ tục hải quan và thuế xuất nhập khẩu (LogiChat).

Mục tiêu & Phong cách phản hồi:
1. Trả lời trực diện, ngắn gọn, súc tích, chuyên nghiệp và lịch sự.
2. NGUYÊN TẮC BẤT DI BẤT DỊCH (Groundedness): Chỉ sử dụng thông tin có trong [Ngữ cảnh tài liệu] được cung cấp dưới đây. Tuyệt đối không tự ý bịa đặt hay suy diễn ngoài phạm vi tài liệu.
3. Nếu ngữ cảnh không có thông tin để trả lời, hãy thông báo lịch sự rằng tài liệu hiện chưa đề cập đến vấn đề này.
4. Trình bày rõ ràng, sử dụng gạch đầu dòng hợp lý khi liệt kê nhiều điều kiện hoặc mức thuế."""


def get_available_model(client, preferred_model: str = "llama3.2") -> str:
    """Tự động kiểm tra và chọn model phù hợp nhất đang có trong Ollama."""
    try:
        models_response = client.list()
        # Lấy danh sách tên model có trên máy (ví dụ: ['llama3.2:latest', 'qwen2.5:3b'])
        installed_models = [m.model for m in getattr(models_response, 'models', [])]
        
        # 1. Kiểm tra chính xác model yêu cầu
        for m in installed_models:
            if m == preferred_model or m.startswith(f"{preferred_model}:"):
                return m
                
        # 2. Kiểm tra các model dự phòng nhẹ
        fallbacks = ["llama3.2:latest", "llama3.2", "llama3.2:1b", "qwen2.5:3b", "qwen2.5:1.5b", "mistral:latest"]
        for fb in fallbacks:
            for m in installed_models:
                if m == fb or m.startswith(f"{fb}:"):
                    return m
                    
        # 3. Nếu có model bất kỳ, dùng model đầu tiên
        if installed_models:
            return installed_models[0]
            
    except Exception:
        pass
        
    return preferred_model


def generate_response(
    user_query: str,
    retrieved_context: Union[str, List[str], List[dict]],
    model: Optional[str] = None,
    host: Optional[str] = None
) -> str:
    """
    Sinh câu trả lời từ Ollama cục bộ dựa trên ngữ cảnh RAG trích xuất.
    
    Args:
        user_query: Câu hỏi của người dùng.
        retrieved_context: Ngữ cảnh trích xuất từ retriever (dạng chuỗi hoặc danh sách).
        model: Tên mô hình (mặc định lấy từ biến môi trường hoặc 'llama3.2').
        host: URL máy chủ Ollama (mặc định lấy từ OLLAMA_HOST hoặc 'http://localhost:11434').
        
    Returns:
        Văn bản câu trả lời được sinh ra từ mô hình Ollama.
    """
    import ollama

    active_host = host or OLLAMA_HOST
    target_model = model or OLLAMA_DEFAULT_MODEL

    # Chuẩn hóa ngữ cảnh đầu vào thành chuỗi text
    if isinstance(retrieved_context, list):
        formatted_chunks = []
        for item in retrieved_context:
            if isinstance(item, dict):
                text = item.get("text") or item.get("content") or str(item)
                formatted_chunks.append(text)
            else:
                formatted_chunks.append(str(item))
        context_str = "\n\n---\n\n".join(formatted_chunks)
    else:
        context_str = str(retrieved_context)

    # Xây dựng User Prompt
    user_prompt = f"""[Ngữ cảnh tài liệu]:
{context_str}

[Câu hỏi của người dùng]:
{user_query}"""

    # Xác định số luồng CPU (tối đa 4 thread để tránh làm đơ máy)
    cpu_cores = os.cpu_count() or 4
    num_threads = min(4, max(1, cpu_cores))

    try:
        # Khởi tạo client kết nối tới Ollama Endpoint
        client = ollama.Client(host=active_host)
        
        # Tìm model khả dụng trên máy
        active_model = get_available_model(client, target_model)

        # Gửi yêu cầu sinh nội dung tới Ollama
        response = client.chat(
            model=active_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            options={
                "temperature": 0.3,    # Giữ câu trả lời ổn định, nhất quán
                "num_ctx": 2048,        # Giới hạn context window tiết kiệm RAM
                "num_thread": num_threads  # Số luồng CPU thực tế
            }
        )

        # Trích xuất nội dung trả về
        answer = response.get("message", {}).get("content", "")
        if answer:
            return answer.strip()
        return "Xin lỗi, không có phản hồi nào được tạo ra từ mô hình."

    except (httpx.ConnectError, ConnectionRefusedError, ConnectionError) as conn_err:
        return (
            "⚠️ Không thể kết nối đến máy chủ Ollama cục bộ tại "
            f"`{active_host}`.\n\n"
            "👉 Vui lòng kiểm tra lại dịch vụ Ollama bằng cách mở Terminal và chạy lệnh:\n"
            "```bash\n"
            "ollama serve\n"
            "```\n"
            "Hoặc mở ứng dụng Ollama Desktop trên máy tính của bạn."
        )

    except ollama.ResponseError as resp_err:
        if resp_err.status_code == 404:
            return (
                f"⚠️ Mô hình `{target_model}` chưa được tải về máy.\n\n"
                "👉 Bạn có thể tải mô hình bằng lệnh:\n"
                f"```bash\n"
                f"ollama run {target_model}\n"
                "```"
            )
        return f"⚠️ Lỗi từ máy chủ Ollama ({resp_err.status_code}): {resp_err.error}"

    except Exception as exc:
        return f"⚠️ Đã xảy ra lỗi khi gọi mô hình Ollama cục bộ: {str(exc)}"


if __name__ == "__main__":
    print(f"=== Đang kiểm tra kết nối Ollama tại {OLLAMA_HOST} ===")
    sample_query = "Mức thuế nhập khẩu linh kiện điện tử mã HS 8542.31 là bao nhiêu?"
    sample_context = [
        "Biểu thuế xuất nhập khẩu quy định: Linh kiện điện tử mã HS 8542.31 có thuế suất thuế nhập khẩu ưu đãi là 0%, thuế GTGT là 10%."
    ]
    
    output = generate_response(sample_query, sample_context)
    print("\n[KẾT QUẢ TRẢ VỀ TỪ OLLAMA]:\n")
    try:
        sys.stdout.buffer.write(output.encode("utf-8"))
        print("\n")
    except Exception:
        print(output)
