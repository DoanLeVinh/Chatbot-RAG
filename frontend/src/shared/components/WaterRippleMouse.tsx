import React, { useEffect, useState } from 'react';

export const WaterRippleMouse: React.FC = () => {
  const [enabled, setEnabled] = useState(
    localStorage.getItem('waterRippleEnabled') !== 'false'
  );

  useEffect(() => {
    const handleSettingChange = () => {
      setEnabled(localStorage.getItem('waterRippleEnabled') !== 'false');
    };
    window.addEventListener('ripple_setting_changed', handleSettingChange);
    return () => window.removeEventListener('ripple_setting_changed', handleSettingChange);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let lastTime = 0;
    const throttleMs = 50; // Spawns a ripple every 50ms

    const handleMouseMove = (e: MouseEvent) => {
      // Don't spawn ripples if hovering over interactive elements to keep UI clean
      if (
        e.target instanceof HTMLElement && 
        (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.tagName === 'INPUT')
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastTime < throttleMs) return;
      lastTime = now;

      const ripple = document.createElement('div');
      ripple.className = 'fixed pointer-events-none rounded-full border border-blue-400/30 bg-blue-200/10 z-[100]';
      ripple.style.left = `${e.clientX - 5}px`;
      ripple.style.top = `${e.clientY - 5}px`;
      ripple.style.width = '10px';
      ripple.style.height = '10px';
      ripple.style.transition = 'all 800ms cubic-bezier(0.1, 0.8, 0.2, 1)';
      ripple.style.opacity = '0.8';
      ripple.style.transform = 'scale(1)';

      document.body.appendChild(ripple);

      // Trigger animation
      requestAnimationFrame(() => {
        ripple.style.transform = 'scale(4)';
        ripple.style.opacity = '0';
      });

      // Cleanup
      setTimeout(() => {
        if (document.body.contains(ripple)) {
          document.body.removeChild(ripple);
        }
      }, 800);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [enabled]);

  return null;
};
