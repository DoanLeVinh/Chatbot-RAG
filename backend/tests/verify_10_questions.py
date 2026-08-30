import sys
import os

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import quiz_service
import db

def run_checks():
    db.init_db()

    print("--- 1. Testing Default Legal Quiz Generation ---")
    reply1, sum1 = quiz_service.generate_quiz("tạo bài trắc nghiệm về luật hải quan")
    print(f"Total Questions Generated: {sum1['totalQuestions']}")
    print(f"Title: {sum1['title']}")
    print(f"Time limit: {sum1['timeLimitMinutes']} mins")
    assert sum1["totalQuestions"] >= 10, f"Expected >= 10 questions, got {sum1['totalQuestions']}"

    print("--- 2. Testing Scoped Document Quiz Generation ---")
    sample_chunks = [
        {"text": f"Điều {i}: Quy định chi tiết về thủ tục khai báo hải quan điện tử và kiểm tra chuyên ngành lô hàng số {i}.", "source": "ThongTu_Test.pdf"}
        for i in range(1, 15)
    ]
    reply2, sum2 = quiz_service.generate_quiz("hãy tạo bài trắc nghiệm từ file tài liệu này", scoped_chunks=sample_chunks)
    print(f"Total Scoped Questions: {sum2['totalQuestions']}")
    print(f"Source: {sum2['sourceName']}")
    assert sum2["totalQuestions"] >= 10, f"Expected >= 10 questions, got {sum2['totalQuestions']}"

    print("--- 3. Verifying Anti-Cheat Masking on 10 Questions ---")
    quiz_detail = db.get_quiz_by_id(sum1["id"])
    questions = quiz_detail["questions"]
    assert len(questions) >= 10, f"Expected >= 10 in DB, got {len(questions)}"
    for q in questions:
        assert "correct_option" not in q or q.get("correct_option") is None, "Anti-cheat failed: correct_option exposed"
        assert "explanation" not in q or q.get("explanation") is None, "Anti-cheat failed: explanation exposed"

    print("--- 4. Verifying Submission on 10 Questions ---")
    submission_answers = {q["id"]: "A" for q in questions}
    sub_res = db.submit_quiz_answers(sum1["id"], user_id=None, answers=submission_answers, time_spent_seconds=120)
    print(f"Submission Score: {sub_res['score']}% ({sub_res['totalCorrect']}/{sub_res['totalQuestions']} correct)")
    assert sub_res["totalQuestions"] >= 10, "Submission total questions must be >= 10"
    assert len(sub_res["questionsWithAnswers"]) >= 10, "Submission results must contain >= 10 questions"

    print("\n✅ ALL 10-QUESTION RIGOROUS CHECKS PASSED PERFECTLY!")

if __name__ == "__main__":
    run_checks()
