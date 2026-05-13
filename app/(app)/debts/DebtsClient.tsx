'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Search, Wallet, X, CheckCircle2, AlertCircle, Phone, Receipt as RcptIcon,
  Loader2, History, Pencil, Banknote, ClockIcon, ArrowDownCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { Order } from '@/lib/types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

type DebtRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  debt: number;
  total_spent: number | null;
  points: number | null;
  created_at: string;
  last_payment_amount: number | null;
  last_payment_at: string | null;
  total_paid: number;
};

type PaymentLog = {
  id: string;
  amount: number;
  note: string | null;
  created_at: string;
};

export default function DebtsClient() {
  const [rows, setRows] = useState<DebtRow[]>([]);
  const [tab, setTab] = useState<'owing' | 'paid'>('owing');
  const [search, setSearch] = useState('');
  const [quickPay, setQuickPay] = useState<DebtRow | null>(null);
  const [quickAmount, setQuickAmount] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  // Detail modal
  const [detail, setDetail] = useState<DebtRow | null>(null);
  const [detailOrders, setDetailOrders] = useState<Order[]>([]);
  const [detailPayments, setDetailPayments] = useState<PaymentLog[]>([]);
  const [editAmount, setEditAmount] = useState<number | null>(null);

  const load = async () => {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('debts_overview')
        .select('*')
        .order('debt', { ascending: false });
      if (!error && data) {
        setRows(data as any);
        return;
      }
    } catch {}
    // Fallback nếu view chưa được tạo
    const { data: fb } = await supabase
      .from('customers')
      .select('id, name, phone, email, debt, total_spent, points, created_at')
      .gt('debt', 0)
      .order('debt', { ascending: false });
    setRows(((fb as any) || []).map((c: any) => ({
      ...c, last_payment_amount: null, last_payment_at: null, total_paid: 0,
    })));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q || r.name.toLowerCase().includes(q) || (r.phone || '').includes(q);
      const matchTab = tab === 'owing' ? r.debt > 0 : r.debt === 0;
      return matchSearch && matchTab;
    });
  }, [rows, search, tab]);

  const owingCount = rows.filter(r => r.debt > 0).length;
  const paidCount  = rows.filter(r => r.debt === 0).length;
  const totalDebt  = rows.filter(r => r.debt > 0).reduce((s, r) => s + Number(r.debt || 0), 0);
  const totalRecentlyPaid = rows.reduce((s, r) => s + Number(r.total_paid || 0), 0);

  const openDetail = async (r: DebtRow) => {
    setDetail(r);
    setEditAmount(null);
    const supabase = createClient();
    const [oResp, pResp] = await Promise.all([
      supabase.from('orders').select('*').eq('customer_id', r.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('debt_payments').select('*').eq('customer_id', r.id).order('created_at', { ascending: false }).limit(30),
    ]);
    setDetailOrders((oResp.data as any) || []);
    setDetailPayments((pResp.data as any) || []);
  };

  const submitQuickPay = async () => {
    if (!quickPay) return;
    if (quickAmount <= 0) return toast.error('Số tiền phải > 0');
    if (quickAmount > Number(quickPay.debt || 0)) return toast.error('Vượt quá số nợ hiện tại');

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc('pay_debt', {
      p_customer_id: quickPay.id,
      p_amount: quickAmount,
      p_note: null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`✅ Đã nhận ${formatCurrency(quickAmount)} từ ${quickPay.name}`);
    setQuickPay(null);
    setQuickAmount(0);
    load();
  };

  const submitDetailPay = async (amount: number) => {
    if (!detail || amount <= 0) return;
    if (amount > Number(detail.debt || 0)) return toast.error('Vượt số nợ');
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc('pay_debt', {
      p_customer_id: detail.id,
      p_amount: amount,
      p_note: null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`✅ Đã nhận ${formatCurrency(amount)}`);
    setDetail(null);
    load();
  };

  const submitEditDebt = async () => {
    if (!detail || editAmount === null) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from('customers')
      .update({ debt: Math.max(0, Number(editAmount)) }).eq('id', detail.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Đã cập nhật số nợ');
    setEditAmount(null);
    setDetail(null);
    load();
  };

  const daysAgo = (iso: string | null) => {
    if (!iso) return null;
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / (1000*60*60*24));
    if (diff === 0) return 'hôm nay';
    if (diff === 1) return 'hôm qua';
    return `${diff} ngày trước`;
  };

  return (
    <div className="space-y-4">
      {/* === Summary === */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <SumBox icon={Wallet}      label="Tổng nợ chưa thu"  value={formatCurrency(totalDebt)} color="from-amber-500 to-orange-500" />
        <SumBox icon={AlertCircle} label="Khách đang nợ"     value={String(owingCount)}        color="from-rose-500 to-pink-500" />
        <SumBox icon={CheckCircle2} label="Tổng đã thu (60d)" value={formatCurrency(totalRecentlyPaid)} color="from-emerald-500 to-teal-500" />
      </div>

      {/* === Search + Tabs === */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 flex-1 min-w-[200px]">
          <Search className="size-4 text-slate-400" />
          <input
            className="bg-transparent outline-none text-sm flex-1"
            placeholder="Tìm khách..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex bg-white border border-slate-200 rounded-xl p-1">
          <button
            onClick={() => setTab('owing')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-semibold transition',
              tab === 'owing' ? 'bg-amber-100 text-amber-800' : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            Đang nợ ({owingCount})
          </button>
          <button
            onClick={() => setTab('paid')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-semibold transition',
              tab === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            Đã trả gần đây ({paidCount})
          </button>
        </div>
      </div>

      {/* === GRID: 2 col mobile, 3 col tablet+ === */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          <CheckCircle2 className="size-10 mx-auto mb-2 text-emerald-400" />
          {tab === 'owing' ? 'Không có khách nào đang nợ.' : 'Chưa có khách nào trả nợ gần đây.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-3">
          {filtered.map((r) => (
            <div
              key={r.id}
              className={cn(
                'rounded-2xl border p-3 flex flex-col gap-2 bg-white transition hover:shadow-md',
                r.debt > 0 ? 'border-amber-200' : 'border-emerald-200'
              )}
            >
              {/* Header row */}
              <button
                onClick={() => openDetail(r)}
                className="flex items-center gap-2 text-left active:scale-[0.98] transition"
              >
                <div className={cn(
                  'size-10 rounded-xl text-white font-bold flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br',
                  r.debt > 0 ? 'from-amber-400 to-orange-500' : 'from-emerald-400 to-teal-500'
                )}>
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 text-[13px] truncate">{r.name}</div>
                  {r.phone && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-0.5 truncate">
                      <Phone className="size-3" />{r.phone}
                    </div>
                  )}
                </div>
              </button>

              {/* Số nợ */}
              <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-center">
                <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500">
                  {r.debt > 0 ? 'Còn nợ' : 'Đã trả hết'}
                </div>
                <div className={cn(
                  'font-extrabold text-base',
                  r.debt > 0 ? 'text-amber-700' : 'text-emerald-700'
                )}>
                  {r.debt > 0 ? formatCurrency(r.debt) : '✓'}
                </div>
              </div>

              {/* Lần trả gần đây */}
              {r.last_payment_at && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-1 text-[10.5px] leading-tight">
                  <div className="text-emerald-700 font-semibold flex items-center gap-0.5">
                    <ArrowDownCircle className="size-3" /> Gần đây trả {formatCurrency(r.last_payment_amount || 0)}
                  </div>
                  <div className="text-slate-500">{daysAgo(r.last_payment_at)}</div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-1.5 mt-auto">
                {r.debt > 0 && (
                  <button
                    onClick={() => { setQuickPay(r); setQuickAmount(Number(r.debt)); }}
                    className="flex-1 px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition active:scale-95"
                  >
                    <CheckCircle2 className="size-3.5" /> Đã nhận
                  </button>
                )}
                <button
                  onClick={() => openDetail(r)}
                  className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center justify-center transition active:scale-95"
                  title="Xem chi tiết"
                >
                  <History className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === QUICK PAY MODAL === */}
      {quickPay && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/50 p-0 md:p-4" onClick={() => setQuickPay(null)}>
          <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-md flex flex-col overflow-hidden border border-slate-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 px-5 py-4 border-b border-slate-200 bg-emerald-50 relative">
              <div className="md:hidden mx-auto absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-300" />
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <Banknote className="size-5 text-emerald-600" /> Đã nhận tiền từ
              </div>
              <div className="text-lg font-extrabold text-emerald-700 mt-0.5">{quickPay.name}</div>
              <div className="text-xs text-slate-600">Còn nợ: <b>{formatCurrency(quickPay.debt)}</b></div>
              <button onClick={() => setQuickPay(null)} className="absolute top-2 right-2 size-9 rounded-lg hover:bg-white/60 flex items-center justify-center"><X className="size-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-sm font-semibold text-slate-700">Số tiền nhận</label>
                <input
                  type="number" autoFocus value={quickAmount || ''}
                  onChange={(e) => setQuickAmount(Number(e.target.value))}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className="input mt-1 text-right text-2xl font-extrabold"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => setQuickAmount(Number(quickPay.debt))} className="btn-ghost !py-2 text-xs justify-center !bg-emerald-50 !text-emerald-700 !border-emerald-200">Toàn bộ</button>
                {[50000, 100000, 200000].map((v) => (
                  <button key={v} onClick={() => setQuickAmount(v)} className="btn-ghost !py-2 text-xs justify-center">
                    {formatCurrency(v)}
                  </button>
                ))}
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 flex justify-between text-sm">
                <span className="text-slate-600">Còn lại sau khi nhận:</span>
                <b className="text-slate-900">{formatCurrency(Math.max(0, Number(quickPay.debt) - quickAmount))}</b>
              </div>
            </div>
            <div className="shrink-0 px-5 py-3 border-t border-slate-200 bg-slate-50 flex gap-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
              <button type="button" onClick={() => setQuickPay(null)} className="btn-ghost flex-1">Huỷ</button>
              <button onClick={submitQuickPay} disabled={busy || quickAmount <= 0} className="btn-primary flex-1 !bg-emerald-600 hover:!bg-emerald-700">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Xác nhận đã nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === DETAIL MODAL === */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/50 p-0 md:p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 px-5 py-4 border-b border-slate-200 bg-white relative">
              <div className="md:hidden mx-auto absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-300" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">{detail.name}</h3>
                {detail.phone && <div className="text-xs text-slate-500">{detail.phone}</div>}
              </div>
              <button onClick={() => setDetail(null)} className="absolute top-2 right-2 size-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="size-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Số nợ + sửa */}
              <div className={cn(
                'rounded-2xl border p-4',
                detail.debt > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
              )}>
                <div className="text-xs uppercase tracking-wide font-semibold text-slate-600">
                  {detail.debt > 0 ? 'Đang nợ' : 'Đã trả hết'}
                </div>
                {editAmount === null ? (
                  <div className="flex items-center justify-between mt-1">
                    <div className={cn('text-2xl font-extrabold', detail.debt > 0 ? 'text-amber-700' : 'text-emerald-700')}>
                      {formatCurrency(detail.debt)}
                    </div>
                    <button onClick={() => setEditAmount(Number(detail.debt))}
                      className="px-2.5 py-1.5 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1">
                      <Pencil className="size-3" /> Sửa
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-2">
                    <input type="number" autoFocus value={editAmount}
                      onChange={(e) => setEditAmount(Number(e.target.value))}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      className="input flex-1 !text-lg font-bold text-right" />
                    <button onClick={submitEditDebt} disabled={busy} className="btn-primary">
                      {busy ? <Loader2 className="size-4 animate-spin" /> : 'Lưu'}
                    </button>
                    <button onClick={() => setEditAmount(null)} className="btn-ghost">Huỷ</button>
                  </div>
                )}
              </div>

              {/* Nhanh nhận tiền */}
              {detail.debt > 0 && (
                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <div className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Banknote className="size-4 text-emerald-600" /> Khách trả nợ
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    <button onClick={() => submitDetailPay(Number(detail.debt))} className="btn-ghost !py-2 text-xs justify-center !bg-emerald-50 !text-emerald-700 !border-emerald-200">Toàn bộ</button>
                    {[50000, 100000, 200000].map((v) => (
                      <button key={v} onClick={() => submitDetailPay(v)} className="btn-ghost !py-2 text-xs justify-center">
                        {formatCurrency(v)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Lịch sử trả nợ */}
              <div>
                <div className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <ClockIcon className="size-4 text-indigo-600" /> Lịch sử trả nợ ({detailPayments.length})
                </div>
                {detailPayments.length === 0 ? (
                  <div className="text-sm text-slate-400 text-center py-3 italic">Chưa có khoản nào.</div>
                ) : (
                  <div className="space-y-1.5">
                    {detailPayments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                        <div>
                          <div className="font-bold text-emerald-700">{formatCurrency(p.amount)}</div>
                          <div className="text-[11px] text-slate-500">{formatDate(p.created_at)}</div>
                        </div>
                        {p.note && <div className="text-[11px] text-slate-600 italic max-w-[160px] truncate">{p.note}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Đơn ghi nợ */}
              <div>
                <div className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <RcptIcon className="size-4 text-rose-600" /> Đơn ghi nợ
                </div>
                {detailOrders.filter(o => o.status === 'debt').length === 0 ? (
                  <div className="text-sm text-slate-400 text-center py-3 italic">Không có.</div>
                ) : (
                  <div className="space-y-1.5">
                    {detailOrders.filter(o => o.status === 'debt').slice(0, 10).map((o) => (
                      <div key={o.id} className="flex items-center justify-between text-sm bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                        <div>
                          <div className="font-mono text-xs">{o.code}</div>
                          <div className="text-[11px] text-slate-500">{formatDate(o.created_at)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-rose-700">{formatCurrency(o.total)}</div>
                          <div className="text-[10px] text-slate-500">Đã trả: {formatCurrency(o.paid)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SumBox({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="card p-3 md:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] md:text-xs uppercase tracking-wide font-semibold text-slate-500 truncate">{label}</div>
          <div className={`mt-1 text-base md:text-lg font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent truncate`}>{value}</div>
        </div>
        <div className={`size-8 md:size-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
          <Icon className="size-4 text-white" />
        </div>
      </div>
    </div>
  );
}
