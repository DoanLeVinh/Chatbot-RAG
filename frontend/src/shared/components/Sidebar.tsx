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
  isMobileOpen,
  onCloseMobile,
  currentUser,
  onLogout,
}) => {
  // Group sessions
  const todaySessions = sessions.filter((s) => s.group === 'TODAY');
  const yesterdaySessions = sessions.filter((s) => s.group === 'YESTERDAY');
  const last7DaysSessions = sessions.filter((s) => s.group === 'LAST_7_DAYS');

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#d2d9f4] p-4 border-r border-[#c5c5d3] w-[280px]">
      {/* Brand Header */}
      <div className="flex items-center justify-between mb-5 px-1 pt-1">
        <div
          onClick={() => onNavigateScreen('landing')}
          className="cursor-pointer group flex items-center gap-2"
        >
          <LogiChatLogo iconOnly size="sm" />
          <div>
            <h1 className="font-bold text-[#00236f] text-base leading-tight group-hover:text-[#1e3a8a] transition-colors">
              LogiChat History
            </h1>
            <p className="text-xs text-[#444651]">Legal Assistant</p>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="md:hidden text-[#444651] hover:text-[#00236f] p-1"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* New Chat Button */}
      <button
        onClick={() => {
          onNewChat();
          onCloseMobile();
        }}
        className="w-full bg-[#131b2e] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 mb-4 hover:bg-[#1e293b] transition-all shadow-[0_4px_12px_rgba(19,27,46,0.1)] active:scale-[0.98] text-sm"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        New Chat
      </button>

      {/* Navigation & Session Groups */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {/* Quick link to History Dashboard */}
        <div>
          <button
            onClick={() => {
              onNavigateScreen('history');
              onCloseMobile();
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeScreen === 'history'
                ? 'bg-[#d0e1fb] text-[#00236f]'
                : 'text-[#444651] hover:bg-[#e2e7ff] hover:text-[#00236f]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            <span className="truncate">Lịch sử hội thoại</span>
          </button>
        </div>

        {/* TODAY */}
        {todaySessions.length > 0 && (
          <div>
            <h2 className="text-[11px] font-semibold text-[#444651] px-3 mb-1.5 uppercase tracking-wider">
              Today
            </h2>
            <ul className="space-y-1">
              {todaySessions.map((session) => {
                const isActive =
                  activeScreen === 'chat' && activeSessionId === session.id;
                return (
                  <li
                    key={session.id}
                    onClick={() => {
                      onSelectSession(session.id);
                      onCloseMobile();
                    }}
                    className={`rounded-xl px-3 py-2 flex items-center gap-2.5 cursor-pointer text-sm transition-all ${
                      isActive
                        ? 'bg-[#d0e1fb] text-[#00236f] font-semibold shadow-xs'
                        : 'text-[#444651] hover:bg-[#e2e7ff] hover:text-[#00236f]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] shrink-0">
                      history
                    </span>
                    <span className="truncate">{session.title}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* YESTERDAY */}
        {yesterdaySessions.length > 0 && (
          <div>
            <h2 className="text-[11px] font-semibold text-[#444651] px-3 mb-1.5 uppercase tracking-wider">
              Yesterday
            </h2>
            <ul className="space-y-1">
              {yesterdaySessions.map((session) => {
                const isActive =
                  activeScreen === 'chat' && activeSessionId === session.id;
                return (
                  <li
                    key={session.id}
                    onClick={() => {
                      onSelectSession(session.id);
                      onCloseMobile();
                    }}
                    className={`rounded-xl px-3 py-2 flex items-center gap-2.5 cursor-pointer text-sm transition-all ${
                      isActive
                        ? 'bg-[#d0e1fb] text-[#00236f] font-semibold'
                        : 'text-[#444651] hover:bg-[#e2e7ff] hover:text-[#00236f]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] shrink-0">
                      calendar_today
                    </span>
                    <span className="truncate">{session.title}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* LAST 7 DAYS */}
        {last7DaysSessions.length > 0 && (
          <div>
            <h2 className="text-[11px] font-semibold text-[#444651] px-3 mb-1.5 uppercase tracking-wider">
              Last 7 Days
            </h2>
            <ul className="space-y-1">
              {last7DaysSessions.map((session) => {
                const isActive =
                  activeScreen === 'chat' && activeSessionId === session.id;
                return (
                  <li
                    key={session.id}
                    onClick={() => {
                      onSelectSession(session.id);
                      onCloseMobile();
                    }}
                    className={`rounded-xl px-3 py-2 flex items-center gap-2.5 cursor-pointer text-sm transition-all ${
                      isActive
                        ? 'bg-[#d0e1fb] text-[#00236f] font-semibold'
                        : 'text-[#444651] hover:bg-[#e2e7ff] hover:text-[#00236f]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] shrink-0">
                      date_range
                    </span>
                    <span className="truncate">{session.title}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Settings at Bottom */}
      <div className="mt-auto pt-3 border-t border-[#c5c5d3]">
        {currentUser && (
          <div className="px-3 py-2 mb-1 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#00236f] text-white flex items-center justify-center text-xs font-bold">
              {currentUser.fullName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-[#131b2e] truncate max-w-[150px]">
              Hi, {currentUser.fullName}
            </span>
          </div>
        )}
        <button
          onClick={() => {
            onOpenSettings();
            onCloseMobile();
          }}
          className="w-full text-[#444651] hover:bg-[#e2e7ff] hover:text-[#00236f] rounded-xl px-3 py-2 flex items-center gap-2.5 cursor-pointer text-sm transition-all font-medium"
        >
          <span className="material-symbols-outlined text-[18px]">settings</span>
          Settings
        </button>
        {onLogout && (
          <button
            onClick={() => {
              onLogout();
              onCloseMobile();
            }}
            className="w-full text-[#e11d48] hover:bg-[#ffe4e6] hover:text-[#be123c] rounded-xl px-3 py-2 flex items-center gap-2.5 cursor-pointer text-sm transition-all font-medium mt-1"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
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

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />
          <div className="relative z-10">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
