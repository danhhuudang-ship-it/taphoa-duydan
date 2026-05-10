'use client';
import { useEffect, useMemo, useState } from 'react';
import { X, Search, Package, Calendar, DollarSign, Loader2, ArrowLeft, CheckCircle2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { Product } from '@/lib/types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

export default function StockIn({
  open, onClose, products, onDone,
}: {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onDone: () => void;
}) {
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Product | null>(null);
  const [qty, setQty] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [expiry, setExpiry] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setPicked(null); setSearch(''); setQty(0); setCost(0); setExpiry(''); setNote('');
    }
  }, [open]);

  // Khi chọn SP, auto-fill cost = giá vốn hiện tại
  useEffect(() => {
    if (picked) {
      setCost(Number(picked.cost || 0));
      setQty(0);
      setExpiry('');
      setNote('');
    }
  }, [picked]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  const submit = async () => {
    if (!picked) return;
    if (qty <= 0) return toast.error('Số lượng phải > 0');
    if (cost < 0) return toast.error('Giá vốn không hợp lệ');

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.rpc('stock_in', {
      p_product_id: picked.id,
      p_quantity: qty,
      p_cost: cost,
      p_expiry_date: expiry || null,
      p_note: note || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);

    // Tính giá vốn TB mới để thông báo
    const oldStock = Number(picked.stock || 0);
    const oldCost  = Number(picked.cost || 0);
    const newStock = oldStock + qty;
    const newCost  = newStock > 0 ? ((oldStock * oldCost) + (qty * cost)) / newStock : cost;

    toast.success(
      `✅ Nhập ${qty} ${picked.unit || 'cái'} ${picked.name}\n` +
      `Giá vốn TB: ${formatCurrency(oldCost)} → ${formatCurrency(newCost)}\n` +
      `Tồn kho: ${oldStock} → ${newStock}`,
      { duration: 4500 }
    );
    setPicked(null);
    setSearch('');
    onDone();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-slate-900/50 p-0 md:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl"
           onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white relative">
          <div className="md:hidden mx-auto absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-300" />
          <div className="flex items-center gap-2">
            {picked && (
              <button onClick={() => setPicked(null)} className="size-9 rounded-lg hover:bg-slate-100 flex items-center justify-center" title="Quay lại danh sách">
                <ArrowLeft className="size-5" />
              </button>
            )}
            <h3 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="size-5 text-indigo-600" /> Nhập hàng
            </h3>
          </div>
          <button onClick={onClose} className="size-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="size-5" /></button>
        </div>

        {!picked ? (
          // ============== Step 1: chọn SP ==============
          <>
            <div className="shrink-0 p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200">
                <Search className="size-4 text-slate-400" />
                <input
                  className="bg-transparent outline-none text-[15px] flex-1 text-slate-800"
                  placeholder="Tìm SP theo tên / SKU / mã vạch..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Bấm vào sản phẩm để nhập số lượng, giá vốn và hạn sử dụng.
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPicked(p)}
                    className="text-left p-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow active:scale-[0.97] transition flex flex-col gap-1.5"
                  >
                    <div className="aspect-square rounded-lg bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center text-2xl overflow-hidden">
                      {p.image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={p.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <span>📦</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">{p.sku}</div>
                    <div className="font-semibold text-[12px] text-slate-900 line-clamp-2 min-h-[2.4em] leading-tight">{p.name}</div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Tồn: <b className="text-slate-900">{p.stock}</b></span>
                      <span className="text-emerald-700">{formatCurrency(p.cost || 0)}</span>
                    </div>
                  </button>
                ))}
                {!filtered.length && (
                  <div className="col-span-full text-center text-slate-500 py-10">Không tìm thấy SP nào.</div>
                )}
              </div>
            </div>
          </>
        ) : (
          // ============== Step 2: nhập thông tin ==============
          <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* SP đã chọn */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                <div className="size-14 rounded-xl bg-white flex items-center justify-center text-2xl overflow-hidden shrink-0">
                  {picked.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={picked.image_url} alt="" className="w-full h-full object-cover" />
                  ) : '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 truncate">{picked.name}</div>
                  <div className="text-xs text-slate-600 font-mono">{picked.sku}</div>
                  <div className="flex gap-3 mt-0.5 text-xs">
                    <span>Tồn hiện tại: <b>{picked.stock} {picked.unit}</b></span>
                    <span>Giá vốn TB: <b className="text-emerald-700">{formatCurrency(picked.cost || 0)}</b></span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Số lượng nhập *</label>
                  <input
                    type="number" inputMode="numeric" autoFocus
                    value={qty || ''}
                    onChange={(e) => setQty(Number(e.target.value))}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    placeholder="0"
                    className="input mt-1 text-right text-lg font-bold"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Giá vốn / 1 đơn vị *</label>
                  <input
                    type="number" inputMode="numeric"
                    value={cost || ''}
                    onChange={(e) => setCost(Number(e.target.value))}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    className="input mt-1 text-right text-lg font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                  <Calendar className="size-3.5" /> Hạn sử dụng <span className="text-slate-400 font-normal">(tùy chọn)</span>
                </label>
                <input
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="input mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Ghi chú <span className="text-slate-400 font-normal">(tùy chọn)</span></label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Lô tháng 5, NCC ABC..."
                  className="input mt-1"
                />
              </div>

              {/* Preview giá vốn TB mới */}
              {qty > 0 && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm">
                  <div className="font-semibold text-emerald-800 mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="size-4" /> Sau khi nhập:
                  </div>
                  <div className="space-y-1 text-slate-700">
                    <div>Tồn kho: <b>{picked.stock}</b> → <b className="text-indigo-700">{picked.stock + qty} {picked.unit}</b></div>
                    <div>Giá vốn TB: <b>{formatCurrency(picked.cost || 0)}</b> → <b className="text-emerald-700">
                      {formatCurrency(((picked.stock * (picked.cost || 0)) + (qty * cost)) / Math.max(picked.stock + qty, 1))}
                    </b></div>
                    <div>Tổng tiền lô này: <b className="text-slate-900">{formatCurrency(qty * cost)}</b></div>
                    <div className="text-xs text-slate-500 mt-1">Ngày nhập: {formatDate(new Date())}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
              <button type="button" onClick={() => setPicked(null)} className="btn-ghost">Chọn SP khác</button>
              <button type="submit" disabled={submitting || qty <= 0} className="btn-primary">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Lưu nhập hàng
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
