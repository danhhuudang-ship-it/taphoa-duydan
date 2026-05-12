'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line, Treemap, ScatterChart, Scatter, ZAxis, ComposedChart,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Wallet, ShoppingBag, Users, Package, Award } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDateShort } from '@/lib/utils';

const COLORS = ['#6366f1', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6', '#f43f5e', '#22c55e'];

type OrderRow   = { id: string; created_at: string; total: number; subtotal: number; discount: number; customer_id: string | null; customer_name: string | null };
type ItemRow    = { product_name: string; product_id: string | null; quantity: number; total: number; created_at: string; price: number };
type ProductRow = { id: string; name: string; category_id: string | null; cost: number; stock: number };
type CategoryRow = { id: string; name: string };
type CustomerProfit = { id: string; name: string; revenue: number; profit: number; order_count: number; debt: number };
type DebtCustomer = { id: string; name: string; debt: number; phone: string | null };

export default function ReportsClient() {
  const [range, setRange] = useState<7 | 14 | 30 | 90>(30);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [topCustomers, setTopCustomers] = useState<CustomerProfit[]>([]);
  const [debtCustomers, setDebtCustomers] = useState<DebtCustomer[]>([]);
  // Previous period for comparison
  const [prevOrders, setPrevOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate() - (range - 1));
      const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - range);
      const prevEnd = new Date(start);

      const [o, prev, it, prods, cats, custProfits, debts] = await Promise.all([
        supabase.from('orders').select('id, created_at, total, subtotal, discount, customer_id, customer_name').gte('created_at', start.toISOString()),
        supabase.from('orders').select('id, created_at, total').gte('created_at', prevStart.toISOString()).lt('created_at', prevEnd.toISOString()),
        supabase.from('order_items').select('product_name, product_id, quantity, total, created_at, price').gte('created_at', start.toISOString()),
        supabase.from('products').select('id, name, category_id, cost, stock'),
        supabase.from('categories').select('id, name'),
        supabase.from('customer_profits').select('id, name, revenue, profit, order_count, debt').order('revenue', { ascending: false }).limit(15),
        supabase.from('customers').select('id, name, debt, phone').gt('debt', 0).order('debt', { ascending: false }),
      ]);
      setOrders((o.data as any) || []);
      setPrevOrders((prev.data as any) || []);
      setItems((it.data as any) || []);
      setProducts((prods.data as any) || []);
      setCategories((cats.data as any) || []);
      setTopCustomers((custProfits.data as any) || []);
      setDebtCustomers((debts.data as any) || []);
    })();
  }, [range]);

  const productCostMap = useMemo(() => {
    const m = new Map<string, number>(); products.forEach(p => m.set(p.id, Number(p.cost || 0))); return m;
  }, [products]);
  const productCatMap = useMemo(() => {
    const m = new Map<string, string | null>(); products.forEach(p => m.set(p.id, p.category_id || null)); return m;
  }, [products]);
  const catNameMap = useMemo(() => {
    const m = new Map<string, string>(); categories.forEach(c => m.set(c.id, c.name)); return m;
  }, [categories]);

  const series = useMemo(() => {
    const days: { date: string; revenue: number; cost: number; profit: number; orders: number; margin: number }[] = [];
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0,10);
      const orderInDay = orders.filter((o) => o.created_at.slice(0,10) === k);
      const revenue = orderInDay.reduce((s, o) => s + Number(o.total || 0), 0);
      const itemsInDay = items.filter((it) => it.created_at.slice(0,10) === k);
      const cost = itemsInDay.reduce((s, it) => s + Number(it.quantity || 0) * (productCostMap.get(it.product_id || '') || 0), 0);
      const profit = revenue - cost;
      days.push({
        date: formatDateShort(d), revenue, cost, profit,
        orders: orderInDay.length,
        margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      });
    }
    return days;
  }, [orders, items, productCostMap, range]);

  // Top SP với cumulative % (Pareto)
  const paretoProducts = useMemo(() => {
    const m = new Map<string, { name: string; revenue: number }>();
    for (const it of items) {
      const k = it.product_name || '—';
      const v = m.get(k) || { name: k, revenue: 0 };
      v.revenue += Number(it.total || 0);
      m.set(k, v);
    }
    const sorted = Array.from(m.values()).sort((a,b) => b.revenue - a.revenue).slice(0, 10);
    const total = sorted.reduce((s, x) => s + x.revenue, 0);
    let cum = 0;
    return sorted.map((x) => {
      cum += x.revenue;
      return { ...x, cumulativePct: total > 0 ? (cum / total) * 100 : 0 };
    });
  }, [items]);

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

  // Aging nợ (theo số tiền)
  const agingBuckets = useMemo(() => {
    const total = debtCustomers.reduce((s, c) => s + Number(c.debt || 0), 0);
    const buckets = [
      { name: '< 1 triệu',     min: 0,        max: 1_000_000, value: 0, count: 0 },
      { name: '1-5 triệu',     min: 1_000_000, max: 5_000_000, value: 0, count: 0 },
      { name: '5-10 triệu',    min: 5_000_000, max: 10_000_000, value: 0, count: 0 },
      { name: '> 10 triệu',    min: 10_000_000, max: Infinity, value: 0, count: 0 },
    ];
    for (const c of debtCustomers) {
      const d = Number(c.debt || 0);
      for (const b of buckets) {
        if (d >= b.min && d < b.max) { b.value += d; b.count++; break; }
      }
    }
    return { buckets, total };
  }, [debtCustomers]);

  // VIP scatter: số đơn vs tổng chi tiêu
  const vipScatter = useMemo(() => {
    return topCustomers
      .filter(c => c.order_count > 0)
      .map((c) => ({
        name: c.name,
        orders: c.order_count,
        revenue: c.revenue,
        profit: c.profit,
      }));
  }, [topCustomers]);

  // Calculations
  const totalRevenue = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const totalCost = series.reduce((s, d) => s + d.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const totalOrders = orders.length;
  const avg = totalOrders ? totalRevenue / totalOrders : 0;

  // So sánh với kỳ trước
  const prevTotal = prevOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const prevOrdersCount = prevOrders.length;
  const revGrowth = prevTotal > 0 ? ((totalRevenue - prevTotal) / prevTotal) * 100 : (totalRevenue > 0 ? 100 : 0);
  const ordGrowth = prevOrdersCount > 0 ? ((totalOrders - prevOrdersCount) / prevOrdersCount) * 100 : (totalOrders > 0 ? 100 : 0);

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

      {/* === KPI SUPER BANNER === */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard icon={DollarSign} label="Doanh thu"
          value={formatCurrency(totalRevenue)} delta={revGrowth}
          color="from-indigo-500 to-violet-600" />
        <KpiCard icon={TrendingUp} label="Lãi gộp"
          value={formatCurrency(totalProfit)} sub={`Margin ${margin.toFixed(1)}%`}
          color="from-emerald-500 to-teal-600" />
        <KpiCard icon={ShoppingBag} label="Số đơn"
          value={totalOrders.toLocaleString()} delta={ordGrowth}
          color="from-pink-500 to-rose-500" />
        <KpiCard icon={Users} label="TB / đơn"
          value={formatCurrency(avg)}
          color="from-cyan-500 to-blue-500" />
        <KpiCard icon={Wallet} label="Tổng nợ"
          value={formatCurrency(agingBuckets.total)}
          sub={`${debtCustomers.length} khách`}
          color="from-amber-500 to-orange-500" />
      </div>

      {/* === Combo: Doanh thu + Lãi + Margin === */}
      <div className="card p-5">
        <h3 className="font-semibold mb-1 flex items-center gap-2"><TrendingUp className="size-4 text-indigo-600" /> Doanh thu · Lãi · Tỷ suất theo ngày</h3>
        <div className="text-xs text-slate-500 mb-3">Cột = số tiền · đường = % lãi/doanh thu</div>
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series}>
              <CartesianGrid stroke="rgba(15,23,42,.06)" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickFormatter={(v) => v >= 1_000_000 ? `${(v/1e6).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}
                formatter={(v: any, n: any) => n === 'Margin' ? `${Number(v).toFixed(1)}%` : formatCurrency(v as number)} />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" name="Doanh thu" fill="#6366f1" radius={[6,6,0,0]} />
              <Bar yAxisId="left" dataKey="profit"  name="Lãi gộp"   fill="#10b981" radius={[6,6,0,0]} />
              <Line yAxisId="right" type="monotone" dataKey="margin" name="Margin" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* === Pareto: top SP đóng góp doanh thu (cumulative %) === */}
        <div className="card p-5">
          <h3 className="font-semibold mb-1 flex items-center gap-2"><Award className="size-4 text-amber-600" /> Top SP — Pareto (80/20)</h3>
          <div className="text-xs text-slate-500 mb-3">Cột = doanh thu · đường = % cộng dồn</div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paretoProducts} margin={{ left: 0, right: 12 }}>
                <CartesianGrid stroke="rgba(15,23,42,.06)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-20} textAnchor="end" height={70} interval={0} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickFormatter={(v) => v >= 1_000_000 ? `${(v/1e6).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <YAxis yAxisId="right" orientation="right" stroke="#f43f5e" fontSize={11} tickFormatter={(v) => `${v.toFixed(0)}%`} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}
                  formatter={(v: any, n: any) => n === 'Cộng dồn' ? `${Number(v).toFixed(1)}%` : formatCurrency(v as number)} />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" name="Doanh thu" radius={[6,6,0,0]}>
                  {paretoProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="cumulativePct" name="Cộng dồn" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* === Treemap doanh thu danh mục === */}
        <div className="card p-5">
          <h3 className="font-semibold mb-1 flex items-center gap-2"><Package className="size-4 text-cyan-600" /> Treemap — Doanh thu danh mục</h3>
          <div className="text-xs text-slate-500 mb-3">Kích thước ô = doanh thu, kéo mắt nhanh sang mục lớn</div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={topCategories.map((c, i) => ({ name: c.name, size: Math.max(c.revenue, 1), fill: COLORS[i % COLORS.length] }))}
                dataKey="size"
                stroke="#fff"
                fill="#6366f1"
              />
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* === Top khách hàng — combo doanh thu + lãi === */}
      <div className="card p-5">
        <h3 className="font-semibold mb-1 flex items-center gap-2">👑 Top 15 khách hàng VIP</h3>
        <div className="text-xs text-slate-500 mb-3">Doanh thu + lãi mọi thời kỳ</div>
        <div className="h-[400px]">
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

      {/* === VIP scatter — khách giá trị cao === */}
      <div className="card p-5">
        <h3 className="font-semibold mb-1 flex items-center gap-2">💎 VIP map — Số đơn vs Doanh thu</h3>
        <div className="text-xs text-slate-500 mb-3">Khách góc trên phải = mua thường xuyên + chi nhiều = VIP nhất</div>
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid stroke="rgba(15,23,42,.06)" />
              <XAxis type="number" dataKey="orders" name="Số đơn" stroke="#64748b" fontSize={11} />
              <YAxis type="number" dataKey="revenue" name="Doanh thu" stroke="#64748b" fontSize={11}
                tickFormatter={(v) => v >= 1_000_000 ? `${(v/1e6).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <ZAxis type="number" dataKey="profit" range={[60, 400]} name="Lãi" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}
                content={({ active, payload }: any) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-xl bg-white border border-slate-200 shadow-lg p-3 text-sm">
                      <div className="font-bold text-slate-900">{d.name}</div>
                      <div>Số đơn: <b>{d.orders}</b></div>
                      <div>Doanh thu: <b className="text-indigo-700">{formatCurrency(d.revenue)}</b></div>
                      <div>Lãi: <b className="text-emerald-700">{formatCurrency(d.profit)}</b></div>
                    </div>
                  );
                }}
              />
              <Scatter data={vipScatter} fill="#6366f1" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* === Aging nợ === */}
      {agingBuckets.total > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold mb-1 flex items-center gap-2"><Wallet className="size-4 text-amber-600" /> Aging nợ — Phân tổ theo mức nợ</h3>
          <div className="text-xs text-slate-500 mb-3">Tổng nợ: <b className="text-amber-700">{formatCurrency(agingBuckets.total)}</b> · {debtCustomers.length} khách</div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingBuckets.buckets}>
                <CartesianGrid stroke="rgba(15,23,42,.06)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => v >= 1_000_000 ? `${(v/1e6).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}
                  formatter={(v: any, n: any) => n === 'count' ? `${v} khách` : formatCurrency(v as number)} />
                <Bar dataKey="value" name="Tổng nợ" radius={[6,6,0,0]}>
                  {agingBuckets.buckets.map((_, i) => <Cell key={i} fill={['#fde68a','#fbbf24','#f97316','#dc2626'][i] || '#6366f1'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, delta, sub, color,
}: { icon: any; label: string; value: string; delta?: number; sub?: string; color: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold truncate">{label}</div>
          <div className={`mt-1 text-lg md:text-xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent truncate`}>{value}</div>
          {delta !== undefined && (
            <div className={`text-[11px] font-semibold mt-0.5 flex items-center gap-0.5 ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {delta >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {Math.abs(delta).toFixed(1)}% so kỳ trước
            </div>
          )}
          {sub && !delta && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
        </div>
        <div className={`size-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
          <Icon className="size-4 text-white" />
        </div>
      </div>
    </div>
  );
}
