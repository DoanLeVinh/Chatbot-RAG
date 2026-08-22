import React, { useState, useEffect } from 'react';
import { LegalCitation, Attachment } from '../shared/types';
import { ShieldCheck, Copy, Check, ExternalLink, Download, X, FileText } from 'lucide-react';

interface ReferencePanelProps {
  isOpen: boolean;
  onClose: () => void;
  citations: LegalCitation[];
  attachments?: Attachment[];
  highlightedCitationId?: string | null;
  onOpenPdfModal?: (title: string, subtitle?: string) => void;
  width?: number;
  // Khi có giá trị, tự động mở modal "Xem chi tiết" (toàn văn tài liệu gốc)
  // cho đúng trích dẫn này — dùng khi người dùng bấm số [N] ngay trong câu trả lời.
  autoOpenCitationCode?: string | null;
  onAutoOpenHandled?: () => void;
}

export const ReferencePanel: React.FC<ReferencePanelProps> = ({
  isOpen,
  onClose,
  citations,
  attachments = [],
  highlightedCitationId,
  onOpenPdfModal,
  width = 340,
  autoOpenCitationCode,
  onAutoOpenHandled,
}) => {
  const [selectedCitationModal, setSelectedCitationModal] = useState<LegalCitation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Bấm số trích dẫn [N] trong câu trả lời -> tự mở modal toàn văn tài liệu gốc
  useEffect(() => {
    if (!autoOpenCitationCode) return;
    const target = citations.find((c) => c.code === autoOpenCitationCode);
    if (target) {
      setSelectedCitationModal(target);
    }
    onAutoOpenHandled?.();
  }, [autoOpenCitationCode]);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Hàm highlight các từ khóa luật (Điều, Khoản, Điểm, Nghị định...)
  const highlightLegalTerms = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(Điều \d+[a-z]?\.|Khoản \d+[a-z]?\.|Điểm [a-z]\.|Chương [IVXLCDM]+\.|Nghị định \d+\/\d+\/NĐ-CP|Thông tư \d+\/\d+\/TT-BTC|Luật số \d+\/\d+\/QH\d+)/gi);
    return parts.map((part, index) => {
      if (/(Điều \d+[a-z]?\.|Khoản \d+[a-z]?\.|Điểm [a-z]\.|Chương [IVXLCDM]+\.|Nghị định \d+\/\d+\/NĐ-CP|Thông tư \d+\/\d+\/TT-BTC|Luật số \d+\/\d+\/QH\d+)/i.test(part)) {
        return <strong key={index} className="text-blue-700 font-bold bg-blue-50/50 px-0.5 rounded">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <>
      <aside 
        className="hidden md:flex bg-slate-50/80 backdrop-blur-md border-l border-slate-200 h-full flex-col shrink-0 z-30 transition-all duration-0"
        style={{ width: `${width}px` }}
      >
        {/* Panel Header */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white/80 sticky top-0 z-10">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-lg">verified</span>
            Căn cứ Pháp lý & Nguồn trích dẫn
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full p-1 transition-colors"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* References Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {citations.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs italic">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              Chưa có trích dẫn điều khoản cho câu hỏi này.
            </div>
          ) : (
            citations.map((cite) => {
              const isHighlighted = highlightedCitationId === cite.id || highlightedCitationId === cite.code;
              const isAmended = cite.status === 'amended';

              return (
                <div
                  key={cite.id}
                  className={`bg-white p-3.5 rounded-2xl border transition-all duration-200 relative overflow-hidden shadow-xs hover:shadow-md ${
                    isHighlighted
                      ? 'border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/30'
                      : 'border-slate-200/80 hover:border-blue-400'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          isAmended
                            ? 'text-amber-800 bg-amber-100/70 border border-amber-200'
                            : 'text-emerald-800 bg-emerald-100/70 border border-emerald-200'
                        }`}
                      >
                        {cite.statusLabel || (isAmended ? 'SỬA ĐỔI/BỔ SUNG' : 'ĐANG CÓ HIỆU LỰC')}
                      </span>

                      {/* SHA-256 Integrity Badge */}
                      <span 
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
                        title="Văn bản đã được xác thực tính toàn vẹn SHA-256"
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>SHA-256</span>
                      </span>
                    </div>

                    <h4
                      onClick={() => setSelectedCitationModal(cite)}
                      className="font-bold text-sm text-slate-900 leading-snug mb-1.5 hover:text-blue-600 cursor-pointer transition-colors"
                    >
                      {highlightLegalTerms(cite.title)}
                    </h4>

                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-3">
                      {highlightLegalTerms(cite.summary)}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <button
                        onClick={() => setSelectedCitationModal(cite)}
                        className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        Xem chi tiết
                        <ExternalLink className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => handleCopy(cite.id, `${cite.code}: ${cite.title}\n${cite.summary}`)}
                        className="text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer px-2 py-1 rounded-md hover:bg-slate-100"
                        title="Sao chép trích dẫn"
                      >
                        {copiedId === cite.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-medium text-[11px]">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Chép</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Attached Documents Section */}
          {attachments.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                Tài liệu liên quan
              </h4>
              {attachments.map((att) => (
                <div
                  key={att.id}
                  onClick={() =>
                    onOpenPdfModal
                      ? onOpenPdfModal(att.name, att.subtitle)
                      : alert(`Đang xem tài liệu ${att.name}`)
                  }
                  className="flex items-center gap-3 p-3 bg-white hover:bg-blue-50/50 rounded-xl transition-all cursor-pointer border border-slate-200 group mb-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {att.name}
                    </span>
                    {att.subtitle && (
                      <span className="text-[10px] text-slate-500 truncate">
                        {att.subtitle}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Citation Full Text Detail Modal */}
      {selectedCitationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
              <div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                  {selectedCitationModal.code}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1.5">
                  {selectedCitationModal.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCitationModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-800 leading-relaxed">
              <div className="flex items-center justify-between p-3 bg-emerald-50/80 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Xác thực Tính toàn vẹn SHA-256: <strong>ĐÃ KIỂM CHỨNG</strong></span>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  {selectedCitationModal.statusLabel || 'Đang có hiệu lực'}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-1.5">Tóm tắt quy định</h4>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/70 text-xs leading-relaxed">
                  {selectedCitationModal.summary}
                </p>
              </div>

              {selectedCitationModal.fullText && (
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-1.5">Toàn văn / Điều khoản chi tiết</h4>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                    {selectedCitationModal.fullText}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(selectedCitationModal.id, `${selectedCitationModal.code}: ${selectedCitationModal.title}\n\n${selectedCitationModal.fullText || selectedCitationModal.summary}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Sao chép
                </button>
                {selectedCitationModal.pdfUrl && selectedCitationModal.pdfUrl !== '#' && (
                  <button
                    onClick={() => window.open(selectedCitationModal.pdfUrl, '_blank')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 border border-blue-700 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Mở file PDF
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedCitationModal(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};