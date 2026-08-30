"""
PostgreSQL (pgvector) Schema & Migration Script for LogiChat Enterprise.

This script demonstrates how to migrate from the local SQLite (logichat.db)
to a robust PostgreSQL database equipped with the pgvector extension for Native Vector Search.

Requirements:
    pip install psycopg2-binary sqlalchemy pgvector
"""

import logging
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, JSON, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
from pgvector.sqlalchemy import Vector
from datetime import datetime

logger = logging.getLogger(__name__)

Base = declarative_base()

# ==========================================
# ENTERPRISE POSTGRESQL SCHEMA (WITH PGVECTOR)
# ==========================================

class User(Base):
    __tablename__ = 'users'
    id = Column(String(50), primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default='user')
    created_at = Column(DateTime, default=datetime.utcnow)
    subscription_plan = Column(String(20), default='free')
    subscription_expiry = Column(DateTime, nullable=True)

class Session(Base):
    __tablename__ = 'sessions'
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey('users.id', ondelete="CASCADE"))
    title = Column(String(255), default="New Chat")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Message(Base):
    __tablename__ = 'messages'
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(50), ForeignKey('sessions.id', ondelete="CASCADE"))
    sender = Column(String(20)) # 'user' or 'bot'
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    ai_model = Column(String(50), nullable=True)

class DocumentNode(Base):
    """Replaces FAISS. Uses Native pgvector for scalable Similarity Search."""
    __tablename__ = 'document_nodes'
    
    id = Column(String(50), primary_key=True)
    parent_id = Column(String(50), index=True) # References the source document
    text = Column(Text, nullable=False)
    
    # 1024 is the embedding size for BAAI/bge-m3
    embedding = Column(Vector(1024), nullable=True)
    
    # Stores metadata like chapter, article_ids, filename
    metadata_json = Column(JSON, default={})
    
    created_at = Column(DateTime, default=datetime.utcnow)

# ==========================================
# MIGRATION LOGIC (SQLITE -> POSTGRES)
# ==========================================

def migrate_to_postgres(sqlite_path: str, pg_uri: str):
    """
    Migrates User data, Sessions, Messages, and Document Chunks from SQLite/FAISS to Postgres.
    """
    import sqlite3
    import faiss
    import json
    
    logger.info(f"Connecting to Postgres: {pg_uri}")
    pg_engine = create_engine(pg_uri)
    
    # Ensure pgvector extension is enabled
    with pg_engine.connect() as conn:
        conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        conn.commit()
        
    Base.metadata.create_all(pg_engine)
    SessionPG = sessionmaker(bind=pg_engine)
    pg_session = SessionPG()
    
    logger.info(f"Connecting to SQLite: {sqlite_path}")
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    cursor = sqlite_conn.cursor()
    
    # 1. Migrate Users
    cursor.execute("SELECT * FROM users")
    for row in cursor.fetchall():
        user = User(
            id=row['id'],
            username=row['username'],
            password_hash=row['password_hash'],
            role=row['role'],
            subscription_plan=row.get('subscription_plan', 'free')
            # Handle timestamps properly in production
        )
        pg_session.merge(user)
    
    # 2. Migrate Sessions & Messages
    # ... Similar standard ORM loops ...
    
    # 3. Migrate Vector Data (FAISS -> DocumentNode)
    # This replaces the monolithic faiss_index_local folder
    try:
        index = faiss.read_index("faiss_index_local/index.faiss")
        with open("faiss_index_local/metadata.json", "r", encoding="utf-8") as f:
            meta_chunks = json.load(f)
            
        for i, chunk in enumerate(meta_chunks):
            # Extract vector from FAISS
            vector = index.reconstruct(i)
            
            doc_node = DocumentNode(
                id=chunk.get('id', f'chunk_{i}'),
                parent_id=chunk.get('parent_id', ''),
                text=chunk.get('text', ''),
                embedding=vector.tolist(),
                metadata_json=chunk
            )
            pg_session.merge(doc_node)
            
        logger.info("Migrated FAISS Vectors to pgvector successfully.")
    except Exception as e:
        logger.error(f"Could not migrate vector data: {e}")
    
    pg_session.commit()
    logger.info("Migration Complete!")

if __name__ == "__main__":
    # Example usage:
    # migrate_to_postgres("data/logichat.db", "postgresql://user:pass@localhost:5432/logichat_db")
    pass
