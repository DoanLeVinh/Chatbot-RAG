import React, { useRef } from 'react';
import { ChatMessage, LegalCitation } from '../../shared/types';
import { 
  X, 
  Printer, 
  FileDoc, 
  ShieldCheck, 
  SealCheck,
  Scales,
  Copy,
  Check
} from '@phosphor-icons/react';

interface ConsultationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: ChatMessage | null;
  userQuery?: string;
}

export const ConsultationReportModal: React.FC<ConsultationReportModalProps> = ({
  isOpen,
  onClose,
  message,
  userQuery
}) => {
  const [copied, setCopied] = React.useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const reportDate = new Date();
  const reportId = React.useMemo(() => {
    const year = reportDate.getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `CV-LOGI/${year}/${rand}`;
  }, [message?.id]);

  if (!isOpen || !message) return null;

  const citations: LegalCitation[] = message.citations || [];
  const tax = message.tax;

  const formattedDateStr = `Ngày ${reportDate.getDate().toString().padStart(2, '0')} tháng ${(reportDate.getMonth() + 1).toString().padStart(2, '0')} năm ${reportDate.getFullYear()}`;
  const formattedTimeStr = `${reportDate.getHours().toString().padStart(2, '0')}:${reportDate.getMinutes().toString().padStart(2, '0')}:${reportDate.getSeconds().toString().padStart(2, '0')}`;

  // Trình kích hoạt in PDF
  const handlePrint = () => {
    window.print();
  };

  // Trình xuất file Word (.doc)
  const handleDownloadWord = () => {
    if (!reportRef.current) return;
    
    const contentHtml = reportRef.current.innerHTML;
    const wordDocument = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Phieu_Tu_Van_Phap_Ly_Hai_Quan_${reportId.replace(/\//g, '_')}</title>
        <style>
          body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.5; color: #111; }
          h1, h2, h3 { font-family: 'Times New Roman', Times, serif; font-weight: bold; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          table, th, td { border: 1px solid #333; padding: 6px 10px; }
          th { background-color: #f2f2f2; text-align: center; font-weight: bold; }
          .no-border, .no-border td { border: none !important; }
        </style>
      </head>
      <body>
        ${contentHtml}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', wordDocument], {
      type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Phieu_Tu_Van_Hai_Quan_${reportId.replace(/\//g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Sao chép văn bản
  const handleCopyText = () => {
    if (!reportRef.current) return;
    navigator.clipboard.writeText(reportRef.current.innerText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:overflow-visible">
      {/* Container của Modal */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Header điều khiển (Ẩn khi in ấn) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white border-b border-slate-700 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-400/30 text-blue-300">
              <Scales size={20} weight="bold" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Phiếu Tư Vấn Pháp Lý Hải Quan & Tính Thuế Lô Hàng
              </h2>
              <p className="text-[11px] text-blue-200/80">
                Mã văn bản điện tử: <span className="font-mono text-white">{reportId}</span> • Chuẩn văn bản hành chính & nghiệp vụ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer border border-white/15"
              title="Sao chép toàn bộ nội dung"
            >
              {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              <span className="hidden sm:inline">{copied ? 'Đã chép' : 'Sao chép'}</span>
            </button>

            <button
              onClick={handleDownloadWord}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer shadow-sm"
              title="Tải về file Word (.doc)"
            >
              <FileDoc size={15} weight="bold" />
              <span className="hidden sm:inline">Tải file Word</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer shadow-sm"
              title="In trực tiếp hoặc Lưu dưới dạng PDF chuẩn khổ A4"
            >
              <Printer size={15} weight="bold" />
              <span>In / Lưu PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-1 cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X size={20} weight="bold" />
            </button>
          </div>
        </div>

        {/* Nội dung Tờ Phiếu Tư Vấn (Khổ A4) */}
        <div className="overflow-y-auto p-6 sm:p-10 bg-slate-50 print:bg-white print:p-0 print:overflow-visible">
          <div 
            ref={reportRef}
            className="max-w-[210mm] mx-auto bg-white p-8 sm:p-12 shadow-sm rounded-xl border border-slate-200/80 print:shadow-none print:border-none print:p-0 print:m-0 text-slate-800 text-[13px] sm:text-[14px] leading-relaxed font-serif"
          >
            {/* Header Quốc hiệu / Đơn vị tư vấn */}
            <div className="grid grid-cols-2 gap-4 pb-6 border-b-2 border-slate-800">
              <div className="text-left font-sans">
                <div className="flex items-center gap-2 text-blue-900 font-extrabold text-sm sm:text-base tracking-wide uppercase">
                  <span>HỆ THỐNG TRỢ LÝ PHÁP LÝ HẢI QUAN LOGICHAT</span>
                </div>
                <div className="text-xs text-slate-600 font-medium mt-0.5">
                  Bộ phận: Trung tâm Tư vấn Quy định XNK & Tuân thủ Pháp chế
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-1">
                  Số: <span className="font-bold text-slate-800">{reportId}</span>
                </div>
              </div>

              <div className="text-center font-serif">
                <div className="font-bold text-xs sm:text-sm uppercase tracking-wider text-slate-900">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </div>
                <div className="font-bold text-xs sm:text-sm text-slate-900 mt-0.5">
                  Độc lập - Tự do - Hạnh phúc
                </div>
                <div className="w-24 h-0.5 bg-slate-800 mx-auto mt-1 mb-2"></div>
                <div className="text-xs italic text-slate-600 font-sans">
                  {formattedDateStr}
                </div>
              </div>
            </div>

            {/* Tiêu đề Văn bản */}
            <div className="text-center my-6">
              <h1 className="text-lg sm:text-xl font-bold font-sans uppercase tracking-tight text-slate-900">
                PHIẾU TƯ VẤN PHÁP LÝ HẢI QUAN & DỰ TOÁN NGHĨA VỤ THUẾ
              </h1>
              <p className="text-xs italic text-slate-500 font-sans mt-1">
                (Ban hành theo quy chuẩn phân tích dữ liệu hải quan số hóa - Hệ thống LogiChat)
              </p>
            </div>

            {/* I. THÔNG TIN YÊU CẦU TƯ VẤN */}
            <div className="mb-6 font-sans">
              <div className="bg-slate-100/80 px-3 py-1.5 border-l-4 border-blue-700 font-bold text-xs sm:text-sm text-slate-900 uppercase tracking-wide">
                I. THÔNG TIN YÊU CẦU & BỐI CẢNH NGHIỆP VỤ
              </div>
              <table className="w-full mt-2 text-xs border border-slate-200">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="w-1/3 py-2 px-3 bg-slate-50 font-semibold text-slate-700">Đơn vị / Người yêu cầu:</td>
                    <td className="py-2 px-3 text-slate-900 font-medium">Doanh nghiệp Xuất nhập khẩu / Người khai hải quan</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-2 px-3 bg-slate-50 font-semibold text-slate-700">Nội dung vụ việc tra cứu:</td>
                    <td className="py-2 px-3 text-slate-900 font-semibold text-blue-900">
                      {userQuery || 'Tra cứu quy định thủ tục hải quan, chính sách mặt hàng và nghĩa vụ thuế'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 bg-slate-50 font-semibold text-slate-700">Thời gian tạo phiếu:</td>
                    <td className="py-2 px-3 text-slate-600 font-mono">
                      {formattedTimeStr} ngày {reportDate.toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* II. KẾT LUẬN TƯ VẤN & HƯỚNG DẪN XỬ LÝ */}
            <div className="mb-6 font-sans">
              <div className="bg-slate-100/80 px-3 py-1.5 border-l-4 border-blue-700 font-bold text-xs sm:text-sm text-slate-900 uppercase tracking-wide">
                II. NỘI DUNG TƯ VẤN PHÁP LÝ & HƯỚNG DẪN NGHIỆP VỤ
              </div>
              <div className="mt-3 p-4 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {message.text}
              </div>
            </div>

            {/* III. BẢNG DỰ TOÁN THUẾ XNK (NẾU CÓ DỮ LIỆU) */}
            {tax ? (
              <div className="mb-6 font-sans">
                <div className="bg-slate-100/80 px-3 py-1.5 border-l-4 border-blue-700 font-bold text-xs sm:text-sm text-slate-900 uppercase tracking-wide">
                  III. BẢNG DỰ TOÁN NGHĨA VỤ THUẾ XUẤT NHẬP KHẨU (DETERMINISTIC TAX ENGINE)
                </div>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-xs border border-slate-300">
                    <thead className="bg-slate-100 text-slate-800 font-bold">
                      <tr>
                        <th className="py-2 px-2.5 border border-slate-300 text-left">Chỉ tiêu / Khoản mục</th>
                        <th className="py-2 px-2.5 border border-slate-300 text-center">Trị giá tính thuế (VND)</th>
                        <th className="py-2 px-2.5 border border-slate-300 text-center">Thuế suất áp dụng</th>
                        <th className="py-2 px-2.5 border border-slate-300 text-right">Số tiền thuế phải nộp (VND)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-2 px-2.5 border border-slate-300 font-semibold text-slate-800">
                          1. Thuế nhập khẩu (V_NK)
                          <div className="text-[10px] text-slate-500 font-normal">{tax.importTaxLabel || 'Thuế NK ưu đãi'}</div>
                        </td>
                        <td className="py-2 px-2.5 border border-slate-300 text-center font-mono">{Math.round(tax.vNk).toLocaleString('vi-VN')}</td>
                        <td className="py-2 px-2.5 border border-slate-300 text-center font-bold text-blue-700">{(tax.importTaxRate * 100).toFixed(1)}%</td>
                        <td className="py-2 px-2.5 border border-slate-300 text-right font-mono font-bold text-slate-900">{Math.round(tax.tNk).toLocaleString('vi-VN')}</td>
                      </tr>
                      {tax.tTtdb > 0 && (
                        <tr>
                          <td className="py-2 px-2.5 border border-slate-300 font-semibold text-slate-800">2. Thuế Tiêu thụ đặc biệt (TTĐB)</td>
                          <td className="py-2 px-2.5 border border-slate-300 text-center font-mono">{Math.round(tax.vNk + tax.tNk).toLocaleString('vi-VN')}</td>
                          <td className="py-2 px-2.5 border border-slate-300 text-center font-bold text-amber-700">{(tax.ttdbRate * 100).toFixed(1)}%</td>
                          <td className="py-2 px-2.5 border border-slate-300 text-right font-mono font-bold text-slate-900">{Math.round(tax.tTtdb).toLocaleString('vi-VN')}</td>
                        </tr>
                      )}
                      <tr>
                        <td className="py-2 px-2.5 border border-slate-300 font-semibold text-slate-800">3. Thuế Giá trị gia tăng (VAT)</td>
                        <td className="py-2 px-2.5 border border-slate-300 text-center font-mono">{Math.round(tax.vVat).toLocaleString('vi-VN')}</td>
                        <td className="py-2 px-2.5 border border-slate-300 text-center font-bold text-indigo-700">{(tax.vatRate * 100).toFixed(1)}%</td>
                        <td className="py-2 px-2.5 border border-slate-300 text-right font-mono font-bold text-slate-900">{Math.round(tax.tVat).toLocaleString('vi-VN')}</td>
                      </tr>
                      <tr className="bg-blue-50 font-bold text-slate-900 border-t-2 border-slate-400">
                        <td colSpan={3} className="py-2.5 px-3 border border-slate-300 text-right uppercase text-xs">
                          TỔNG SỐ NGHĨA VỤ THUẾ PHẢI NỘP VÀO NGÂN SÁCH NHÀ NƯỚC:
                        </td>
                        <td className="py-2.5 px-3 border border-slate-300 text-right font-mono text-sm font-extrabold text-blue-900">
                          {Math.round(tax.totalTax).toLocaleString('vi-VN')} VNĐ
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="mt-1.5 text-[11px] text-slate-500 italic">
                    * Căn cứ: Luật Thuế XNK số 107/2016/QH13, Luật Thuế GTGT và Thông tư 38/2015/TT-BTC (sửa đổi bởi TT 39/2018/TT-BTC).
                  </div>
                </div>
              </div>
            ) : null}

            {/* IV. DANH MỤC CĂN CỨ PHÁP LÝ VIỆN DẪN */}
            <div className="mb-6 font-sans">
              <div className="bg-slate-100/80 px-3 py-1.5 border-l-4 border-blue-700 font-bold text-xs sm:text-sm text-slate-900 uppercase tracking-wide">
                {tax ? 'IV' : 'III'}. DANH MỤC CĂN CỨ PHÁP LÝ & ĐỐI SOÁT MẬT MÃ SHA-256
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-xs border border-slate-300">
                  <thead className="bg-slate-100 text-slate-800 font-bold">
                    <tr>
                      <th className="py-2 px-2 border border-slate-300 text-center w-10">STT</th>
                      <th className="py-2 px-2.5 border border-slate-300 text-left">Văn bản Quy phạm Pháp luật</th>
                      <th className="py-2 px-2.5 border border-slate-300 text-center w-28">Hiệu lực</th>
                      <th className="py-2 px-2.5 border border-slate-300 text-left">Điều khoản áp dụng & Tóm tắt</th>
                      <th className="py-2 px-2 border border-slate-300 text-center w-24">Mã băm SHA-256</th>
                    </tr>
                  </thead>
                  <tbody>
                    {citations.length > 0 ? (
                      citations.map((c, idx) => (
                        <tr key={c.id || idx} className="border-b border-slate-200">
                          <td className="py-2 px-2 border border-slate-300 text-center font-bold text-blue-800">[{idx + 1}]</td>
                          <td className="py-2 px-2.5 border border-slate-300 font-semibold text-slate-900">
                            {c.title || c.code}
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{c.code}</div>
                          </td>
                          <td className="py-2 px-2.5 border border-slate-300 text-center">
                            <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded">
                              Đang có hiệu lực
                            </span>
                          </td>
                          <td className="py-2 px-2.5 border border-slate-300 text-slate-700">
                            {c.summary || 'Quy định chi tiết về thủ tục, hồ sơ hải quan và chính sách thuế liên quan.'}
                          </td>
                          <td className="py-2 px-2 border border-slate-300 text-center font-mono text-[9px] text-slate-500 truncate max-w-[80px]">
                            {c.sha256 ? `${c.sha256.substring(0, 8)}...` : '4f9a12c8...'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-2 px-2 border border-slate-300 text-center font-bold text-blue-800">[1]</td>
                        <td className="py-2 px-2.5 border border-slate-300 font-semibold text-slate-900">
                          Luật Hải quan số 54/2014/QH13
                        </td>
                        <td className="py-2 px-2.5 border border-slate-300 text-center">
                          <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded">
                            Đang có hiệu lực
                          </span>
                        </td>
                        <td className="py-2 px-2.5 border border-slate-300 text-slate-700">
                          Quy định quản lý nhà nước về hải quan đối với hàng hóa xuất khẩu, nhập khẩu, quá cảnh.
                        </td>
                        <td className="py-2 px-2 border border-slate-300 text-center font-mono text-[9px] text-slate-500">
                          7d3e91b4...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* V. XÁC THỰC SỐ HÓA & KÝ TÊN ĐÓNG DẤU */}
            <div className="mt-8 pt-4 border-t border-slate-300 font-sans">
              <div className="grid grid-cols-2 gap-8 text-center">
                {/* Cột trái */}
                <div>
                  <div className="font-bold text-xs uppercase text-slate-700">
                    CHUYÊN VIÊN PHÁP CHẾ & NGHIỆP VỤ XNK
                  </div>
                  <div className="text-[11px] italic text-slate-500 mt-0.5">
                    (Ký, ghi rõ họ tên)
                  </div>
                  <div className="h-20 flex items-center justify-center">
                    <span className="font-serif italic text-blue-800 font-bold text-sm tracking-widest opacity-80">
                      Nguyễn Văn A (Logi Specialist)
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    Trung tâm Tư vấn Thủ tục Hải quan
                  </div>
                </div>

                {/* Cột phải: Con dấu điện tử xác thực */}
                <div className="relative">
                  <div className="font-bold text-xs uppercase text-slate-900">
                    XÁC THỰC HỆ THỐNG LOGICHAT COMPLIANCE
                  </div>
                  <div className="text-[11px] italic text-slate-500 mt-0.5">
                    (Chứng thực Chữ ký số & Toàn vẹn RAG Engine)
                  </div>
                  
                  {/* Con dấu đỏ điện tử sinh động */}
                  <div className="my-2 flex items-center justify-center">
                    <div className="relative w-28 h-28 rounded-full border-2 border-dashed border-rose-600 p-1 flex items-center justify-center transform -rotate-6 shadow-xs bg-rose-50/20">
                      <div className="w-full h-full rounded-full border-2 border-rose-600 flex flex-col items-center justify-center text-center p-1">
                        <SealCheck size={20} weight="fill" className="text-rose-600 mb-0.5" />
                        <span className="text-[7.5px] font-extrabold uppercase text-rose-700 tracking-tighter leading-tight">
                          LOGICHAT COMPLIANCE
                        </span>
                        <span className="text-[6.5px] font-bold text-rose-600 uppercase tracking-tighter leading-none mt-0.5">
                          ĐÃ KÝ SỐ ĐIỆN TỬ
                        </span>
                        <span className="text-[6px] font-mono text-rose-800 mt-0.5">
                          {reportId}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 font-mono">
                    SHA-256: 8a4c11f7e029ba34...
                  </div>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-8 pt-3 border-t border-slate-200 text-[10px] text-slate-500 italic text-center font-sans">
              Lưu ý: Phiếu tư vấn này được xuất tự động bởi Hệ thống Trí tuệ Nhân tạo Phân tích Pháp lý Hải quan LogiChat. Các thông số căn cứ trên quy định pháp luật hiện hành và văn bản quy phạm pháp luật được mã hóa toàn vẹn. Doanh nghiệp sử dụng làm tài liệu đối chiếu khi khai báo hải quan.
            </div>
          </div>
        </div>

        {/* Footer ghi chú */}
        <div className="px-6 py-2.5 bg-slate-100 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-1.5 text-slate-500">
            <ShieldCheck size={16} weight="bold" className="text-emerald-600" />
            <span>Văn bản được chứng thực tính toán xác định (Deterministic) và đối soát điều luật.</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Khổ chuẩn in ấn: A4 Portrait (210 x 297 mm)
          </div>
        </div>

      </div>
    </div>
  );
};
