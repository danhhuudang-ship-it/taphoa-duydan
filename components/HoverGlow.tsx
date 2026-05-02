'use client';
import { useCallback } from 'react';

/**
 * Hook trả về handler onMouseMove + onMouseLeave để gán vào element.
 * Element phải có class .glow-card hoặc .card-hover để CSS bắt được.
 *
 * Cập nhật trực tiếp CSS variables trên element (không dùng React state)
 * → không gây re-render → cực mượt.
 */
export function useGlow() {
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, []);
  return { onMouseMove };
}
