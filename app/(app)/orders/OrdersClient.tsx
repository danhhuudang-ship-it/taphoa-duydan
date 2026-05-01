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

      <div className="glass-strong rounded-2xl overflow-hidden">
        <div className="overflow-x-auto -mx-2 md:mx-0">
          <table className="tbl text-sm">
            <thead><tr>
              <th>Mã HĐ</th><th>Thời gian</th><th>Khách</th>
              <th>Thanh toán</th>
              <th className="text-right">Tổng</th>
              <th className="text-right"></th>
            </tr></thead>
            <tbody>
              {filtered.map((o) => (
                <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td className="font-mono text-xs">{o.code}</td>
                  <td className="text-sm">{formatDate(o.created_at)}</td>
                  <td className="text-sm">{o.customer_name || '—'}</td>
                  <td><span className="badge">{o.payment_method}</span></td>
                  <td className="text-right font-semibold">{formatCurrency(o.total)}</td>
                  <td className="text-right">
                    <button onClick={() => open(o)} className="btn-ghost !py-1 !px-2 text-xs"><Eye className="size-3.5" /> Xem</button>
                  </td>
                </motion.tr>
              ))}
              {!filtered.length && <tr><td colSpan={6} className="text-center text-slate-500 py-10">Chưa có đơn hàng.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {detail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDetail(null)}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass-strong rounded-3xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2"><RecIcon className="size-5" /> Hóa đơn {detail.order.code}</h3>
                <button onClick={() => setDetail(null)}><X /></button>
              </div>
              <div className="text-sm space-y-1 mb-3">
                <div>Thời gian: <b>{formatDate(detail.order.created_at)}</b></div>
                <div>Khách: <b>{detail.order.customer_name || 'Khách lẻ'}</b></div>
                <div>Thanh toán: <span className="badge">{detail.order.payment_method}</span></div>
              </div>
              <div className="border-t border-white/10 pt-3 space-y-2 max-h-72 overflow-y-auto">
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
              <div className="border-t border-white/10 pt-3 mt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>Tạm tính</span><span>{formatCurrency(detail.order.subtotal)}</span></div>
                <div className="flex justify-between"><span>Giảm giá</span><span>-{formatCurrency(detail.order.discount)}</span></div>
                <div className="flex justify-between text-base font-bold pt-1 border-t border-white/10">
                  <span>Tổng</span><span className="text-gradient">{formatCurrency(detail.order.total)}</span>
                </div>
                <div className="flex justify-between"><span>Khách trả</span><span>{formatCurrency(detail.order.paid)}</span></div>
                <div className="flex justify-between text-emerald-400"><span>Tiền thừa</span><span>{formatCurrency(Math.max(0, Number(detail.order.paid) - Number(detail.order.total)))}</span></div>
              </div>
              <button onClick={() => window.print()} className="btn-primary w-full mt-4">In hóa đơn</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
