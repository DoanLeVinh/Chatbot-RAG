import React from 'react';
import { LogiChatLogo } from './LogiChatLogo';

interface HeaderProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onGoHome?: () => void;
  currentUser?: { fullName: string } | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onLoginClick,
  onRegisterClick,
  onGoHome,
  currentUser,
  onLogout,
}) => {
  return (
    <header className="bg-white/90 backdrop-blur-md text-blue-600 flex justify-between items-center h-16 px-4 md:px-8 w-full sticky top-0 z-40 border-b border-blue-200">
      <div
        onClick={onGoHome}
        className="cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all duration-150"
      >
        <LogiChatLogo size="md" />
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        {currentUser ? (
          <div className="flex items-center gap-4">
            <span className="font-medium text-sm text-slate-600">
              Hi, <strong className="text-blue-600">{currentUser.fullName}</strong>
            </span>
            <button
              onClick={onLogout}
              className="text-[#e11d48] hover:text-[#be123c] font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-[#ffe4e6] transition-colors"
            >
              Đăng xuất
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={onLoginClick}
              className="text-slate-600 hover:text-blue-600 transition-colors font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50"
            >
              Đăng nhập
            </button>
            <button
              onClick={onRegisterClick}
              className="bg-slate-900 text-white hover:bg-[#1e293b] active:scale-[0.98] transition-all text-sm px-4 py-2 rounded-lg font-bold shadow-[0_4px_12px_rgba(19,27,46,0.15)]"
            >
              Đăng ký
            </button>
          </>
        )}
      </div>
    </header>
  );
};
