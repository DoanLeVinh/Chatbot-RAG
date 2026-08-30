import logging
from typing import List, Dict, Any, Tuple
from .retriever import AdvancedRetriever
from .generator import Generator

logger = logging.getLogger(__name__)

class RAGPipeline:
    """
    Enterprise RAG Pipeline Orchestrator.
    Manages the flow from query -> retrieval -> synthesis.
    """
    def __init__(self, index_dir: str = "faiss_index_local"):
        self.retriever = AdvancedRetriever(index_dir)
        self.generator = Generator()

    def chat(self, 
             query: str, 
             ai_model: str = "logi_fast", 
             chat_history: List[Dict[str, str]] = None,
             top_k: int = 5) -> Tuple[str, List[Dict[str, Any]], str]:
        """
        Executes the full RAG pipeline for a given query.
        """
        logger.info(f"[RAG PIPELINE] Processing query: {query} with model: {ai_model}")
        
        # 1. Retrieve relevant chunks using Hybrid Search
        retrieved_chunks = self.retriever.retrieve(query, top_k=top_k)
        
        # 2. Synthesize answer using LLM
        answer, sources, provider = self.generator.synthesize(
            query=query,
            retrieved_chunks=retrieved_chunks,
            ai_model=ai_model,
            chat_history=chat_history
        )
        
        return answer, sources, provider
