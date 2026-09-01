import React from 'react';
import { TaxCalculationResult } from '../../shared/types';
import { 
  X, 
  Calculator, 
  Printer, 
  CheckCircle, 
  ShieldCheck, 
  FileText,
  Building,
  Scales
} from '@phosphor-icons/react';

interface TaxEstimatorModalProps {
  taxData: TaxCalculationResult | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaxEstimatorModal: React.FC<TaxEstimatorModalProps> = ({
  taxData,
  isOpen,
  onClose
}) => {
  if (!isOpen || !taxData) return null;

  const formatVND = (val: number) => {
    return `${Math.round(val).toLocaleString('vi-VN')} VNĐ`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner">
              <Calculator size={22} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded bg-white text-blue-800 tracking-wider">
                  BẢNG KÊ THUẾ XNK
                </span>
                <span className="text-xs text-blue-200">Mã HS: {taxData.hsCode}</span>
              </div>
              <h3 className="text-base font-bold line-clamp-1 leading-snug">{taxData.productName}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="In bản dự toán"
            >
              <Printer size={18} weight="bold" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Đóng"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Commodity Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5">Mã số HS:</span>
              <strong className="text-sm font-bold text-blue-600 font-mono">{taxData.hsCode}</strong>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Quy mô hàng hóa:</span>
              <strong className="text-sm font-bold text-slate-800">{taxData.quantity.toLocaleString('vi-VN')} {taxData.unit}</strong>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Đơn giá khai báo:</span>
              <strong className="text-sm font-bold text-slate-800">{taxData.unitPrice.toLocaleString('vi-VN')} {taxData.currency}</strong>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">C/O Áp dụng:</span>
              <strong className="text-sm font-bold text-emerald-700">{taxData.coForm}</strong>
            </div>
          </div>

          {/* Section 2: Full Itemized Calculation Sheet */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
              <Scales size={16} className="text-blue-600" /> Bảng tính toán các khoản thuế & lệ phí hải quan
            </h4>
            <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs">
              <div className="grid grid-cols-12 bg-slate-100/90 px-4 py-2.5 font-bold text-slate-700 border-b border-slate-200">
                <div className="col-span-4">Khoản mục tính thuế</div>
                <div className="col-span-4">Công thức / Căn cứ tính</div>
                <div className="col-span-4 text-right">Thành tiền (VNĐ)</div>
              </div>

              {/* 1. Trị giá tính thuế NK */}
              <div className="grid grid-cols-12 px-4 py-3 border-b border-slate-100 items-center">
                <div className="col-span-4 font-semibold text-slate-800">
                  1. Trị giá Hải quan (V_NK)
                </div>
                <div className="col-span-4 text-slate-500">
                  {taxData.cifForeign.toLocaleString('vi-VN')} {taxData.currency} × {taxData.exchangeRate.toLocaleString('vi-VN')} đ
                </div>
                <div className="col-span-4 text-right font-bold text-slate-900">
                  {formatVND(taxData.vNk)}
                </div>
              </div>

              {/* 2. Thuế Nhập khẩu */}
              <div className="grid grid-cols-12 px-4 py-3 border-b border-slate-100 items-center bg-blue-50/30">
                <div className="col-span-4 font-semibold text-blue-900">
                  2. Thuế Nhập khẩu ({taxData.importTaxRate}%)
                  <p className="text-[11px] text-slate-500 font-normal">{taxData.importTaxLabel}</p>
                </div>
                <div className="col-span-4 text-slate-500">
                  {formatVND(taxData.vNk)} × {taxData.importTaxRate}%
                </div>
                <div className="col-span-4 text-right font-bold text-blue-700">
                  {formatVND(taxData.tNk)}
                </div>
              </div>

              {/* 3. Thuế TTĐB */}
              {taxData.ttdbRate > 0 && (
                <div className="grid grid-cols-12 px-4 py-3 border-b border-slate-100 items-center bg-amber-50/40">
                  <div className="col-span-4 font-semibold text-amber-900">
                    3. Thuế Tiêu thụ đặc biệt ({taxData.ttdbRate}%)
                  </div>
                  <div className="col-span-4 text-slate-500">
                    (V_NK + T_NK) × {taxData.ttdbRate}%
                  </div>
                  <div className="col-span-4 text-right font-bold text-amber-900">
                    {formatVND(taxData.tTtdb)}
                  </div>
                </div>
              )}

              {/* 4. Thuế BVMT */}
              {taxData.tBvmt > 0 && (
                <div className="grid grid-cols-12 px-4 py-3 border-b border-slate-100 items-center bg-emerald-50/40">
                  <div className="col-span-4 font-semibold text-emerald-900">
                    4. Thuế Bảo vệ Môi trường
                  </div>
                  <div className="col-span-4 text-slate-500">
                    {taxData.quantity.toLocaleString('vi-VN')} {taxData.unit} × {taxData.bvmtRate} đ
                  </div>
                  <div className="col-span-4 text-right font-bold text-emerald-900">
                    {formatVND(taxData.tBvmt)}
                  </div>
                </div>
              )}

              {/* 5. Thuế GTGT */}
              <div className="grid grid-cols-12 px-4 py-3 border-b border-slate-100 items-center bg-purple-50/30">
                <div className="col-span-4 font-semibold text-purple-900">
                  5. Thuế Giá trị gia tăng ({taxData.vatRate}%)
                </div>
                <div className="col-span-4 text-slate-500">
                  Trị giá tính VAT ({formatVND(taxData.vVat)}) × {taxData.vatRate}%
                </div>
                <div className="col-span-4 text-right font-bold text-purple-800">
                  {formatVND(taxData.tVat)}
                </div>
              </div>

              {/* Total Row */}
              <div className="grid grid-cols-12 px-4 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold items-center">
                <div className="col-span-8 text-sm">
                  💰 TỔNG CỘNG TIỀN THUẾ PHẢI NỘP:
                </div>
                <div className="col-span-4 text-right text-base font-extrabold">
                  {formatVND(taxData.totalTax)}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Legal Basis & GIR Rules */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText size={16} className="text-blue-600" /> Căn cứ pháp lý & Hướng dẫn phân loại hàng hóa
            </h4>
            
            {taxData.girRule && (
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-slate-700 leading-relaxed">
                <strong className="text-blue-800 block mb-1">Quy tắc phân loại tổng quát (GIR):</strong>
                {taxData.girRule}
              </div>
            )}

            {taxData.importConditions && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
                <strong className="text-amber-800 block mb-1">Kiểm tra chuyên ngành & Điều kiện thông quan:</strong>
                {taxData.importConditions}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Building size={14} />
              <span>Văn bản pháp lý áp dụng: <strong className="text-slate-700">{taxData.legalReference}</strong></span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
          <span className="text-slate-500 flex items-center gap-1">
            <ShieldCheck size={16} className="text-emerald-600" weight="fill" />
            Dữ liệu tra cứu bám sát biểu thuế XNK hiện hành
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
