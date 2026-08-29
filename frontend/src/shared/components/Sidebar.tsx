import React from 'react';
import { ActiveScreen, ChatSession } from '../types';
import { LogiChatLogo } from './LogiChatLogo';
import { RippleButton } from './RippleButton';
import { ClockCounterClockwise, Calendar, CalendarBlank, Plus, X, Trash, Gear, SignOut, ShieldCheck, SidebarSimple } from '@phosphor-icons/react';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  activeScreen: ActiveScreen;

  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onNavigateScreen: (screen: 'chat' | 'history' | 'landing') => void;
  onOpenSettings: () => void;

  // Xóa session
  onDeleteSession: (id: string) => void;

  isMobileOpen: boolean;
  onCloseMobile: () => void;

  currentUser?: { fullName: string } | null;
  onLogout?: () => void;
  width?: number;
  onCloseDesktop?: () => void;
  userUsage?: import('../types').UserUsage | null;
  onUpgradeClick?: () => void;
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
  width = 280,
  onCloseDesktop,
  userUsage,
  onUpgradeClick,
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
        <span className="shrink-0 flex items-center justify-center">
          {icon === 'history' && <ClockCounterClockwise size={20} weight="regular" />}
          {icon === 'calendar_today' && <Calendar size={20} weight="regular" />}
          {icon === 'date_range' && <CalendarBlank size={20} weight="regular" />}
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
          <Trash size={18} weight="fill" />
        </button>
      </li>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-surface-bright p-4 border-r border-slate-200/60 w-full">
      {/* Header */}
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

        <div className="flex items-center gap-1">
          {/* Desktop close button */}
          {onCloseDesktop && (
            <button
              onClick={onCloseDesktop}
              className="hidden md:flex text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5 transition-colors"
              title="Đóng thanh điều hướng"
            >
              <SidebarSimple size={22} weight="regular" />
            </button>
          )}

          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="md:hidden text-slate-600 hover:text-blue-600 p-1.5"
          >
            <X size={24} weight="regular" />
          </button>
        </div>
      </div>

      {/* New Chat */}
      <div className="mb-4">
        <RippleButton
          variant="primary"
          onClick={() => {
            onNewChat();
            onCloseMobile();
          }}
          className="w-full text-sm font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-2 shadow-[0_8px_20px_-8px_rgba(37,99,235,0.4)] transition-all"
        >
          <Plus size={18} weight="bold" />
          Tạo Cuộc Hỏi Đáp Mới
        </RippleButton>
      </div>

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
            <ClockCounterClockwise size={20} weight="regular" />

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

      {/* Usage Progress */}
      {userUsage && (
        <div className="px-4 py-3 mx-2 mb-2 bg-slate-50 border border-slate-200 rounded-xl mt-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-600">Gói hiện tại:</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${userUsage.plan === 'pro' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {userUsage.plan === 'pro' ? 'Logi Pro' : 'Miễn phí'}
            </span>
          </div>
          
          {userUsage.plan === 'free' && (
            <div className="space-y-3 mt-3">
              <div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span>Tin nhắn</span>
                  <span>{userUsage.usage.messages}/{userUsage.limits.messages}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-1.5 rounded-full transition-all" 
                    style={{ width: `${Math.min(100, (userUsage.usage.messages / userUsage.limits.messages) * 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span>Tải ảnh</span>
                  <span>{userUsage.usage.images}/{userUsage.limits.images}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-purple-500 h-1.5 rounded-full transition-all" 
                    style={{ width: `${Math.min(100, (userUsage.usage.images / userUsage.limits.images) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <button 
                onClick={onUpgradeClick}
                className="w-full mt-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                Nâng cấp Pro
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bottom */}
      <div className="pt-3 border-t border-slate-200">
        {currentUser ? (
          <div className="flex items-center justify-between px-1 py-1">
            <div className="flex items-center gap-2 overflow-hidden px-2">
              <div className="w-7 h-7 shrink-0 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center text-xs font-bold">
                {currentUser.fullName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-slate-700 truncate max-w-[100px]" title={currentUser.fullName}>
                {currentUser.fullName}
              </span>
            </div>
            
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                title="Cài đặt"
                onClick={() => {
                  onOpenSettings();
                  onCloseMobile();
                }}
                className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-all cursor-pointer"
              >
                <Gear size={18} weight="fill" />
              </button>

              {onLogout && (
                <button
                  title="Đăng xuất"
                  onClick={() => {
                    onLogout();
                    onCloseMobile();
                  }}
                  className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all cursor-pointer"
                >
                  <SignOut size={18} weight="fill" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              onOpenSettings();
              onCloseMobile();
            }}
            className="w-full text-slate-600 hover:bg-slate-100 hover:text-slate-800 rounded-xl px-3 py-2 flex items-center gap-2.5 cursor-pointer text-sm transition-all font-medium"
          >
            <Gear size={20} weight="regular" />
            Cài đặt
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar (now a flex child, width controlled by style) */}
      <aside 
        className="hidden md:block h-screen z-40 shrink-0 transition-all duration-0"
        style={{ width: `${width}px` }}
      >
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