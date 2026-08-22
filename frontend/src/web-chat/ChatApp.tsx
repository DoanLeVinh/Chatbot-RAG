import React, { useState, useEffect, useCallback } from 'react';
import { ActiveScreen, ChatSession, ChatMessage, LegalCitation } from '../shared/types';
import { LandingPage } from './LandingPage';
import { Sidebar } from '../shared/components/Sidebar';
import { Resizer } from '../shared/components/Resizer';
import { ChatView } from './ChatView';
import { ReferencePanel } from './ReferencePanel';
import { HistoryView } from './HistoryView';
import { AuthModal } from '../shared/components/AuthModal';
import { PdfModal } from './PdfModal';
import { SettingsModal } from '../shared/components/SettingsModal';
import { LiquidLoader } from '../shared/components/LiquidLoader';
import { WaterRippleMouse } from '../shared/components/WaterRippleMouse';

const createDefaultBlankSession = (): ChatSession => ({
  id: `session-${Date.now()}`,
  title: 'Hội thoại tư vấn mới',
  group: 'TODAY',
  updatedAt: 'Vừa xong',
  categoryTag: 'Tư vấn Hải quan',
  previewText: 'Bắt đầu đặt câu hỏi pháp lý mới...',
  references: [],
  messages: [
    {
      id: `m-${Date.now()}`,
      sender: 'ai',
      text: 'Xin chào. Tôi là Trợ lý Pháp lý Hải quan LogiChat. Tôi có thể giúp gì cho bạn về quy định xuất nhập khẩu, mã HS, thuế quan hoặc thủ tục thông quan?',
      timestamp: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  ],
});

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('landing');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isReferencesOpen, setIsReferencesOpen] = useState<boolean>(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState<boolean>(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>(280);
  const [referencePanelWidth, setReferencePanelWidth] = useState<number>(340);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isAppLoading, setIsAppLoading] = useState(true);

  // User Auth State with LocalStorage Persistence
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
    fullName: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('logichat_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Modals state
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    mode: 'login' | 'register';
  }>({
    isOpen: false,
    mode: 'login',
  });

  const [pdfModal, setPdfModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    content?: string;
    hsCode?: string;
    taxes?: ChatMessage['taxes'];
    citations?: ChatMessage['citations'];
  }>({
    isOpen: false,
    title: '',
  });

  const openPdfModalFromMessage = (message: ChatMessage) => {
    setPdfModal({
      isOpen: true,
      title: message.summaryPdf?.title || 'Tóm tắt pháp lý',
      subtitle: `Số tờ khai / HS Code: ${message.hsCode || 'Chi tiết'}`,
      content: message.text,
      hsCode: message.hsCode,
      taxes: message.taxes,
      citations: message.citations,
    });
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [highlightedCitationCode, setHighlightedCitationCode] = useState<string | null>(null);
  const [citationToAutoOpen, setCitationToAutoOpen] = useState<string | null>(null);

  // ─── Load User-Isolated Sessions from Backend ────────────────────
  const loadSessionsFromBackend = useCallback(async () => {
    try {
      const userIdParam = currentUser?.id ? `?userId=${encodeURIComponent(currentUser.id)}` : '';
      const res = await fetch(`/api/sessions${userIdParam}`);
      if (res.ok) {
        const data = await res.json();
        if (data.sessions && data.sessions.length > 0) {
          const backendSessions: ChatSession[] = data.sessions.map((s: any) => ({
            id: s.id,
            title: s.title || 'Hội thoại tư vấn',
            group: s.group || 'TODAY',
            updatedAt: s.updatedAt || 'Hôm nay',
            categoryTag: s.categoryTag || 'Tư vấn Hải quan',
            previewText: s.previewText || '',
            messages: s.messages || [],
            references: s.references || [],
            attachments: s.attachments || [],
          }));

          setSessions(backendSessions);
          setActiveSessionId(backendSessions[0].id);
          return;
        }
      }
    } catch (err) {
      console.log('Error loading sessions from backend');
    }

    // Default: create a fresh blank session for clean workspace
    const blank = createDefaultBlankSession();
    setSessions([blank]);
    setActiveSessionId(blank.id);
  }, [currentUser]);

  useEffect(() => {
    loadSessionsFromBackend();
  }, [loadSessionsFromBackend]);

  // Get active session
  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0] || createDefaultBlankSession();

  // Handle New Chat creation
  const handleNewChat = async () => {
    const newSession = createDefaultBlankSession();

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setActiveScreen('chat');

    // Create session in backend tied to currentUser.id
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSession.title,
          categoryTag: newSession.categoryTag,
          userId: currentUser?.id || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session?.id) {
          const backendId = data.session.id;
          setSessions((prev) =>
            prev.map((s) => (s.id === newSession.id ? { ...s, id: backendId } : s))
          );
          setActiveSessionId(backendId);
        }
      }
    } catch {
      // Continue with local session if backend fails
    }
  };

  // Handle Send Message
  const handleSendMessage = async (text: string, file?: File) => {
    if (!text.trim() && !file) return;

    let userMessageText = text.trim() || (file ? `[Đính kèm file: ${file.name}]` : '');
    const userMsgId = `usr-${Date.now()}`;
    const timestampStr = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Upload file if attached
    let uploadedFile: any = null;
    let scopedRagJustEnabled = false;
    let scopedRagError: string | null = null;
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        if (currentUser?.id) {
          formData.append('userId', currentUser.id);
        }
        if (activeSession?.id) {
          formData.append('sessionId', activeSession.id);
        }
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedFile = uploadData.file;
          if (uploadData.scopedRagEnabled) {
            scopedRagJustEnabled = true;
          } else if (uploadData.scopedRagError) {
            scopedRagError = uploadData.scopedRagError;
          }
          if (!text.trim()) {
            userMessageText = `[Đính kèm: ${uploadedFile.name}]`;
          }
        }
      } catch {
        console.log('File upload failed, continuing without attachment');
      }
    }

    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: userMessageText,
      timestamp: timestampStr,
    };

    const systemNoticeMsg: ChatMessage | null = scopedRagJustEnabled
      ? {
          id: `sys-${Date.now()}`,
          sender: 'ai',
          text: `🔒 Đã nhận và xử lý "${uploadedFile?.name}". Từ giờ trong cuộc trò chuyện này, tôi sẽ CHỈ trả lời dựa trên nội dung tài liệu bạn vừa tải lên. Nếu muốn hỏi về kho luật chung, hãy bắt đầu một "Trò chuyện mới".`,
          timestamp: timestampStr,
        }
      : scopedRagError
      ? {
          id: `sys-${Date.now()}`,
          sender: 'ai',
          text: `⚠️ ${scopedRagError}`,
          timestamp: timestampStr,
        }
      : null;

    // Update session with user message
    const updatedSessions = sessions.map((s) => {
      if (s.id === activeSession.id) {
        return {
          ...s,
          title: s.title === 'Hội thoại tư vấn mới' ? userMessageText.slice(0, 36) : s.title,
          previewText: userMessageText,
          updatedAt: 'Hôm nay',
          messages: systemNoticeMsg
            ? [...s.messages, userMsg, systemNoticeMsg]
            : [...s.messages, userMsg],
          attachments: uploadedFile
            ? [...(s.attachments || []), uploadedFile]
            : s.attachments,
        };
      }
      return s;
    });

    setSessions(updatedSessions);
    setIsGenerating(true);

    try {
      // Create a placeholder message for AI
      const aiMsgId = `ai-${Date.now()}`;
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              messages: [
                ...s.messages,
                {
                  id: aiMsgId,
                  sender: 'ai',
                  text: '',
                  timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                },
              ],
            };
          }
          return s;
        })
      );

      // Call backend FastAPI (SQLite) for RAG + AI Streaming
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessageText,
          sessionId: activeSession.id,
          userId: currentUser?.id || null,
        }),
      });

      if (!res.body) throw new Error("No readable stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let doneReading = false;
      let finalData: any = {};
      let currentText = "";

      while (!doneReading) {
        const { value, done } = await reader.read();
        doneReading = done;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split("\n\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              if (!dataStr) continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.done) {
                  finalData = parsed;
                } else if (parsed.citations) {
                  // Nguồn trích dẫn đến SỚM (trước khi trả lời xong) — gắn ngay
                  // vào tin nhắn đang gõ để số [1][2] trong câu chữ có thể bấm được
                  // ngay lúc đang stream, không phải đợi tới lúc trả lời xong.
                  const earlyCitations: LegalCitation[] = parsed.citations;
                  finalData.citations = earlyCitations;
                  setSessions((prev) =>
                    prev.map((s) => {
                      if (s.id !== activeSession.id) return s;
                      const msgs = [...s.messages];
                      const idx = msgs.findIndex((m) => m.id === aiMsgId);
                      if (idx !== -1) msgs[idx] = { ...msgs[idx], citations: earlyCitations };

                      const existingCodes = new Set((s.references || []).map((r) => r.code));
                      const uniqueNewCitations = earlyCitations.filter((c) => !existingCodes.has(c.code));
                      return {
                        ...s,
                        messages: msgs,
                        references: [...(s.references || []), ...uniqueNewCitations],
                      };
                    })
                  );
                } else if (parsed.token) {
                  currentText += parsed.token;
                  setSessions((prev) =>
                    prev.map((s) => {
                      if (s.id === activeSession.id) {
                        const msgs = [...s.messages];
                        const idx = msgs.findIndex((m) => m.id === aiMsgId);
                        if (idx !== -1) msgs[idx] = { ...msgs[idx], text: currentText };
                        return { ...s, messages: msgs };
                      }
                      return s;
                    })
                  );
                } else if (parsed.error) {
                  currentText = parsed.error;
                }
              } catch (e) {
                // Ignore incomplete JSON chunks in buffer if any
              }
            }
          }
        }
      }

      const newCitations: LegalCitation[] = finalData.citations || [];

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSession.id) {
            const msgs = [...s.messages];
            const idx = msgs.findIndex((m) => m.id === aiMsgId);
            if (idx !== -1) {
              msgs[idx] = {
                ...msgs[idx],
                hsCode: finalData.hsCode || undefined,
                taxes: finalData.taxes || undefined,
                inspections: finalData.inspections || undefined,
                citations: finalData.citations || undefined,
                summaryPdf: finalData.summaryPdf || undefined,
              };
            }

            const existingCodes = new Set((s.references || []).map((r) => r.code));
            const uniqueNewCitations = newCitations.filter((c) => !existingCodes.has(c.code));

            return {
              ...s,
              messages: msgs,
              references: [...(s.references || []), ...uniqueNewCitations],
            };
          }
          return s;
        })
      );
    } catch (err) {
      console.error('Error fetching AI legal response:', err);
      const fallbackAiMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: `Đã tiếp nhận yêu cầu: "${userMessageText}".\n\nTheo quy định Hải quan hiện hành, mã HS và biểu thuế nhập khẩu ưu đãi đặc biệt được áp dụng dựa trên C/O hợp lệ (AJCEP/VJEPA). Cần chuẩn bị đầy đủ Tờ khai hải quan, Hóa đơn thương mại (Commercial Invoice) và Phiếu đóng gói (Packing List).`,
        timestamp: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        summaryPdf: {
          title: 'Tải bản tóm tắt pháp lý (PDF)',
        },
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              messages: [...s.messages, fallbackAiMsg],
            };
          }
          return s;
        })
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Delete Session (with backend sync + safe active-session fallback)
  const handleDeleteSession = async (sessionId: string) => {
    const confirmed = window.confirm(
      'Bạn có chắc chắn muốn xóa cuộc hội thoại này? Hành động này không thể hoàn tác.'
    );
    if (!confirmed) return;

    try {
      const userIdParam = currentUser?.id
        ? `?userId=${encodeURIComponent(currentUser.id)}`
        : '';
      const res = await fetch(`/api/sessions/${sessionId}${userIdParam}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        alert('Không thể xóa cuộc hội thoại. Vui lòng thử lại.');
        return;
      }
    } catch {
      alert('Không thể xóa cuộc hội thoại. Vui lòng kiểm tra kết nối và thử lại.');
      return;
    }

    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== sessionId);

      if (activeSessionId === sessionId) {
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          const blank = createDefaultBlankSession();
          setActiveSessionId(blank.id);
          return [blank];
        }
      }

      return remaining;
    });
  };

  // Handle User Login/Register Success
  const handleAuthSuccess = (userInfo: { id?: string; email?: string; fullName: string }) => {
    const user = {
      id: userInfo.id || `usr-${Date.now()}`,
      email: userInfo.email || '',
      fullName: userInfo.fullName,
    };
    setCurrentUser(user);
    try {
      localStorage.setItem('logichat_user', JSON.stringify(user));
    } catch {}

    setActiveScreen('chat');
    loadSessionsFromBackend();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('logichat_user');
    } catch {}
    loadSessionsFromBackend();
    setActiveScreen('landing');
  };

  const handleCitationClick = (citationCode: string) => {
    setIsReferencesOpen(true);
    setHighlightedCitationCode(citationCode);
    // Mở luôn modal "Xem chi tiết" (toàn văn tài liệu gốc) của đúng nguồn này
    setCitationToAutoOpen(citationCode);
    setTimeout(() => {
      setHighlightedCitationCode(null);
    }, 4000);
  };

  return (
    <>
      {isAppLoading && <LiquidLoader onComplete={() => setIsAppLoading(false)} />}
      <div className="min-h-[100dvh] bg-blue-50 text-slate-900 flex flex-col font-sans selection:bg-blue-200 selection:text-blue-600">
        {/* Screen 1: Landing Page */}
      {activeScreen === 'landing' && (
        <LandingPage
          onStartChat={() => {
            setActiveScreen('chat');
          }}
          onLoginClick={() => setAuthModal({ isOpen: true, mode: 'login' })}
          onRegisterClick={() => setAuthModal({ isOpen: true, mode: 'register' })}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/* Screen 2 & 3: Chat Application & History Workspace */}
      {activeScreen !== 'landing' && (
        <div className="flex h-screen w-full overflow-hidden relative">
          
          {/* Left Navigation Sidebar (Desktop) */}
          {isDesktopSidebarOpen && (
            <>
              <Sidebar
                sessions={sessions}
                activeSessionId={activeSessionId}
                activeScreen={activeScreen}
                onSelectSession={(id) => {
                  setActiveSessionId(id);
                  setActiveScreen('chat');
                }}
                onNewChat={handleNewChat}
                onNavigateScreen={(scr) => setActiveScreen(scr)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onDeleteSession={handleDeleteSession}
                isMobileOpen={isMobileSidebarOpen}
                onCloseMobile={() => setIsMobileSidebarOpen(false)}
                currentUser={currentUser}
                onLogout={handleLogout}
                width={sidebarWidth}
                onCloseDesktop={() => setIsDesktopSidebarOpen(false)}
              />
              <Resizer
                direction="left"
                onResize={setSidebarWidth}
                minWidth={200}
                maxWidth={500}
              />
            </>
          )}

          {/* Main Content View */}
          <div className="flex-1 flex flex-row h-full relative min-w-0 transition-none">
            
            {/* Toggle Sidebar Button when collapsed */}
            {!isDesktopSidebarOpen && (
              <button
                onClick={() => setIsDesktopSidebarOpen(true)}
                className="hidden md:flex absolute top-4 left-4 z-50 p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 shadow-sm"
                title="Mở thanh điều hướng"
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
            )}

            {activeScreen === 'chat' ? (
              <ChatView
                session={activeSession}
                onSendMessage={handleSendMessage}
                onToggleReferences={() => setIsReferencesOpen(!isReferencesOpen)}
                isReferencesOpen={isReferencesOpen}
                onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
                onOpenPdfModal={openPdfModalFromMessage}
                onCitationClick={handleCitationClick}
                isGenerating={isGenerating}
              />
            ) : (
              <HistoryView
                sessions={sessions}
                onSelectSession={(id) => {
                  setActiveSessionId(id);
                  setActiveScreen('chat');
                }}
                onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
                onNewChat={handleNewChat}
                onDeleteSession={handleDeleteSession}
              />
            )}

            {/* Right Side References Panel in Chat mode */}
            {activeScreen === 'chat' && isReferencesOpen && (
              <>
                <Resizer
                  direction="right"
                  onResize={setReferencePanelWidth}
                  minWidth={250}
                  maxWidth={800}
                />
                <ReferencePanel
                  isOpen={isReferencesOpen}
                  onClose={() => setIsReferencesOpen(false)}
                  citations={activeSession.references || []}
                  attachments={activeSession.attachments}
                  highlightedCitationId={highlightedCitationCode}
                  onOpenPdfModal={(title, subtitle) =>
                    setPdfModal({ isOpen: true, title, subtitle })
                  }
                  width={referencePanelWidth}
                  autoOpenCitationCode={citationToAutoOpen}
                  onAutoOpenHandled={() => setCitationToAutoOpen(null)}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <AuthModal
        isOpen={authModal.isOpen}
        initialMode={authModal.mode}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        onSuccess={(userName, userInfo) => {
          handleAuthSuccess(userInfo || { fullName: userName });
        }}
      />

      <PdfModal
        isOpen={pdfModal.isOpen}
        title={pdfModal.title}
        subtitle={pdfModal.subtitle}
        content={pdfModal.content}
        hsCode={pdfModal.hsCode}
        taxes={pdfModal.taxes}
        citations={pdfModal.citations}
        onClose={() => setPdfModal({ ...pdfModal, isOpen: false })}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
      {/* Global Water Ripple Effect */}
      <WaterRippleMouse />
    </>
  );
}