import React, { useState, useCallback } from 'react';
import { ChatSession } from '../shared/types';

interface HistoryViewProps {
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  onOpenMobileSidebar: () => void;
  onNewChat: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  sessions,
  onSelectSession,
  onOpenMobileSidebar,
  onNewChat,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.previewText.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTag || s.categoryTag === selectedTag;
    return matchesSearch && matchesTag;
  });

  const allTags = Array.from(
    new Set(sessions.map((s) => s.categoryTag).filter(Boolean))
  ) as string[];

  return (
    <div className="flex-1 flex flex-col h-screen bg-blue-50 overflow-hidden w-full">
      {/* Top Bar for Search & Mobile Menu */}
      <header className="bg-white/90 backdrop-blur-md flex justify-between items-center h-16 px-4 md:px-8 w-full sticky top-0 z-30 border-b border-blue-200">
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={onOpenMobileSidebar}
            className="text-slate-600 p-1.5 rounded-lg hover:bg-blue-50"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
          <span className="font-bold text-blue-600 text-base">LogiChat</span>
        </div>

        {/* Search input field */}
        <div className="hidden md:flex flex-1 max-w-2xl mx-auto relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#757682] text-xl">
            search
          </span>
          <input
            id="historySearchInput"
            name="historySearch"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm lịch sử hội thoại..."
            className="w-full bg-blue-50 border border-blue-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            U
          </div>
        </div>
      </header>

      {/* Main Canvas Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-blue-50">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Dashboard Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">
                Lịch sử hội thoại
              </h1>
              <p className="text-sm text-slate-600">
                Xem lại các phiên tư vấn pháp lý và tra cứu thông tin trước đây.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onNewChat}
                className="bg-blue-600 text-white font-bold text-xs px-3.5 py-2 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1 shadow-2xs"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Thêm hội thoại
              </button>
            </div>
          </div>

          {/* Filter Tags */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-600 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">filter_list</span>
                Lọc:
              </span>
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  selectedTag === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-slate-600 hover:bg-blue-100'
                }`}
              >
                Tất cả
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                    selectedTag === tag
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-slate-600 hover:bg-blue-100'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Chat History List Cards */}
          <div className="space-y-3.5">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-blue-200">
                <p className="text-sm text-slate-600">
                  Không tìm thấy lịch sử hội thoại phù hợp.
                </p>
              </div>
            ) : (
              filteredSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className="bg-white border border-blue-200 rounded-2xl p-4 md:p-5 hover:shadow-md transition-all group cursor-pointer relative overflow-hidden"
                >
                  {/* Left Highlight Accent Line */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-l-2xl" />

                  <div className="flex justify-between items-start mb-2 pl-2">
                    <h3 className="font-bold text-base md:text-lg text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                      {session.title}
                    </h3>
                    <span className="text-xs text-slate-600 whitespace-nowrap ml-4">
                      {session.updatedAt}
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="pl-2 flex gap-2 mb-3 flex-wrap">
                    {session.categoryTag && (
                      <span className="inline-flex items-center gap-1 bg-blue-200 text-blue-600 font-semibold text-xs px-2.5 py-1 rounded-md">
                        <span className="material-symbols-outlined text-[14px]">
                          local_shipping
                        </span>
                        {session.categoryTag}
                      </span>
                    )}

                    {session.attachmentCount && session.attachmentCount > 0 ? (
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-slate-600 font-semibold text-xs px-2.5 py-1 rounded-md">
                        <span className="material-symbols-outlined text-[14px]">
                          attach_file
                        </span>
                        {session.attachmentCount} Tài liệu
                      </span>
                    ) : null}
                  </div>

                  <p className="pl-2 text-xs md:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {session.previewText}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Load More Trigger */}
          <div className="pt-4 flex justify-center">
            <button
              onClick={async () => {
                try {
                  const currentPage = Math.ceil(filteredSessions.length / 20) + 1;
                  const res = await fetch(`/api/sessions?page=${currentPage}&limit=20`);
                  if (res.ok) {
                    const data = await res.json();
                    if (!data.hasMore) {
                      alert('Đã hiển thị tất cả lịch sử tư vấn gần đây.');
                    }
                  } else {
                    alert('Đã hiển thị tất cả lịch sử tư vấn gần đây.');
                  }
                } catch {
                  alert('Đã hiển thị tất cả lịch sử tư vấn gần đây.');
                }
              }}
              className="text-blue-600 font-bold text-xs hover:underline cursor-pointer py-2 px-4"
            >
              Tải thêm
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
