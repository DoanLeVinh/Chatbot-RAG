import subprocess
import time

commands = [
    ("git rm Chatbot.py --ignore-unmatch", "Xóa file Chatbot cũ"),
    ("git add backend/db.py", "Tạo cấu trúc database SQLite"),
    ("git add backend/serve.py", "Thêm API server FastAPI"),
    ("git add backend/seed_db_from_json.py", "Tạo script đồng bộ DB"),
    ("git add backend/build_faiss_local.py backend/retriever_local.py", "Cập nhật logic truy xuất"),
    ("git add backend/", "Hoàn thiện thư mục backend"),
    ("git add out/ out.txt faiss_index_local/ data/", "Cập nhật thư mục data"),
    ("git add frontend/package.json frontend/vite.config.ts frontend/tsconfig*.json", "Cấu hình Vite cho frontend"),
    ("git add frontend/server.ts", "Tạo Express proxy server"),
    ("git add frontend/src/App.tsx frontend/src/main.tsx", "Cấu hình routing frontend"),
    ("git add frontend/src/web-admin/AdminApp.tsx", "Thiết lập giao diện Admin"),
    ("git add frontend/src/web-admin/UserManager.tsx", "Tạo trang quản lý User"),
    ("git add frontend/src/web-admin/DocumentManager.tsx", "Tạo trang quản lý File"),
    ("git add frontend/src/web-admin/", "Hoàn thiện trang Admin"),
    ("git add frontend/src/web-chat/", "Cập nhật giao diện Chatbot"),
    ("git add frontend/src/shared/", "Cập nhật component chung"),
    ("git add frontend/", "Hoàn thiện toàn bộ frontend"),
    ("git add openspec.md openspecchunk.md", "Cập nhật tài liệu kỹ thuật"),
    ("git add .", "Bổ sung file còn thiếu")
]

for cmd, msg in commands:
    print(f"Running: {cmd}")
    subprocess.run(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    # Check if there's anything staged to commit
    status = subprocess.run("git diff --cached --quiet", shell=True)
    if status.returncode != 0: # Changes exist
        commit_cmd = f'git commit -m "{msg}"'
        print(f"Committing: {msg}")
        subprocess.run(commit_cmd, shell=True)
        time.sleep(0.5)

print("Đẩy code lên nhánh main...")
subprocess.run("git push origin main", shell=True)
