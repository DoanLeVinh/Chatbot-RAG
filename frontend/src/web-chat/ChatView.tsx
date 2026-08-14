import React, { useState, useRef, useEffect } from 'react';
import { ChatSession, ChatMessage } from '../shared/types';

interface ChatViewProps {
  session: ChatSession;
  onSendMessage: (text: string, fileAttachment?: File) => void;
  onToggleReferences: () => void;
  isReferencesOpen: boolean;
  onOpenMobileSidebar: () => void;
  onOpenPdfModal: (message: ChatMessage) => void;
  onCitationClick: (citationCode: string) => void;
  isGenerating?: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({
  session,
  onSendMessage,
  onToggleReferences,
  isReferencesOpen,
  onOpenMobileSidebar,
  onOpenPdfModal,
  onCitationClick,
  isGenerating = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages, isGenerating]);

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;
    onSendMessage(inputText, attachedFile || undefined);
    setInputText('');
    setAttachedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInputSubmit(e);
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-blue-50 relative overflow-hidden w-full">
      {/* Desktop & Mobile Top Bar */}
      <header className="flex justify-between items-center h-16 px-4 md:px-6 w-full sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-blue-200 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            onClick={onOpenMobileSidebar}
            className="md:hidden text-slate-600 hover:text-blue-600 p-1.5 rounded-lg hover:bg-[blue-50]"
            title="Mở menu history"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
          <h1 className="text-sm md:text-base font-bold text-blue-600 truncate">
            {session.title || 'Hỏi đáp Hải quan'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleReferences}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
              isReferencesOpen
                ? 'bg-blue-200 text-blue-600 border-blue-600'
                : 'bg-white text-slate-500 border-blue-200 hover:bg-[blue-50] hover:text-blue-600'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              library_books
            </span>
            <span className="hidden sm:inline">Nguồn tham khảo</span>
          </button>
        </div>
      </header>

      {/* Main Chat Scroll Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 flex flex-col items-center">
        <div className="w-full max-w-[800px] flex flex-col gap-6">
          
          {/* System Data Context Banner */}
          <div className="flex justify-center mb-1">
            <span className="bg-[blue-50] text-slate-600 text-xs font-semibold px-3.5 py-1 rounded-full border border-blue-200/50 flex items-center gap-1.5 shadow-2xs">
              <span className="material-symbols-outlined text-sm text-emerald-600">
                verified_user
              </span>
              Dữ liệu pháp luật được cập nhật đến: 15/10/2023
            </span>
          </div>

