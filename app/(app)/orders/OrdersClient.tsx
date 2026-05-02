'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, X, Receipt as RecIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Order, OrderItem } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function OrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<{ order: Order; items: OrderItem[] } | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200);
      setOrders(data || []);
    })();
  }, []);

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return !q || o.code.toLowerCase().includes(q) || (o.customer_name || '').toLowerCase().includes(q);
  });

  const open = async (o: Order) => {
    const supabase = createClient();
    const { data } = await supabase.from('order_items').select('*').eq('order_id', o.id);
    setDetail({ order: o, items: data || [] });
  };

  return (
    <div className="space-y-4">
      <div className="glass flex items-center gap-2 px-3 py-2">
        <Search className="size-4 text-slate-400" />
        <input className="bg-transparent outline-none text-sm flex-1" placeholder="Tìm theo mã hóa đơn / khách..."
               value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* MOBILE: Card list */}
      <div className="md:hidden space-y-2">
        <AnimatePresence>
          {filtered.map((o) => (
            <motion.div
              key={o.id} layout
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glow-card p-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-mono text-xs font-semibold">{o.code}</div>
                  <span className="badge text-[10px]">{o.payment_method}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{formatDate(o.created_at)}</div>
                <div className="text-xs text-slate-700 truncate mt-0.5">👤 {o.customer_name || 'Khách lẻ'}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-sm text-indigo-700 font-bold">{formatCurrency(o.total)}</div>
                <button onClick={() => open(o)} className="btn-edit !min-h-8 !py-1 !px-2 mt-1 text-[11px]"><Eye className="size-3" /> Xem</button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {!filtered.length && <div className="text-center text-slate-500 py-10">Chưa có đơn hàng.</div>}
      </div>

      {/* DESKTOP: Compact table fitting screen */}
      <div className="hidden md:block glass-strong rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-4 py-3 w-36">Mã HĐ</th>
              <th className="text-left text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-3 py-3 w-44">Thời gian</th>
              <th className="text-left text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-3 py-3">Khách</th>
              <th className="text-left text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-3 py-3 w-24">TT</th>
              <th className="text-right text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-3 py-3 w-32">Tổng</th>
              <th className="text-right text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-3 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-slate-100 hover:bg-slate-50 transition">
                <td className="px-4 py-2.5 font-mono text-xs">{o.code}</td>
                <td className="px-3 py-2.5 text-sm whitespace-nowrap">{formatDate(o.created_at)}</td>
                <td className="px-3 py-2.5 text-sm truncate">{o.customer_name || '—'}</td>
                <td className="px-3 py-2.5"><span className="badge">{o.payment_method}</span></td>
                <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">{formatCurrency(o.total)}</td>
                <td className="px-3 py-2.5 text-right">
                  <button onClick={() => open(o)} title="Xem chi tiết" className="btn-edit !min-h-9 !py-1.5 !px-2.5"><Eye className="size-4" /> Xem</button>
                </td>
              </motion.tr>
            ))}
            {!filtered.length && <tr><td colSpan={6} className="text-center text-slate-500 py-10">Chưa có đơn hàng.</td></tr>}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {detail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDetail(null)}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/40 p-0 md:p-4">
            <motion.div onClick={(e) => e.stopPropagation()}
              initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="glass-strong rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[92vh] md:max-h-[88vh] flex flex-col overflow-hidden">

              <div className="shrink-0 px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-100 relative">
                <div className="md:hidden mx-auto absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-200" />
                <h3 className="text-lg md:text-xl font-bold flex items-center gap-2"><RecIcon className="size-5" /> {detail.order.code}</h3>
                <button onClick={() => setDetail(null)} className="size-9 rounded-lg hover:bg-slate-200 flex items-center justify-center"><X className="size-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 overscroll-contain">
                <div className="text-sm space-y-1 mb-3">
                  <div>Thời gian: <b>{formatDate(detail.order.created_at)}</b></div>
                  <div>Khách: <b>{detail.order.customer_name || 'Khách lẻ'}</b></div>
                  <div>Thanh toán: <span className="badge">{detail.order.payment_method}</span></div>
                </div>
                <div className="border-t border-slate-200 pt-3 space-y-2">
                  {detail.items.map((i) => (
                    <div key={i.id} className="flex items-start justify-between text-sm">
                      <div className="flex-1">
                        <div className="font-medium">{i.product_name}</div>
                        <div className="text-xs text-slate-400">{i.quantity} × {formatCurrency(i.price)}</div>
                      </div>
                      <div className="font-semibold">{formatCurrency(i.total)}</div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-200 pt-3 mt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Tạm tính</span><span>{formatCurrency(detail.order.subtotal)}</span></div>
                  <div className="flex justify-between"><span>Giảm giá</span><span>-{formatCurrency(detail.order.discount)}</span></div>
                  <div className="flex justify-between text-base font-bold pt-1 border-t border-slate-200">
                    <span>Tổng</span><span className="text-indigo-700 font-bold">{formatCurrency(detail.order.total)}</span>
                  </div>
                  <div className="flex justify-between"><span>Khách trả</span><span>{formatCurrency(detail.order.paid)}</span></div>
                  <div className="flex justify-between text-emerald-600"><span>Tiền thừa</span><span>{formatCurrency(Math.max(0, Number(detail.order.paid) - Number(detail.order.total)))}</span></div>
                </div>
              </div>

              <div className="shrink-0 px-5 py-3 border-t border-slate-200 bg-slate-100 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
                <button onClick={() => window.print()} className="btn-primary w-full">In hóa đơn</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
