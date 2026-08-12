import React from 'react';

interface LogiChatLogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const LogiChatLogo: React.FC<LogiChatLogoProps> = ({
  className = '',
  iconOnly = false,
  size = 'md',
}) => {
  const iconSizeClass = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  }[size];

  const textSizeClass = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* SVG Icon: Speech bubble with Scales of Justice inside */}
      <div className={`relative flex items-center justify-center ${iconSizeClass}`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full text-[#00236f]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Speech bubble frame */}
          <path
            d="M50 12 C26.8 12 8 28.8 8 49.5 C8 62.4 15.2 73.8 26.5 80.5 L20 92 L34.5 85.5 C39.3 86.8 44.5 87 50 87 C73.2 87 92 70.2 92 49.5 C92 28.8 73.2 12 50 12 Z"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="#faf8ff"
          />
          {/* Scales Center Pillar */}
          <path d="M50 32 L50 64 M40 64 L60 64" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          {/* Scales Top Beam */}
          <path d="M28 38 L72 38" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          {/* Left Pan Chains & Container */}
          <path d="M28 38 L22 52 L34 52 Z" fill="currentColor" stroke="currentColor" strokeWidth="2" />
          {/* Right Pan Chains & Container */}
          <path d="M72 38 L66 52 L78 52 Z" fill="currentColor" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>

      {!iconOnly && (
        <span className={`font-bold tracking-tight text-[#00236f] ${textSizeClass}`}>
          LogiChat
        </span>
      )}
    </div>
  );
};
