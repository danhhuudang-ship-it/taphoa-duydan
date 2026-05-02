'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDateShort } from '@/lib/utils';

export default function ReportsClient() {
  const [range, setRange] = useState<7 | 14 | 30>(30);
  const [orders, setOrders] = useState<{ created_at: string; total: number }[]>([]);
  const [items, setItems] = useState<{ product_name: string; quantity: number; total: number; created_at: string }[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate() - (range - 1));
      const [o, it] = await Promise.all([
        supabase.from('orders').select('created_at,total').gte('created_at', start.toISOString()),
        supabase.from('order_items').select('product_name,quantity,total,created_at').gte('created_at', start.toISOString()),
      ]);
      setOrders(o.data || []);
      setItems(it.data || []);
    })();
  }, [range]);

  const series = useMemo(() => {
    const days: { date: string; revenue: number; orders: number }[] = [];
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0,10);
      const inDay = orders.filter((o) => o.created_at.slice(0,10) === k);
      days.push({
        date: formatDateShort(d),
        revenue: inDay.reduce((s, o) => s + Number(o.total || 0), 0),
        orders: inDay.length,
      });
    }
    return days;
  }, [orders, range]);

  const top = useMemo(() => {
    const m = new Map<string, { qty: number; revenue: number }>();
    for (const it of items) {
      const k = it.product_name || '—';
      const v = m.get(k) || { qty: 0, revenue: 0 };
      v.qty += Number(it.quantity || 0); v.revenue += Number(it.total || 0);
      m.set(k, v);
    }
    return Array.from(m.entries()).map(([n, v]) => ({ name: n, ...v })).sort((a,b) => b.revenue - a.revenue).slice(0, 10);
  }, [items]);

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const totalOrders  = orders.length;
  const avg = totalOrders ? totalRevenue / totalOrders : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">Khoảng:</span>
        {[7, 14, 30].map((d) => (
          <button key={d} onClick={() => setRange(d as 7|14|30)}
            className={`btn-ghost ${range === d ? '!bg-slate-200 !border-slate-300 !text-slate-900' : ''}`}>
            {d} ngày
          </button>
        ))}
      </div>

      <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: `Doanh thu ${range} ngày`, value: formatCurrency(totalRevenue), color: 'from-indigo-500 to-fuchsia-500' },
          { label: 'Số đơn', value: totalOrders.toLocaleString(), color: 'from-pink-500 to-rose-500' },
          { label: 'Trung bình / đơn', value: formatCurrency(avg), color: 'from-cyan-500 to-blue-500' },
        ].map((s) => (
          <motion.div key={s.label} whileHover={{ y: -4 }} className="glow-card p-5">
            <div className="text-xs uppercase tracking-wider text-slate-400">{s.label}</div>
            <div className={`mt-2 text-2xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</div>
          </motion.div>
        ))}
      </motion.div>

      <div className="glow-card p-5">
        <h3 className="font-semibold mb-3">Doanh thu theo ngày</h3>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a5b4fc" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,.05)" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => v >= 1_000_000 ? `${(v/1e6).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip contentStyle={{ background: 'rgba(20,22,40,.9)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} formatter={(v: any) => formatCurrency(v as number)} />
              <Area type="monotone" dataKey="revenue" stroke="#a5b4fc" strokeWidth={2} fill="url(#g2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glow-card p-5">
        <h3 className="font-semibold mb-3">Top sản phẩm theo doanh thu</h3>
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid stroke="rgba(255,255,255,.05)" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={160} />
              <Tooltip contentStyle={{ background: 'rgba(20,22,40,.9)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} formatter={(v: any) => formatCurrency(v as number)} />
              <Bar dataKey="revenue" fill="#a5b4fc" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
