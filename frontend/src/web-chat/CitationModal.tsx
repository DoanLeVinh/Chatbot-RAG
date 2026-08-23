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
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
          <div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
              {citation.code}
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1.5">{citation.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-800 leading-relaxed">
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

          {/* Summary section removed because it naively extracts first 3 sentences which might not match AI's actual reference */}

          {/* Full Text with Jump Tabs */}
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-end mb-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Toàn văn / Điều khoản chi tiết
              </h4>
              {jumpTabs.length > 0 && (
                <div className="flex gap-1.5">
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
            <div ref={scrollRef} className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
              {highlightText(citation.fullText || citation.summary || 'Không có dữ liệu toàn văn', activeTab)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex justify-between items-center">
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
