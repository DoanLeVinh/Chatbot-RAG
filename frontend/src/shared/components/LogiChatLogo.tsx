import React from 'react';
import { Anchor } from '@phosphor-icons/react';

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
    sm: 'w-10 h-10 rounded-xl',
    md: 'w-12 h-12 rounded-2xl',
    lg: 'w-16 h-16 rounded-[1.25rem]',
    xl: 'w-28 h-28 rounded-[2rem]',
  }[size];

  const anchorSize = {
    sm: 20,
    md: 24,
    lg: 32,
    xl: 56,
  }[size];

  const textSizeClass = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-4xl',
    xl: 'text-5xl',
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Premium Glass-like Logo Wrapper */}
      <div className={`relative flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[0_4px_12px_rgba(79,70,229,0.25)] overflow-hidden flex-shrink-0 transition-transform hover:scale-105 hover:shadow-[0_8px_20px_rgba(79,70,229,0.35)] duration-300 ${iconSizeClass}`}>
        <Anchor size={anchorSize} weight="bold" className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] z-10" />
        
        {/* Subtle glass reflection layer */}
        <div className="absolute inset-0 border-[0.5px] border-white/30 rounded-inherit pointer-events-none" />
        <div className="absolute -top-1/2 -right-1/2 w-[150%] h-[150%] bg-gradient-to-b from-white/20 to-transparent rotate-45 transform pointer-events-none" />
      </div>

      {!iconOnly && (
        <span className={`font-semibold tracking-tight text-slate-800 ${textSizeClass}`}>
          Logi<span className="text-blue-600 font-extrabold">Chat</span>
        </span>
      )}
    </div>
  );
};
