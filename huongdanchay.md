Bước 1: Khởi động Backend (FastAPI)
Mở một terminal mới, điều hướng đến thư mục gốc của dự án và chạy file serve.py:

bash
cd c:\TTTN\Chatbot-RAG
python backend/serve.py
Backend sẽ bắt đầu chạy và lắng nghe ở địa chỉ http://localhost:8000.

Bước 2: Khởi động Frontend (React / Vite)
Mở một terminal thứ hai (giữ nguyên terminal backend đang chạy), di chuyển vào thư mục frontend và khởi động máy chủ phát triển:

bash
cd c:\TTTN\Chatbot-RAG\frontend
npm run dev
Khi terminal hiển thị thành công, bạn có thể truy cập giao diện chatbot trên trình duyệt thông qua đường dẫn http://localhost:5173 (hoặc link được in ra trong terminal).

Bước 3 (Tùy chọn): Khởi động Ollama
Do hệ thống hiện tại đã tích hợp khả năng chạy LLM cục bộ qua Ollama (nằm trong chiến lược dự phòng cùng Gemini và OpenRouter), nếu bạn muốn gọi model qwen2.5:3b thì cần đảm bảo Ollama đã được bật trên máy:

Mở terminal và chạy lệnh để bật server cho Ollama:
bash
ollama serve
Nếu chưa từng tải model qwen2.5:3b, bạn có thể tải trước bằng lệnh:
bash
ollama pull qwen2.5:3b