import React, { useState } from 'react';
import { LegalCitation, Attachment } from '../shared/types';

interface ReferencePanelProps {
  isOpen: boolean;
  onClose: () => void;
  citations: LegalCitation[];
  attachments?: Attachment[];
  highlightedCitationId?: string | null;
  onOpenPdfModal?: (title: string, subtitle?: string) => void;
}

export const ReferencePanel: React.FC<ReferencePanelProps> = ({
  isOpen,
  onClose,
  citations,
  attachments = [],
  highlightedCitationId,
  onOpenPdfModal,
}) => {
  const [selectedCitationModal, setSelectedCitationModal] = useState<LegalCitation | null>(null);

  if (!isOpen) return null;

  return (
    <>
      <aside className="w-full md:w-[320px] bg-[#f2f3ff] border-l border-[#c5c5d3] h-full flex flex-col shrink-0 z-30 transition-all duration-300 shadow-lg md:shadow-none">
        {/* Panel Header */}
        <div className="p-4 border-b border-[#c5c5d3] flex justify-between items-center bg-[#f2f3ff] sticky top-0 z-10">
          <h3 className="font-bold text-base text-[#00236f] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00236f]">source</span>
            Nguồn tham khảo
          </h3>
          <button
            onClick={onClose}
            className="text-[#444651] hover:text-[#00236f] hover:bg-[#dae2fd] rounded-full p-1 transition-colors"
            title="Đóng"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* References Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {citations.length === 0 ? (
            <div className="text-center py-8 text-[#444651] text-xs italic">
              Không có tài liệu tham khảo cụ thể cho câu hỏi này.
            </div>
          ) : (
            citations.map((cite) => {
              const isHighlighted = highlightedCitationId === cite.id || highlightedCitationId === cite.code;
              const isAmended = cite.status === 'amended';

              return (
                <div
                  key={cite.id}
                  className={`bg-white p-3.5 rounded-xl border transition-all duration-200 relative overflow-hidden shadow-xs hover:shadow-md ${
                    isHighlighted
                      ? 'border-[#00236f] ring-2 ring-[#00236f]/20 bg-[#f8faff]'
                      : isAmended
                      ? 'border-[#00236f]/30 ring-1 ring-[#00236f]/10'
                      : 'border-[#c5c5d3]/60 hover:border-[#00236f]'
                  }`}
                >
                  <div
                    className={`absolute top-0 left-0 w-1 h-full ${
                      isAmended ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                  <div className="pl-2">
                    <div className="flex justify-between items-start mb-1.5">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          isAmended
                            ? 'text-amber-800 bg-amber-100'
                            : 'text-emerald-700 bg-emerald-100'
                        }`}
                      >
                        {cite.statusLabel || (isAmended ? 'SỬA ĐỔI/BỔ SUNG' : 'ĐANG CÓ HIỆU LỰC')}
                      </span>
                      <span className="text-[11px] text-[#444651] font-medium">
                        {cite.enactmentDate}
                      </span>
                    </div>

                    <h4
                      onClick={() => setSelectedCitationModal(cite)}
                      className="font-bold text-sm text-[#131b2e] leading-snug mb-1.5 hover:text-[#00236f] cursor-pointer transition-colors"
                    >
                      {cite.title}
                    </h4>

                    <p className="text-xs text-[#444651] line-clamp-3 leading-relaxed mb-2.5">
                      {cite.summary}
                    </p>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedCitationModal(cite)}
                        className="text-xs font-bold text-[#00236f] flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        Xem chi tiết
                        <span className="material-symbols-outlined text-[14px]">
                          arrow_forward
                        </span>
                      </button>

                      {cite.pdfUrl && (
                        <button
                          onClick={() =>
                            onOpenPdfModal
                              ? onOpenPdfModal(cite.title, cite.code)
                              : alert(`Tải xuống PDF ${cite.code}`)
                          }
                          className="text-xs font-bold text-[#505f76] hover:text-[#00236f] flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            download
                          </span>
                          Tải PDF
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Attached Documents Section */}
          {attachments.length > 0 && (
            <div className="pt-2 border-t border-[#c5c5d3]">
              <h4 className="text-[10px] font-bold text-[#444651] uppercase tracking-widest mb-2 px-1">
                Tài liệu đính kèm
              </h4>
              {attachments.map((att) => (
                <div
                  key={att.id}
                  onClick={() =>
                    onOpenPdfModal
                      ? onOpenPdfModal(att.name, att.subtitle)
                      : alert(`Đang xem tài liệu ${att.name}`)
                  }
                  className="flex items-center gap-3 p-3 bg-[#f2f3ff] hover:bg-[#e2e7ff] rounded-xl transition-all cursor-pointer border border-[#c5c5d3]/50 group"
                >
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center text-red-600 shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-xl">
                      picture_as_pdf
                    </span>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-bold text-[#131b2e] truncate">
                      {att.name}
                    </span>
                    {att.subtitle && (
                      <span className="text-[10px] text-[#444651] truncate">
                        {att.subtitle}
                      </span>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-sm text-[#444651] group-hover:text-[#00236f]">
                    download
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="text-center pt-2">
            <p className="text-[11px] text-[#444651] italic">
              Nhấp vào thẻ tham khảo trong đoạn chat để làm nổi bật văn bản liên quan tại đây.
            </p>
          </div>
        </div>
      </aside>

      {/* Citation Full Text Detail Modal */}
      {selectedCitationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-[#c5c5d3]">
            <div className="p-4 border-b border-[#c5c5d3] flex justify-between items-center bg-[#faf8ff]">
              <div>
                <span className="text-xs font-bold text-[#00236f] bg-[#d0e1fb] px-2 py-0.5 rounded">
                  {selectedCitationModal.code}
                </span>
                <h3 className="text-lg font-bold text-[#131b2e] mt-1">
                  {selectedCitationModal.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCitationModal(null)}
                className="text-[#444651] hover:text-[#00236f] p-1"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-sm text-[#131b2e] leading-relaxed">
              <div className="p-3 bg-[#f2f3ff] rounded-xl border border-[#c5c5d3]/50">
                <span className="text-xs font-semibold text-[#444651]">Trạng thái: </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded ml-1">
                  {selectedCitationModal.statusLabel}
                </span>
                <span className="text-xs text-[#444651] ml-3">
                  Ngày ban hành: {selectedCitationModal.enactmentDate}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-[#00236f] mb-1">Tóm tắt trích dẫn</h4>
                <p className="text-[#444651]">{selectedCitationModal.summary}</p>
              </div>

              {selectedCitationModal.fullText && (
                <div>
                  <h4 className="font-bold text-[#00236f] mb-1">Toàn văn / Điều khoản áp dụng</h4>
                  <div className="p-4 bg-[#faf8ff] rounded-xl border border-[#c5c5d3] font-mono text-xs text-[#131b2e] leading-relaxed whitespace-pre-wrap">
                    {selectedCitationModal.fullText}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#c5c5d3] bg-[#faf8ff] flex justify-between items-center">
              <button
                onClick={() =>
                  onOpenPdfModal
                    ? onOpenPdfModal(selectedCitationModal.title, selectedCitationModal.code)
                    : alert(`Tải xuống PDF văn bản ${selectedCitationModal.code}`)
                }
                className="bg-[#00236f] text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-[#1e3a8a] transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">download</span>
                Tải văn bản PDF gốc
              </button>
              <button
                onClick={() => setSelectedCitationModal(null)}
                className="border border-[#c5c5d3] text-[#444651] font-semibold text-xs px-4 py-2 rounded-lg hover:bg-[#e2e7ff] transition-all"
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
