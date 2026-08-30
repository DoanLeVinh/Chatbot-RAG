# -*- coding: utf-8 -*-
"""
End-to-End Rigorous Test Suite for In-Chat AI Quiz Generator
Tests:
1. Legal DB Quiz Intent & SSE Stream Output
2. PDF File Upload & Scoped-RAG Quiz Ingestion
3. Scoped-RAG Quiz Generation from Uploaded PDF
4. Anti-Cheat Answer Masking via GET /api/quiz/{id}
5. Quiz Submission & Server-side Grading via POST /api/quiz/{id}/submit
6. User Quiz History Retrieval via GET /api/quiz/history
"""

import os
import sys
import json
import uuid
import time
import requests
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"

def log(msg):
    try:
        print(f"[TEST RUNNER] {msg}", flush=True)
    except Exception:
        safe_msg = str(msg).encode("utf-8", errors="backslashreplace").decode("latin1", errors="replace")
        print(f"[TEST RUNNER] {safe_msg}", flush=True)

def test_legal_db_quiz_generation():
    log("=== TEST 1: Legal DB Quiz Generation via SSE Stream ===")
    session_id = f"test-e2e-session-{uuid.uuid4().hex[:8]}"
    payload = {
        "prompt": "Tạo cho tôi một bài trắc nghiệm về Luật Hải quan 3 câu",
        "sessionId": session_id,
        "userId": "test-user-e2e",
        "aiModel": "logi_fast"
    }
    
    resp = requests.post(f"{BASE_URL}/api/chat/stream", json=payload, stream=True, timeout=180)
    assert resp.status_code == 200, f"Expected status 200, got {resp.status_code}"
    
    stages_received = []
    tokens_received = []
    final_quiz_payload = None
    
    for line in resp.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data: "):
            continue
        data_str = line[6:].strip()
        try:
            evt = json.loads(data_str)
            if "stage" in evt:
                stages_received.append(evt["stage"])
            if "token" in evt:
                tokens_received.append(evt["token"])
            if "quiz" in evt and evt["quiz"]:
                final_quiz_payload = evt["quiz"]
        except Exception as e:
            pass
            
    log(f"Received {len(stages_received)} stages: {stages_received}")
    log(f"Received {len(tokens_received)} token chunks")
    assert final_quiz_payload is not None, "Failed to receive quiz payload in SSE stream!"
    assert "id" in final_quiz_payload, "Quiz payload missing ID!"
    assert final_quiz_payload["totalQuestions"] >= 1, "Quiz should have >= 1 question"
    log(f"PASSED: Generated Quiz ID={final_quiz_payload['id']}, Title={final_quiz_payload['title']}, TotalQuestions={final_quiz_payload['totalQuestions']}")
    return final_quiz_payload["id"]

