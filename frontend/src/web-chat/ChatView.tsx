import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatSession, ChatMessage } from '../shared/types';
import { RippleButton } from '../shared/components/RippleButton';
import { List, BookBookmark, ShieldCheck, User, Download, Spinner, Paperclip, PaperPlaneRight, Anchor, FileText, ThumbsUp, ThumbsDown, Copy, SpeakerHigh, Check } from '@phosphor-icons/react';
import { Zap, BrainCircuit, BookOpenCheck, ArrowRight } from 'lucide-react';

const getOrderedCitations = (msg: ChatMessage) => {
  if (!msg.citations || msg.citations.length === 0) return { processedText: msg.text, orderedCitations: [] };
  
  const citationRegex = /\[\s*(?:Nguồn\s*)?(\d+)\s*\]/gi;
  const matches = [...msg.text.matchAll(citationRegex)];
  
  const uniqueIds = Array.from(new Set(matches.map(m => parseInt(m[1], 10))));
  const mapping: Record<number, number> = {};
  
  uniqueIds.forEach((originalId, index) => {
    mapping[originalId] = index + 1;
  });
  
  const processedText = msg.text.replace(citationRegex, (match, idStr) => {
    const originalId = parseInt(idStr, 10);
    const visualId = mapping[originalId] || originalId;
    return `[${visualId}](#citation-${originalId})`;
  });
  
  const orderedCitations: any[] = [];
  uniqueIds.forEach(originalId => {
    const ref = msg.citations!.find(c => c.id.startsWith(`cit-${originalId - 1}-`));
    if (ref) {
      orderedCitations.push({ ...ref, _visualId: mapping[originalId] });
    }
  });
  
  let nextVisualId = Object.keys(mapping).length + 1;
  msg.citations.forEach((ref, index) => {
    const originalId = index + 1;
    if (!uniqueIds.includes(originalId)) {
      orderedCitations.push({ ...ref, _visualId: nextVisualId++ });
    }
  });
  
  return { processedText, orderedCitations };
};

interface ChatViewProps {
  session: ChatSession;
  onSendMessage: (text: string, fileAttachment?: File) => void;
  onToggleReferences: () => void;
  isReferencesOpen: boolean;
  onOpenMobileSidebar: () => void;
  onOpenPdfModal: (message: ChatMessage) => void;
  onCitationClick: (citationCode: string) => void;
  isGenerating?: boolean;
  aiModel?: 'logi_fast' | 'logi_think';
  setAiModel?: (model: 'logi_fast' | 'logi_think') => void;
  userPlan?: 'free' | 'pro';
  onUpgradeClick?: () => void;
  onStartQuiz?: (quizId: string) => void;
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
  aiModel = 'logi_fast',
  setAiModel,
  userPlan = 'free',
  onUpgradeClick,
  onStartQuiz,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleSpeakText = (id: string, text: string) => {
    if ('speechSynthesis' in window) {
      if (speakingMsgId === id) {
        window.speechSynthesis.cancel();
        setSpeakingMsgId(null);
      } else {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.onend = () => setSpeakingMsgId(null);
        window.speechSynthesis.speak(utterance);
        setSpeakingMsgId(id);
      }
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsAutoScroll(isNearBottom);
    }
  };

