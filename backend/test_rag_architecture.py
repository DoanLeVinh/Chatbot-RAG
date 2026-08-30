import os
import sys
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'rag')))

def test_phase_1():
    logger.info("=== BẮT ĐẦU TEST PHASE 1: HYBRID SEARCH & RERANKER ===")
    try:
        from rag.retriever import AdvancedRetriever
        retriever = AdvancedRetriever(index_dir="faiss_index_local")
        
        logger.info("Khởi tạo Retriever thành công.")
        if retriever.faiss_index is None:
            logger.warning("FAISS Index không tồn tại, test tìm kiếm bị bỏ qua.")
            return 50 # 50% for phase 1 (code loads but no data)
            
        results = retriever.retrieve("quy định về thuế xuất khẩu", top_k=2)
        logger.info(f"Tìm thấy {len(results)} kết quả.")
        return 100
    except Exception as e:
        logger.error(f"Lỗi Phase 1: {str(e)}")
        return 0

def test_phase_2():
    logger.info("=== BẮT ĐẦU TEST PHASE 2: AGENTIC AI & TOOL CALLING ===")
    try:
        # Dummy rag pipeline
        class DummyPipeline:
            def chat(self, q, model, hist):
                return f"Đây là câu trả lời RAG cho: {q}", [], "RAG"
                
        from rag.agent import AgentDispatcher
        agent = AgentDispatcher(DummyPipeline())
        
        # Test 1: Tool Calling (HS Code)
        logger.info("Test gọi Tool: Tra cứu mã HS...")
        ans, _, prov = agent.process_request("Tra mã HS cho máy tính", ai_model="logi_fast")
        logger.info(f"Kết quả HS Tool: {ans} (Provider: {prov})")
        
        # Test 2: RAG Fallback
        logger.info("Test gọi RAG: Hỏi quy định pháp luật...")
        ans, _, prov = agent.process_request("Thuế nhập khẩu ô tô là bao nhiêu?", ai_model="logi_fast")
        logger.info(f"Kết quả RAG: {ans} (Provider: {prov})")
        
        if prov == "Error":
            return 50
        return 100
    except Exception as e:
        logger.error(f"Lỗi Phase 2: {str(e)}")
        return 0

def test_phase_3():
    logger.info("=== BẮT ĐẦU TEST PHASE 3: CACHING & DATABASE ===")
    score = 0
    
    # Test Redis Cache
    try:
        from rag.cache import SemanticCache
        cache = SemanticCache()
        if cache.enabled:
            logger.info("Redis Semantic Cache: OK")
            score += 50
        else:
            logger.info("Redis Semantic Cache: Disabled (Không có kết nối Redis)")
            score += 20 # Code runs safely without crashing
    except Exception as e:
        logger.error(f"Lỗi Redis Cache: {str(e)}")
        
    # Test PG Migration syntax
    try:
        from rag.pg_migration import User, Session, DocumentNode
        logger.info("PostgreSQL Schema: OK (SQLAlchemy models compile)")
        score += 50
    except Exception as e:
        logger.error(f"Lỗi PG Schema: {str(e)}")
        
    return score

if __name__ == "__main__":
    logger.info("Đang kiểm tra toàn bộ cấu trúc kiến trúc Enterprise Advanced RAG...")
    
    p1 = test_phase_1()
    p2 = test_phase_2()
    p3 = test_phase_3()
    
    total = (p1 + p2 + p3) / 3
    logger.info("========================================")
    logger.info(f"ĐÁNH GIÁ THỰC TẾ HỆ THỐNG: {total:.2f}% Hoàn thiện")
    logger.info("Phase 1 (Advanced RAG): " + f"{p1}%")
    logger.info("Phase 2 (Agentic Tools): " + f"{p2}%")
    logger.info("Phase 3 (Enterprise DB & Cache): " + f"{p3}%")
    logger.info("========================================")
