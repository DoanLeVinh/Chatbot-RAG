import React, { useState, useEffect } from 'react';
import { CaseStudyDetail, CaseStudyGradingResult } from '../../shared/types';
import { getAuthHeaders } from '../../shared/utils';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RotateCcw, 
  Lightbulb, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  FileCode, 
  Clock,
  Calculator,
  Scale,
  Check,
  Layers,
  ShieldAlert,
  FileCheck2,
  Sparkles
} from 'lucide-react';

interface CaseStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseStudy: CaseStudyDetail | null;
  initialTab?: 'solve' | 'solution';
  userId?: string;
  onCaseStudyChanged?: (newCs: CaseStudyDetail) => void;
}

interface CustomsWorksheet {
  // Common
  exchangeRate: string;
  legalBasis: string;
  conclusion: string;

  // 1. Valuation & Incoterms (Máy CNC)
  fobUsd: string;
  freightUsd: string;
  insuranceUsd: string;
  adjustmentUsd: string;
  deductionUsd: string;
  customsValueUsd: string;
  vnkVnd: string;
  taxImportVndA: string;
  taxVatVndA: string;
  totalTaxVndA: string;
  taxImportVndB: string;
  taxVatVndB: string;
  totalTaxVndB: string;
  taxDiffVnd: string;

  // 2. Multi-Tax & Anti-Dumping (Thép cuộn)
  unitPriceUsd: string;
  quantityTon: string;
  cifMultiUsd: string;
  vnkMultiVnd: string;
  taxImportFtaVnd: string;
  taxAdVnd: string;
  vatBaseMultiVnd: string;
  taxVatMultiVnd: string;
  totalTaxMultiVnd: string;

  // 3. Post-Clearance Audit & Penalties (Smart Tivi)
  vnkAuditVnd: string;
  diffImportTaxVnd: string;
  diffVatTaxVnd: string;
  totalDiffTaxVnd: string;
  lateDays: string;
  lateFeeVnd: string;
  penalty20Vnd: string;
  totalPayableAuditVnd: string;

  // 4. Origin & Third-Party C/O (Nồi chiên)
  vnkOriginVnd: string;
  diffImportOriginVnd: string;
  diffVatOriginVnd: string;
  totalDiffOriginVnd: string;
  coBox13Assessment: string;
  customsProcedureSolution: string;
}

const defaultWorksheet: CustomsWorksheet = {
  exchangeRate: '25,450',
  legalBasis: '',
  conclusion: '',

  fobUsd: '',
  freightUsd: '',
  insuranceUsd: '',
  adjustmentUsd: '',
  deductionUsd: '',
  customsValueUsd: '',
  vnkVnd: '',
  taxImportVndA: '',
  taxVatVndA: '',
  totalTaxVndA: '',
  taxImportVndB: '',
  taxVatVndB: '',
  totalTaxVndB: '',
  taxDiffVnd: '',

  unitPriceUsd: '',
  quantityTon: '',
  cifMultiUsd: '',
  vnkMultiVnd: '',
  taxImportFtaVnd: '',
  taxAdVnd: '',
  vatBaseMultiVnd: '',
  taxVatMultiVnd: '',
  totalTaxMultiVnd: '',

  vnkAuditVnd: '',
  diffImportTaxVnd: '',
  diffVatTaxVnd: '',
  totalDiffTaxVnd: '',
  lateDays: '60',
  lateFeeVnd: '',
  penalty20Vnd: '',
  totalPayableAuditVnd: '',

  vnkOriginVnd: '',
  diffImportOriginVnd: '',
  diffVatOriginVnd: '',
  totalDiffOriginVnd: '',
  coBox13Assessment: '',
  customsProcedureSolution: ''
};

const SCENARIOS = [
  { id: 'valuation_incoterms', label: '1. Trị giá Incoterms & So sánh C/O', desc: 'Máy CNC • VJEPA vs MFN', icon: Scale },
  { id: 'multi_tax_trade_defense', label: '2. Đa Sắc Thuế & Chống Bán Phá Giá', desc: '100 tấn Thép • Thuế AD 15%', icon: ShieldAlert },
  { id: 'post_clearance_audit_penalties', label: '3. Sau Thông Quan & Phạt Chậm Nộp', desc: 'Smart Tivi • Phạt 20% NĐ 128', icon: AlertCircle },
  { id: 'origin_co_dispute', label: '4. Thẩm Định C/O Bên Thứ Ba', desc: 'Nồi chiên • ACFTA Form E Ô 13', icon: FileCheck2 },
];

