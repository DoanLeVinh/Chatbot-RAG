"""
Unit Test Suite for Case Study & Scenario Reasoning Engine (case_study_service.py)
Kiểm tra toàn diện 4 dạng kịch bản, tính toán số học Ground Truth, Intent detection và Chấm điểm Barem.
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import case_study_service

class TestCaseStudyService(unittest.TestCase):

    def test_01_intent_detection(self):
        """Kiểm tra nhận diện ý định bài tập tình huống / tự luận nghiệp vụ."""
        positives = [
            "Cho tôi một bài tập tình huống về tính trị giá hải quan theo Incoterms FOB",
            "Tạo case study về thuế chống bán phá giá",
            "Tôi muốn làm bài tập tự luận về tranh chấp C/O",
            "Ra đề bài tập tính tiền phạt chậm nộp hải quan",
            "Cho tôi một thử thách nghiệp vụ xuất nhập khẩu"
        ]
        for p in positives:
            self.assertTrue(
                case_study_service.is_case_study_intent(p),
                f"Phải nhận diện được intent case study trong: '{p}'"
            )

        negatives = [
            "Luật hải quan có hiệu lực từ năm nào?",
            "Quy định nhãn hàng hóa gồm những gì?",
            "Thời hạn lưu trữ hồ sơ hải quan là bao lâu?",
            "Xin chào bot"
        ]
        for n in negatives:
            self.assertFalse(
                case_study_service.is_case_study_intent(n),
                f"Không được nhận diện nhầm intent trong: '{n}'"
            )

    def test_02_generate_all_4_preset_categories(self):
        """Kiểm tra sinh đề đủ 4 dạng kịch bản nghiệp vụ chuẩn hóa."""
        categories = [
            "valuation_incoterms",
            "multi_tax_trade_defense",
            "origin_co_dispute",
            "post_clearance_audit_penalties"
        ]
        for cat in categories:
            cs = case_study_service.generate_case_study(category=cat)
            self.assertIsNotNone(cs["id"])
            self.assertEqual(cs["category"], cat)
            self.assertGreater(len(cs["company"]), 5)
            self.assertGreater(len(cs["context"]), 50)
            self.assertGreaterEqual(len(cs["documents"]), 3)
            self.assertGreaterEqual(len(cs["questions"]), 3)
            self.assertIsNotNone(cs["solution"])
            self.assertGreaterEqual(len(cs["rubric"]), 4)

    def test_03_valuation_incoterms_ground_truth_math(self):
        """Kiểm tra tính toán số học chuẩn xác của bài toán Trị giá Incoterms (Zero-Hallucination)."""
        cs = case_study_service.generate_case_study(category="valuation_incoterms")
        sol = cs["solution"]
        nums = sol["final_numbers"]

        # FOB = 20 * 12,000 = 240,000 USD
        # Khoản cộng: F = 2,500 + I = 350 + Hoa hồng = 800 -> 3,650 USD
        # CIF = 243,650 USD
        self.assertEqual(nums["v_cif_usd"], 243650)
        
        # V_NK = 243,650 * 25,450 = 6,200,892,500 VNĐ
        self.assertEqual(nums["v_nk_vnd"], 6200892500)

        # Form VJ 0% -> Thuế NK = 0, Thuế GTGT 10% = 620,089,250 VNĐ
        self.assertEqual(nums["tax_fta_vnd"], 620089250)

        # MFN 5% -> Thuế NK = 310,044,625, Thuế GTGT = 651,093,713 -> Tổng = 961,138,338 VNĐ
        self.assertEqual(nums["tax_mfn_vnd"], 961138338)

        # Chênh lệch tiết kiệm: 961,138,338 - 620,089,250 = 341,049,088 VNĐ
        self.assertEqual(nums["tax_diff_vnd"], 341049088)

    def test_04_penalties_ground_truth_math(self):
        """Kiểm tra tính toán tiền chậm nộp và phạt 20% theo Nghị định 128/2020."""
        cs = case_study_service.generate_case_study(category="post_clearance_audit_penalties")
        nums = cs["solution"]["final_numbers"]

        # V_NK = 200 * 150 * 25,450 = 763,500,000 VNĐ
        self.assertEqual(nums["v_nk_vnd"], 763500000)

        # Thuế NK truy thu (15%) = 114,525,000 VNĐ
        self.assertEqual(nums["diff_import_tax_vnd"], 114525000)

        # Thuế GTGT truy thu (10%) = 11,452,500 VNĐ
        self.assertEqual(nums["diff_vat_vnd"], 11452500)

        # Tổng thuế truy thu = 125,977,500 VNĐ
        self.assertEqual(nums["total_diff_tax_vnd"], 125977500)

        # Tiền chậm nộp 60 ngày * 0.03%/ngày = 125,977,500 * 0.0003 * 60 = 2,267,595 VNĐ
        self.assertEqual(nums["late_fee_vnd"], 2267595)

        # Phạt 20% = 125,977,500 * 20% = 25,195,500 VNĐ
        self.assertEqual(nums["penalty_20_vnd"], 25195500)

        # Tổng phải nộp = 125,977,500 + 2,267,595 + 25,195,500 = 153,440,595 VNĐ
        self.assertEqual(nums["total_payable_vnd"], 153440595)

    def test_05_auto_rubric_grading(self):
        """Kiểm tra chấm điểm tự luận theo Barem 4 tiêu chí chuẩn."""
        cs = case_study_service.generate_case_study(category="valuation_incoterms")

        # 1. Bài làm rỗng / quá ngắn
        res_empty = case_study_service.grade_case_study_solution(cs, "Ngắn quá")
        self.assertEqual(res_empty["score"], 0.0)
        self.assertFalse(res_empty["passed"])

        # 2. Bài làm chuẩn xác, đầy đủ công thức và số liệu
        good_solution = (
            "Căn cứ Thông tư 39/2015/TT-BTC và Thông tư 60/2019/TT-BTC, các khoản điều chỉnh cộng gồm: "
            "cước vận chuyển quốc tế F (2,500 USD), bảo hiểm I (350 USD), phí hoa hồng môi giới (800 USD). "
            "Trị giá tính thuế CIF = 243,650 USD quy đổi sang VNĐ là V_NK = 6,200,892,500 VNĐ. "
            "Trường hợp C/O Form VJ thuế NK 0% thì thuế GTGT là 620,089,250 VNĐ. "
            "Trường hợp áp thuế MFN 5% thì tổng số tiền thuế phải nộp là 961,138,338 VNĐ. "
            "Doanh nghiệp tiết kiệm được 341,049,088 VNĐ nhờ C/O hợp lệ."
        )
        res_good = case_study_service.grade_case_study_solution(cs, good_solution)
        self.assertGreaterEqual(res_good["score"], 8.0)
        self.assertTrue(res_good["passed"])
        self.assertEqual(len(res_good["rubricScores"]), 4)

if __name__ == '__main__':
    unittest.main()
