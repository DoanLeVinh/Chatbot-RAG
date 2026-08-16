import React, { useRef, useEffect } from 'react';

interface ResizerProps {
  onResize: (newWidth: number) => void;
  direction?: 'left' | 'right';
  minWidth?: number;
  maxWidth?: number;
}

export const Resizer: React.FC<ResizerProps> = ({
  onResize,
  direction = 'left',
  minWidth = 200,
  maxWidth = 600,
}) => {
  const isResizing = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      
      let newWidth = direction === 'left' ? e.clientX : window.innerWidth - e.clientX;
      
      if (newWidth < minWidth) newWidth = minWidth;
      if (newWidth > maxWidth) newWidth = maxWidth;
      
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [direction, minWidth, maxWidth, onResize]);

  return (
    <div
      className="hidden md:block w-[3px] hover:w-[3px] hover:bg-blue-400 active:bg-blue-500 bg-transparent cursor-col-resize shrink-0 transition-colors h-full relative group z-40"
      onMouseDown={handleMouseDown}
    >
        <div className="absolute inset-y-0 -inset-x-2" /> {/* Invisible larger hit area for easier grabbing */}
        <div className="w-[1px] h-full bg-slate-200 mx-auto group-hover:bg-transparent" />
    </div>
  );
};
