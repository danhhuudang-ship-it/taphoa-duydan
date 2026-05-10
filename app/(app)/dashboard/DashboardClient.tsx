'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, ShoppingCart, Package, Users, TrendingUp, AlertTriangle,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import StatCard from '@/components/StatCard';
import { MotionGrid, MotionItem } from '@/components/MotionGrid';
import { cn, formatCurrency, formatDateShort } from '@/lib/utils';

type Stats = {
  todayRevenue: number;
  todayOrders: number;
  totalProducts: number;
  totalCustomers: number;
  lowStockCount: number;
  weekly: { date: string; revenue: number; orders: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
};

const COLORS = ['#6366f1', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#8b5cf6'];

export default function DashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expiring, setExpiring] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const today = new Date(); today.setHours(0,0,0,0);
      const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 6);

      const [
        ordersResp, productsResp, customersResp, lowResp, itemsResp, expiringResp,
      ] = await Promise.all([
        supabase.from('orders').select('total, created_at').gte('created_at', weekAgo.toISOString()),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id, name, stock, min_stock').lt('stock', 10).limit(50),
        supabase.from('order_items').select('product_name, quantity, total, created_at').gte('created_at', weekAgo.toISOString()),
        supabase.from('expiring_products').select('*').limit(20),
      ]);

      setExpiring((expiringResp as any)?.data || []);

      const orders = ordersResp.data || [];
      const todayOrders = orders.filter((o) => new Date(o.created_at) >= today).length;
      const todayRevenue = orders.filter((o) => new Date(o.created_at) >= today)
        .reduce((s, o) => s + Number(o.total || 0), 0);

      // weekly
      const days: { date: string; revenue: number; orders: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        const dKey = d.toISOString().slice(0,10);
        const inDay = orders.filter((o) => o.created_at.slice(0,10) === dKey);
        days.push({
          date: formatDateShort(d),
          revenue: inDay.reduce((s, o) => s + Number(o.total || 0), 0),
          orders: inDay.length,
        });
      }

      // top products from order_items
      const items = itemsResp.data || [];
      const map = new Map<string, { qty: number; revenue: number }>();
      for (const it of items) {
        const k = it.product_name || '—';
        const m = map.get(k) || { qty: 0, revenue: 0 };
        m.qty += Number(it.quantity || 0);
        m.revenue += Number(it.total || 0);
        map.set(k, m);
      }
      const topProducts = Array.from(map.entries())
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6);

      setStats({
        todayRevenue,
        todayOrders,
        totalProducts: productsResp.count || 0,
        totalCustomers: customersResp.count || 0,
        lowStockCount: (lowResp.data || []).length,
        weekly: days,
        topProducts,
      });
      setLoading(false);
    })();
  }, []);

  const totalWeek = useMemo(
    () => stats?.weekly.reduce((s, d) => s + d.revenue, 0) || 0,
    [stats]
  );

  if (loading || !stats) {
    return <div className="text-slate-400 motion-fade-up">Đang tải dữ liệu…</div>;
  }

  return (
    <div className="space-y-6">
      <MotionGrid className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MotionItem><StatCard label="Doanh thu hôm nay" value={stats.todayRevenue} currency icon={DollarSign} delta={12.5} /></MotionItem>
        <MotionItem><StatCard label="Đơn hôm nay"       value={stats.todayOrders}    icon={ShoppingCart} delta={4.2} color="from-pink-500 to-rose-500" /></MotionItem>
        <MotionItem><StatCard label="Sản phẩm"          value={stats.totalProducts}  icon={Package} color="from-cyan-500 to-blue-500" /></MotionItem>
        <MotionItem><StatCard label="Khách hàng"        value={stats.totalCustomers} icon={Users} color="from-emerald-500 to-teal-500" /></MotionItem>
      </MotionGrid>

      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} className="glow-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="size-4 text-indigo-600" /> Doanh thu 7 ngày</h3>
              <div className="text-xs text-slate-400">Tổng tuần: <b className="text-slate-900">{formatCurrency(totalWeek)}</b></div>
            </div>
            <div className="badge">Live</div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.weekly}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => v >= 1_000_000 ? `${(v/1e6).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip
                  contentStyle={{ background: 'rgba(20,22,40,.9)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }}
                  formatter={(v: any) => formatCurrency(v as number)}
                />
                <Area type="monotone" dataKey="revenue" stroke="#a5b4fc" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:.05 }} className="glow-card p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="size-4 text-amber-600" /> Cảnh báo tồn kho thấp</h3>
          <div className="text-3xl font-bold text-indigo-700 font-bold">{stats.lowStockCount}</div>
          <div className="text-xs text-slate-400 mb-4">sản phẩm tồn kho dưới 10</div>

          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.topProducts} dataKey="revenue" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={3}>
                  {stats.topProducts.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'rgba(20,22,40,.9)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} formatter={(v: any) => formatCurrency(v as number)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[11px] text-slate-400 text-center">Tỉ trọng doanh thu top sản phẩm</div>
        </motion.div>
      </div>

      {/* CẬN DATE ALERT */}
      {expiring.length > 0 && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:.08 }} className="glow-card p-5 border-amber-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <span>Sản phẩm cận date (≤ 30 ngày)</span>
              <span className="badge badge-warn">{expiring.length}</span>
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
            {expiring.map((it, idx) => (
              <div key={idx} className={cn(
                "rounded-xl border p-2.5 flex items-center gap-2.5",
                it.days_left <= 7 ? "bg-rose-50 border-rose-200"
                : it.days_left <= 14 ? "bg-amber-50 border-amber-200"
                : "bg-yellow-50 border-yellow-100"
              )}>
                <div className="size-10 rounded-lg bg-white flex items-center justify-center text-lg shrink-0 overflow-hidden border border-slate-100">
                  {it.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={it.image_url} alt="" className="size-full object-cover" />
                  ) : (
                    <span>{it.category_icon || '📦'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13px] text-slate-900 truncate">{it.name}</div>
                  <div className="text-[11px] text-slate-600">
                    HSD: <b>{new Date(it.expiry_date).toLocaleDateString('vi-VN')}</b>
                  </div>
                  <div className={cn(
                    "text-[11px] font-bold",
                    it.days_left <= 7 ? "text-rose-700"
                    : it.days_left <= 14 ? "text-amber-700"
                    : "text-yellow-700"
                  )}>
                    Còn {it.days_left} ngày · {it.batch_quantity} {it.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:.1 }} className="glow-card p-5">
        <h3 className="font-semibold mb-4">Top sản phẩm bán chạy 7 ngày</h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.topProducts} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid stroke="rgba(255,255,255,.05)" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={140} />
              <Tooltip contentStyle={{ background: 'rgba(20,22,40,.9)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} formatter={(v: any) => formatCurrency(v as number)} />
              <Bar dataKey="revenue" radius={[0, 8, 8, 0]}>
                {stats.topProducts.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
