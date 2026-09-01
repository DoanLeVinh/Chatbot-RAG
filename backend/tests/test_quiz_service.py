"""
Test Suite: Quiz Service & Assessment Integration
Kiểm thử toàn diện tính năng sinh đề, làm bài, chấm điểm và bảo mật trắc nghiệm.
"""

import os
import sys
import unittest
import json

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import db
import quiz_service
from fastapi.testclient import TestClient
from serve import app

class TestQuizService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db.init_db()
        cls.client = TestClient(app)
        # Register a test user
        cls.email = f"quiz_user_{os.urandom(3).hex()}@logichat.vn"
        cls.password = "TestQuiz@123"
        cls.user = db.register_user(cls.email, cls.password, "Quiz Tester")
        cls.user_id = cls.user["id"]
        login_res = db.login_user(cls.email, cls.password)
        cls.token = login_res["token"]
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

    def test_01_quiz_intent_recognition(self):
        """Kiểm tra nhận diện đúng câu lệnh tạo bài trắc nghiệm."""
        positives = [
            "Tạo 10 câu trắc nghiệm về Luật Hải quan cho tôi",
            "tạo bài trắc nghiệm về thuế xuất nhập khẩu",
            "cho tôi 5 câu hỏi trắc nghiệm kiểm tra kiến thức",
            "sinh đề thi trắc nghiệm từ file tài liệu này",
            "làm bài test trắc nghiệm về C/O",
            "Tạo quiz 5 câu hỏi",
        ]
        for p in positives:
            self.assertTrue(quiz_service.is_quiz_intent(p), f"Should detect quiz intent in: '{p}'")

        negatives = [
            "Thuế nhập khẩu ô tô từ Nhật Bản là bao nhiêu?",
            "Quy trình xin C/O mẫu D như thế nào?",
            "Xin chào bạn là ai",
            "Tra cứu mã HS cho máy tính xách tay",
            "Luật hải quan có hiệu lực từ năm nào",
        ]
        for n in negatives:
            self.assertFalse(quiz_service.is_quiz_intent(n), f"Should NOT detect quiz intent in: '{n}'")

    def test_02_extract_quiz_params(self):
        """Kiểm tra trích xuất số lượng câu hỏi và độ khó."""
        p1 = quiz_service.extract_quiz_params("Tạo 10 câu trắc nghiệm khó về Luật Hải quan")
        self.assertEqual(p1["total_questions"], 10)
        self.assertEqual(p1["difficulty"], "hard")

        p2 = quiz_service.extract_quiz_params("Tạo 5 câu trắc nghiệm cơ bản")
        self.assertEqual(p2["total_questions"], 5)
        self.assertEqual(p2["difficulty"], "easy")

        p3 = quiz_service.extract_quiz_params("Tạo bài trắc nghiệm")
        self.assertEqual(p3["total_questions"], 10)
        self.assertEqual(p3["difficulty"], "medium")

    def test_03_db_create_and_hide_answers_before_submit(self):
        """Kiểm tra bảo mật: Không lộ đáp án trước khi nộp bài."""
        sample_questions = [
            {
                "question": "Thủ tục hải quan phải được thực hiện tại đâu?",
                "options": {
                    "A": "Trụ sở Chi cục Hải quan",
                    "B": "Ủy ban nhân dân xã",
                    "C": "Sở Công thương",
                    "D": "Bộ Kế hoạch & Đầu tư"
                },
                "correct_option": "A",
                "explanation": "Theo Điều 22 Luật Hải quan 2014, địa điểm làm thủ tục hải quan là trụ sở Chi cục Hải quan.",
                "citation_code": "Điều 22 Luật Hải quan 2014"
            },
            {
                "question": "Thời hạn nộp tờ khai hải quan đối với hàng hóa nhập khẩu là bao lâu?",
                "options": {
                    "A": "Trước ngày hàng hóa đến cửa khẩu hoặc trong thời hạn 30 ngày kể từ ngày hàng hóa đến",
                    "B": "Trong vòng 60 ngày",
                    "C": "Sau 90 ngày",
                    "D": "Bất kỳ lúc nào"
                },
                "correct_option": "A",
                "explanation": "Theo Điều 25 Luật Hải quan 2014, thời hạn nộp tờ khai là trong thời hạn 30 ngày.",
                "citation_code": "Điều 25 Luật Hải quan 2014"
            }
        ]

        quiz_id = db.create_quiz(
            session_id=None,
            user_id=self.user_id,
            title="Trắc nghiệm Thủ tục Hải quan",
            topic="Thủ tục hải quan",
            source_type="law_database",
            source_name="Luật Hải quan 2014",
            total_questions=2,
            time_limit_minutes=10,
            difficulty="medium",
            questions=sample_questions
        )
        self.assertTrue(quiz_id.startswith("quiz-"))

        # Test API GET /api/quiz/{id} (hides correct answers)
        res = self.client.get(f"/api/quiz/{quiz_id}")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["id"], quiz_id)
        self.assertEqual(len(data["questions"]), 2)

        # Check answers are hidden
        for q in data["questions"]:
            self.assertNotIn("correctOption", q, "correctOption must NOT be exposed before submit")
            self.assertNotIn("explanation", q, "explanation must NOT be exposed before submit")

    def test_04_submit_quiz_and_grading(self):
        """Kiểm tra chấm điểm và xem lại giải thích sau khi nộp."""
        sample_questions = [
            {
                "question": "Câu 1?",
                "options": {"A": "A1", "B": "B1", "C": "C1", "D": "D1"},
                "correct_option": "A",
                "explanation": "Giải thích câu 1",
                "citation_code": "Điều 1"
            },
            {
                "question": "Câu 2?",
                "options": {"A": "A2", "B": "B2", "C": "C2", "D": "D2"},
                "correct_option": "B",
                "explanation": "Giải thích câu 2",
                "citation_code": "Điều 2"
            }
        ]
        quiz_id = db.create_quiz(None, self.user_id, "Test Grading", "Test", "law_database", "Luật", 2, 10, "medium", sample_questions)
        
        # Get question ids
        quiz_detail = db.get_quiz_by_id(quiz_id, include_answers=True)
        q1_id = quiz_detail["questions"][0]["id"]
        q2_id = quiz_detail["questions"][1]["id"]

        # Submit answers: 1 Correct (A), 1 Wrong (C instead of B)
        submit_payload = {
            "answers": {
                q1_id: "A",
                q2_id: "C"
            },
            "timeSpentSeconds": 45,
            "userId": self.user_id
        }

        res = self.client.post(f"/api/quiz/{quiz_id}/submit", json=submit_payload, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        result = res.json()
        
        self.assertEqual(result["totalQuestions"], 2)
        self.assertEqual(result["totalCorrect"], 1)
        self.assertEqual(result["score"], 50.0)
        self.assertFalse(result["passed"])

        # Check that explanations are now provided
        self.assertEqual(len(result["questionsWithAnswers"]), 2)
        q1_res = result["questionsWithAnswers"][0]
        self.assertTrue(q1_res["isCorrect"])
        self.assertEqual(q1_res["correctOption"], "A")
        self.assertEqual(q1_res["explanation"], "Giải thích câu 1")

        q2_res = result["questionsWithAnswers"][1]
        self.assertFalse(q2_res["isCorrect"])
        self.assertEqual(q2_res["userOption"], "C")
        self.assertEqual(q2_res["correctOption"], "B")

    def test_05_quiz_history_api(self):
        """Kiểm tra API lấy lịch sử làm bài trắc nghiệm của người dùng."""
        res = self.client.get(f"/api/quiz/history?userId={self.user_id}", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("history", data)
        self.assertGreaterEqual(len(data["history"]), 1)

    def test_06_smart_scoped_nlp_extractor_and_diversity(self):
        """Kiểm tra bộ lọc rác hành chính và tính đa dạng của câu hỏi từ tài liệu Scoped PDF."""
        # Giả lập các đoạn văn bản từ Nghị định về phòng vệ thương mại có lẫn rác hành chính
        mock_scoped_chunks = [
            {"text": "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\nSố: 86/2025/NĐ-CP\nHà Nội, ngày 11 tháng 04 năm 2025"},
            {"text": "Điều 1. Phạm vi điều chỉnh\nNghị định này quy định chi tiết về các biện pháp phòng vệ thương mại, căn cứ xác định thiệt hại của ngành sản xuất trong nước."},
            {"text": "Điều 4. Xác định ngành sản xuất trong nước\nNgành sản xuất trong nước được xác định bao gồm các nhà sản xuất hàng hóa tương tự trong phạm vi lãnh thổ Việt Nam chiếm tỷ lệ chủ yếu trong tổng sản lượng."},
            {"text": "Điều 5. Nghĩa vụ cung cấp thông tin\nCác bên liên quan trong vụ việc điều tra có trách nhiệm cung cấp đầy đủ thông tin, chứng cứ chính xác cho Cơ quan điều tra trong thời hạn quy định."},
            {"text": "Điều 8. Thẩm quyền quyết định\nBộ trưởng Bộ Công Thương có thẩm quyền quyết định việc áp dụng hoặc bãi bỏ biện pháp phòng vệ thương mại tạm thời căn cứ vào kết luận sơ bộ của Cơ quan điều tra."},
            {"text": "Điều 10. Thời hạn điều tra\nThời hạn điều tra áp dụng biện pháp tự vệ là 12 tháng kể từ ngày có quyết định điều tra, trường hợp đặc biệt có thể gia hạn nhưng không quá 06 tháng."},
            {"text": "Trang 1/15\nMục lục tài liệu hướng dẫn"}
        ]

        questions = quiz_service._generate_rich_fallback_questions(
            source_name="Nghị định 86/2025/NĐ-CP",
            diff="medium",
            num_q=10,
            scoped_chunks=mock_scoped_chunks
        )

        self.assertGreaterEqual(len(questions), 10, "Phải sinh ra ít nhất 10 câu hỏi")

        # 1. Kiểm tra không có câu hỏi nào chọn đáp án đúng là rác hành chính hoặc Quốc hiệu
        for q in questions:
            correct_ans = q["options"][q["correct_option"]]
            self.assertFalse(quiz_service._is_administrative_or_noise(correct_ans), f"Đáp án không được là rác hành chính: '{correct_ans}'")
            self.assertNotIn("CỘNG HÒA XÃ HỘI", correct_ans.upper())
            self.assertNotIn("ĐỘC LẬP - TỰ DO", correct_ans.upper())
            self.assertNotEqual(correct_ans.strip(), "Điều 1. Phạm vi điều chỉnh")

        # 2. Kiểm tra tính đa dạng của mẫu câu hỏi (ít nhất 2 mẫu khác nhau)
        question_texts = [q["question"] for q in questions]
        unique_questions = set(question_texts)
        self.assertGreaterEqual(len(unique_questions), 5, "Các câu hỏi phải có nội dung và cấu trúc đa dạng")

        # 3. Kiểm tra các phương án nhiễu không bị lặp lại 3 câu cứng nhắc
        distractor_signatures = []
        for q in questions:
            wrong_opts = tuple(sorted([v for k, v in q["options"].items() if k != q["correct_option"]]))
            distractor_signatures.append(wrong_opts)

        # Đảm bảo không có 2 câu hỏi liên tiếp có bộ phương án nhiễu trùng hệt nhau
        for i in range(len(distractor_signatures) - 1):
            self.assertNotEqual(distractor_signatures[i], distractor_signatures[i+1], f"Bộ phương án nhiễu ở câu {i+1} và câu {i+2} không được trùng lặp y hệt")

if __name__ == '__main__':
    unittest.main()