  useEffect(() => {
    if (isAutoScroll) {
      chatEndRef.current?.scrollIntoView({ behavior: isGenerating ? 'auto' : 'smooth' });
    }
  }, [session.messages, isGenerating]);

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

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData && e.clipboardData.items) {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setAttachedFile(file);
            e.preventDefault();
            return;
          }
        }
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-surface relative overflow-hidden w-full">
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
          {setAiModel && (
            <div className="relative group flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 mr-2 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setAiModel('logi_fast')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                  aiModel === 'logi_fast'
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Zap size={14} />
                <span className="hidden sm:inline">Logi Fast</span>
              </button>
              <button
                onClick={() => {
                  if (userPlan === 'free' && onUpgradeClick) {
                    onUpgradeClick();
                  } else {
                    setAiModel('logi_think');
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                  aiModel === 'logi_think'
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <BrainCircuit size={14} />
                <span className="hidden sm:inline">Logi Think</span>
                {userPlan === 'free' && <ShieldCheck size={12} weight="fill" className="text-amber-500 ml-0.5" />}
              </button>
            </div>
          )}

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

      <div 
        className="flex-1 overflow-y-auto relative z-10 w-full" 
        id="chat-container"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        <div className="max-w-5xl mx-auto px-4 pt-6 pb-6 w-full min-h-full">
          <div className="space-y-6">
          
          <div className="flex justify-center mb-1">
            <span className="bg-[blue-50] text-slate-600 text-xs font-semibold px-3.5 py-1 rounded-full border border-blue-200/50 flex items-center gap-1.5 shadow-2xs">
              <ShieldCheck size={16} weight="fill" className="text-emerald-600" />
              Dữ liệu pháp luật được cập nhật đến: 15/10/2023
            </span>
          </div>

          {session.messages.map((msg: ChatMessage) => {
            const isUser = msg.sender === 'user';

            if (isUser) {
              // Clean display text: hide the long "[Văn bản trích xuất từ ảnh...]" or "[Đính kèm: ...]" block from UI
              const displayText = msg.text
                .replace(/\[Văn bản trích xuất từ ảnh[^\]]*\]:\n[\s\S]*$/, '')
                .replace(/\[Đính kèm:[^\]]*\]/, '')
                .trim();

              return (
                <div key={msg.id} className="flex gap-3 max-w-[85%] ml-auto flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm border border-white">
                    <User size={16} weight="bold" />
                  </div>
                  <div className={`${userPlan === 'pro' ? 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20' : 'bg-primary shadow-sm'} text-white rounded-[1.5rem] rounded-tr-sm px-5 py-3.5 text-sm sm:text-base leading-relaxed whitespace-pre-wrap transition-all duration-300`}>
                    {/* Attachment file card */}
                    {msg.attachment && (
                      <div className="flex items-center gap-3 p-2.5 mb-2.5 rounded-xl bg-white/15 border border-white/20 backdrop-blur-xs text-white">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                          <FileText size={18} weight="bold" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold truncate leading-tight">{msg.attachment.name}</p>
                          <p className="text-[11px] opacity-80 mt-0.5">{msg.attachment.size}</p>
                        </div>
                      </div>
                    )}

                    {msg.imageUrl && (
                      <img 
                        src={msg.imageUrl} 
                        alt="Ảnh đính kèm" 
                        className="max-w-[240px] max-h-[180px] rounded-xl mb-2 border border-white/30 shadow-sm object-cover"
                      />
                    )}

                    {displayText ? (
                      <span>{displayText}</span>
                    ) : msg.attachment ? (
                      <span className="text-xs opacity-90 italic">Đã đính kèm tệp tài liệu</span>
                    ) : (
                      <span>Đã gửi hình ảnh</span>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className="flex gap-3 max-w-[95%] sm:max-w-[88%]">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm border border-blue-200">
                  <Anchor size={16} weight="fill" />
                </div>

                <div className={`${userPlan === 'pro' ? 'bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5' : 'bg-white border border-slate-200/60 shadow-sm'} rounded-[1.5rem] rounded-tl-sm p-4 md:p-5 text-slate-900 text-sm sm:text-base leading-snug space-y-1.5 transition-all duration-300`}>
                  <div className="text-sm sm:text-base leading-snug text-slate-800 whitespace-pre-wrap min-h-[1.5rem] [&_li>p]:mb-0 [&_li>p]:inline-block [&_li]:mt-0.5">
                    {isGenerating && msg.text === '' ? (
                      <div className="py-2 space-y-2">
                        {(() => {
                          const isQuiz = msg.currentStage && (
                            msg.currentStage.includes('trắc nghiệm') || 
                            msg.currentStage.includes('biên soạn') ||
                            msg.currentStage.includes('tổng hợp kiến thức')
                          );

                          const steps = isQuiz ? [
                            { id: 'q1', icon: '🔍', label: 'Tổng hợp kiến thức & Căn cứ pháp lý', prefix: '🔍' },
                            { id: 'q2', icon: '📝', label: 'Biên soạn bộ câu hỏi trắc nghiệm', prefix: '📝' },
                          ] : [
                            { id: 's1', icon: '🔍', label: 'Tìm kiếm văn bản pháp luật', prefix: '🔍' },
                            { id: 's2', icon: '⚖️', label: 'Phân tích độ phù hợp', prefix: '⚖️' },
                            { id: 's3', icon: '✍️', label: 'Tổng hợp câu trả lời', prefix: '✍️' },
                          ];

                          let activeIdx = 0;
                          if (msg.currentStage) {
                            const found = steps.findIndex(st => msg.currentStage?.startsWith(st.prefix) || msg.currentStage?.includes(st.label));
                            if (found !== -1) activeIdx = found;
                          }

                          return steps.map((step, idx) => {
                            const isActive = idx === activeIdx;
                            const isDone = idx < activeIdx;

                            return (
                              <div key={step.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-500 ${
                                isActive ? 'bg-blue-50 border border-blue-200 shadow-xs' :
                                isDone ? 'bg-green-50 border border-green-100 opacity-75' :
                                'opacity-35'
                              }`}>
                                {isActive ? (
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-[bounce_0.8s_ease-in-out_infinite]" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-[bounce_0.8s_ease-in-out_0.15s_infinite]" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-[bounce_0.8s_ease-in-out_0.3s_infinite]" />
                                  </div>
                                ) : isDone ? (
                                  <span className="text-green-500 text-sm font-bold shrink-0">✓</span>
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-slate-200 shrink-0" />
                                )}
                                <span className="text-base shrink-0">{step.icon}</span>
                                <span className={`text-sm font-medium ${
                                  isActive ? 'text-blue-700 font-semibold' :
                                  isDone ? 'text-green-700' :
                                  'text-slate-400'
                                }`}>
                                  {step.label}
                                  {isActive && <span className="ml-1 text-blue-400 animate-pulse">…</span>}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      (() => {
                        const { processedText, orderedCitations } = getOrderedCitations(msg);
                        return (
                          <>
                            <ReactMarkdown
                              components={{
                                p: ({node, ...props}) => <p className="mb-2.5 last:mb-0" {...props} />,
                                strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2.5 space-y-1" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2.5 space-y-1" {...props} />,
                                li: ({node, ...props}) => <li className="text-slate-800 leading-relaxed" {...props} />,
                                h1: ({node, ...props}) => <h1 className="text-lg font-bold text-slate-900 mb-2 mt-4" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-base font-bold text-slate-900 mb-2 mt-3" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-sm font-bold text-slate-900 mb-2 mt-2" {...props} />,
                                table: ({node, ...props}) => <div className="markdown-table-wrapper"><table className="markdown-table" {...props} /></div>,
                                thead: ({node, ...props}) => <thead {...props} />,
                                tbody: ({node, ...props}) => <tbody {...props} />,
                                tr: ({node, ...props}) => <tr {...props} />,
                                th: ({node, ...props}) => <th {...props} />,
                                td: ({node, ...props}) => <td {...props} />,
                                blockquote: ({node, children, ...props}) => {
                                  const text = String(children);
                                  if (text.toLowerCase().includes('lưu ý') || text.toLowerCase().includes('quan trọng')) {
                                    return <blockquote className="legal-callout" {...props}>{children}</blockquote>;
                                  }
                                  return <blockquote className="info-callout" {...props}>{children}</blockquote>;
                                },
                                code: ({node, className, children, ...props}) => {
                                  const isInline = !className;
                                  return isInline
                                    ? <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[13px] font-mono border border-slate-200" {...props}>{children}</code>
                                    : <pre className="bg-slate-900 text-slate-50 p-3 rounded-xl my-2 overflow-x-auto text-sm font-mono"><code className={className} {...props}>{children}</code></pre>;
                                },
                                em: ({node, ...props}) => <em className="italic text-slate-700" {...props} />,
                                a: ({node, href, children, ...props}) => {
                                  if (href?.startsWith('#citation-')) {
                                    const numIdx = parseInt(href.replace('#citation-', ''), 10) - 1;
                                    const ref = msg.citations?.find(c => c.id.startsWith(`cit-${numIdx}-`));
                                    
                                    return (
                                      <span className="tooltip-group inline-flex items-center">
                                        <button
                                          onClick={(e) => { e.preventDefault(); if (ref?.code) onCitationClick(ref.code); }}
                                          className="inline-flex items-center justify-center min-w-[20px] h-5 ml-1 px-1.5 text-[10px] font-bold text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 cursor-pointer shadow-xs border border-blue-200 transition-colors"
                                        >
                                          {children}
                                        </button>
                                        <span className="tooltip-content text-left">
                                          <strong className="block text-blue-300 mb-1">{ref?.code || 'Nguồn tham khảo'}</strong>
                                          <span className="font-normal opacity-90 line-clamp-2">{ref?.summary || 'Đang tải nội dung...'}</span>
                                        </span>
                                      </span>
                                    );
                                  }
                                  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline underline-offset-2" {...props}>{children}</a>;
                                },
                              }}
                            >
                              {processedText}
                            </ReactMarkdown>

                            {msg.taxes && msg.taxes.length > 0 && (
                              <div className="mt-3 space-y-2 bg-blue-50 p-3.5 rounded-xl border border-blue-200/60">
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

                            {msg.inspections && (
                              <div className="mt-3 space-y-1.5 bg-blue-50 p-3.5 rounded-xl border border-blue-200/60">
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

                            {orderedCitations.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-slate-200/60">
                                <h3 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
                                  <span className="text-lg">📚</span> Nguồn tham khảo:
                                </h3>
                                <ul className="space-y-2">
                                  {orderedCitations.map((c: any) => (
                                    <li key={c.id} className="text-xs sm:text-sm text-slate-600 flex items-start gap-2">
                                      <span className="font-bold text-blue-600 shrink-0">[{c._visualId}]</span>
                                      <div className="flex-1">
                                        <span className="font-semibold text-slate-800">{c.code || c.title}</span>
                                        {c.summary && <p className="mt-0.5 text-slate-500 line-clamp-2">{c.summary}</p>}
                                      </div>
                                      <div className="flex flex-col gap-1.5 shrink-0 ml-2">
                                        <button
                                          onClick={() => onCitationClick(c.code)}
                                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 whitespace-nowrap"
                                        >
                                          <FileText size={14} /> Chi tiết
                                        </button>
                                        {c.pdfUrl && c.pdfUrl !== '#' && (
                                          <a
                                            href={c.pdfUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 whitespace-nowrap"
                                          >
                                            <Download size={14} /> Xem PDF
                                          </a>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        );
                      })()
                    )}
                  </div>

                  {/* Interactive In-Chat Quiz Card */}
                  {msg.quiz && (
                    <div className="mt-3.5 p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-blue-50/70 to-slate-50 border border-blue-200/80 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                            <BookOpenCheck size={20} className="stroke-[2.2]" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 leading-tight flex items-center gap-2">
                              {msg.quiz.title}
                              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                {msg.quiz.totalQuestions} Câu
                              </span>
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {msg.quiz.sourceType === 'document_upload' 
                                ? `Nguồn: ${msg.quiz.sourceName || 'Tài liệu đính kèm'}`
                                : 'Nguồn: Hệ thống Văn bản Quy phạm Pháp luật Hải quan'}
                            </p>
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => onStartQuiz && onStartQuiz(msg.quiz!.id)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                        >
                          <span>Bắt đầu làm bài</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Download Summary PDF Button */}
                  {msg.summaryPdf && (
                    <div className="pt-2 mt-3 border-t border-slate-100">
                      <button
                        onClick={() => onOpenPdfModal(msg)}
                        className="text-xs sm:text-sm text-blue-600 font-bold flex items-center gap-1.5 hover:underline cursor-pointer bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100"
                      >
                        <Download size={18} weight="bold" />
                        {msg.summaryPdf.title}
                      </button>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex items-center gap-2 pt-3 mt-2 border-t border-slate-100">
                    <button onClick={() => handleCopyText(msg.id, msg.text)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="Sao chép">
                      {copiedMsgId === msg.id ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    </button>
                    <button onClick={() => handleSpeakText(msg.id, msg.text)} className={`p-1.5 rounded-lg transition-colors ${speakingMsgId === msg.id ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`} title="Đọc văn bản">
                      <SpeakerHigh size={16} weight={speakingMsgId === msg.id ? 'fill' : 'regular'} />
                    </button>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <button className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="Câu trả lời tốt">
                      <ThumbsUp size={16} />
                    </button>
                    <button className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Câu trả lời chưa tốt">
                      <ThumbsDown size={16} />
                    </button>
                  </div>

                  {/* Follow-up chips */}
                  {!isGenerating && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(msg.followUpQuestions && msg.followUpQuestions.length > 0
                        ? msg.followUpQuestions
                        : ["Giải thích chi tiết hơn?", "Điều kiện áp dụng là gì?", "Quy trình thực hiện?"]
                      ).map((q, qIdx) => (
                        <button
                          key={qIdx}
                          onClick={() => onSendMessage(q)}
                          className="text-[11px] sm:text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-full hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
                        >
                          <span className="text-blue-500">✨</span> {q}
                        </button>
                      ))}
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

            <div className="flex flex-col w-full">
              <textarea
                id="chatMessageInput"
                name="chatMessage"
                ref={textareaRef}
                value={inputText}
                onChange={handleTextareaInput}
                onKeyDown={handleTextareaKeyDown}
                onPaste={handlePaste}
                placeholder="Nhập câu hỏi hoặc số tờ khai hải quan..."
                rows={1}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none max-h-36 min-h-[44px] py-2 px-1 text-sm sm:text-base text-slate-900 placeholder-[#757682]"
              />
              <div className="hidden sm:flex justify-end px-1 pb-1">
                <span className="text-[10px] text-slate-400 font-medium">
                  <kbd className="font-sans bg-slate-100 border border-slate-200 px-1 rounded">Enter</kbd> gửi • 
                  <kbd className="font-sans bg-slate-100 border border-slate-200 px-1 rounded ml-1">Shift</kbd> + 
                  <kbd className="font-sans bg-slate-100 border border-slate-200 px-1 rounded">Enter</kbd> xuống dòng
                </span>
              </div>
            </div>

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