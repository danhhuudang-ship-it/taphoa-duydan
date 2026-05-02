'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (typeof window !== 'undefined' ? localStorage.getItem('theme') : null) as 'light' | 'dark' | null;
    const initial = stored || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    setTheme(initial);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  if (!mounted) {
    return <div className="size-10 rounded-xl bg-white border border-slate-200" />;
  }

  return (
    <button
      onClick={toggle}
      title={theme === 'light' ? 'Chuyển sang Dark mode' : 'Chuyển sang Light mode'}
      aria-label="Toggle theme"
      className="relative size-10 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 flex items-center justify-center transition bounce"
    >
      <Sun className={`absolute size-5 text-amber-500 transition-all ${theme === 'light' ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'}`} />
      <Moon className={`absolute size-5 text-indigo-400 transition-all ${theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} />
    </button>
  );
}
