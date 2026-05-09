'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';

export default function Topbar({ title }: { title: string }) {
  const [shopName, setShopName] = useState('');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from('settings').select('shop_name').eq('id', 1).maybeSingle();
      if (data?.shop_name) setShopName(data.shop_name);
    })();
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-8 py-3 bg-white/95 backdrop-blur border-b border-slate-200">
      <Link href="/dashboard" className="md:hidden flex items-center gap-2 min-w-0" title="Tổng quan">
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-xl blur-sm opacity-60 bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-pink-500" />
          <div className="relative size-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-pink-500">
            <Sparkles className="size-4 text-white animate-wobble" />
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-slate-500 leading-none truncate font-medium">{shopName || '—'}</div>
          <div className="text-base font-extrabold text-slate-900 leading-tight truncate">{title}</div>
        </div>
      </Link>

      <h1 className="hidden md:block text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>

      <div className="ml-auto hidden md:flex items-center gap-2 px-3 py-2 w-72 rounded-xl bg-slate-50 border border-slate-200">
        <Search className="size-4 text-slate-400" />
        <input className="bg-transparent outline-none text-sm flex-1 text-slate-700" placeholder="Tìm kiếm nhanh..." />
        <kbd>⌘K</kbd>
      </div>

      <div className="ml-auto md:ml-0 flex items-center gap-2">
        <ThemeToggle />
        <NotificationBell />
      </div>
    </header>
  );
}