def test_anti_cheat_masking(quiz_id):
    log(f"=== TEST 2: Anti-Cheat Masking via GET /api/quiz/{quiz_id} ===")
    resp = requests.get(f"{BASE_URL}/api/quiz/{quiz_id}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    
    assert data["id"] == quiz_id
    assert len(data["questions"]) > 0
    for q in data["questions"]:
        assert "correctOption" not in q, f"SECURITY LEAK: correctOption leaked in quiz runner API! {q}"
        assert "explanation" not in q, f"SECURITY LEAK: explanation leaked in quiz runner API! {q}"
        assert "optionA" in q and q["optionA"], "Question missing optionA"
        assert "optionB" in q and q["optionB"], "Question missing optionB"
    log(f"PASSED: Verified {len(data['questions'])} questions are properly masked with zero answer leakage.")
    return data

def test_quiz_submission_and_grading(quiz_detail):
    quiz_id = quiz_detail["id"]
    log(f"=== TEST 3: Quiz Submission & Grading via POST /api/quiz/{quiz_id}/submit ===")
    
    # Pick option 'A' for every question
    answers = {}
    for q in quiz_detail["questions"]:
        answers[q["id"]] = "A"
        
    submit_payload = {
        "answers": answers,
        "timeSpentSeconds": 45,
        "userId": "test-user-e2e"
    }
    
    resp = requests.post(f"{BASE_URL}/api/quiz/{quiz_id}/submit", json=submit_payload)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    result = resp.json()
    
    assert "submissionId" in result
    assert "score" in result
    assert "percentage" in result
    assert "questionsWithAnswers" in result
    assert len(result["questionsWithAnswers"]) == len(quiz_detail["questions"])
    
    for q_graded in result["questionsWithAnswers"]:
        assert "correctOption" in q_graded, "Graded review must include correctOption"
        assert "explanation" in q_graded, "Graded review must include explanation"
        assert "isCorrect" in q_graded, "Graded review must include isCorrect"
        assert "userOption" in q_graded, "Graded review must include userOption"
        
    log(f"PASSED: Graded successfully. Score={result['score']}/{result['totalQuestions']} ({result['percentage']}%), SubmissionId={result['submissionId']}")

def test_scoped_document_quiz_workflow():
    log("=== TEST 4: Scoped Document Upload & In-Chat Quiz Generation ===")
    session_id = f"test-scoped-e2e-{uuid.uuid4().hex[:8]}"
    
    # Find existing sample pdf or create a dummy text pdf
    pdf_path = Path(r"c:\TTTN\Chatbot-RAG\data\uploads\006d0ae78053.pdf")
    assert pdf_path.exists(), f"Sample PDF {pdf_path} not found!"
    
    with open(pdf_path, "rb") as f:
        upload_resp = requests.post(
            f"{BASE_URL}/api/upload",
            files={"file": (pdf_path.name, f, "application/pdf")},
            data={"sessionId": session_id, "userId": "test-user-e2e"}
        )
    assert upload_resp.status_code == 200, f"Upload failed with {upload_resp.status_code}: {upload_resp.text}"
    upload_json = upload_resp.json()
    assert upload_json.get("scopedRagEnabled") is True, f"Scoped RAG was not enabled: {upload_json}"
    log(f"Uploaded {pdf_path.name} successfully. Scoped RAG chunks count = {upload_json.get('chunksSaved')}")
    
    # Request quiz based on uploaded document
    chat_payload = {
        "prompt": "Hãy tạo các câu hỏi trắc nghiệm từ nội dung file này cho tôi đi",
        "sessionId": session_id,
        "userId": "test-user-e2e",
        "aiModel": "logi_fast"
    }
    
    stream_resp = requests.post(f"{BASE_URL}/api/chat/stream", json=chat_payload, stream=True, timeout=120)
    assert stream_resp.status_code == 200
    
    quiz_obj = None
    for line in stream_resp.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data: "):
            continue
        try:
            evt = json.loads(line[6:].strip())
            if "quiz" in evt and evt["quiz"]:
                quiz_obj = evt["quiz"]
        except Exception:
            pass
            
    assert quiz_obj is not None, "Failed to generate quiz from uploaded document!"
    assert quiz_obj["sourceType"] == "document_upload", f"Expected sourceType=document_upload, got {quiz_obj['sourceType']}"
    log(f"PASSED: Generated Scoped Document Quiz ID={quiz_obj['id']}, SourceName={quiz_obj['sourceName']}, TotalQuestions={quiz_obj['totalQuestions']}")

def test_quiz_history():
    log("=== TEST 5: Quiz History Endpoint GET /api/quiz/history ===")
    resp = requests.get(f"{BASE_URL}/api/quiz/history?userId=test-user-e2e")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    history = data.get("history", [])
    assert isinstance(history, list)
    assert len(history) >= 1
    log(f"PASSED: Retrieved {len(history)} quiz history records.")

if __name__ == "__main__":
    try:
        q_id = test_legal_db_quiz_generation()
        detail = test_anti_cheat_masking(q_id)
        test_quiz_submission_and_grading(detail)
        test_scoped_document_quiz_workflow()
        test_quiz_history()
        print("\n" + "="*60)
        print("ALL 5/5 RIGOROUS END-TO-END TESTS PASSED (100%)!")
        print("="*60 + "\n")
    except Exception as exc:
        print(f"\n[TEST FAILED] {exc}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
