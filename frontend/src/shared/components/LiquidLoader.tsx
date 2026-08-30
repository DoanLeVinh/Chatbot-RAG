import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LiquidLoaderProps {
  onComplete: () => void;
}

export const LiquidLoader: React.FC<LiquidLoaderProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'loading' | 'ripple'>('loading');
  const [loadingText, setLoadingText] = useState('INITIALIZING ENGINE...');

  useEffect(() => {
    // Dynamic text changes during load
    const texts = [
      'INITIALIZING ENGINE...',
      'LOADING NEURAL WEIGHTS...',
      'ESTABLISHING SECURE CONNECTION...',
      'READY.'
    ];
    let i = 0;
    const textInterval = setInterval(() => {
      i = (i + 1) % texts.length;
      if (i < texts.length) setLoadingText(texts[i]);
    }, 600);

    // Artificial delay to show the logo
    const timer1 = setTimeout(() => {
      setStage('ripple');
    }, 2500);

    // After ripple expands, unmount
    const timer2 = setTimeout(() => {
      onComplete();
    }, 3300);

    return () => {
      clearInterval(textInterval);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        key="liquid-loader"
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0f1c] overflow-hidden"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      >
        {/* Animated Background Orbs - Optimized using radial gradients instead of heavy blur() */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div 
            className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] rounded-full"
            style={{ 
              background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, rgba(37,99,235,0) 70%)',
              willChange: 'transform, opacity'
            }}
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-[60vw] h-[60vw] rounded-full"
            style={{ 
              background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, rgba(79,70,229,0) 70%)',
              willChange: 'transform, opacity'
            }}
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </div>

        {/* The Ripple Effect that expands (transitions into light app background) */}
        {stage === 'ripple' && (
          <motion.div
            className="absolute inset-0 bg-slate-50 z-10"
            style={{ willChange: 'clip-path' }}
            initial={{ clipPath: 'circle(0% at 50% 50%)' }}
            animate={{ clipPath: 'circle(150% at 50% 50%)' }}
            transition={{
              duration: 1.0,
              ease: [0.8, 0, 0.2, 1], // Smoother viscous ease
            }}
          />
        )}

        {/* Central Logo */}
        <motion.div
          className="relative z-20 flex flex-col items-center gap-6"
          style={{ willChange: 'transform, opacity' }}
          animate={
            stage === 'ripple'
              ? { scale: 1.8, opacity: 0 }
              : { scale: 1, opacity: 1 }
          }
          transition={{ duration: 0.6, ease: "easeIn" }}
        >
          <div className="relative flex items-center justify-center w-32 h-32">
            {/* Glowing outer rings - Added willChange for hardware acceleration */}
            <motion.div
              className="absolute inset-0 rounded-full border border-blue-400/30"
              style={{ willChange: 'transform', boxShadow: '0 0 20px rgba(59,130,246,0.2)' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-2 rounded-full border-t-2 border-r-2 border-indigo-400/60"
              style={{ willChange: 'transform' }}
              animate={{ rotate: -360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-500/20">
              <span className="material-symbols-outlined text-white text-5xl icon-fill">
                policy
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <h1 className="text-4xl font-extrabold tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
              LogiChat
            </h1>
            
            <div className="h-6 flex items-center justify-center mt-2 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p 
                  key={loadingText}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-blue-300/80 text-xs tracking-[0.3em] font-mono whitespace-nowrap"
                >
                  {loadingText}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
