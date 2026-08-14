import os
import sys
import sqlite3
import tempfile
from pathlib import Path
import pytest
import time

# Add the parent directory of backend to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend import db

@pytest.fixture(autouse=True)
def test_db():
    """Setup a temporary database for testing."""
    fd, path = tempfile.mkstemp()
    old_db_path = db.DB_PATH
    db.DB_PATH = Path(path)
    
    # Initialize the tables
    db.init_db()
    
    yield path
    
    # Teardown
    os.close(fd)
    try:
        os.unlink(path)
    except PermissionError:
        pass
    db.DB_PATH = old_db_path

def test_init_db():
    """Test if tables are created correctly."""
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row["name"] for row in cursor.fetchall()]
        assert "users" in tables
        assert "sessions" in tables
        assert "messages" in tables
        assert "document_parent_chunks" in tables

def test_jwt_token():
    """Test JWT token generation and verification."""
    payload = {"user_id": "test_123", "role": "admin"}
    token = db.create_jwt_token(payload, expires_in=3600)
    
    # Verify token
    decoded = db.verify_jwt_token(token)
    assert decoded is not None
    assert decoded["user_id"] == "test_123"
    assert decoded["role"] == "admin"
    
    # Expired token
    expired_token = db.create_jwt_token(payload, expires_in=-10)
    assert db.verify_jwt_token(expired_token) is None

def test_user_registration_and_login():
    """Test registering a user and verifying credentials."""
    user = db.register_user("test@example.com", "Password123", "Test User", "user")
    assert user is not None
    assert user["email"] == "test@example.com"
    assert user["role"] == "user"
    
    # Duplicate registration should fail
    try:
        db.register_user("test@example.com", "Password123", "Test User")
        assert False, "Should raise Exception"
    except Exception as e:
        assert "đăng ký trước đó" in str(e)
    
    # Login success
    logged_in_user = db.login_user("test@example.com", "Password123")
    assert logged_in_user is not None
    assert logged_in_user["id"] == user["id"]
    
    # Login wrong password
    try:
        db.login_user("test@example.com", "WrongPassword")
        assert False, "Should raise Exception"
    except Exception as e:
        assert "không chính xác" in str(e)
