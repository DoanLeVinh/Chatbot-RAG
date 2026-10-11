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

---

### Bước 4: Hướng dẫn kiểm thử Tính năng Quên mật khẩu (OTP)
1. **Tại giao diện Web (`http://localhost:5173`)**:
   - Bấm **"Đăng nhập"** ở góc phải thanh điều hướng.
   - Bấm vào liên kết **"Quên mật khẩu?"** bên cạnh ô nhập mật khẩu.
   - Nhập email tài khoản đã đăng ký (ví dụ: `admin@logichat.vn` hoặc tài khoản bạn tự đăng ký) -> Bấm **"Gửi mã xác nhận (OTP)"**.
2. **Cơ chế nhận mã OTP**:
   - **Chế độ Thử nghiệm / Demo (mặc định)**: Mã OTP 6 số sẽ tự động in nổi bật trên terminal của Backend (`python backend/serve.py`) đồng thời hiển thị huy hiệu gợi ý *"Mã OTP thử nghiệm"* ngay trên giao diện web (có nút **"Điền nhanh"** để kiểm thử tức thì không lo lỗi email).
   - **Chế độ Gửi Email thật**: Mở file `.env` và điền cấu hình `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` (ví dụ tài khoản Gmail App Password), hệ thống sẽ gửi email HTML chuyên nghiệp trực tiếp đến hộp thư người dùng.
3. **Đặt lại mật khẩu**:
   - Nhập mã OTP gồm 6 chữ số và mật khẩu mới (tối thiểu 6 ký tự) -> Bấm **"Xác nhận đổi mật khẩu"**.
   - Sau khi hoàn tất, hệ thống sẽ tự động chuyển về màn hình đăng nhập để bạn trải nghiệm ngay với mật khẩu mới.