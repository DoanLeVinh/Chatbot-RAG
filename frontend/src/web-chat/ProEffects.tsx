import React from 'react';

export default function ProBackground() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-slate-50/50">
      {/* Animated Premium Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-amber-400/10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute top-[10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-500/10 blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }}></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-fuchsia-500/10 blur-[150px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '1s' }}></div>
      
      {/* Subtle Premium Mesh Grid */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(to right, #0f172a 1px, transparent 1px), linear-gradient(to bottom, #0f172a 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  );
}
