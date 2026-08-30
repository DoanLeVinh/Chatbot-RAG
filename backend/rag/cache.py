import json
import logging
from typing import Optional, Dict, Any
import numpy as np

try:
    import redis
except ImportError:
    redis = None

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

logger = logging.getLogger(__name__)

class SemanticCache:
    """
    Enterprise Semantic Caching using Redis.
    Reduces LLM latency and costs by returning cached answers for semantically identical questions.
    """
    def __init__(self, host: str = "localhost", port: int = 6379, db: int = 0, similarity_threshold: float = 0.95):
        self.similarity_threshold = similarity_threshold
        self.enabled = False
        
        if redis is None:
            logger.warning("[SEMANTIC CACHE] Redis library not installed. Cache disabled.")
            return
            
        try:
            self.redis_client = redis.Redis(host=host, port=port, db=db, decode_responses=False)
            self.redis_client.ping()
            self.enabled = True
            logger.info("[SEMANTIC CACHE] Connected to Redis successfully.")
        except Exception as e:
            logger.warning(f"[SEMANTIC CACHE] Redis connection failed: {e}. Cache disabled.")
            
        if SentenceTransformer:
            # We reuse the same model as Retriever to ensure embedding space matches
            self.embedding_model = SentenceTransformer("BAAI/bge-m3")
        else:
            self.enabled = False

    def _cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors."""
        dot_product = np.dot(vec1, vec2)
        norm_a = np.linalg.norm(vec1)
        norm_b = np.linalg.norm(vec2)
        return float(dot_product / (norm_a * norm_b))

    def get(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Check if a semantically similar query exists in cache.
        """
        if not self.enabled:
            return None
            
        try:
            # Embed the incoming query
            query_embedding = self.embedding_model.encode(query, normalize_embeddings=True)
            
            # Since Redis doesn't natively support Vector Search without RediSearch/RedisVL,
            # for a lightweight Semantic Cache, we can iterate over recent cached keys or use RedisVL.
            # Here we demonstrate a brute-force approach over recent keys for simplicity, 
            # but in Enterprise, RedisVL or PGVector would be used for this step too.
            
            # Fetch all cached query embeddings (hash keys)
            # Format: 'semcache:vectors' -> field: query_hash, value: binary_vector
            # Format: 'semcache:answers' -> field: query_hash, value: json_answer
            all_vectors = self.redis_client.hgetall("semcache:vectors")
            
            best_score = -1.0
            best_hash = None
            
            for q_hash, vec_bytes in all_vectors.items():
                cached_vec = np.frombuffer(vec_bytes, dtype=np.float32)
                score = self._cosine_similarity(query_embedding, cached_vec)
                
                if score > best_score:
                    best_score = score
                    best_hash = q_hash
                    
            if best_score >= self.similarity_threshold and best_hash:
                logger.info(f"[SEMANTIC CACHE] Cache Hit! Similarity: {best_score:.4f}")
                cached_answer_bytes = self.redis_client.hget("semcache:answers", best_hash)
                if cached_answer_bytes:
                    return json.loads(cached_answer_bytes.decode('utf-8'))
                    
            logger.info("[SEMANTIC CACHE] Cache Miss.")
            return None
            
        except Exception as e:
            logger.error(f"[SEMANTIC CACHE] Error during get: {e}")
            return None

    def set(self, query: str, answer_data: Dict[str, Any], ttl_seconds: int = 86400):
        """
        Store a new query and its answer in the semantic cache.
        """
        if not self.enabled:
            return
            
        try:
            import hashlib
            query_hash = hashlib.sha256(query.encode('utf-8')).hexdigest()
            
            query_embedding = self.embedding_model.encode(query, normalize_embeddings=True)
            
            # Store vector and answer
            self.redis_client.hset("semcache:vectors", query_hash, query_embedding.astype(np.float32).tobytes())
            self.redis_client.hset("semcache:answers", query_hash, json.dumps(answer_data))
            
            # Expire logic can be applied per key or managed via scheduled cron in enterprise
            # For HSETs, we might use separate keys with TTL instead if strict expiration is needed.
            
            logger.info("[SEMANTIC CACHE] Cached new response.")
        except Exception as e:
            logger.error(f"[SEMANTIC CACHE] Error during set: {e}")
