'use client';
import { useEffect, useState } from 'react';
import { Search, Store } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import NotificationBell from '@/components/NotificationBell';

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
      <div className="md:hidden flex items-center gap-2 min-w-0">
        <div className="size-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 shrink-0">
          <Store className="size-4 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-slate-500 leading-none truncate">{shopName || '—'}</div>
          <div className="text-base font-bold text-slate-900 leading-tight truncate">{title}</div>
        </div>
      </div>

      <h1 className="hidden md:block text-2xl font-bold text-slate-900">{title}</h1>

      <div className="ml-auto hidden md:flex items-center gap-2 px-3 py-2 w-72 rounded-xl bg-slate-50 border border-slate-200">
        <Search className="size-4 text-slate-400" />
        <input className="bg-transparent outline-none text-sm flex-1 text-slate-700" placeholder="Tìm kiếm nhanh..." />
        <kbd>⌘K</kbd>
      </div>

      <div className="ml-auto md:ml-0">
        <NotificationBell />
      </div>
    </header>
  );
}
