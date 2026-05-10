'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDateShort } from '@/lib/utils';

const COLORS = ['#6366f1', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6'];

type OrderRow   = { id: string; created_at: string; total: number; subtotal: number; discount: number; customer_id: string | null; customer_name: string | null };
type ItemRow    = { product_name: string; product_id: string | null; quantity: number; total: number; created_at: string; price: number };
type ProductRow = { id: string; name: string; category_id: string | null; cost: number };
type CategoryRow = { id: string; name: string };

export default function ReportsClient() {
  const [range, setRange] = useState<7 | 14 | 30 | 90>(30);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [topCustomers, setTopCustomers] = useState<{ name: string; revenue: number; profit: number }[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate() - (range - 1));

      const [o, it, prods, cats, custProfits] = await Promise.all([
        supabase.from('orders').select('id, created_at, total, subtotal, discount, customer_id, customer_name').gte('created_at', start.toISOString()),
        supabase.from('order_items').select('product_name, product_id, quantity, total, created_at, price').gte('created_at', start.toISOString()),
        supabase.from('products').select('id, name, category_id, cost'),
        supabase.from('categories').select('id, name'),
        supabase.from('customer_profits').select('name, revenue, profit').order('revenue', { ascending: false }).limit(10),
      ]);
      setOrders((o.data as any) || []);
      setItems((it.data as any) || []);
      setProducts((prods.data as any) || []);
      setCategories((cats.data as any) || []);
      setTopCustomers((custProfits.data as any) || []);
    })();
  }, [range]);

  const productCostMap = useMemo(() => {
    const m = new Map<string, number>();
    products.forEach(p => m.set(p.id, Number(p.cost || 0)));
    return m;
  }, [products]);
  const productCatMap = useMemo(() => {
    const m = new Map<string, string | null>();
    products.forEach(p => m.set(p.id, p.category_id || null));
    return m;
  }, [products]);
  const catNameMap = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach(c => m.set(c.id, c.name));
    return m;
  }, [categories]);

  // === Series doanh thu + lãi theo ngày ===
  const series = useMemo(() => {
    const days: { date: string; revenue: number; cost: number; profit: number; orders: number }[] = [];
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0,10);
      const orderInDay = orders.filter((o) => o.created_at.slice(0,10) === k);
      const revenue = orderInDay.reduce((s, o) => s + Number(o.total || 0), 0);
      const itemsInDay = items.filter((it) => it.created_at.slice(0,10) === k);
      const cost = itemsInDay.reduce((s, it) => s + Number(it.quantity || 0) * (productCostMap.get(it.product_id || '') || 0), 0);
      days.push({
        date: formatDateShort(d), revenue, cost, profit: revenue - cost, orders: orderInDay.length,
      });
    }
    return days;
  }, [orders, items, productCostMap, range]);

  // === Top sản phẩm bán chạy (theo doanh thu) ===
  const topProducts = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const it of items) {
      const k = it.product_name || '—';
      const v = m.get(k) || { name: k, qty: 0, revenue: 0 };
      v.qty += Number(it.quantity || 0); v.revenue += Number(it.total || 0);
      m.set(k, v);
    }
    return Array.from(m.values()).sort((a,b) => b.revenue - a.revenue).slice(0, 8);
  }, [items]);

  // === Top danh mục bán chạy ===
  const topCategories = useMemo(() => {
    const m = new Map<string, { name: string; revenue: number; qty: number }>();
    for (const it of items) {
      const catId = productCatMap.get(it.product_id || '') || null;
      const catName = catId ? (catNameMap.get(catId) || 'Khác') : 'Không phân loại';
      const v = m.get(catName) || { name: catName, revenue: 0, qty: 0 };
      v.revenue += Number(it.total || 0);
      v.qty += Number(it.quantity || 0);
      m.set(catName, v);
    }
    return Array.from(m.values()).sort((a,b) => b.revenue - a.revenue);
  }, [items, productCatMap, catNameMap]);

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const totalCost = series.reduce((s, d) => s + d.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const totalOrders = orders.length;
  const avg = totalOrders ? totalRevenue / totalOrders : 0;

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-slate-600 font-semibold">Khoảng:</span>
        {[7, 14, 30, 90].map((d) => (
          <button key={d} onClick={() => setRange(d as any)}
            className={`btn-ghost ${range === d ? '!bg-indigo-600 !text-white !border-indigo-600' : ''}`}>
            {d} ngày
          </button>
        ))}
      </div>

      {/* === Stat cards === */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBox label="Doanh thu" value={formatCurrency(totalRevenue)} color="from-indigo-500 to-violet-600" />
        <StatBox label="Lãi gộp"   value={formatCurrency(totalProfit)} color="from-emerald-500 to-teal-600" />
        <StatBox label="Số đơn"    value={totalOrders.toLocaleString()} color="from-pink-500 to-rose-500" />
        <StatBox label="TB / đơn"  value={formatCurrency(avg)} color="from-cyan-500 to-blue-500" />
      </div>

      {/* === Doanh thu + lãi theo ngày === */}
      <div className="card p-5">
        <h3 className="font-semibold mb-3">📈 Doanh thu & Lãi theo ngày</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid stroke="rgba(15,23,42,.06)" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => v >= 1_000_000 ? `${(v/1e6).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }} formatter={(v: any) => formatCurrency(v as number)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#6366f1" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="profit"  name="Lãi gộp"   stroke="#10b981" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* === Thu chi === */}
      <div className="card p-5">
        <h3 className="font-semibold mb-3">💰 Thu - Chi theo ngày</h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid stroke="rgba(15,23,42,.06)" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => v >= 1_000_000 ? `${(v/1e6).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }} formatter={(v: any) => formatCurrency(v as number)} />
              <Legend />
              <Bar dataKey="revenue" name="Thu (Doanh thu)" fill="#6366f1" radius={[6,6,0,0]} />
              <Bar dataKey="cost"    name="Chi (Giá vốn)"   fill="#f59e0b" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 text-xs text-slate-500 text-center">
          Tổng thu: <b className="text-indigo-700">{formatCurrency(totalRevenue)}</b>{' '}·{' '}
          Tổng chi: <b className="text-amber-700">{formatCurrency(totalCost)}</b>{' '}·{' '}
          Lãi: <b className="text-emerald-700">{formatCurrency(totalProfit)}</b>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* === Top danh mục bán chạy === */}
        <div className="card p-5">
          <h3 className="font-semibold mb-3">🥧 Top danh mục bán chạy</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={topCategories} dataKey="revenue" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3} label={(e) => e.name}>
                  {topCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }} formatter={(v: any) => formatCurrency(v as number)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* === Top sản phẩm bán chạy === */}
        <div className="card p-5">
          <h3 className="font-semibold mb-3">🏆 Top sản phẩm theo doanh thu</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid stroke="rgba(15,23,42,.06)" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={120} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }} formatter={(v: any) => formatCurrency(v as number)} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                  {topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* === Top khách hàng chi tiền === */}
      <div className="card p-5">
        <h3 className="font-semibold mb-3">👑 Top khách hàng (theo doanh thu mọi thời kỳ)</h3>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topCustomers} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid stroke="rgba(15,23,42,.06)" horizontal={false} />
              <XAxis type="number" stroke="#64748b" fontSize={11} />
              <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={140} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }} formatter={(v: any) => formatCurrency(v as number)} />
              <Legend />
              <Bar dataKey="revenue" name="Doanh thu" fill="#6366f1" radius={[0, 6, 6, 0]} />
              <Bar dataKey="profit"  name="Lãi"       fill="#10b981" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{label}</div>
      <div className={`mt-1 text-xl md:text-2xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>{value}</div>
    </div>
  );
}
