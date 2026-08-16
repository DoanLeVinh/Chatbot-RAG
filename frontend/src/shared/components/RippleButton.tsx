import React, { useState } from 'react';
import { motion, AnimatePresence, HTMLMotionProps } from 'motion/react';

interface RippleButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass';
}

export const RippleButton: React.FC<RippleButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  onClick,
  ...props
}) => {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setRipples((prev) => [...prev, { x, y, id: Date.now() }]);

    if (onClick) {
      onClick(e);
    }
  };

  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm border border-transparent',
    secondary: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-transparent',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-blue-600 border border-transparent',
    glass: 'liquid-glass text-blue-600 hover:bg-white/90',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`relative overflow-hidden inline-flex items-center justify-center font-medium transition-colors ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.35 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            onAnimationComplete={() => {
              setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
            }}
            className="absolute bg-current rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 100,
              height: 100,
              transformOrigin: 'center center',
              marginLeft: -50,
              marginTop: -50,
            }}
          />
        ))}
      </AnimatePresence>
    </motion.button>
  );
};
