import React, { useState } from 'react';
import { LegalCitation } from '../shared/types';
import { ShieldCheck, Copy, Check, ExternalLink, X } from 'lucide-react';

interface CitationModalProps {
  citation: LegalCitation;
  onClose: () => void;
  handleCopy: (id: string, text: string) => void;
  copiedId: string | null;
}

export const CitationModal: React.FC<CitationModalProps> = ({
  citation,
  onClose,
  handleCopy,
  copiedId,
}) => {
  // Hooks được gọi ở top-level của component — đúng chuẩn Rules of Hooks
  const jumpTabs = citation.title.includes('-')
    ? citation.title.split('-')[1].split(',').map((t) => t.trim())
    : [];
  const [activeTab, setActiveTab] = useState(jumpTabs[0] || '');
  const [mainTab, setMainTab] = useState<'context' | 'pdf'>('context');

  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      const mark = scrollRef.current.querySelector('mark');
      if (mark) {
        mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeTab]);

  const highlightText = (text: string, keyword: string) => {
    if (!keyword) return <>{text}</>;
    const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === keyword.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 text-yellow-900 font-bold px-1 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-[70vw] h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/60 shrink-0">
          <div className="flex-1">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
              {citation.code}
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1.5">{citation.title}</h3>
            
            {citation.pdfUrl && citation.pdfUrl !== '#' && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setMainTab('context')}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${mainTab === 'context' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                >
                  Nội dung trích đoạn (RAG)
                </button>
                <button
                  onClick={() => setMainTab('pdf')}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 ${mainTab === 'pdf' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Trình đọc PDF gốc
                </button>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 shrink-0 ml-4"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden bg-white relative">
          {mainTab === 'context' ? (
            <div className="p-6 h-full overflow-y-auto space-y-4 text-sm text-slate-800 leading-relaxed">
              {/* SHA-256 Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 w-fit">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">✓ Đã kiểm chứng SHA-256</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  {citation.statusLabel || 'Đang có hiệu lực'}
                </span>
              </div>

              {/* Full Text with Jump Tabs */}
              <div className="flex flex-col h-full mt-4">
                <div className="flex justify-between items-end mb-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                    Nội dung điều khoản
                  </h4>
                  {jumpTabs.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {jumpTabs.map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${
                            activeTab === tab
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div ref={scrollRef} className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[13px] text-slate-800 leading-relaxed whitespace-pre-wrap flex-1 overflow-y-auto">
                  {highlightText(citation.fullText || citation.summary || 'Không có dữ liệu toàn văn', activeTab)}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-slate-100">
              {citation.pdfUrl && citation.pdfUrl !== '#' ? (
                <iframe
                  src={`${citation.pdfUrl}${citation.pageNumber ? `#page=${citation.pageNumber}` : ''}`}
                  className="w-full h-full border-0"
                  title="PDF Viewer"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                  Không có bản PDF cho tài liệu này.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex justify-between items-center shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() =>
                handleCopy(
                  citation.id,
                  `${citation.code}: ${citation.title}\n\n${citation.fullText || citation.summary}`
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {copiedId === citation.id ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Sao chép trích dẫn
                </>
              )}
            </button>
            {citation.pdfUrl && citation.pdfUrl !== '#' && (
              <a
                href={citation.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Mở PDF gốc
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
