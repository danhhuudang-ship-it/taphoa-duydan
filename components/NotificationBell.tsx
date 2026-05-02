'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, ShoppingBag, Package, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';

type LowStock = { id: string; name: string; stock: number; min_stock: number | null };
type RecentOrder = { id: string; code: string; total: number; created_at: string };

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [low, setLow] = useState<LowStock[]>([]);
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Load data
  const load = async () => {
    setLoading(true);
    const supabase = createClient();

    const today = new Date(); today.setHours(0,0,0,0);

    const [lowResp, recentResp, todayResp] = await Promise.all([
      supabase.from('products')
        .select('id, name, stock, min_stock')
        .lt('stock', 10)
        .order('stock', { ascending: true })
        .limit(20),
      supabase.from('orders')
        .select('id, code, total, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('orders')
        .select('total')
        .gte('created_at', today.toISOString()),
    ]);

    setLow(lowResp.data || []);
    setRecent(recentResp.data || []);
    const td = todayResp.data || [];
    setTodayCount(td.length);
    setTodayRevenue(td.reduce((s, o) => s + Number(o.total || 0), 0));
    setLoading(false);
  };

  // Load lần đầu để có badge count
  useEffect(() => {
    load();
    const t = setInterval(load, 60000); // refresh mỗi phút
    return () => clearInterval(t);
  }, []);

  // Re-load khi mở dropdown
  useEffect(() => {
    if (open) load();
  }, [open]);

  // Click outside to close
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [open]);

  const totalAlerts = low.length;

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileHover={{ scale: 1.05, rotate: -8 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl glass hover:border-white/20"
      >
        <Bell className="size-5" />
        {totalAlerts > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-[10px] font-bold flex items-center justify-center shadow-glow">
            {totalAlerts > 99 ? '99+' : totalAlerts}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[340px] max-h-[80vh] glass-strong rounded-2xl overflow-hidden shadow-glow-lg z-50"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="font-bold">Thông báo</div>
                <div className="text-xs text-slate-400">{loading ? 'Đang tải...' : 'Cập nhật mỗi phút'}</div>
              </div>
              <button onClick={() => load()} className="text-xs text-slate-400 hover:text-white">↻</button>
            </div>

            <div className="overflow-y-auto max-h-[calc(80vh-60px)]">
              {/* Hôm nay */}
              <div className="p-4 border-b border-white/5">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                  <ShoppingBag className="size-3" /> Hôm nay
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 glass p-3">
                    <div className="text-xs text-slate-400">Số đơn</div>
                    <div className="font-bold text-lg">{todayCount}</div>
                  </div>
                  <div className="flex-1 glass p-3">
                    <div className="text-xs text-slate-400">Doanh thu</div>
                    <div className="font-bold text-sm text-gradient">{formatCurrency(todayRevenue)}</div>
                  </div>
                </div>
              </div>

              {/* Tồn kho thấp */}
              <div className="p-4 border-b border-white/5">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                  <AlertTriangle className="size-3 text-amber-300" /> Tồn kho thấp ({low.length})
                </div>
                {low.length === 0 ? (
                  <div className="text-xs text-slate-500 italic">Chưa có sản phẩm nào sắp hết.</div>
                ) : (
                  <div className="space-y-1">
                    {low.slice(0, 5).map((p) => (
                      <Link
                        key={p.id}
                        href="/products"
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Package className="size-3.5 text-slate-400 shrink-0" />
                          <span className="text-sm truncate">{p.name}</span>
                        </div>
                        <span className={`badge ${p.stock <= 0 ? 'badge-danger' : 'badge-warn'} shrink-0`}>{p.stock <= 0 ? 'Hết' : `${p.stock}`}</span>
                      </Link>
                    ))}
                    {low.length > 5 && (
                      <Link
                        href="/products"
                        onClick={() => setOpen(false)}
                        className="block text-center text-xs text-slate-400 hover:text-white py-1"
                      >
                        Xem thêm {low.length - 5} sản phẩm →
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Đơn gần đây */}
              <div className="p-4">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                  <span>Đơn gần đây</span>
                  <Link href="/orders" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white normal-case tracking-normal flex items-center gap-0.5">
                    Tất cả <ChevronRight className="size-3" />
                  </Link>
                </div>
                {recent.length === 0 ? (
                  <div className="text-xs text-slate-500 italic">Chưa có đơn nào.</div>
                ) : (
                  <div className="space-y-1">
                    {recent.map((o) => (
                      <Link
                        key={o.id}
                        href="/orders"
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-mono text-slate-300 truncate">{o.code}</div>
                          <div className="text-[10px] text-slate-500">{new Date(o.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</div>
                        </div>
                        <div className="font-semibold text-sm">{formatCurrency(o.total)}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
