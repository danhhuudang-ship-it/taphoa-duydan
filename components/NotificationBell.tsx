'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, AlertTriangle, ShoppingBag, Package, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

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

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    const today = new Date(); today.setHours(0,0,0,0);

    const [lowResp, recentResp, todayResp] = await Promise.all([
      supabase.from('products').select('id, name, stock, min_stock').lt('stock', 10).order('stock', { ascending: true }).limit(20),
      supabase.from('orders').select('id, code, total, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('orders').select('total').gte('created_at', today.toISOString()),
    ]);

    setLow(lowResp.data || []);
    setRecent(recentResp.data || []);
    const td = todayResp.data || [];
    setTodayCount(td.length);
    setTodayRevenue(td.reduce((s, o) => s + Number(o.total || 0), 0));
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (open) load(); }, [open]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [open]);

  const totalAlerts = low.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative size-10 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 flex items-center justify-center transition"
      >
        <Bell className="size-5 text-slate-600" />
        {totalAlerts > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
            {totalAlerts > 99 ? '99+' : totalAlerts}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown absolute right-0 mt-2 w-[340px] max-h-[80vh] bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden motion-fade-up">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900">Thông báo</div>
              <div className="text-xs text-slate-500">{loading ? 'Đang tải...' : 'Cập nhật mỗi phút'}</div>
            </div>
            <button onClick={() => load()} className="text-sm text-slate-500 hover:text-slate-900 size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">↻</button>
          </div>

          <div className="overflow-y-auto max-h-[calc(80vh-60px)]">
            <div className="p-4 border-b border-slate-100">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1 font-semibold">
                <ShoppingBag className="size-3" /> Hôm nay
              </div>
              <div className="flex gap-2">
                <div className="flex-1 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                  <div className="text-xs text-slate-600">Số đơn</div>
                  <div className="font-bold text-lg text-indigo-700">{todayCount}</div>
                </div>
                <div className="flex-1 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <div className="text-xs text-slate-600">Doanh thu</div>
                  <div className="font-bold text-sm text-emerald-700">{formatCurrency(todayRevenue)}</div>
                </div>
              </div>
            </div>

            <div className="p-4 border-b border-slate-100">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1 font-semibold">
                <AlertTriangle className="size-3 text-amber-500" /> Tồn kho thấp ({low.length})
              </div>
              {low.length === 0 ? (
                <div className="text-xs text-slate-500 italic">Chưa có sản phẩm nào sắp hết.</div>
              ) : (
                <div className="space-y-1">
                  {low.slice(0, 5).map((p) => (
                    <Link key={p.id} href="/products" onClick={() => setOpen(false)}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition">
                      <div className="flex items-center gap-2 min-w-0">
                        <Package className="size-3.5 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-700 truncate">{p.name}</span>
                      </div>
                      <span className={cn('badge shrink-0', p.stock <= 0 ? 'badge-danger' : 'badge-warn')}>{p.stock <= 0 ? 'Hết' : p.stock}</span>
                    </Link>
                  ))}
                  {low.length > 5 && (
                    <Link href="/products" onClick={() => setOpen(false)} className="block text-center text-xs text-indigo-600 hover:underline py-1">
                      Xem thêm {low.length - 5} sản phẩm →
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="p-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between font-semibold">
                <span>Đơn gần đây</span>
                <Link href="/orders" onClick={() => setOpen(false)} className="text-indigo-600 hover:underline normal-case tracking-normal flex items-center gap-0.5 font-normal">
                  Tất cả <ChevronRight className="size-3" />
                </Link>
              </div>
              {recent.length === 0 ? (
                <div className="text-xs text-slate-500 italic">Chưa có đơn nào.</div>
              ) : (
                <div className="space-y-1">
                  {recent.map((o) => (
                    <Link key={o.id} href="/orders" onClick={() => setOpen(false)}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition">
                      <div className="min-w-0">
                        <div className="text-xs font-mono text-slate-700 truncate">{o.code}</div>
                        <div className="text-[10px] text-slate-500">{new Date(o.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</div>
                      </div>
                      <div className="font-semibold text-sm text-slate-900">{formatCurrency(o.total)}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
