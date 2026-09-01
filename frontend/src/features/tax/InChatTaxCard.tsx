import React, { useState } from 'react';
import { TaxCalculationResult } from '../../shared/types';
import { 
  Calculator, 
  ArrowsClockwise, 
  ShieldWarning, 
  Info, 
  FileText, 
  Sparkle,
  TrendUp
} from '@phosphor-icons/react';

interface InChatTaxCardProps {
  initialTax: TaxCalculationResult;
  onOpenDetailedModal?: (taxData: TaxCalculationResult) => void;
}

export const InChatTaxCard: React.FC<InChatTaxCardProps> = ({ 
  initialTax, 
  onOpenDetailedModal 
}) => {
  const [tax, setTax] = useState<TaxCalculationResult>(initialTax);
  const [isEditing, setIsEditing] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  // Form states
  const [quantity, setQuantity] = useState(initialTax.quantity);
  const [unitPrice, setUnitPrice] = useState(initialTax.unitPrice);
  const [currency, setCurrency] = useState(initialTax.currency);
  const [coForm, setCoForm] = useState(initialTax.coForm);
  const [exchangeRate, setExchangeRate] = useState(initialTax.exchangeRate);

  const formatVND = (val: number) => {
    return `${Math.round(val).toLocaleString('vi-VN')} VNĐ`;
  };

  const handleRecalculate = async () => {
    setIsCalculating(true);
    try {
      const resp = await fetch('/api/tariff/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hsCode: tax.hsCode,
          productName: tax.productName,
          quantity: Number(quantity) || 1,
          unitPrice: Number(unitPrice) || 0,
          currency: currency,
          coForm: coForm,
          customExchangeRate: Number(exchangeRate) || undefined
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        setTax(data);
      }
    } catch (err) {
      console.error('Failed to recalculate tax:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const coOptions = [
    { value: 'MFN', label: 'MFN (Ưu đãi tiêu chuẩn)' },
    { value: 'Form E', label: 'Form E (ACFTA - Trung Quốc)' },
    { value: 'Form VK', label: 'Form VK (VKFTA - Hàn Quốc)' },
    { value: 'Form AK', label: 'Form AK (AKFTA - Hàn Quốc)' },
    { value: 'Form D', label: 'Form D (ATIGA - ASEAN)' },
    { value: 'Form EUR.1', label: 'Form EUR.1 (EVFTA - Châu Âu)' },
    { value: 'Form CPTPP', label: 'Form CPTPP (CPTPP)' },
    { value: 'Form VJ', label: 'Form VJ (VJEPA - Nhật Bản)' },
    { value: 'Form AANZ', label: 'Form AANZ (AANZFTA - Úc/New Zealand)' },
    { value: 'GENERAL', label: 'Thuế thông thường' }
  ];

  return (
    <div className="mt-3.5 rounded-2xl bg-gradient-to-br from-blue-50/90 via-indigo-50/60 to-slate-50 border border-blue-200/90 shadow-sm overflow-hidden text-slate-800 transition-all duration-300">
      {/* Header Banner */}
      <div className="px-4 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-inner">
            <Calculator size={20} weight="bold" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white text-blue-700 tracking-wider">
                MÃ HS: {tax.hsCode}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-500/50 text-white">
                {tax.coForm === 'MFN' ? 'Biểu thuế MFN' : `Ưu đãi ${tax.coForm}`}
              </span>
            </div>
            <h4 className="text-sm font-bold mt-0.5 line-clamp-1 leading-tight">{tax.productName}</h4>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="self-start sm:self-center px-3 py-1 text-xs font-semibold rounded-lg bg-white/15 hover:bg-white/25 border border-white/30 text-white transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <ArrowsClockwise size={14} className={isCalculating ? 'animate-spin' : ''} />
          <span>{isEditing ? 'Đóng chỉnh sửa' : '✏️ Điều chỉnh số liệu'}</span>
        </button>
      </div>

      {/* Quick Parameter Tweaker Form */}
      {isEditing && (
        <div className="p-4 bg-white/80 border-b border-blue-200/70 backdrop-blur-xs animate-in fade-in duration-200">
          <p className="text-xs font-bold text-slate-700 mb-2.5 flex items-center gap-1.5">
            <Sparkle size={14} className="text-blue-600" /> Điều chỉnh tham số để máy tính tự động cập nhật:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Số lượng ({tax.unit}):</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Đơn giá ({currency}):</label>
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Loại tiền tệ:</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="CNY">CNY (¥)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="KRW">KRW (₩)</option>
                <option value="VND">VND (đ)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Chứng nhận xuất xứ (C/O):</label>
              <select
                value={coForm}
                onChange={(e) => setCoForm(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold truncate"
              >
                {coOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleRecalculate}
              disabled={isCalculating}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowsClockwise size={14} className={isCalculating ? 'animate-spin' : ''} />
              <span>{isCalculating ? 'Đang tính toán...' : 'Áp dụng & Tính lại ngay'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Breakdown Section */}
      <div className="p-4 space-y-3">
        {/* Value row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white/70 p-2.5 rounded-xl border border-slate-200/70">
          <div>
            <span className="text-slate-500">Quy mô lô hàng:</span>{' '}
            <strong className="text-slate-800">{tax.quantity.toLocaleString('vi-VN')} {tax.unit} × {tax.unitPrice.toLocaleString('vi-VN')} {tax.currency}</strong>
          </div>
          <div>
            <span className="text-slate-500">Trị giá Hải quan (V_NK):</span>{' '}
            <strong className="text-blue-700 font-bold">{formatVND(tax.vNk)}</strong>
          </div>
        </div>

        {/* Detailed Taxes Breakdown Table */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden text-xs">
          <div className="grid grid-cols-12 bg-slate-100/80 px-3 py-2 font-bold text-slate-600 border-b border-slate-200">
            <div className="col-span-6 sm:col-span-5">Loại thuế</div>
            <div className="col-span-2 text-center">Thuế suất</div>
            <div className="col-span-4 sm:col-span-5 text-right">Số tiền thuế</div>
          </div>

          {/* Thuế Nhập Khẩu */}
          <div className="grid grid-cols-12 px-3 py-2 border-b border-slate-100 items-center">
            <div className="col-span-6 sm:col-span-5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              <span className="font-semibold text-slate-800">1. Thuế Nhập khẩu</span>
            </div>
            <div className="col-span-2 text-center font-bold text-blue-600">
              {tax.importTaxRate}%
            </div>
            <div className="col-span-4 sm:col-span-5 text-right font-bold text-slate-800">
              {formatVND(tax.tNk)}
            </div>
          </div>

          {/* Thuế Tiêu thụ đặc biệt nếu có */}
          {tax.ttdbRate > 0 && (
            <div className="grid grid-cols-12 px-3 py-2 border-b border-slate-100 items-center bg-amber-50/40">
              <div className="col-span-6 sm:col-span-5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="font-semibold text-amber-900">2. Thuế TTĐB</span>
              </div>
              <div className="col-span-2 text-center font-bold text-amber-700">
                {tax.ttdbRate}%
              </div>
              <div className="col-span-4 sm:col-span-5 text-right font-bold text-amber-900">
                {formatVND(tax.tTtdb)}
              </div>
            </div>
          )}

          {/* Thuế Bảo vệ môi trường nếu có */}
          {tax.tBvmt > 0 && (
            <div className="grid grid-cols-12 px-3 py-2 border-b border-slate-100 items-center bg-emerald-50/40">
              <div className="col-span-6 sm:col-span-5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-semibold text-emerald-900">Thuế BVMT</span>
              </div>
              <div className="col-span-2 text-center font-bold text-emerald-700">
                Tuyệt đối
              </div>
              <div className="col-span-4 sm:col-span-5 text-right font-bold text-emerald-900">
                {formatVND(tax.tBvmt)}
              </div>
            </div>
          )}

          {/* Thuế GTGT */}
          <div className="grid grid-cols-12 px-3 py-2 items-center">
            <div className="col-span-6 sm:col-span-5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
              <span className="font-semibold text-slate-800">Thuế GTGT (VAT)</span>
            </div>
            <div className="col-span-2 text-center font-bold text-purple-600">
              {tax.vatRate}%
            </div>
            <div className="col-span-4 sm:col-span-5 text-right font-bold text-slate-800">
              {formatVND(tax.tVat)}
            </div>
          </div>
        </div>

        {/* Total Grand Summary Banner */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
          <div>
            <span className="text-[11px] font-medium text-emerald-100 flex items-center gap-1">
              <TrendUp size={14} weight="bold" /> TỔNG TIỀN THUẾ DỰ KIẾN PHẢI NỘP:
            </span>
            <p className="text-lg sm:text-xl font-extrabold tracking-tight mt-0.5">
              {formatVND(tax.totalTax)}
            </p>
          </div>
          {onOpenDetailedModal && (
            <button
              onClick={() => onOpenDetailedModal(tax)}
              className="px-3.5 py-1.5 rounded-lg bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <FileText size={16} weight="bold" />
              <span>Xem Bảng Kê Chi Tiết</span>
            </button>
          )}
        </div>

        {/* Legal & Inspection Warning Notes */}
        {tax.importConditions && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
            <ShieldWarning size={16} className="text-amber-600 shrink-0 mt-0.5" weight="fill" />
            <div>
              <strong className="font-bold">Kiểm tra chuyên ngành & Điều kiện thông quan:</strong> {tax.importConditions}
            </div>
          </div>
        )}

        {tax.girRule && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-50/60 text-[11px] text-slate-600">
            <Info size={14} className="text-blue-500 shrink-0 mt-0.5" weight="fill" />
            <div className="line-clamp-2">
              <span className="font-semibold text-slate-700">Căn cứ phân loại:</span> {tax.girRule}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
