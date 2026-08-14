import React from 'react';
import { ActiveScreen, ChatSession } from '../types';
import { LogiChatLogo } from './LogiChatLogo';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  activeScreen: ActiveScreen;

  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onNavigateScreen: (screen: ActiveScreen) => void;
  onOpenSettings: () => void;

  // Xóa session
  onDeleteSession: (id: string) => void;

  isMobileOpen: boolean;
  onCloseMobile: () => void;

  currentUser?: { fullName: string } | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  activeScreen,
  onSelectSession,
  onNewChat,
  onNavigateScreen,
  onOpenSettings,
  onDeleteSession,
  isMobileOpen,
  onCloseMobile,
  currentUser,
  onLogout,
}) => {
  // Group sessions
  const todaySessions = sessions.filter(
    (s) => s.group === 'TODAY'
  );

  const yesterdaySessions = sessions.filter(
    (s) => s.group === 'YESTERDAY'
  );

  const last7DaysSessions = sessions.filter(
    (s) => s.group === 'LAST_7_DAYS'
  );

  /**
   * Xử lý xóa session
   */
  const handleDeleteSession = (
    e: React.MouseEvent,
    sessionId: string
  ) => {
    // Không cho click lan lên <li>
    e.stopPropagation();

    const confirmed = window.confirm(
      'Bạn có chắc chắn muốn xóa cuộc hội thoại này không?\n\n' +
      'Lịch sử hội thoại sẽ bị xóa và không thể khôi phục.'
    );

    if (!confirmed) {
      return;
    }

    onDeleteSession(sessionId);
  };

  /**
   * Render từng session
   */
  const renderSession = (
    session: ChatSession,
    icon: string
  ) => {
    const isActive =
      activeScreen === 'chat' &&
      activeSessionId === session.id;

    return (
      <li
        key={session.id}
        onClick={() => {
          onSelectSession(session.id);
          onCloseMobile();
        }}
        className={`group rounded-xl px-3 py-2 flex items-center gap-2.5 cursor-pointer text-sm transition-all ${
          isActive
            ? 'bg-blue-200 text-blue-600 font-semibold shadow-xs'
            : 'text-slate-600 hover:bg-blue-100 hover:text-blue-600'
        }`}
      >
        {/* Icon */}
        <span className="material-symbols-outlined text-[18px] shrink-0">
          {icon}
        </span>

        {/* Title */}
        <span className="truncate flex-1 min-w-0">
          {session.title}
        </span>

        {/* Delete */}
        <button
          type="button"
          onClick={(e) =>
            handleDeleteSession(e, session.id)
          }
          title="Xóa hội thoại"
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
        >
          <span className="material-symbols-outlined text-[17px]">
            delete
          </span>
        </button>
      </li>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#d2d9f4] p-4 border-r border-blue-200 w-[280px]">

      {/* Brand Header */}
      <div className="flex items-center justify-between mb-5 px-1 pt-1">
        <div
          onClick={() => onNavigateScreen('landing')}
          className="cursor-pointer group flex items-center gap-2"
        >
          <LogiChatLogo iconOnly size="sm" />

          <div>
            <h1 className="font-bold text-blue-600 text-base leading-tight group-hover:text-blue-700 transition-colors">
              LogiChat History
            </h1>

            <p className="text-xs text-slate-600">
              Legal Assistant
            </p>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="md:hidden text-slate-600 hover:text-blue-600 p-1"
        >
          <span className="material-symbols-outlined text-xl">
            close
          </span>
        </button>
      </div>

      {/* New Chat */}
      <button
        onClick={() => {
          onNewChat();
          onCloseMobile();
        }}
        className="w-full bg-slate-900 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 mb-4 hover:bg-[#1e293b] transition-all shadow-[0_4px_12px_rgba(19,27,46,0.1)] active:scale-[0.98] text-sm"
      >
        <span className="material-symbols-outlined text-[18px]">
          add
        </span>

        New Chat
      </button>

      {/* Navigation & Session Groups */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">

        {/* History */}
        <div>
          <button
            onClick={() => {
              onNavigateScreen('history');
              onCloseMobile();
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeScreen === 'history'
                ? 'bg-blue-200 text-blue-600'
                : 'text-slate-600 hover:bg-blue-100 hover:text-blue-600'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              history
            </span>

            <span className="truncate">
              Lịch sử hội thoại
            </span>
          </button>
        </div>

        {/* TODAY */}
        {todaySessions.length > 0 && (
          <div>
            <h2 className="text-[11px] font-semibold text-slate-600 px-3 mb-1.5 uppercase tracking-wider">
              Today
            </h2>

            <ul className="space-y-1">
              {todaySessions.map((session) =>
                renderSession(session, 'history')
              )}
            </ul>
          </div>
        )}

        {/* YESTERDAY */}
        {yesterdaySessions.length > 0 && (
          <div>
            <h2 className="text-[11px] font-semibold text-slate-600 px-3 mb-1.5 uppercase tracking-wider">
              Yesterday
            </h2>

            <ul className="space-y-1">
              {yesterdaySessions.map((session) =>
                renderSession(session, 'calendar_today')
              )}
            </ul>
          </div>
        )}

        {/* LAST 7 DAYS */}
        {last7DaysSessions.length > 0 && (
          <div>
            <h2 className="text-[11px] font-semibold text-slate-600 px-3 mb-1.5 uppercase tracking-wider">
              Last 7 Days
            </h2>

            <ul className="space-y-1">
              {last7DaysSessions.map((session) =>
                renderSession(session, 'date_range')
              )}
            </ul>
          </div>
        )}

      </div>

      {/* Bottom */}
      <div className="mt-auto pt-3 border-t border-blue-200">

        {/* Current User */}
        {currentUser && (
          <div className="px-3 py-2 mb-1 flex items-center gap-2">

            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
              {currentUser.fullName
                .charAt(0)
                .toUpperCase()}
            </div>

            <span className="text-xs font-medium text-slate-900 truncate max-w-[150px]">
              Hi, {currentUser.fullName}
            </span>
          </div>
        )}

        {/* Settings */}
        <button
          onClick={() => {
            onOpenSettings();
            onCloseMobile();
          }}
          className="w-full text-slate-600 hover:bg-blue-100 hover:text-blue-600 rounded-xl px-3 py-2 flex items-center gap-2.5 cursor-pointer text-sm transition-all font-medium"
        >
          <span className="material-symbols-outlined text-[18px]">
            settings
          </span>

          Cài đặt
        </button>

        {/* Logout */}
        {currentUser && onLogout && (
          <button
            onClick={() => {
              onLogout();
              onCloseMobile();
            }}
            className="w-full text-[#e11d48] hover:bg-[#ffe4e6] hover:text-[#be123c] rounded-xl px-3 py-2 flex items-center gap-2.5 cursor-pointer text-sm transition-all font-medium mt-1"
          >
            <span className="material-symbols-outlined text-[18px]">
              logout
            </span>

            Đăng xuất
          </button>
        )}

      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden md:block fixed left-0 top-0 h-screen z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">

          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          <div className="relative z-10">
            {sidebarContent}
          </div>

        </div>
      )}
    </>
  );
};