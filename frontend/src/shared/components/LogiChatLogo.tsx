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
    sm: 22,
    md: 26,
    lg: 36,
    xl: 64,
  }[size];

  const textSizeClass = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-4xl',
    xl: 'text-5xl',
  }[size];

  return (
    <div className={`flex items-center gap-3.5 select-none ${className}`}>
      {/* Prominent Gradient Logo Wrapper */}
      <div className={`relative flex items-center justify-center bg-gradient-to-tr from-blue-700 to-blue-500 shadow-[0_8px_20px_rgba(37,99,235,0.3)] overflow-hidden flex-shrink-0 transition-transform hover:scale-105 duration-300 ${iconSizeClass}`}>
        <Anchor size={anchorSize} weight="bold" className="text-white drop-shadow-md z-10" />
        
        {/* Subtle glass reflection layer */}
        <div className="absolute inset-0 border border-white/20 rounded-inherit pointer-events-none" />
        <div className="absolute -top-4 -right-4 w-12 h-12 bg-white/20 blur-xl rounded-full" />
      </div>

      {!iconOnly && (
        <span className={`font-semibold tracking-tight text-slate-800 ${textSizeClass}`}>
          Logi<span className="text-blue-600 font-bold">Chat</span>
        </span>
      )}
    </div>
  );
};
