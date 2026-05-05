'use client';
import { useEffect, useMemo, useState } from 'react';
import { Search, Wallet, Pencil, X, CheckCircle2, AlertCircle, Phone, Receipt as RcptIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { Customer, Order } from '@/lib/types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

type DebtCustomer = Customer & { debt: number };

export default function DebtsClient() {
  const [customers, setCustomers] = useState<DebtCustomer[]>([]);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<DebtCustomer | null>(null);
  const [debtOrders, setDebtOrders] = useState<Order[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [editAmount, setEditAmount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .gt('debt', 0)
        .order('debt', { ascending: false });
      if (error) {
        // Cột debt chưa tồn tại — chạy migration_debt.sql
        toast.error('Chưa có dữ liệu công nợ — vui lòng chạy migration_debt.sql trên Supabase');
        setCustomers([]);
        return;
      }
      setCustomers((data as any) || []);
    } catch (e) {
      setCustomers([]);
    }
  };

  useEffect(() => { load(); }, []);

  const totalDebt = useMemo(() => customers.reduce((s, c) => s + Number(c.debt || 0), 0), [customers]);

  const openDetail = async (c: DebtCustomer) => {
    setDetail(c);
    setPayAmount(Number(c.debt || 0));
    setEditAmount(null);
    setLoadingDetail(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', c.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setDebtOrders(data || []);
    setLoadingDetail(false);
  };

  const handlePay = async () => {
    if (!detail) return;
    if (payAmount <= 0) return toast.error('Số tiền trả phải > 0');
    if (payAmount > Number(detail.debt || 0)) return toast.error('Số tiền vượt nợ hiện tại');
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc('pay_debt', {
      p_customer_id: detail.id,
      p_amount: payAmount,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`✅ Đã ghi nhận thanh toán ${formatCurrency(payAmount)}`);
    setDetail(null);
    load();
  };

  const handleEditDebt = async () => {
    if (!detail || editAmount === null) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('customers')
      .update({ debt: Math.max(0, Number(editAmount)) })
      .eq('id', detail.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('✅ Đã cập nhật số nợ');
    setEditAmount(null);
    setDetail(null);
    load();
  };

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.phone || '').includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 md:p-5">
          <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">Tổng nợ chưa thu</div>
          <div className="mt-1 text-2xl md:text-3xl font-extrabold text-amber-600">{formatCurrency(totalDebt)}</div>
        </div>
        <div className="card p-4 md:p-5">
          <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">Số khách đang nợ</div>
          <div className="mt-1 text-2xl md:text-3xl font-extrabold text-indigo-700">{customers.length}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200">
        <Search className="size-4 text-slate-400" />
        <input
          className="bg-transparent outline-none text-sm flex-1"
          placeholder="Tìm khách theo tên hoặc SĐT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Customer debt list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="card p-10 text-center text-slate-400">
            <CheckCircle2 className="size-10 mx-auto mb-2 text-emerald-300" />
            Tuyệt vời! Hiện không có khách nào nợ.
          </div>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => openDetail(c)}
              className="card card-hover w-full text-left p-3 md:p-4 flex items-center gap-3"
            >
              <div className="size-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold flex items-center justify-center shrink-0 shadow-sm">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 truncate">{c.name}</div>
                {c.phone && <div className="text-xs text-slate-500 flex items-center gap-1"><Phone className="size-3" />{c.phone}</div>}
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Còn nợ</div>
                <div className="text-lg md:text-xl font-extrabold text-amber-600">{formatCurrency(c.debt)}</div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* DETAIL MODAL */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/40 p-0 md:p-4" onClick={() => setDetail(null)}>
          <div className="modal-panel bg-white rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[92vh] md:max-h-[88vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white relative">
              <div className="md:hidden mx-auto absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-300" />
              <div>
                <h3 className="text-lg md:text-xl font-bold text-slate-900">{detail.name}</h3>
                {detail.phone && <div className="text-xs text-slate-500">{detail.phone}</div>}
              </div>
              <button onClick={() => setDetail(null)} className="size-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="size-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Debt amount + edit */}
              <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-4">
                <div className="text-xs uppercase tracking-wide font-semibold text-amber-700">Đang nợ</div>
                {editAmount === null ? (
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-3xl font-extrabold text-amber-700">{formatCurrency(detail.debt)}</div>
                    <button onClick={() => setEditAmount(Number(detail.debt))} className="btn-edit !min-h-9 !py-1.5">
                      <Pencil className="size-3.5" /> Sửa
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number" onWheel={(e) => (e.target as HTMLInputElement).blur()} autoFocus value={editAmount}
                      onChange={(e) => setEditAmount(Number(e.target.value))}
                      className="input flex-1 !text-lg font-bold text-right"
                    />
                    <button onClick={handleEditDebt} disabled={busy} className="btn-primary">
                      {busy ? <Loader2 className="size-4 animate-spin" /> : 'Lưu'}
                    </button>
                    <button onClick={() => setEditAmount(null)} className="btn-ghost">Huỷ</button>
                  </div>
                )}
              </div>

              {/* Pay debt form */}
              <div className="rounded-2xl bg-white border border-slate-200 p-4">
                <div className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Wallet className="size-4 text-emerald-600" /> Khách trả nợ
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2">
                    {[Number(detail.debt), 50000, 100000, 200000, 500000].slice(0, 4).map((v, i) => (
                      <button key={i} onClick={() => setPayAmount(v)} className="btn-ghost !py-2 text-xs justify-center">
                        {formatCurrency(v)}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" onWheel={(e) => (e.target as HTMLInputElement).blur()} value={payAmount}
                      onChange={(e) => setPayAmount(Number(e.target.value))}
                      placeholder="Số tiền khách trả"
                      className="input flex-1 !text-lg font-bold text-right"
                    />
                    <button onClick={handlePay} disabled={busy || payAmount <= 0} className="btn-primary !text-base">
                      {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Ghi nhận
                    </button>
                  </div>
                  <div className="text-xs text-slate-500">
                    Còn lại sau khi trả: <b className="text-slate-700">{formatCurrency(Math.max(0, Number(detail.debt) - Number(payAmount || 0)))}</b>
                  </div>
                </div>
              </div>

              {/* Debt orders history */}
              <div>
                <div className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <RcptIcon className="size-4 text-indigo-600" /> Đơn ghi nợ gần đây
                </div>
                {loadingDetail ? (
                  <div className="text-sm text-slate-400 text-center py-4">Đang tải...</div>
                ) : debtOrders.filter(o => o.status === 'debt').length === 0 ? (
                  <div className="text-sm text-slate-400 text-center py-4">Không có đơn ghi nợ.</div>
                ) : (
                  <div className="space-y-1.5">
                    {debtOrders.filter(o => o.status === 'debt').slice(0, 10).map((o) => (
                      <div key={o.id} className="flex items-center justify-between text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
                        <div>
                          <div className="font-mono text-xs">{o.code}</div>
                          <div className="text-[11px] text-slate-500">{formatDate(o.created_at)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-slate-900">{formatCurrency(o.total)}</div>
                          <div className="text-[10px] text-amber-700">Đã trả: {formatCurrency(o.paid)}</div>
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
