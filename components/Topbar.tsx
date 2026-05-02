'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Store } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { createClient } from '@/lib/supabase/client';

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
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-8 py-3 md:py-4 backdrop-blur-md bg-black/20 border-b border-white/5">
      {/* Mobile: small logo + shop name */}
      <div className="md:hidden flex items-center gap-2 min-w-0">
        <div className="size-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-pink-500 shadow-glow shrink-0">
          <Store className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-slate-400 leading-none truncate">{shopName || '—'}</div>
          <div className="text-base font-bold text-gradient leading-tight truncate">{title}</div>
        </div>
      </div>

      {/* Desktop: big title */}
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden md:block text-xl md:text-2xl font-bold text-gradient"
      >
        {title}
      </motion.h1>

      <div className="ml-auto hidden md:flex items-center gap-2 glass px-3 py-2 w-72">
        <Search className="size-4 text-slate-400" />
        <input className="bg-transparent outline-none text-sm flex-1" placeholder="Tìm kiếm nhanh..." />
        <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 border border-white/10">⌘K</kbd>
      </div>

      <div className="ml-auto md:ml-0">
        <NotificationBell />
      </div>
    </header>
  );
}
