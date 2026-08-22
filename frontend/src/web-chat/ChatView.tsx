import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatSession, ChatMessage } from '../shared/types';
import { RippleButton } from '../shared/components/RippleButton';
import { List, BookBookmark, ShieldCheck, User, Download, Spinner, Paperclip, PaperPlaneRight, Anchor } from '@phosphor-icons/react';

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
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  // Handle manual scroll to detect if user wants to stop auto-scrolling
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      // If user scrolls up more than 100px from the bottom, disable auto-scroll
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsAutoScroll(isNearBottom);
    }
  };

  useEffect(() => {
    if (isAutoScroll) {
      // Use 'auto' instead of 'smooth' during generation to prevent jitter
      chatEndRef.current?.scrollIntoView({ behavior: isGenerating ? 'auto' : 'smooth' });
    }
  }, [session.messages, isGenerating]);

  // Force auto-scroll on new message submission
  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;
    onSendMessage(inputText, attachedFile || undefined);
    setInputText('');
    setAttachedFile(null);
    setIsAutoScroll(true);
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
    <div className="flex-1 flex flex-col h-screen bg-surface relative overflow-hidden w-full">
      {/* Desktop & Mobile Top Bar */}
      <header className="flex justify-between items-center h-16 px-4 md:px-6 w-full sticky top-0 z-20 liquid-glass border-b border-blue-200/50 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            onClick={onOpenMobileSidebar}
            className="md:hidden text-slate-600 hover:text-blue-600 p-1.5 rounded-lg hover:bg-[blue-50]"
            title="Mở menu history"
          >
            <List size={24} weight="regular" />
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
            <BookBookmark size={18} weight="fill" />
            <span className="hidden sm:inline">Nguồn tham khảo</span>
          </button>
        </div>
      </header>

      {/* Scrollable Chat Area */}
      <div 
        className="flex-1 overflow-y-auto relative z-10 w-full" 
        id="chat-container"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        <div className="max-w-5xl mx-auto px-4 pt-6 pb-6 w-full min-h-full">
          <div className="space-y-6">
          
          {/* System Data Context Banner */}
          <div className="flex justify-center mb-1">
            <span className="bg-[blue-50] text-slate-600 text-xs font-semibold px-3.5 py-1 rounded-full border border-blue-200/50 flex items-center gap-1.5 shadow-2xs">
              <ShieldCheck size={16} weight="fill" className="text-emerald-600" />
              Dữ liệu pháp luật được cập nhật đến: 15/10/2023
            </span>
          </div>

          {/* Messages */}
          {session.messages.map((msg: ChatMessage) => {
            const isUser = msg.sender === 'user';

            if (isUser) {
              return (
                <div key={msg.id} className="flex gap-3 max-w-[85%] ml-auto flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm border border-white">
                    <User size={16} weight="bold" />
                  </div>
                  <div className="bg-primary text-white rounded-[1.5rem] rounded-tr-sm px-5 py-3.5 shadow-sm text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                    {msg.text}
                  </div>
                </div>
              );
            }

            // AI Response Message
            return (
              <div key={msg.id} className="flex gap-3 max-w-[95%] sm:max-w-[88%]">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm border border-blue-200">
                  <Anchor size={16} weight="fill" />
                </div>

                <div className="bg-white border border-slate-200/60 rounded-[1.5rem] rounded-tl-sm p-4 md:p-5 text-slate-900 shadow-sm text-sm sm:text-base leading-snug space-y-1.5">
                  {/* Text Main */}
                  <div className="text-sm sm:text-base leading-snug text-slate-800 whitespace-pre-wrap min-h-[1.5rem] [&_li>p]:mb-0 [&_li>p]:inline-block [&_li]:mt-0.5">
                    {isGenerating && msg.text === '' ? (
                      <div className="flex gap-2 items-center h-full pt-1">
                        <div className="w-2.5 h-2.5 rounded-full rounded-tl-none rotate-45 bg-blue-500 animate-bounce shadow-[0_2px_6px_rgba(59,130,246,0.4)]" />
                        <div
                          className="w-2.5 h-2.5 rounded-full rounded-tl-none rotate-45 bg-blue-500 animate-bounce shadow-[0_2px_6px_rgba(59,130,246,0.4)]"
                          style={{ animationDelay: '0.2s' }}
                        />
                        <div
                          className="w-2.5 h-2.5 rounded-full rounded-tl-none rotate-45 bg-blue-500 animate-bounce shadow-[0_2px_6px_rgba(59,130,246,0.4)]"
                          style={{ animationDelay: '0.4s' }}
                        />
                      </div>
                    ) : isGenerating && /^[🔍⚖️✍️]/.test(msg.text) && !msg.text.includes('\n') ? (
                      /* Pipeline stage indicator — hiệu ứng mượt hơn */
                      <div className="flex items-center gap-3 py-1 animate-fadeIn">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '0.15s' }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse" style={{ animationDelay: '0.3s' }} />
                        </div>
                        <span className="text-blue-600 font-semibold text-sm tracking-wide">{msg.text}</span>
                      </div>
                    ) : (
                      <ReactMarkdown
                        components={{
                          p: ({node, ...props}) => <p className="mb-1.5 last:mb-0" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-bold text-blue-700" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-1.5 space-y-0" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-1.5 space-y-0" {...props} />,
                          li: ({node, ...props}) => <li className="text-slate-800" {...props} />,
                          h1: ({node, ...props}) => <h1 className="text-lg font-bold text-slate-900 mb-1 mt-2" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-base font-bold text-slate-900 mb-1 mt-2" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-sm font-bold text-blue-700 mb-1 mt-1.5" {...props} />,
                          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-400 pl-3 italic text-slate-600 bg-blue-50 py-1 pr-2 rounded-r my-1" {...props} />,
                          code: ({node, className, children, ...props}) => {
                            const isInline = !className;
                            return isInline
                              ? <code className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs font-semibold border border-blue-200/50" {...props}>{children}</code>
                              : <code className={className} {...props}>{children}</code>;
                          },
                          em: ({node, ...props}) => <em className="text-slate-500 text-xs" {...props} />,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    )}
                  </div>

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
                                className="inline-flex items-center gap-1 px-2 py-0.5 ml-2 bg-blue-600 text-white text-[10px] font-bold uppercase rounded hover:bg-blue-700 transition-colors cursor-pointer border border-blue-700/50 shadow-sm"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
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
                            className="inline-flex items-center gap-1 px-2 py-0.5 ml-2 bg-blue-600 text-white text-[10px] font-bold uppercase rounded hover:bg-blue-700 transition-colors cursor-pointer border border-blue-700/50 shadow-sm"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
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
                        <Download size={18} weight="bold" />
                        {msg.summaryPdf.title}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}


          <div ref={chatEndRef} />
          </div>
        </div>
      </div>

      {/* Static Bottom Input Bar */}
      <div className="w-full bg-slate-50/50 pt-2 pb-4 px-4 shrink-0 z-20 pointer-events-none border-t border-slate-200/50 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
        <div className="max-w-5xl mx-auto pointer-events-auto">
          {/* File attachment preview badge */}
          {attachedFile && (
            <div className="mb-2 inline-flex items-center gap-2 bg-blue-200 text-blue-600 px-3 py-1 rounded-lg text-xs font-semibold">
              <Paperclip size={14} weight="bold" />
              <span className="truncate max-w-[200px]">{attachedFile.name}</span>
              <button
                onClick={() => setAttachedFile(null)}
                className="hover:text-red-600 font-bold ml-1"
                title="Xóa tệp"
              >
                ×
              </button>
            </div>
          )}

          {/* Prompt Suggestions when chat is empty */}
          {session.messages.length === 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                "Thuế suất HS 8542.31?",
                "Biểu thuế EVFTA năm nay?",
                "Quy trình xin C/O form E?"
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputText(suggestion)}
                  className="bg-white/90 backdrop-blur-sm border border-blue-200 text-blue-700 text-xs sm:text-sm px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors shadow-sm cursor-pointer font-medium"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={handleInputSubmit}
            className="relative liquid-glass rounded-[2rem] shadow-[0_8px_30px_rgba(0,35,111,0.08)] focus-within:shadow-[0_8px_30px_rgba(0,35,111,0.15)] focus-within:border-blue-300 transition-all flex items-end p-2 gap-2"
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
              <Paperclip size={20} weight="regular" />
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

            <RippleButton
              type="submit"
              disabled={!inputText.trim() && !attachedFile}
              className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center p-0"
              title="Gửi"
            >
              <PaperPlaneRight size={20} weight="fill" />
            </RippleButton>
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