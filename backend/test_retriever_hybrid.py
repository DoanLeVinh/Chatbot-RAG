import sys
from pathlib import Path

# Add backend to path if needed
backend_dir = Path(__file__).parent
if str(backend_dir) not in sys.path:
    sys.path.append(str(backend_dir))

from retriever_local import LocalRetriever

def main():
    print("--- Khởi tạo LocalRetriever (FAISS + BM25 + Reranker) ---")
    try:
        retriever = LocalRetriever()
        print("✅ Khởi tạo thành công!")
    except Exception as e:
        print(f"❌ Lỗi khởi tạo: {e}")
        import traceback
        traceback.print_exc()
        return

    test_queries = [
        "Thuế xuất khẩu đối với phân bón là bao nhiêu?",
        "Điều 3 Nghị định 15 quy định như thế nào?",
        "Quy định về hóa đơn thương mại trong hồ sơ hải quan"
    ]

    print("\n--- Bắt đầu Test Retrieval ---")
    for q in test_queries:
        print(f"\nCâu hỏi: '{q}'")
        try:
            results = retriever.retrieve(q, top_k=3)
            print(f"✅ Tìm được {len(results)} kết quả (Top 3).")
            for i, res in enumerate(results):
                score = res.get('score', 0)
                cross_score = res.get('cross_score', 'N/A')
                text = res.get('text', '')[:100].replace('\n', ' ')
                print(f"  {i+1}. Score: {score} (Cross: {cross_score}) | Text: {text}...")
        except Exception as e:
            print(f"❌ Lỗi khi tìm kiếm: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main()
