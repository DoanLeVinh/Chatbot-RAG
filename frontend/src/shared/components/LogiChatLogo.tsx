import React from 'react';

interface LogiChatLogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const LogiChatLogo: React.FC<LogiChatLogoProps> = ({
  className = '',
  iconOnly = false,
  size = 'md',
}) => {
  const iconSizeClass = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl',
    xl: 'w-24 h-24 rounded-3xl',
  }[size];

  const textSizeClass = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Liquid Glass Logo Wrapper */}
      <div className={`relative flex items-center justify-center bg-white shadow-sm overflow-hidden flex-shrink-0 ${iconSizeClass}`}>
        <img
          src="/logo.jpg"
          alt="LogiChat Maritime Logo"
          className="w-full h-full object-cover animate-float-water"
          draggable="false"
        />
        {/* Glass reflection layer */}
        <div className="absolute inset-0 border border-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] pointer-events-none rounded-inherit"></div>
      </div>

      {!iconOnly && (
        <span className={`font-semibold tracking-tight text-slate-800 ${textSizeClass}`}>
          Logi<span className="text-blue-600 font-bold">Chat</span>
        </span>
      )}
    </div>
  );
};
