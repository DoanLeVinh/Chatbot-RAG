import logging
from typing import List, Dict, Any, Tuple
import llm_router

logger = logging.getLogger(__name__)

class Generator:
    """
    RAG Generator handling prompt formatting and LLM synthesis.
    """
    def __init__(self):
        pass

    def synthesize(self, 
                   query: str, 
                   retrieved_chunks: List[Dict[str, Any]], 
                   ai_model: str = "logi_fast",
                   chat_history: List[Dict[str, str]] = None) -> Tuple[str, List[Dict[str, Any]], str]:
        """
        Synthesizes an answer using the provided retrieved chunks and LLM router.
        """
        sources = []
        for chunk in retrieved_chunks:
            # Reconstruct source metadata
            source_name = chunk.get("source") or chunk.get("filename") or "Unknown"
            sources.append({
                "id": chunk.get("id", ""),
                "source": source_name,
                "filename": chunk.get("filename") or source_name,
                "article_refs": chunk.get("article_refs", []),
                "text": chunk.get("text", "")
            })

        # Build context
        context_str = ""
        for i, src in enumerate(sources):
            context_str += f"Tài liệu {i+1}: {src['filename']}\nNội dung: {src['text']}\n\n"

        prompt = f"""Bạn là LogiChat, chuyên viên tư vấn pháp luật Hải quan, Thuế và XNK.
Dựa vào các tài liệu tham khảo sau, hãy trả lời câu hỏi của người dùng.
Nếu tài liệu không có thông tin, hãy nói "Tôi không tìm thấy thông tin trong cơ sở dữ liệu".

Tài liệu tham khảo:
{context_str}

Câu hỏi: {query}
"""
        # Truncate history to avoid exceeding context window
        history_msgs = chat_history[-6:] if chat_history else []
        messages = history_msgs + [{"role": "user", "content": prompt}]
        
        # Determine model
        model_name = "llama-3.3-70b" if ai_model == "logi_think" else "llama-3.1-8b-instant"

        try:
            router = llm_router.get_llm_router()
            system_prompt = "Bạn là LogiChat, chuyên viên tư vấn pháp luật Hải quan, Thuế và XNK."
            user_prompt = f"Dựa vào các tài liệu tham khảo sau, hãy trả lời câu hỏi của người dùng.\nNếu tài liệu không có thông tin, hãy nói 'Tôi không tìm thấy thông tin trong cơ sở dữ liệu'.\n\nTài liệu tham khảo:\n{context_str}\n\nCâu hỏi: {query}"
            
            res = router.generate(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                chat_history=chat_history,
                max_tokens=3000,
                temperature=0.3
            )
            if res:
                response_text, provider = res
            else:
                response_text, provider = "Tôi không tìm thấy thông tin phù hợp trong cơ sở dữ liệu pháp luật.", "fallback"
            return response_text, sources, provider
        except Exception as e:
            logger.error(f"[GENERATOR] Error during synthesis: {str(e)}")
            return f"Đã xảy ra lỗi khi kết nối với mô hình AI: {str(e)}", sources, "Error"
