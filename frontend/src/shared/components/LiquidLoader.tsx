import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LiquidLoaderProps {
  onComplete: () => void;
}

export const LiquidLoader: React.FC<LiquidLoaderProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'loading' | 'ripple'>('loading');

  useEffect(() => {
    // Artificial delay to show the logo
    const timer1 = setTimeout(() => {
      setStage('ripple');
    }, 1200);

    // After ripple expands, unmount
    const timer2 = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        key="liquid-loader"
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900 overflow-hidden"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        {/* The Ripple Effect that expands */}
        {stage === 'ripple' && (
          <motion.div
            className="absolute inset-0 bg-blue-50 z-10"
            initial={{ clipPath: 'circle(0% at 50% 50%)' }}
            animate={{ clipPath: 'circle(150% at 50% 50%)' }}
            transition={{
              duration: 1.2,
              ease: [0.7, 0, 0.3, 1], // Viscous ease
            }}
          />
        )}

        {/* Central Logo */}
        <motion.div
          className="relative z-20 flex flex-col items-center gap-4"
          animate={
            stage === 'ripple'
              ? { scale: 1.5, opacity: 0 }
              : { scale: 1, opacity: 1 }
          }
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <div className="relative">
            <span className="material-symbols-outlined text-white text-6xl icon-fill drop-shadow-lg">
              policy
            </span>
            {/* Pulsing ring around logo */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-white"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-widest uppercase">
            LogiChat
          </h1>
          <p className="text-[#90a8ff] text-sm tracking-widest uppercase font-mono">
            Initializing Engine
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
