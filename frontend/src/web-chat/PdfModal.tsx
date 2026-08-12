import React, { useState } from 'react';

interface PdfModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
}

export const PdfModal: React.FC<PdfModalProps> = ({
  isOpen,
  title,
  subtitle,
  onClose,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadStatus('idle');

    try {
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title,
          content: `Bản tóm tắt pháp lý: ${title}\n${subtitle || ''}\n\nI. CĂN CỨ PHÁP LÝ CHÍNH\n- Luật Hải quan số 54/2014/QH13\n- Nghị định số 119/2022/NĐ-CP (Biểu thuế AJCEP/VJEPA)\n- Thông tư số 04/2023/TT-BTTTT\n- Thông tư số 38/2015/TT-BTC sửa đổi bởi TT 39/2018/TT-BTC\n\nII. KẾT QUẢ PHÂN TÍCH THUẾ SUẤT & THỦ TỤC\n• Thuế nhập khẩu ưu đãi đặc biệt: 0%\n• Thuế giá trị gia tăng (VAT): 10%\n• Thủ tục kiểm tra chuyên ngành: Miễn giấy phép (Trừ thiết bị thu phát sóng)`,
          citations: [
            { code: 'NĐ 119/2022/NĐ-CP', title: 'Nghị định 119/2022/NĐ-CP - Biểu thuế AJCEP' },
            { code: 'TT 04/2023/TT-BTTTT', title: 'Thông tư 04/2023/TT-BTTTT - Danh mục KTCN' },
          ],
        }),
      });

      if (res.ok) {
        // Check content type to determine response format
        const contentType = res.headers.get('content-type') || '';

        if (contentType.includes('application/pdf')) {
          // Download PDF file
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `logichat_summary_${new Date().toISOString().slice(0, 10)}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          // HTML fallback — open in new tab
          const html = await res.text();
          const blob = new Blob([html], { type: 'text/html' });
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          window.URL.revokeObjectURL(url);
        }

        setDownloadStatus('success');
        setTimeout(() => {
          onClose();
          setDownloadStatus('idle');
        }, 1500);
      } else {
        setDownloadStatus('error');
      }
    } catch {
      setDownloadStatus('error');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#c5c5d3] flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-[#c5c5d3] pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 text-2xl">
              picture_as_pdf
            </span>
            <div>
              <h3 className="font-bold text-base text-[#00236f]">{title}</h3>
              {subtitle && <p className="text-xs text-[#444651]">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#444651] hover:text-[#00236f] p-1"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* PDF Simulated Viewer */}
        <div className="bg-[#faf8ff] p-6 rounded-xl border border-[#c5c5d3] space-y-4 font-mono text-xs text-[#131b2e] leading-relaxed max-h-[60vh] overflow-y-auto">
          <div className="text-center font-bold text-sm text-[#00236f] border-b pb-2">
            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            <br />
            Độc lập - Tự do - Hạnh phúc
          </div>

          <div className="font-bold uppercase text-[#00236f] text-center pt-2">
            BẢN TÓM TẮT PHÁP LÝ HẢI QUAN & THUẾ SUẤT NHẬP KHẨU
          </div>

          <p className="text-[#444651]">
            Ngày trích xuất: {new Date().toLocaleDateString('vi-VN')} | Đơn vị tư vấn: Hệ thống Trợ lý AI LogiChat Legal.
          </p>

          <div className="border p-3 rounded bg-white space-y-1">
            <div className="font-bold text-[#00236f]">I. CĂN CỨ PHÁP LÝ CHÍNH</div>
            <div>- Luật Hải quan số 54/2014/QH13</div>
            <div>- Nghị định số 119/2022/NĐ-CP (Biểu thuế AJCEP/VJEPA)</div>
            <div>- Thông tư số 04/2023/TT-BTTTT</div>
            <div>- Thông tư số 38/2015/TT-BTC sửa đổi bởi TT 39/2018/TT-BTC</div>
          </div>

          <div className="border p-3 rounded bg-white space-y-1">
            <div className="font-bold text-[#00236f]">II. KẾT QUẢ PHÂN TÍCH THUẾ SUẤT & THỦ TỤC</div>
            <div>• Thuế nhập khẩu ưu đãi đặc biệt: 0%</div>
            <div>• Thuế giá trị gia tăng (VAT): 10%</div>
            <div>• Thủ tục kiểm tra chuyên ngành: Miễn giấy phép (Trừ thiết bị thu phát sóng)</div>
          </div>

          <p className="italic text-[11px] text-[#757682]">
            * Văn bản tóm tắt này có giá trị tham khảo tư vấn theo dữ liệu văn bản quy phạm pháp luật Hải quan hiện hành.
          </p>
        </div>

        <div className="flex justify-between items-center pt-2">
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-[#00236f] text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-[#1e3a8a] transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
            >
              {isDownloading ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">sync</span>
                  Đang tạo PDF...
                </>
              ) : downloadStatus === 'success' ? (
                <>
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  Tải thành công!
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">download</span>
                  Tải về máy (.PDF)
                </>
              )}
            </button>
            {downloadStatus === 'error' && (
              <span className="text-xs text-red-600 font-medium">Lỗi tạo PDF</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="border border-[#c5c5d3] text-[#444651] px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#f2f3ff]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