          {/* Messages */}
          {session.messages.map((msg: ChatMessage) => {
            const isUser = msg.sender === 'user';

            if (isUser) {
              return (
                <div key={msg.id} className="flex gap-3 max-w-[85%] ml-auto flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-slate-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <span className="material-symbols-outlined text-sm">person</span>
                  </div>
                  <div className="bg-blue-600 text-white rounded-2xl rounded-tr-none p-4 shadow-sm text-sm sm:text-base leading-relaxed">
                    <p>{msg.text}</p>
                  </div>
                </div>
              );
            }

            // AI Response Message
            return (
              <div key={msg.id} className="flex gap-3 max-w-[95%] sm:max-w-[88%]">
                <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <span className="material-symbols-outlined text-sm">gavel</span>
                </div>

                <div className="bg-white border border-blue-200 rounded-2xl rounded-tl-none p-4 md:p-5 text-slate-900 shadow-xs text-sm sm:text-base leading-relaxed space-y-4">
                  {/* Text Main */}
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Taxes Breakdown if available */}
                  {msg.taxes && msg.taxes.length > 0 && (
                    <div className="space-y-2 bg-blue-50 p-3.5 rounded-xl border border-blue-200/60">
                      <h3 className="font-bold text-blue-600 text-sm">1. Thuế suất:</h3>
                      <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                        {msg.taxes.map((t, idx) => (
                          <li key={idx}>
                            <strong className="text-slate-900">{t.label}:</strong>{' '}
                            <span className="font-bold text-blue-600">{t.rate}</span>
                            {t.citationCode && (
                              <button
                                onClick={() => onCitationClick(t.citationCode!)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 ml-2 bg-blue-100 text-slate-900 text-[10px] font-bold uppercase rounded hover:bg-blue-200 transition-colors cursor-pointer border border-blue-200/50"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {t.citationCode}
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Inspections / Special Regulations */}
                  {msg.inspections && (
                    <div className="space-y-1.5 bg-blue-50 p-3.5 rounded-xl border border-blue-200/60">
                      <h3 className="font-bold text-blue-600 text-sm">2. Kiểm tra chuyên ngành:</h3>
                      <p className="text-xs sm:text-sm text-slate-600">
                        {msg.inspections.description}
                        {msg.inspections.citationCode && (
                          <button
                            onClick={() => onCitationClick(msg.inspections!.citationCode!)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 ml-2 bg-blue-100 text-slate-900 text-[10px] font-bold uppercase rounded hover:bg-blue-200 transition-colors cursor-pointer border border-blue-200/50"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {msg.inspections.citationCode}
                          </button>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Download Summary PDF Button */}
                  {msg.summaryPdf && (
                    <div className="pt-2 border-t border-blue-200/60">
                      <button
                        onClick={() => onOpenPdfModal(msg)}
                        className="text-xs sm:text-sm text-blue-600 font-bold flex items-center gap-1.5 hover:underline cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          download
                        </span>
                        {msg.summaryPdf.title}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Generating Loading State */}
          {isGenerating && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-sm animate-spin">
                  sync
                </span>
              </div>
              <div className="bg-white border border-blue-200 rounded-2xl rounded-tl-none p-4 flex gap-1.5 items-center">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
                <div
                  className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"
                  style={{ animationDelay: '0.4s' }}
                />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Static Bottom Input Bar */}
      <div className="w-full bg-white border-t border-blue-200 pt-4 pb-4 px-4 shrink-0 z-20">
        <div className="max-w-[760px] mx-auto">
          {/* File attachment preview badge */}
          {attachedFile && (
            <div className="mb-2 inline-flex items-center gap-2 bg-blue-200 text-blue-600 px-3 py-1 rounded-lg text-xs font-semibold">
              <span className="material-symbols-outlined text-sm">attach_file</span>
              <span className="truncate max-w-[200px]">{attachedFile.name}</span>
              <button
                onClick={() => setAttachedFile(null)}
                className="hover:text-red-600 font-bold ml-1"
              >
                ×
              </button>
            </div>
          )}

          <form
            onSubmit={handleInputSubmit}
            className="relative bg-white border-2 border-blue-200 rounded-2xl shadow-lg focus-within:border-blue-600 transition-all flex items-end p-2 gap-2"
          >
            {/* Hidden File Input */}
            <input
              id="chatFileInput"
              name="chatFile"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-600 hover:text-blue-600 transition-colors rounded-xl hover:bg-[blue-50] shrink-0"
              title="Đính kèm tài liệu tờ khai/hóa đơn"
            >
              <span className="material-symbols-outlined text-xl">attach_file</span>
            </button>

            <textarea
              id="chatMessageInput"
              name="chatMessage"
              ref={textareaRef}
              value={inputText}
              onChange={handleTextareaInput}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Nhập câu hỏi hoặc số tờ khai hải quan..."
              rows={1}
              className="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none max-h-36 min-h-[44px] py-2 px-1 text-sm sm:text-base text-slate-900 placeholder-[#757682]"
            />

            <button
              type="submit"
              disabled={!inputText.trim() && !attachedFile}
              className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition-colors shrink-0 shadow-sm cursor-pointer"
              title="Gửi"
            >
              <span className="material-symbols-outlined text-xl">send</span>
            </button>
          </form>

          <div className="text-center mt-2">
            <span className="text-[11px] text-slate-600">
              LogiChat có thể đưa ra thông tin không chính xác. Hãy kiểm tra lại các quy định pháp lý trước khi thực hiện.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};