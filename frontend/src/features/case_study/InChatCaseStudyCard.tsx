import React from 'react';
import { CaseStudyDetail } from '../../shared/types';
import { FileText, FileCode, Lightbulb } from 'lucide-react';

interface InChatCaseStudyCardProps {
  caseStudy: CaseStudyDetail;
  onOpenSolveModal: (caseStudy: CaseStudyDetail) => void;
  onOpenSolutionModal: (caseStudy: CaseStudyDetail) => void;
}

export const InChatCaseStudyCard: React.FC<InChatCaseStudyCardProps> = ({
  caseStudy,
  onOpenSolveModal,
  onOpenSolutionModal
}) => {
  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'hard':
        return <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200/80 dark:border-red-900/60">Nâng cao</span>;
      case 'easy':
        return <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60">Cơ bản</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60">Nghiệp vụ chuẩn</span>;
    }
  };

  return (
    <div className="mt-3.5 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 flex items-center justify-center border border-blue-200/60 dark:border-slate-700 shrink-0">
            <FileCode className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {caseStudy.title}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chủ đề: <span className="font-medium text-slate-700 dark:text-slate-300">{caseStudy.categoryName}</span>
            </p>
          </div>
        </div>
        <div>
          {getDifficultyBadge(caseStudy.difficulty)}
        </div>
      </div>

      {/* Thông tin Doanh nghiệp & Hồ sơ */}
      <div className="mt-3 space-y-2 text-xs">
        <div className="flex items-start space-x-1.5 text-slate-600 dark:text-slate-300">
          <span className="font-medium text-slate-500 dark:text-slate-400 min-w-[90px]">Doanh nghiệp:</span>
          <span className="truncate font-semibold text-slate-800 dark:text-slate-200">{caseStudy.company}</span>
        </div>

        {caseStudy.documents && caseStudy.documents.length > 0 && (
          <div className="flex items-start space-x-1.5 text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-500 dark:text-slate-400 min-w-[90px]">Hồ sơ đính kèm:</span>
            <div className="flex flex-wrap gap-1.5">
              {caseStudy.documents.map((doc, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700 text-[11px] flex items-center space-x-1"
                  title={doc.summary}
                >
                  <FileText className="w-3 h-3 text-slate-400" strokeWidth={1.5} />
                  <span>{doc.code}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="p-3 rounded-lg bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs leading-relaxed line-clamp-2">
          {caseStudy.context}
        </div>
      </div>

      {/* Danh sách câu hỏi tóm tắt */}
      <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-2.5">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
          <span>Yêu cầu giải quyết ({caseStudy.questions?.length || 0} câu hỏi):</span>
          <span className="text-[11px] text-slate-400 font-normal">Thang điểm 10.0</span>
        </div>
        <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
          {caseStudy.questions?.slice(0, 2).map((q, idx) => (
            <li key={idx} className="line-clamp-1 flex items-start space-x-1.5">
              <span className="text-slate-400 font-bold">•</span>
              <span className="truncate">{q}</span>
            </li>
          ))}
          {(caseStudy.questions?.length || 0) > 2 && (
            <li className="text-[11px] text-slate-400 italic pl-2.5">
              ... và {(caseStudy.questions?.length || 0) - 2} yêu cầu chi tiết khác.
            </li>
          )}
        </ul>
      </div>

      {/* Nút hành động */}
      <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => onOpenSolveModal(caseStudy)}
          className="flex-1 min-w-[140px] px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
        >
          <FileCode className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Bắt đầu làm bài tự luận</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenSolutionModal(caseStudy)}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
        >
          <Lightbulb className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.5} />
          <span>Barem & Đáp án</span>
        </button>
      </div>
    </div>
  );
};
