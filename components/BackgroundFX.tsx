'use client';
import { useEffect, useRef } from 'react';

export default function BackgroundFX() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // hover-glow theo chuột — set CSS vars trên các .glow-card đang hover
    const handler = (e: MouseEvent) => {
      const targets = document.querySelectorAll<HTMLElement>('.glow-card');
      targets.forEach((el) => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        if (x >= -20 && x <= 120 && y >= -20 && y <= 120) {
          el.style.setProperty('--mx', x + '%');
          el.style.setProperty('--my', y + '%');
        }
      });
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return (
    <div ref={ref} className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="orb" style={{ width: 480, height: 480, top: -120, left: -120, background: '#6366f1' }} />
      <div className="orb" style={{ width: 520, height: 520, top: '20%', right: -180, background: '#ec4899', animationDelay: '-3s' }} />
      <div className="orb" style={{ width: 440, height: 440, bottom: -140, left: '30%', background: '#22d3ee', animationDelay: '-7s' }} />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
        }}
      />
    </div>
  );
}
