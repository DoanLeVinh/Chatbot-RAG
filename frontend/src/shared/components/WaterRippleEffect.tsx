import React, { useEffect, useRef, useState } from 'react';

interface WaterRippleEffectProps {
  interactive?: boolean;
  opacity?: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
  lineWidth: number;
  color: string;
}

export const WaterRippleEffect: React.FC<WaterRippleEffectProps> = ({
  interactive = true,
  opacity = 0.6,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [effectEnabled, setEffectEnabled] = useState(true);
  const [rippleMode, setRippleMode] = useState<'wave' | 'liquid'>('wave');
  const ripplesRef = useRef<Ripple[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Color choices for water ripples
    const colors = [
      'rgba(0, 35, 111, ',   // Navy primary
      'rgba(30, 58, 138, ',  // Dark blue
      'rgba(144, 168, 255, ',// Light blue
      'rgba(80, 95, 118, ',  // Secondary slate
    ];

    const addRipple = (x: number, y: number, isClick = false) => {
      if (!effectEnabled) return;
      const baseColor = colors[Math.floor(Math.random() * colors.length)];
      const maxR = isClick ? 180 + Math.random() * 80 : 80 + Math.random() * 40;
      ripplesRef.current.push({
        x,
        y,
        radius: 2,
        maxRadius: maxR,
        alpha: isClick ? 0.8 : 0.4,
        speed: isClick ? 3.5 : 2.0,
        lineWidth: isClick ? 3.5 : 1.8,
        color: baseColor,
      });

      // Limit max ripples for high performance (60fps)
      if (ripplesRef.current.length > 35) {
        ripplesRef.current.shift();
      }
    };

    // Auto add random gentle raindrops periodically
    const interval = setInterval(() => {
      if (!effectEnabled) return;
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      addRipple(rx, ry, false);
    }, 1800);

    let lastMoveTime = 0;
    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive || !effectEnabled) return;
      const now = Date.now();
      if (now - lastMoveTime > 80) { // Throttle mousemove
        const rect = canvas.getBoundingClientRect();
        addRipple(e.clientX - rect.left, e.clientY - rect.top, false);
        lastMoveTime = now;
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!interactive || !effectEnabled) return;
      const rect = canvas.getBoundingClientRect();
      // Add multiple concentric ripples on click for extra liquid splash impact
      addRipple(e.clientX - rect.left, e.clientY - rect.top, true);
      setTimeout(() => {
        addRipple(e.clientX - rect.left, e.clientY - rect.top, true);
      }, 120);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (effectEnabled) {
        for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
          const r = ripplesRef.current[i];
          r.radius += r.speed;
          r.alpha -= 0.012;

          if (r.alpha <= 0 || r.radius >= r.maxRadius) {
            ripplesRef.current.splice(i, 1);
            continue;
          }

          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `${r.color}${r.alpha * opacity})`;
          ctx.lineWidth = r.lineWidth;
          ctx.shadowBlur = 12;
          ctx.shadowColor = 'rgba(144, 168, 255, 0.4)';
          ctx.stroke();

          if (rippleMode === 'liquid') {
            // Draw secondary subtle refraction ring
            ctx.beginPath();
            ctx.arc(r.x, r.y, Math.max(0, r.radius - 8), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${r.alpha * opacity * 0.5})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [interactive, opacity, effectEnabled, rippleMode]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500"
        style={{ opacity: effectEnabled ? opacity : 0 }}
      />

      {/* Floating Control Widget for Water Effects in bottom left corner */}
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#c5c5d3] shadow-md text-xs font-medium text-[#131b2e] hover:bg-white transition-all">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-[#00236f] animate-pulse">
            water_drop
          </span>
          <span className="hidden sm:inline font-semibold">Hiệu ứng nước</span>
        </div>
        <button
          onClick={() => setEffectEnabled(!effectEnabled)}
          className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-colors ${
            effectEnabled
              ? 'bg-[#00236f] text-white'
              : 'bg-[#f2f3ff] text-[#757682]'
          }`}
          title="Bật/tắt gợn sóng nước tương tác"
        >
          {effectEnabled ? 'Đang bật' : 'Đã tắt'}
        </button>
        {effectEnabled && (
          <button
            onClick={() => setRippleMode(rippleMode === 'wave' ? 'liquid' : 'wave')}
            className="px-2 py-0.5 rounded-full text-[10px] bg-[#d0e1fb] text-[#00236f] hover:bg-[#b6c4ff] transition-colors"
            title="Đổi kiểu hiệu ứng nước"
          >
            {rippleMode === 'wave' ? 'Sóng' : 'Thạch'}
          </button>
        )}
      </div>
    </>
  );
};