export const CaseStudyModal: React.FC<CaseStudyModalProps> = ({
  isOpen,
  onClose,
  caseStudy,
  initialTab = 'solve',
  userId,
  onCaseStudyChanged
}) => {
  const [activeTab, setActiveTab] = useState<'solve' | 'solution'>(initialTab);
  const [currentCase, setCurrentCase] = useState<CaseStudyDetail | null>(caseStudy);
  const [worksheet, setWorksheet] = useState<CustomsWorksheet>(defaultWorksheet);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSwitchingScenario, setIsSwitchingScenario] = useState<boolean>(false);
  const [isScenarioDropdownOpen, setIsScenarioDropdownOpen] = useState<boolean>(false);
  const [gradingResult, setGradingResult] = useState<CaseStudyGradingResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Accordion state for criteria explanation dropdowns
  const [expandedCriteria, setExpandedCriteria] = useState<Record<number, boolean>>({});

  // Sync initialTab and reset states when modal opens or caseStudy changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setCurrentCase(caseStudy);
      setGradingResult(null);
      setErrorMsg(null);
      setExpandedCriteria({ 0: true, 1: true, 2: true, 3: true });

      // Init default legal basis based on category
      const cat = caseStudy?.category || 'valuation_incoterms';
      if (cat === 'multi_tax_trade_defense') {
        setWorksheet({
          ...defaultWorksheet,
          legalBasis: 'Điều 12 Luật Quản lý ngoại thương số 05/2017/QH14, Điều 39 Thông tư 38/2015/TT-BTC, Luật Thuế 107/2016'
        });
      } else if (cat === 'post_clearance_audit_penalties') {
        setWorksheet({
          ...defaultWorksheet,
          legalBasis: 'Điều 9 Nghị định 128/2020/NĐ-CP, Điều 59 Luật Quản lý thuế số 38/2019/QH14, Luật Thuế 107/2016'
        });
      } else if (cat === 'origin_co_dispute') {
        setWorksheet({
          ...defaultWorksheet,
          legalBasis: 'Quy tắc 23 Phụ lục I Thông tư 12/2019/TT-BCT, Điều 26 Thông tư 38/2015/TT-BTC, Thông tư 33/2023/TT-BTC'
        });
      } else {
        setWorksheet({
          ...defaultWorksheet,
          legalBasis: 'Khoản 2 Điều 13 Thông tư 39/2015/TT-BTC, Điều 15 Thông tư 39/2015/TT-BTC, Luật Thuế 107/2016, Hiệp định VJEPA'
        });
      }
    }
  }, [isOpen, caseStudy, initialTab]);

  if (!isOpen || !currentCase) return null;

  const toggleCriteria = (index: number) => {
    setExpandedCriteria(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleFieldChange = (field: keyof CustomsWorksheet, value: string) => {
    setWorksheet(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddLegalBasis = (citation: string) => {
    setWorksheet(prev => {
      if (prev.legalBasis.includes(citation)) return prev;
      const updated = prev.legalBasis ? `${prev.legalBasis}, ${citation}` : citation;
      return { ...prev, legalBasis: updated };
    });
  };

  const handleSelectScenario = async (scenarioCategory: string) => {
    setIsScenarioDropdownOpen(false);
    if (scenarioCategory === currentCase.category) return;

    setIsSwitchingScenario(true);
    setErrorMsg(null);
    setGradingResult(null);

    try {
      const resp = await fetch('/api/case-study/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ category: scenarioCategory })
      });

      if (!resp.ok) {
        throw new Error(`Không thể tạo bài tập mới (HTTP ${resp.status})`);
      }

      const newCs: CaseStudyDetail = await resp.json();
      setCurrentCase(newCs);
      if (onCaseStudyChanged) onCaseStudyChanged(newCs);

      // Reset worksheet values tailored to new scenario
      if (scenarioCategory === 'multi_tax_trade_defense') {
        setWorksheet({
          ...defaultWorksheet,
          legalBasis: 'Điều 12 Luật Quản lý ngoại thương số 05/2017/QH14, Điều 39 Thông tư 38/2015/TT-BTC, Luật Thuế 107/2016'
        });
      } else if (scenarioCategory === 'post_clearance_audit_penalties') {
        setWorksheet({
          ...defaultWorksheet,
          legalBasis: 'Điều 9 Nghị định 128/2020/NĐ-CP, Điều 59 Luật Quản lý thuế số 38/2019/QH14, Luật Thuế 107/2016'
        });
      } else if (scenarioCategory === 'origin_co_dispute') {
        setWorksheet({
          ...defaultWorksheet,
          legalBasis: 'Quy tắc 23 Phụ lục I Thông tư 12/2019/TT-BCT, Điều 26 Thông tư 38/2015/TT-BTC, Thông tư 33/2023/TT-BTC'
        });
      } else {
        setWorksheet({
          ...defaultWorksheet,
          legalBasis: 'Khoản 2 Điều 13 Thông tư 39/2015/TT-BTC, Điều 15 Thông tư 39/2015/TT-BTC, Luật Thuế 107/2016, Hiệp định VJEPA'
        });
      }
      setActiveTab('solve');
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi đổi dạng bài tập. Vui lòng thử lại.');
    } finally {
      setIsSwitchingScenario(false);
    }
  };

  const handleSubmitSolution = async () => {
    const cat = currentCase.category;
    let fullSolution = '';

    if (cat === 'multi_tax_trade_defense') {
      const hasData = worksheet.vnkMultiVnd || worksheet.taxAdVnd || worksheet.totalTaxMultiVnd || worksheet.taxVatMultiVnd;
      if (!hasData) {
        setErrorMsg('Vui lòng nhập các chỉ tiêu số liệu (Trị giá tính thuế V_NK, Thuế Chống bán phá giá AD, Thuế GTGT, Tổng thuế...).');
        return;
      }
      fullSolution = [
        `--- BẢNG KÊ KHAI ĐA SẮC THUẾ & CHỐNG BÁN PHÁ GIÁ ---`,
        `1. Kê khai Trị giá tính thuế hải quan:`,
        `- Đơn giá hóa đơn CIF: ${worksheet.unitPriceUsd || '650'} USD/tấn`,
        `- Khối lượng lô hàng: ${worksheet.quantityTon || '100'} tấn`,
        `- Tổng Trị giá CIF lô hàng: ${worksheet.cifMultiUsd || '65,000'} USD`,
        `- Tỷ giá quy đổi: ${worksheet.exchangeRate || '25,450'} VNĐ/USD`,
        `- Trị giá tính thuế Hải quan (V_NK): ${worksheet.vnkMultiVnd || '0'} VNĐ`,
        ``,
        `2. Thứ tự tính toán các sắc thuế cộng dồn theo Luật:`,
        `- Thuế nhập khẩu (ACFTA Form E 0%): ${worksheet.taxImportFtaVnd || '0'} VNĐ`,
        `- Thuế Chống bán phá giá (AD 15%): ${worksheet.taxAdVnd || '0'} VNĐ`,
        `- Trị giá tính thuế GTGT (V_VAT): ${worksheet.vatBaseMultiVnd || '0'} VNĐ`,
        `- Thuế GTGT (VAT 10%): ${worksheet.taxVatMultiVnd || '0'} VNĐ`,
        `- Tổng số tiền thuế phải nộp trước khi thông quan: ${worksheet.totalTaxMultiVnd || '0'} VNĐ`,
        ``,
        `3. Căn cứ pháp lý & Nguyên tắc tính thuế:`,
        `- Căn cứ pháp luật: ${worksheet.legalBasis || 'Điều 12 Luật Quản lý ngoại thương số 05/2017/QH14, Khoản 1 Điều 39 Thông tư 38/2015/TT-BTC, Luật Thuế 107/2016'}`,
        `- Kết luận & Thứ tự tính thuế: ${worksheet.conclusion || 'Hàng hóa chịu đồng thời thuế NK, thuế AD và thuế GTGT. Thuế AD tính trên trị giá tính thuế NK; trị giá tính thuế GTGT bằng trị giá tính thuế cộng thuế NK và thuế AD.'}`
      ].join('\n');
    } else if (cat === 'post_clearance_audit_penalties') {
      const hasData = worksheet.vnkAuditVnd || worksheet.diffImportTaxVnd || worksheet.penalty20Vnd || worksheet.totalPayableAuditVnd;
      if (!hasData) {
        setErrorMsg('Vui lòng nhập số liệu tính toán (Thuế truy thu, Tiền chậm nộp, Phạt 20%, Tổng nộp NSNN...).');
        return;
      }
      fullSolution = [
        `--- BẢNG KÊ KHAI KIỂM TRA SAU THÔNG QUAN & XỬ PHẠT ---`,
        `1. Trị giá tính thuế & Thuế khai thiếu:`,
        `- Trị giá tính thuế Hải quan (V_NK): ${worksheet.vnkAuditVnd || '763,500,000'} VNĐ`,
        `- Thuế nhập khẩu ấn định truy thu (15%): ${worksheet.diffImportTaxVnd || '0'} VNĐ`,
        `- Thuế GTGT ấn định truy thu (10%): ${worksheet.diffVatTaxVnd || '0'} VNĐ`,
        `- Tổng số tiền thuế truy thu (NK + GTGT): ${worksheet.totalDiffTaxVnd || '0'} VNĐ`,
        ``,
        `2. Tiền phạt VPHC & Tiền chậm nộp tiền thuế:`,
        `- Tiền chậm nộp (${worksheet.lateDays || '60'} ngày * 0.03%/ngày theo Luật QLT 38): ${worksheet.lateFeeVnd || '0'} VNĐ`,
        `- Tiền phạt vi phạm hành chính (20% theo Điều 9 Nghị định 128/2020): ${worksheet.penalty20Vnd || '0'} VNĐ`,
        `- Tổng số tiền phải nộp vào Ngân sách Nhà nước: ${worksheet.totalPayableAuditVnd || '0'} VNĐ`,
        ``,
        `3. Căn cứ pháp lý:`,
        `- ${worksheet.legalBasis || 'Điều 9 Nghị định 128/2020/NĐ-CP, Điều 59 Luật Quản lý thuế số 38/2019/QH14, Luật Thuế XNK 107/2016'}`
      ].join('\n');
    } else if (cat === 'origin_co_dispute') {
      const hasData = worksheet.vnkOriginVnd || worksheet.diffImportOriginVnd || worksheet.totalDiffOriginVnd;
      if (!hasData) {
        setErrorMsg('Vui lòng nhập các chỉ tiêu số liệu và ý kiến pháp lý về C/O bên thứ ba.');
        return;
      }
      fullSolution = [
        `--- BẢNG THẨM ĐỊNH XUẤT XỨ C/O & HÓA ĐƠN BÊN THỨ BA ---`,
        `1. Trị giá tính thuế & Số thuế chênh lệch cần nộp bảo lãnh:`,
        `- Trị giá tính thuế CIF quy đổi (V_NK): ${worksheet.vnkOriginVnd || '445,375,000'} VNĐ`,
        `- Thuế NK MFN (20% nếu C/O bị bác bỏ): ${worksheet.diffImportOriginVnd || '0'} VNĐ`,
        `- Thuế GTGT nộp bổ sung: ${worksheet.diffVatOriginVnd || '0'} VNĐ`,
        `- Tổng số tiền thuế chênh lệch cần bảo lãnh/tạm nộp: ${worksheet.totalDiffOriginVnd || '0'} VNĐ`,
        ``,
        `2. Đánh giá tính hợp lệ C/O & Thủ tục hải quan:`,
        `- Tính hợp lệ Ô số 13 Third-Party: ${worksheet.coBox13Assessment || 'Ô số 13 không tick Third Party Invoicing là sai sót trọng yếu làm C/O chưa đủ điều kiện chấp nhận ngay.'}`,
        `- Quy trình thủ tục của Hải quan: ${worksheet.customsProcedureSolution || 'Hải quan không từ chối ngay mà cho phép bảo lãnh/tạm nộp theo thuế MFN để giải phóng hàng, sau đó tiến hành xác minh C/O.'}`,
        ``,
        `3. Căn cứ pháp lý:`,
        `- ${worksheet.legalBasis || 'Quy tắc 23 Phụ lục I Thông tư 12/2019/TT-BCT, Điều 26 Thông tư 38/2015/TT-BTC, Thông tư 33/2023/TT-BTC'}`
      ].join('\n');
    } else {
      // Default: valuation_incoterms
      const hasEnteredData = 
        worksheet.vnkVnd.trim() || 
        worksheet.customsValueUsd.trim() || 
        worksheet.taxImportVndB.trim() || 
        worksheet.totalTaxVndA.trim() || 
        worksheet.taxDiffVnd.trim();

      if (!hasEnteredData) {
        setErrorMsg('Vui lòng nhập các chỉ tiêu số liệu chính (Trị giá Hải quan, Trị giá tính thuế V_NK, Số thuế MFN/VJ hoặc Chênh lệch thuế...) trước khi nộp bài.');
        return;
      }

      fullSolution = [
        `--- BẢNG KÊ KHAI SỐ LIỆU TÍNH THUẾ HẢI QUAN (SO SÁNH C/O) ---`,
        `1. Kê khai Trị giá Hải quan & Các khoản điều chỉnh Incoterms:`,
        `- Trị giá hóa đơn (FOB): ${worksheet.fobUsd || '0'} USD`,
        `- Cước vận chuyển quốc tế (F): ${worksheet.freightUsd || '0'} USD`,
        `- Phí bảo hiểm quốc tế (I): ${worksheet.insuranceUsd || '0'} USD`,
        `- Tổng các khoản điều chỉnh cộng: ${worksheet.adjustmentUsd || '0'} USD`,
        `- Các khoản điều chỉnh trừ: ${worksheet.deductionUsd || '0'} USD`,
        `- Trị giá Hải quan (USD): ${worksheet.customsValueUsd || '0'} USD`,
        `- Tỷ giá quy đổi hải quan: ${worksheet.exchangeRate || '25,450'} VNĐ/USD`,
        `- Trị giá tính thuế Hải quan (V_NK): ${worksheet.vnkVnd || '0'} VNĐ`,
        ``,
        `2. Kê khai nghĩa vụ thuế (Bảng so sánh 2 trường hợp C/O theo Yêu cầu 3):`,
        `[Trường hợp sử dụng C/O Form VJ hợp lệ (Thuế NK 0%)]:`,
        `- Thuế Nhập khẩu: ${worksheet.taxImportVndA || '0'} VNĐ`,
        `- Thuế GTGT (VAT): ${worksheet.taxVatVndA || '0'} VNĐ`,
        `- Tổng số thuế phải nộp (Form VJ): ${worksheet.totalTaxVndA || '0'} VNĐ`,
        ``,
        `[Trường hợp mất C/O áp thuế MFN 5%]:`,
        `- Thuế Nhập khẩu MFN: ${worksheet.taxImportVndB || '0'} VNĐ`,
        `- Thuế GTGT (VAT MFN): ${worksheet.taxVatVndB || '0'} VNĐ`,
        `- Tổng số thuế phải nộp (MFN): ${worksheet.totalTaxVndB || '0'} VNĐ`,
        ``,
        `[Chỉ tiêu chênh lệch]:`,
        `- Tiền thuế chênh lệch tiết kiệm được (MFN - Form VJ): ${worksheet.taxDiffVnd || '0'} VNĐ`,
        ``,
        `3. Căn cứ pháp lý & Đề xuất giải pháp nghiệp vụ:`,
        `- Căn cứ pháp luật: ${worksheet.legalBasis || 'Thông tư 39/2015/TT-BTC, Thông tư 60/2019/TT-BTC, Luật Thuế 107/2016, Hiệp định VJEPA'}`,
        `- Kết luận & Giải pháp thủ tục: ${worksheet.conclusion || 'Doanh nghiệp xuất trình C/O Form VJ để được hưởng thuế NK 0%, tiết kiệm 341 triệu tiền thuế.'}`
      ].join('\n');
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const resp = await fetch(`/api/case-study/${currentCase.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          solution: fullSolution,
          userId: userId || 'anonymous'
        })
      });

      if (!resp.ok) {
        throw new Error(`Lỗi nộp bài chấm điểm (HTTP ${resp.status})`);
      }

      const data: CaseStudyGradingResult = await resp.json();
      setGradingResult(data);
      
      const initialExp: Record<number, boolean> = {};
      data.rubricScores?.forEach((r, idx) => {
        initialExp[idx] = true;
      });
      setExpandedCriteria(initialExp);
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl xl:max-w-7xl h-[92vh] max-h-[920px] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden font-sans">
        
        {/* ─── [PHẦN HEADER (TRÊN CÙNG)]: KÈM DROPDOWN CHỌN TÌNH HUỐNG ──── */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shrink-0">
          
          {/* Tiêu đề góc trái & Nút Đổi Dạng Bài Tập */}
          <div className="min-w-0 flex items-center space-x-3">
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                  {currentCase.title}
                </h3>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                <span className="font-normal text-slate-600 dark:text-slate-300 truncate">
                  {currentCase.company}
                </span>
                <span>•</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                  {currentCase.categoryName}
                </span>
              </div>
            </div>

            {/* Menu Dropdown Chọn Dạng Bài Tập Mới (Test Độ Đa Dạng) */}
            <div className="relative shrink-0 hidden md:block">
              <button
                type="button"
                onClick={() => setIsScenarioDropdownOpen(!isScenarioDropdownOpen)}
                disabled={isSwitchingScenario}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span>{isSwitchingScenario ? 'Đang đổi dạng đề...' : 'Đổi dạng bài tập'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
              </button>

              {isScenarioDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-72 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700/60">
                    Chọn chuyên đề thử thách
                  </div>
                  {SCENARIOS.map((sc) => {
                    const IconComponent = sc.icon;
                    const isCurrent = sc.id === currentCase.category;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => handleSelectScenario(sc.id)}
                        className={`w-full px-3 py-2 text-left flex items-start space-x-2.5 transition-colors cursor-pointer ${
                          isCurrent 
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <IconComponent className={`w-4 h-4 shrink-0 mt-0.5 ${isCurrent ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <div>
                          <div className="text-xs">{sc.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{sc.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Nút bấm góc phải: Tabs & Nút đóng */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="flex bg-slate-100/80 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('solve')}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 font-medium cursor-pointer ${
                  activeTab === 'solve'
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs border border-blue-200/60 dark:border-slate-600'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Bảng Kê Khai & Chấm Điểm</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('solution')}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 font-medium cursor-pointer ${
                  activeTab === 'solution'
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs border border-blue-200/60 dark:border-slate-600'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Lời Giải Chuẩn & Barem</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Đóng trang"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* ─── [KHU VỰC NỘI DUNG: CHIA 2 BÊN] ─────────────────────────── */}
        {activeTab === 'solve' ? (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80 dark:divide-slate-800">
            
            {/* ─── [SIDEBAR TRÁI: DỮ LIỆU & ĐỀ BÀI (ĐÃ GỘP GỌN)] (5/12) ──── */}
            <div className="lg:col-span-5 xl:col-span-5 flex flex-col h-full overflow-y-auto p-5 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
              
              {/* Thẻ 1 - DỮ LIỆU & CHI TIẾT HỒ SƠ */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    DỮ LIỆU & CHI TIẾT HỒ SƠ ({currentCase.documents?.length || 0} tệp)
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 font-medium">
                    Hồ sơ ngoại thương
                  </span>
                </div>

                <div className="space-y-2.5">
                  {currentCase.documents?.map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/70 text-xs hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center space-x-2 min-w-0">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={1.5} />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                            {doc.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-white dark:bg-slate-750 text-slate-600 dark:text-slate-300 rounded border border-slate-200/60 dark:border-slate-700 shrink-0 font-medium">
                          {doc.code}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-[13px] leading-relaxed pl-6 font-normal">
                        {doc.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Thẻ 2 - ĐỀ BÀI & YÊU CẦU GIẢI QUYẾT */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-750 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    ĐỀ BÀI & YÊU CẦU GIẢI QUYẾT ({currentCase.questions?.length || 0} Câu)
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-medium border border-blue-200/60 dark:border-blue-900/60">
                    {currentCase.difficulty === 'hard' ? 'Nâng cao' : 'Nghiệp vụ chuẩn'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Bối cảnh tình huống thực tế:
                  </span>
                  <p className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line text-justify font-normal">
                    {currentCase.context}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-750 space-y-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Nội dung yêu cầu giải quyết:
                  </span>
                  <div className="space-y-2 pl-1">
                    {currentCase.questions?.map((q, idx) => (
                      <div key={idx} className="flex items-start space-x-2.5 text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 font-medium">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5 border border-blue-200 dark:border-blue-800">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{q}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* ─── [KHU VỰC CHÍNH BÊN PHẢI: BẢNG KÊ KHAI ĐỘNG THEO DẠNG ĐỀ] (7/12) ─── */}
            <div className="lg:col-span-7 xl:col-span-7 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden relative">
              
              {!gradingResult ? (
                <div className="flex flex-col h-full overflow-hidden">
                  
                  {/* Header Form */}
                  <div className="px-5 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
                        BẢNG KÊ KHAI SỐ LIỆU NGHIỆP VỤ & TÍNH THUẾ
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Biểu mẫu chuyên biệt cho chuyên đề: <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">{currentCase.categoryName}</strong>
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60">
                      Worksheet Mode
                    </span>
                  </div>

                  {/* VÙNG CUỘN CHỨA CÁC FORM ĐỘNG THEO DẠNG BÀI TẬP */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
                    
                    {/* ════ DẠNG 1: TRỊ GIÁ INCOTERMS & SO SÁNH C/O ════ */}
                    {currentCase.category === 'valuation_incoterms' && (
                      <>
                        {/* Khối 1: Trị giá hải quan */}
                        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-3 shadow-xs">
                          <div className="flex items-center space-x-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                            <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                              1. Kê Khai Trị Giá Hải Quan (Yêu cầu 1 & 2)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Trị giá hóa đơn (FOB):</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={worksheet.fobUsd}
                                  onChange={(e) => handleFieldChange('fobUsd', e.target.value)}
                                  placeholder="VD: 240,000"
                                  className="w-full pl-3 pr-12 py-1.5 text-xs sm:text-[13px] font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                                <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[10px] font-semibold text-slate-400">USD</span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Cước vận chuyển quốc tế (F):</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={worksheet.freightUsd}
                                  onChange={(e) => handleFieldChange('freightUsd', e.target.value)}
                                  placeholder="VD: 2,500"
                                  className="w-full pl-3 pr-12 py-1.5 text-xs sm:text-[13px] font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                                <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[10px] font-semibold text-slate-400">USD</span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Phí bảo hiểm quốc tế (I):</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={worksheet.insuranceUsd}
                                  onChange={(e) => handleFieldChange('insuranceUsd', e.target.value)}
                                  placeholder="VD: 350"
                                  className="w-full pl-3 pr-12 py-1.5 text-xs sm:text-[13px] font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                                <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[10px] font-semibold text-slate-400">USD</span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Tổng các khoản điều chỉnh cộng:</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={worksheet.adjustmentUsd}
                                  onChange={(e) => handleFieldChange('adjustmentUsd', e.target.value)}
                                  placeholder="VD: 800"
                                  className="w-full pl-3 pr-12 py-1.5 text-xs sm:text-[13px] font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                                <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[10px] font-semibold text-slate-400">USD</span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                <span>Các khoản điều chỉnh trừ (nếu có):</span>
                                <span className="text-[10px] text-slate-400">0 nếu không có</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={worksheet.deductionUsd}
                                  onChange={(e) => handleFieldChange('deductionUsd', e.target.value)}
                                  placeholder="0 (nếu không phát sinh)"
                                  className="w-full pl-3 pr-12 py-1.5 text-xs sm:text-[13px] font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                                <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[10px] font-semibold text-slate-400">USD</span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Tỷ giá quy đổi hải quan:</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={worksheet.exchangeRate}
                                  onChange={(e) => handleFieldChange('exchangeRate', e.target.value)}
                                  placeholder="VD: 25,450"
                                  className="w-full pl-3 pr-18 py-1.5 text-xs sm:text-[13px] font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                                <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[10px] font-semibold text-slate-400">VNĐ/USD</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                              <span>Trị giá Hải quan (USD):</span>
                              <span className="text-[10px] text-slate-500 font-normal">FOB + F + I + Tổng điều chỉnh cộng - Tổng điều chỉnh trừ</span>
                            </label>
                            <div className="relative mt-1">
                              <input
                                type="text"
                                value={worksheet.customsValueUsd}
                                onChange={(e) => handleFieldChange('customsValueUsd', e.target.value)}
                                placeholder="VD: 243,650"
                                className="w-full pl-3 pr-12 py-1.5 text-xs sm:text-[13px] font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold text-blue-700 dark:text-blue-300"
                              />
                              <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[10px] font-semibold text-slate-400">USD</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                            <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                              <span>Trị Giá Tính Thuế Hải Quan (V_NK bằng VNĐ):</span>
                              <span className="text-[11px] text-blue-600 font-normal">Trị giá Hải quan (USD) × Tỷ giá</span>
                            </label>
                            <div className="relative mt-1">
                              <input
                                type="text"
                                value={worksheet.vnkVnd}
                                onChange={(e) => handleFieldChange('vnkVnd', e.target.value)}
                                placeholder="VD: 6,200,892,500"
                                className="w-full pl-3 pr-14 py-2 text-xs sm:text-sm font-mono font-bold rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200"
                              />
                              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs font-bold text-blue-600">VNĐ</span>
                            </div>
                          </div>
                        </div>

                        {/* Khối 2: Lưới 2 cột so sánh C/O */}
                        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-3.5 shadow-xs">
                          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                            <div className="flex items-center space-x-2">
                              <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" strokeWidth={1.5} />
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                2. Kê Khai Thuế: So Sánh 2 Trường Hợp C/O (Yêu cầu 3)
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">Bảng tính đối chiếu</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {/* Form VJ */}
                            <div className="p-3.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-2.5">
                              <div className="flex items-center justify-between border-b border-emerald-200/70 pb-1.5">
                                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Trường hợp sử dụng C/O Form VJ</span>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">Thuế NK 0%</span>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Thuế Nhập khẩu (0%):</label>
                                <input
                                  type="text"
                                  value={worksheet.taxImportVndA}
                                  onChange={(e) => handleFieldChange('taxImportVndA', e.target.value)}
                                  placeholder="VD: 0"
                                  className="w-full pl-2.5 pr-11 py-1.5 text-xs font-mono rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                                  <span>Thuế GTGT (VAT 10%):</span>
                                  <span className="text-[10px] text-slate-500 font-normal italic block">(Trị giá tính thuế + Thuế NK) × 10%</span>
                                </label>
                                <input
                                  type="text"
                                  value={worksheet.taxVatVndA}
                                  onChange={(e) => handleFieldChange('taxVatVndA', e.target.value)}
                                  placeholder="VD: 620,089,250"
                                  className="w-full pl-2.5 pr-11 py-1.5 text-xs font-mono rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                              <div className="space-y-1 pt-2 border-t border-emerald-200/60">
                                <label className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Tổng thuế phải nộp (Form VJ):</label>
                                <input
                                  type="text"
                                  value={worksheet.totalTaxVndA}
                                  onChange={(e) => handleFieldChange('totalTaxVndA', e.target.value)}
                                  placeholder="VD: 620,089,250"
                                  className="w-full pl-2.5 pr-11 py-1.5 text-xs font-mono font-bold rounded-lg border border-emerald-300 bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300"
                                />
                              </div>
                            </div>

                            {/* MFN */}
                            <div className="p-3.5 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2.5">
                              <div className="flex items-center justify-between border-b border-amber-200/70 pb-1.5">
                                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Trường hợp mất C/O (Áp thuế MFN)</span>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Thuế MFN 5%</span>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Thuế Nhập khẩu (MFN 5%):</label>
                                <input
                                  type="text"
                                  value={worksheet.taxImportVndB}
                                  onChange={(e) => handleFieldChange('taxImportVndB', e.target.value)}
                                  placeholder="VD: 310,044,625"
                                  className="w-full pl-2.5 pr-11 py-1.5 text-xs font-mono rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                                  <span>Thuế GTGT (VAT MFN):</span>
                                  <span className="text-[10px] text-slate-500 font-normal italic block">(Trị giá tính thuế + Thuế NK) × 10%</span>
                                </label>
                                <input
                                  type="text"
                                  value={worksheet.taxVatVndB}
                                  onChange={(e) => handleFieldChange('taxVatVndB', e.target.value)}
                                  placeholder="VD: 651,093,713"
                                  className="w-full pl-2.5 pr-11 py-1.5 text-xs font-mono rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                              <div className="space-y-1 pt-2 border-t border-amber-200/60">
                                <label className="text-xs font-bold text-amber-900 dark:text-amber-200">Tổng thuế phải nộp (MFN):</label>
                                <input
                                  type="text"
                                  value={worksheet.totalTaxVndB}
                                  onChange={(e) => handleFieldChange('totalTaxVndB', e.target.value)}
                                  placeholder="VD: 961,138,338"
                                  className="w-full pl-2.5 pr-11 py-1.5 text-xs font-mono font-bold rounded-lg border border-amber-300 bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                            <label className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center justify-between">
                              <span>Tiền Thuế Chênh Lệch Tiết Kiệm Được (MFN - Form VJ):</span>
                              <span className="text-[11px] text-purple-600 font-normal">Lợi ích kinh tế khi có C/O Form VJ</span>
                            </label>
                            <input
                              type="text"
                              value={worksheet.taxDiffVnd}
                              onChange={(e) => handleFieldChange('taxDiffVnd', e.target.value)}
                              placeholder="VD: 341,049,088"
                              className="w-full pl-3 pr-14 py-2 text-xs sm:text-sm font-mono font-bold rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-purple-50/50 text-purple-900 dark:text-purple-200 mt-1"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* ════ DẠNG 2: ĐA SẮC THUẾ & CHỐNG BÁN PHÁ GIÁ (AD) ════ */}
                    {currentCase.category === 'multi_tax_trade_defense' && (
                      <>
                        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-3 shadow-xs">
                          <div className="flex items-center space-x-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                            <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                              1. Kê Khai Trị Giá Tính Thuế Hải Quan (Yêu cầu 2)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Đơn giá CIF Hải Phòng:</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={worksheet.unitPriceUsd}
                                  onChange={(e) => handleFieldChange('unitPriceUsd', e.target.value)}
                                  placeholder="VD: 650"
                                  className="w-full pl-3 pr-18 py-1.5 text-xs sm:text-[13px] font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                                <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[10px] font-semibold text-slate-400">USD/tấn</span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Khối lượng lô hàng:</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={worksheet.quantityTon}
                                  onChange={(e) => handleFieldChange('quantityTon', e.target.value)}
                                  placeholder="VD: 100"
                                  className="w-full pl-3 pr-12 py-1.5 text-xs sm:text-[13px] font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                                <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[10px] font-semibold text-slate-400">Tấn</span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Tổng Trị giá CIF lô hàng:</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={worksheet.cifMultiUsd}
                                  onChange={(e) => handleFieldChange('cifMultiUsd', e.target.value)}
                                  placeholder="VD: 65,000"
                                  className="w-full pl-3 pr-12 py-1.5 text-xs sm:text-[13px] font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                                <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[10px] font-semibold text-slate-400">USD</span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Tỷ giá tính thuế:</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={worksheet.exchangeRate}
                                  onChange={(e) => handleFieldChange('exchangeRate', e.target.value)}
                                  placeholder="VD: 25,450"
                                  className="w-full pl-3 pr-18 py-1.5 text-xs sm:text-[13px] font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                                <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[10px] font-semibold text-slate-400">VNĐ/USD</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                            <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                              <span>Trị Giá Tính Thuế Hải Quan (V_NK bằng VNĐ):</span>
                              <span className="text-[11px] text-blue-600 font-normal">CIF USD × Tỷ giá</span>
                            </label>
                            <input
                              type="text"
                              value={worksheet.vnkMultiVnd}
                              onChange={(e) => handleFieldChange('vnkMultiVnd', e.target.value)}
                              placeholder="VD: 1,654,250,000"
                              className="w-full pl-3 pr-14 py-2 text-xs sm:text-sm font-mono font-bold rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50/40 text-blue-900 dark:text-blue-200 mt-1"
                            />
                          </div>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-3.5 shadow-xs">
                          <div className="flex items-center space-x-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                            <ShieldAlert className="w-4 h-4 text-amber-600" strokeWidth={1.5} />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                              2. Kê Khai Thứ Tự Tính Các Sắc Thuế Cộng Dồn (Yêu cầu 1 & 3)
                            </span>
                          </div>

                          <div className="space-y-3 text-xs">
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                              <label className="font-semibold text-slate-800 dark:text-slate-200 flex justify-between">
                                <span>1. Thuế Nhập khẩu (ACFTA Form E - 0%):</span>
                                <span className="text-[11px] text-emerald-600 font-bold">0% Ưu đãi đặc biệt</span>
                              </label>
                              <input
                                type="text"
                                value={worksheet.taxImportFtaVnd}
                                onChange={(e) => handleFieldChange('taxImportFtaVnd', e.target.value)}
                                placeholder="VD: 0"
                                className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                              />
                            </div>

                            <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1">
                              <label className="font-semibold text-amber-900 dark:text-amber-200 flex justify-between">
                                <span>2. Thuế Chống bán phá giá (AD 15%):</span>
                                <span className="text-[11px] text-amber-700">Trị giá tính thuế × 15%</span>
                              </label>
                              <input
                                type="text"
                                value={worksheet.taxAdVnd}
                                onChange={(e) => handleFieldChange('taxAdVnd', e.target.value)}
                                placeholder="VD: 248,137,500"
                                className="w-full px-3 py-1.5 font-mono font-semibold rounded-lg border border-amber-300 text-amber-900 dark:text-amber-200"
                              />
                            </div>

                            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                              <label className="font-semibold text-slate-800 dark:text-slate-200 flex justify-between">
                                <span>3. Trị giá tính thuế GTGT (V_VAT):</span>
                                <span className="text-[11px] text-indigo-600">V_NK + Thuế NK + Thuế AD</span>
                              </label>
                              <input
                                type="text"
                                value={worksheet.vatBaseMultiVnd}
                                onChange={(e) => handleFieldChange('vatBaseMultiVnd', e.target.value)}
                                placeholder="VD: 1,902,387,500"
                                className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                              />
                            </div>

                            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                              <label className="font-semibold text-slate-800 dark:text-slate-200 flex justify-between">
                                <span>4. Thuế Giá trị gia tăng (GTGT / VAT 10%):</span>
                                <span className="text-[11px] text-slate-500">Trị giá tính thuế GTGT × 10%</span>
                              </label>
                              <input
                                type="text"
                                value={worksheet.taxVatMultiVnd}
                                onChange={(e) => handleFieldChange('taxVatMultiVnd', e.target.value)}
                                placeholder="VD: 190,238,750"
                                className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                              />
                            </div>

                            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-700 space-y-1">
                              <label className="font-bold text-emerald-900 dark:text-emerald-200 flex justify-between text-xs sm:text-[13px]">
                                <span>⭐ TỔNG SỐ TIỀN THUẾ PHẢI NỘP VÀO NSNN:</span>
                                <span className="text-emerald-700">Thuế NK + Thuế AD + Thuế GTGT</span>
                              </label>
                              <input
                                type="text"
                                value={worksheet.totalTaxMultiVnd}
                                onChange={(e) => handleFieldChange('totalTaxMultiVnd', e.target.value)}
                                placeholder="VD: 438,376,250"
                                className="w-full px-3 py-2 font-mono font-bold text-sm sm:text-base rounded-lg border border-emerald-400 bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-200"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* ════ DẠNG 3: KIỂM TRA SAU THÔNG QUAN & PHẠT CHẬM NỘP ════ */}
                    {currentCase.category === 'post_clearance_audit_penalties' && (
                      <>
                        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-3 shadow-xs">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block border-b border-slate-200/60 pb-2">
                            1. Kê Khai Trị Giá Tính Thuế & Thuế Ấn Định Truy Thu (Yêu cầu 1 & 2)
                          </span>

                          <div className="space-y-2.5 text-xs">
                            <div className="space-y-1">
                              <label className="font-medium text-slate-700 dark:text-slate-300">Trị giá tính thuế hải quan (200 chiếc Smart Tivi):</label>
                              <input
                                type="text"
                                value={worksheet.vnkAuditVnd}
                                onChange={(e) => handleFieldChange('vnkAuditVnd', e.target.value)}
                                placeholder="VD: 763,500,000"
                                className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-200 text-slate-900"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="font-medium text-slate-700 dark:text-slate-300">Thuế NK truy thu (15% theo mã Smart Tivi):</label>
                                <input
                                  type="text"
                                  value={worksheet.diffImportTaxVnd}
                                  onChange={(e) => handleFieldChange('diffImportTaxVnd', e.target.value)}
                                  placeholder="VD: 114,525,000"
                                  className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-200 text-slate-900"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="font-medium text-slate-700 dark:text-slate-300">Thuế GTGT truy thu (10% thuế NK tăng):</label>
                                <input
                                  type="text"
                                  value={worksheet.diffVatTaxVnd}
                                  onChange={(e) => handleFieldChange('diffVatTaxVnd', e.target.value)}
                                  placeholder="VD: 11,452,500"
                                  className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-200 text-slate-900"
                                />
                              </div>
                            </div>

                            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900">
                              <label className="font-bold flex justify-between">
                                <span>Tổng số tiền thuế truy thu (NK + GTGT):</span>
                                <span className="text-xs">114.5M + 11.45M</span>
                              </label>
                              <input
                                type="text"
                                value={worksheet.totalDiffTaxVnd}
                                onChange={(e) => handleFieldChange('totalDiffTaxVnd', e.target.value)}
                                placeholder="VD: 125,977,500"
                                className="w-full px-3 py-1.5 font-mono font-bold rounded-lg border border-blue-300 mt-1"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-3 shadow-xs">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block border-b border-slate-200/60 pb-2">
                            2. Kê Khai Tiền Phạt VPHC 20% & Tiền Chậm Nộp 0.03%/Ngày (Yêu cầu 3 & 4)
                          </span>

                          <div className="space-y-3 text-xs">
                            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
                              <label className="font-semibold text-amber-900 flex justify-between">
                                <span>Tiền chậm nộp (60 ngày × 0.03%/ngày theo Luật QLT 38):</span>
                                <span>125.9M × 0.03% × 60</span>
                              </label>
                              <input
                                type="text"
                                value={worksheet.lateFeeVnd}
                                onChange={(e) => handleFieldChange('lateFeeVnd', e.target.value)}
                                placeholder="VD: 2,267,595"
                                className="w-full px-3 py-1.5 font-mono rounded-lg border border-amber-300 font-bold text-amber-900"
                              />
                            </div>

                            <div className="p-3 rounded-xl bg-red-50/50 border border-red-200 space-y-1">
                              <label className="font-semibold text-red-900 flex justify-between">
                                <span>Tiền phạt vi phạm hành chính 20% (Điều 9 Nghị định 128/2020):</span>
                                <span>20% × 125.9M</span>
                              </label>
                              <input
                                type="text"
                                value={worksheet.penalty20Vnd}
                                onChange={(e) => handleFieldChange('penalty20Vnd', e.target.value)}
                                placeholder="VD: 25,195,500"
                                className="w-full px-3 py-1.5 font-mono rounded-lg border border-red-300 font-bold text-red-900"
                              />
                            </div>

                            <div className="p-3.5 rounded-xl bg-purple-50 border-2 border-purple-300 space-y-1">
                              <label className="font-bold text-purple-900 flex justify-between text-xs sm:text-[13px]">
                                <span>⭐ TỔNG SỐ TIỀN PHẢI NỘP VÀO NGÂN SÁCH NHÀ NƯỚC:</span>
                                <span>Thuế + Chậm nộp + Phạt 20%</span>
                              </label>
                              <input
                                type="text"
                                value={worksheet.totalPayableAuditVnd}
                                onChange={(e) => handleFieldChange('totalPayableAuditVnd', e.target.value)}
                                placeholder="VD: 153,440,595"
                                className="w-full px-3 py-2 font-mono font-bold text-sm sm:text-base rounded-lg border border-purple-400 text-purple-900"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* ════ DẠNG 4: THẨM ĐỊNH C/O BÊN THỨ BA (THIRD PARTY) ════ */}
                    {currentCase.category === 'origin_co_dispute' && (
                      <>
                        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-3 shadow-xs">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block border-b border-slate-200/60 pb-2">
                            1. Kê Khai Số Tiền Thuế Chênh Lệch Cần Nộp Bảo Lãnh (Yêu cầu 3)
                          </span>
                          <div className="space-y-2.5 text-xs">
                            <div className="space-y-1">
                              <label className="font-medium text-slate-700 dark:text-slate-300">Trị giá tính thuế CIF quy đổi (500 chiếc Nồi chiên):</label>
                              <input
                                type="text"
                                value={worksheet.vnkOriginVnd}
                                onChange={(e) => handleFieldChange('vnkOriginVnd', e.target.value)}
                                placeholder="VD: 445,375,000"
                                className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-200"
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="font-medium text-slate-700 dark:text-slate-300">Thuế NK MFN chênh lệch (20%):</label>
                                <input
                                  type="text"
                                  value={worksheet.diffImportOriginVnd}
                                  onChange={(e) => handleFieldChange('diffImportOriginVnd', e.target.value)}
                                  placeholder="VD: 89,075,000"
                                  className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-200"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="font-medium text-slate-700 dark:text-slate-300">Thuế GTGT nộp bổ sung:</label>
                                <input
                                  type="text"
                                  value={worksheet.diffVatOriginVnd}
                                  onChange={(e) => handleFieldChange('diffVatOriginVnd', e.target.value)}
                                  placeholder="VD: 8,907,500"
                                  className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-200"
                                />
                              </div>
                            </div>
                            <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                              <label className="font-bold text-purple-900 flex justify-between">
                                <span>⭐ Tổng số tiền thuế cần nộp bảo lãnh giải phóng hàng:</span>
                                <span>89M + 8.9M</span>
                              </label>
                              <input
                                type="text"
                                value={worksheet.totalDiffOriginVnd}
                                onChange={(e) => handleFieldChange('totalDiffOriginVnd', e.target.value)}
                                placeholder="VD: 97,982,500"
                                className="w-full px-3 py-1.5 font-mono font-bold text-purple-900 border border-purple-300 rounded-lg mt-1"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-3 shadow-xs">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block border-b border-slate-200/60 pb-2">
                            2. Phân Tích Thể Thức C/O & Thủ Tục Hải Quan (Yêu cầu 1 & 2)
                          </span>
                          <div className="space-y-2 text-xs">
                            <div className="space-y-1">
                              <label className="font-medium text-slate-700">Đánh giá tính hợp lệ của Ô số 13 Third-Party:</label>
                              <textarea
                                rows={2}
                                value={worksheet.coBox13Assessment}
                                onChange={(e) => handleFieldChange('coBox13Assessment', e.target.value)}
                                placeholder="Nêu quy định về việc không đánh dấu vào ô số 13 khi hóa đơn do bên thứ ba phát hành..."
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-medium text-slate-700">Thủ tục xử lý của Hải quan (Bảo lãnh & Xác minh C/O):</label>
                              <textarea
                                rows={2}
                                value={worksheet.customsProcedureSolution}
                                onChange={(e) => handleFieldChange('customsProcedureSolution', e.target.value)}
                                placeholder="Nêu thủ tục cho phép người khai nộp bảo lãnh theo mức MFN để thông quan hàng và gửi công văn xác minh..."
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* KHỐI 3: CĂN CỨ PHÁP LÝ & KẾT LUẬN GIẢI PHÁP (DÙNG CHUNG) */}
                    <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-3 shadow-xs">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block border-b border-slate-200/60 dark:border-slate-800 pb-2">
                        Căn Cứ Pháp Lý & Kết Luận Nghiệp Vụ
                      </span>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Văn bản quy phạm pháp luật áp dụng:
                        </label>
                        <input
                          type="text"
                          value={worksheet.legalBasis}
                          onChange={(e) => handleFieldChange('legalBasis', e.target.value)}
                          placeholder="Nhập các điều khoản, thông tư, luật áp dụng..."
                          className="w-full px-3 py-1.5 text-xs sm:text-[13px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div className="space-y-1 pt-1">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Kết luận nghiệp vụ & Đề xuất giải pháp cho doanh nghiệp:
                        </label>
                        <textarea
                          rows={2}
                          value={worksheet.conclusion}
                          onChange={(e) => handleFieldChange('conclusion', e.target.value)}
                          placeholder="Nêu kết luận tóm tắt và khuyến nghị hoàn thiện thủ tục cho doanh nghiệp..."
                          className="w-full px-3 py-1.5 text-xs sm:text-[13px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none leading-relaxed"
                        />
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="p-3 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center space-x-2 shrink-0">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" strokeWidth={1.5} />
                        <span>{errorMsg}</span>
                      </div>
                    )}
                  </div>

                  {/* Sticky Action Footer */}
                  <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 shadow-xs">
                    <span className="text-[11px] text-slate-400">
                      💡 Số liệu được hệ thống tự động đối chiếu Barem & Ground Truth số học.
                    </span>

                    <div className="flex items-center space-x-2.5">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                      >
                        Đóng
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitSolution}
                        disabled={isSubmitting}
                        className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs disabled:opacity-50 transition-all flex items-center space-x-2 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Đang chấm điểm AI...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
                            <span>Nộp bảng kê & Chấm điểm Barem</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* GIAO DIỆN KẾT QUẢ ĐÁNH GIÁ VÀ BAREM CHI TIẾT */
                <div className="flex flex-col h-full min-h-0">
                  
                  {/* Vùng cuộn nội dung kết quả */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
                    
                    {/* THẺ KẾT QUẢ TỔNG QUAN */}
                    <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/60 shadow-xs flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1 max-w-[70%]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                          KẾT QUẢ ĐÁNH GIÁ NGHIỆP VỤ
                        </span>
                        <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-medium">
                          {gradingResult.feedback}
                        </p>
                      </div>

                      <div className="text-center px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 shadow-xs shrink-0 min-w-[120px]">
                        <div className="text-3xl sm:text-4xl font-light text-slate-900 dark:text-slate-100 tracking-tight">
                          {gradingResult.score} <span className="text-xs font-normal text-slate-400">/ 10.0</span>
                        </div>
                        <div className="mt-1">
                          <span
                            className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full border ${
                              gradingResult.passed
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                            }`}
                          >
                            {gradingResult.passed ? 'ĐẠT CHUẨN NGHIỆP VỤ' : 'CẦN CẢI THIỆN'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* THẺ CHI TIẾT ĐIỂM TỪNG TIÊU CHÍ */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
                        CHI TIẾT ĐIỂM TỪNG TIÊU CHÍ
                      </span>

                      <div className="space-y-2.5">
                        {gradingResult.rubricScores?.map((r, idx) => {
                          const isDeducted = r.awardedPoints < r.maxPoints;
                          const ratio = r.maxPoints > 0 ? (r.awardedPoints / r.maxPoints) : 0;
                          const isExpanded = !!expandedCriteria[idx];

                          return (
                            <div
                              key={idx}
                              className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 overflow-hidden shadow-xs"
                            >
                              <div 
                                onClick={() => toggleCriteria(idx)}
                                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800 transition-colors"
                              >
                                <div className="space-y-1.5 flex-1 pr-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs sm:text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                                      Tiêu chí {idx + 1}: {r.criterion}
                                    </span>
                                    <span className={`text-xs font-bold ${isDeducted ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                      {r.awardedPoints} / {r.maxPoints} đ
                                    </span>
                                  </div>

                                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-750 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        ratio >= 0.8
                                          ? 'bg-emerald-500'
                                          : ratio >= 0.4
                                          ? 'bg-amber-400'
                                          : 'bg-red-400'
                                      }`}
                                      style={{ width: `${Math.max(4, ratio * 100)}%` }}
                                    />
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" strokeWidth={1.5} />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                                  )}
                                </button>
                              </div>

                              {isExpanded && (
                                <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/30 text-xs sm:text-[13px]">
                                  <div className={`p-2.5 rounded-lg border text-slate-800 dark:text-slate-200 leading-relaxed ${
                                    isDeducted 
                                      ? 'bg-amber-50/60 border-amber-200/70 text-amber-900 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-200' 
                                      : 'bg-emerald-50/40 border-emerald-200/60 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-200'
                                  }`}>
                                    <div className="flex items-start space-x-2">
                                      {isDeducted ? (
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" strokeWidth={1.5} />
                                      ) : (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" strokeWidth={1.5} />
                                      )}
                                      <span className="text-xs sm:text-[13px] leading-relaxed">
                                        {r.comment}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* NÚT CTA CỐ ĐỊNH Ở ĐÁY CỘT PHẢI */}
                  <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setGradingResult(null)}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center space-x-1.5 transition-colors cursor-pointer py-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Làm lại bài tập</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('solution')}
                      className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-indigo-200" strokeWidth={1.5} />
                      <span>Xem Lời Giải Chuẩn Của Chuyên Gia</span>
                    </button>
                  </div>

                </div>
              )}
            </div>

          </div>
        ) : (
          /* ─── [TAB 2: LỜI GIẢI CHUẨN KÈM FORM ĐÁP ÁN & BAREM CỦA CHUYÊN GIA] ─── */
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80 dark:divide-slate-800">
            
            {/* Cột trái: Barem điểm chính thức */}
            <div className="lg:col-span-4 flex flex-col h-full overflow-y-auto p-5 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                BAREM CHẤM ĐIỂM CHUẨN (Thang 10.0)
              </span>

              <div className="space-y-3">
                {currentCase.rubric?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 space-y-1.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-slate-100">
                      <span>Tiêu chí {idx + 1}</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded text-xs">
                        {item.max_points} đ
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-[13px] leading-relaxed font-normal">
                      {item.criterion}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cột phải: Form đáp án chuẩn kèm Lời giải chi tiết Zero-Hallucination */}
            <div className="lg:col-span-8 flex flex-col h-full overflow-y-auto p-5 bg-white dark:bg-slate-900 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  LỜI GIẢI CHI TIẾT & BẢNG KÊ KHAI ĐÁP ÁN CHUẨN
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Đáp án Chuyên gia Zero-Hallucination</span>
                </span>
              </div>

              {/* ─── BẢNG ĐÁP ÁN MẪU PRE-FILLED CỦA CHUYÊN GIA ─────────────── */}
              <div className="p-4 rounded-xl border border-indigo-200/90 dark:border-indigo-900/60 bg-indigo-50/25 dark:bg-indigo-950/15 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/40 pb-2">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" strokeWidth={1.5} />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Bảng Kê Khai Số Liệu Điền Mẫu Chuẩn (Expert Worksheet)
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60">
                    10.0 / 10.0 Điểm Chuẩn
                  </span>
                </div>

                {/* Nội dung đáp án mẫu động theo category */}
                {currentCase.category === 'multi_tax_trade_defense' ? (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[11px] text-slate-500 block">Đơn giá CIF:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">650 USD/tấn</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[11px] text-slate-500 block">Khối lượng:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">100 tấn</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[11px] text-slate-500 block">Tổng CIF:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">65,000 USD</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[11px] text-slate-500 block">Tỷ giá:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">25,450 VNĐ/USD</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 col-span-full">
                        <span className="text-[11px] text-blue-700 font-medium block">Trị giá tính thuế Hải quan (V_NK):</span>
                        <span className="font-mono font-bold text-blue-900 text-sm">65,000 USD × 25,450 = 1,654,250,000 VNĐ</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 space-y-1">
                        <span className="text-slate-500 block">1. Thuế Nhập khẩu (Form E 0%):</span>
                        <span className="font-mono font-bold text-slate-900">0 VNĐ</span>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-1">
                        <span className="text-amber-800 block">2. Thuế Chống bán phá giá (AD 15%):</span>
                        <span className="font-mono font-bold text-amber-900">248,137,500 VNĐ</span>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 space-y-1">
                        <span className="text-slate-500 block">3. Trị giá tính thuế GTGT (V_VAT):</span>
                        <span className="font-mono font-bold text-slate-900">1,902,387,500 VNĐ</span>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 space-y-1">
                        <span className="text-slate-500 block">4. Thuế GTGT (VAT 10%):</span>
                        <span className="font-mono font-bold text-slate-900">190,238,750 VNĐ</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50 border-2 border-emerald-300 flex items-center justify-between">
                      <span className="font-bold text-emerald-900">⭐ TỔNG SỐ THUẾ DOANH NGHIỆP PHẢI NỘP:</span>
                      <span className="font-mono font-bold text-base text-emerald-800">438,376,250 VNĐ</span>
                    </div>
                  </div>
                ) : currentCase.category === 'post_clearance_audit_penalties' ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                      <span className="text-[11px] text-blue-700 font-medium block">Trị giá tính thuế (200 Smart Tivi):</span>
                      <span className="font-mono font-bold text-blue-900">763,500,000 VNĐ</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                        <span className="text-slate-500 block">Thuế NK truy thu (15%):</span>
                        <span className="font-mono font-bold">114,525,000 VNĐ</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                        <span className="text-slate-500 block">Thuế GTGT truy thu (10%):</span>
                        <span className="font-mono font-bold">11,452,500 VNĐ</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                        <span className="text-amber-800 block">Tiền chậm nộp (60 ngày × 0.03%):</span>
                        <span className="font-mono font-bold text-amber-900">2,267,595 VNĐ</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-red-50 border border-red-200">
                        <span className="text-red-800 block">Phạt khai sai 20% (NĐ 128):</span>
                        <span className="font-mono font-bold text-red-900">25,195,500 VNĐ</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-50 border-2 border-purple-300 flex items-center justify-between">
                      <span className="font-bold text-purple-900">⭐ TỔNG SỐ TIỀN PHẢI NỘP VÀO NSNN:</span>
                      <span className="font-mono font-bold text-base text-purple-800">153,440,595 VNĐ</span>
                    </div>
                  </div>
                ) : (
                  // Default: valuation_incoterms
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200">
                        <span className="text-[11px] text-slate-500 block">Trị giá FOB:</span>
                        <span className="font-mono font-bold">240,000 USD</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200">
                        <span className="text-[11px] text-slate-500 block">Cước F:</span>
                        <span className="font-mono font-bold">2,500 USD</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200">
                        <span className="text-[11px] text-slate-500 block">Bảo hiểm I:</span>
                        <span className="font-mono font-bold">350 USD</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200">
                        <span className="text-[11px] text-slate-500 block">Điều chỉnh cộng (Hoa hồng):</span>
                        <span className="font-mono font-bold">800 USD</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200">
                        <span className="text-[11px] text-slate-500 block">Điều chỉnh trừ:</span>
                        <span className="font-mono font-bold text-emerald-600">0 USD (Không trừ 500)</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200">
                        <span className="text-[11px] text-slate-500 block">Tỷ giá:</span>
                        <span className="font-mono font-bold">25,450 VNĐ/USD</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 col-span-1 sm:col-span-2">
                        <span className="text-[11px] text-blue-700 font-medium block">Trị giá Hải quan & V_NK:</span>
                        <span className="font-mono font-bold text-blue-900">243,650 USD = 6,200,892,500 VNĐ</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                      <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1 font-mono">
                        <div className="font-bold text-emerald-800 font-sans border-b border-emerald-200 pb-1">Trường hợp sử dụng C/O Form VJ</div>
                        <div className="flex justify-between"><span className="text-slate-600 font-sans">Thuế NK (0%):</span><span className="font-bold">0 VNĐ</span></div>
                        <div className="flex justify-between"><span className="text-slate-600 font-sans">Thuế GTGT (10%):</span><span className="font-bold">620,089,250 VNĐ</span></div>
                        <div className="flex justify-between pt-1 border-t border-emerald-200 text-emerald-800 font-bold"><span className="font-sans">Tổng thuế:</span><span>620,089,250 VNĐ</span></div>
                      </div>

                      <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 space-y-1 font-mono">
                        <div className="font-bold text-amber-800 font-sans border-b border-amber-200 pb-1">Trường hợp mất C/O (Áp thuế MFN)</div>
                        <div className="flex justify-between"><span className="text-slate-600 font-sans">Thuế NK (5%):</span><span className="font-bold">310,044,625 VNĐ</span></div>
                        <div className="flex justify-between"><span className="text-slate-600 font-sans">Thuế GTGT (10%):</span><span className="font-bold">651,093,713 VNĐ</span></div>
                        <div className="flex justify-between pt-1 border-t border-amber-200 text-amber-800 font-bold"><span className="font-sans">Tổng thuế:</span><span>961,138,338 VNĐ</span></div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 flex items-center justify-between">
                      <span className="font-bold text-purple-900">⭐ Tiền thuế chênh lệch tiết kiệm được (MFN - Form VJ):</span>
                      <span className="font-mono font-bold text-sm text-purple-700">341,049,088 VNĐ</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ─── LỜI GIẢI CHI TIẾT & CĂN CỨ PHÁP LÝ ─────────────────────── */}
              {currentCase.solution && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 shadow-xs">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block tracking-normal">
                      1. Phân tích phương pháp & Căn cứ pháp lý:
                    </span>
                    <div className="text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed text-xs sm:text-[13px] pl-3.5 border-l-4 border-indigo-500 font-normal">
                      {currentCase.solution.analysis}
                    </div>
                  </div>

                  {currentCase.solution.step_by_step_math && (
                    <div className="p-4 rounded-xl bg-blue-50/30 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-2.5 shadow-xs">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block tracking-normal">
                        2. Các bước tính toán số học chuẩn xác:
                      </span>
                      <div className="space-y-2 text-xs sm:text-[13px] text-slate-900 dark:text-slate-100 pl-3.5 border-l-4 border-emerald-500 font-mono leading-relaxed bg-white dark:bg-slate-900/70 p-3.5 rounded-lg border border-slate-200/70 dark:border-slate-800 shadow-2xs">
                        {currentCase.solution.step_by_step_math.map((step, idx) => (
                          <p key={idx} className="py-0.5 tracking-normal font-medium">{step}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentCase.solution.legal_citations && (
                    <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 shadow-xs">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block tracking-normal">
                        3. Viện dẫn các văn bản quy phạm pháp luật:
                      </span>
                      <ul className="list-disc list-inside text-slate-800 dark:text-slate-200 space-y-1.5 text-xs sm:text-[13px] pl-2 leading-relaxed font-normal">
                        {currentCase.solution.legal_citations.map((cit, idx) => (
                          <li key={idx}>{cit}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── [FOOTER (DƯỚI CÙNG)] ───────────────────────────────────── */}
        <div className="px-6 py-2.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
            <span>LogiChat Customs Reasoning & Evaluation Engine • Chấm điểm Barem tự động</span>
            <span>•</span>
            <span className="flex items-center space-x-1 text-slate-500">
              <Clock className="w-3 h-3" strokeWidth={1.5} />
              <span>6:29 CH 03/09/2026</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
