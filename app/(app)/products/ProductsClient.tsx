'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, X, Save, FileSpreadsheet, ScanBarcode } from 'lucide-react';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import type { Product, Category } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';
import ImageUploader from '@/components/ImageUploader';
import CategoryManager from '@/components/CategoryManager';
const BarcodeScanner = dynamic(() => import('@/components/BarcodeScanner'), { ssr: false });
const BulkImport = dynamic(() => import('@/components/BulkImport'), { ssr: false });

export default function ProductsClient() {
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats]   = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [activeCat, setActiveCat] = useState<string | 'all'>('all');

  const load = async () => {
    const supabase = createClient();
    const [p, c] = await Promise.all([
      supabase.from('products').select('*, categories(*)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
    ]);
    setItems((p.data as any) || []);
    setCats(c.data || []);
  };
  useEffect(() => { load(); }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());
  const toggleSelectAll = () => {
    setSelected((prev) => {
      const allIds = filtered.map((p) => p.id);
      if (allIds.every((id) => prev.has(id))) return new Set();
      return new Set(allIds);
    });
  };
  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Bạn chắc chắn muốn xoá ${selected.size} sản phẩm đã chọn?`)) return;
    setBulkDeleting(true);
    const supabase = createClient();
    const ids = Array.from(selected);
    const { error } = await supabase.from('products').delete().in('id', ids);
    setBulkDeleting(false);
    if (error) return toast.error(error.message);
    toast.success(`Đã xoá ${ids.length} sản phẩm`);
    clearSelection();
    load();
  };

  const filtered = items.filter((p) => {
    const q = search.toLowerCase();
    if (activeCat !== 'all' && p.category_id !== activeCat) return false;
    return !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  const remove = async (id: string) => {
    if (!confirm('Xóa sản phẩm này?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Đã xóa');
    load();
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name || !editing.sku) return toast.error('Thiếu Tên / SKU');
    const supabase = createClient();
    const payload: any = {
      sku: editing.sku, name: editing.name, description: editing.description || null,
      category_id: editing.category_id || null,
      price: Number(editing.price || 0), cost: Number(editing.cost || 0),
      stock: Number(editing.stock || 0), min_stock: Number(editing.min_stock || 5),
      unit: editing.unit || 'cái', image_url: editing.image_url || null,
      barcode: editing.barcode || null, active: editing.active ?? true,
    };
    const { error } = editing.id
      ? await supabase.from('products').update(payload).eq('id', editing.id)
      : await supabase.from('products').insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing.id ? 'Đã cập nhật' : 'Đã thêm');
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-4">
      <CategoryManager
        categories={cats}
        activeCat={activeCat}
        onSelect={setActiveCat}
        onChanged={load}
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="glass flex items-center gap-2 px-3 py-2 flex-1 min-w-[200px]">
          <Search className="size-4 text-slate-400" />
          <input className="bg-transparent outline-none text-sm flex-1" placeholder="Tìm theo tên hoặc SKU..."
                 value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setBulkOpen(true)} className="btn-ghost shrink-0">
          <FileSpreadsheet className="size-4" /> <span className="hidden sm:inline">Nhập hàng loạt</span><span className="sm:hidden">Excel</span>
        </button>
        <motion.button whileHover={{ y:-2 }} whileTap={{ scale: 0.97 }}
          onClick={() => setEditing({ active: true, stock: 0, min_stock: 5, price: 0, cost: 0, unit: 'cái' })}
          className="btn-primary"><Plus className="size-4" /> <span className="hidden sm:inline">Thêm sản phẩm</span><span className="sm:hidden">Thêm</span></motion.button>
      </div>

      {/* BULK ACTION BAR */}
      {selected.size > 0 && (
        <div className="sticky top-16 md:top-20 z-40 bg-indigo-600 text-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 motion-fade-up">
          <div className="size-9 rounded-lg bg-white/20 flex items-center justify-center font-bold">{selected.size}</div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Đã chọn {selected.size} sản phẩm</div>
            <div className="text-xs text-white/80">Bấm "Xoá" để xoá hàng loạt</div>
          </div>
          <button onClick={clearSelection} className="btn-ghost !bg-white/15 !border-white/20 !text-white hover:!bg-white/25">
            Bỏ chọn
          </button>
          <button onClick={bulkDelete} disabled={bulkDeleting} className="btn-primary !bg-white !text-rose-600 hover:!bg-rose-50 hover:!text-rose-700">
            <Trash2 className="size-4" /> {bulkDeleting ? 'Đang xoá...' : `Xoá ${selected.size}`}
          </button>
        </div>
      )}

      {/* MOBILE: Card list */}
      <div className="md:hidden space-y-2">
        <AnimatePresence>
          {filtered.map((p) => (
            <motion.div
              key={p.id} layout
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className={cn("glow-card bounce p-3", selected.has(p.id) && "ring-2 ring-indigo-400")}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="size-5 accent-indigo-600 mt-3 shrink-0"
                  checked={selected.has(p.id)}
                  onChange={() => toggleSelect(p.id)}
                />
                <div className="size-12 rounded-xl bg-gradient-to-br from-indigo-100 to-fuchsia-100 flex items-center justify-center text-xl shrink-0 overflow-hidden">
                  {p.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.image_url} alt={p.name} className="size-full object-cover" />
                  ) : (
                    <span>{p.categories?.icon || '📦'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{p.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">{p.sku} {p.categories?.name ? `· ${p.categories.name}` : ''}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="font-bold text-sm text-indigo-700 font-bold">{formatCurrency(p.price)}</div>
                    <span className={cn('badge text-[10px]', p.stock <= 0 ? 'badge-danger' : p.stock < (p.min_stock || 5) ? 'badge-warn' : 'badge-success')}>
                      {p.stock} {p.unit}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={() => setEditing(p)} className="btn-edit !min-h-9 !py-1.5 !px-2.5"><Pencil className="size-3.5" /> Sửa</button>
                  <button onClick={() => remove(p.id)} className="btn-delete !min-h-9 !py-1.5 !px-2.5"><Trash2 className="size-3.5" /> Xoá</button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {!filtered.length && <div className="text-center text-slate-500 py-10">Chưa có sản phẩm.</div>}
      </div>

      {/* DESKTOP: Bảng compact, fit viewport */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-10" />
            <col />
            <col className="w-28 lg:w-32" />
            <col className="w-24 lg:w-28" />
            <col className="w-20 lg:w-24" />
            <col className="w-24" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-2 py-3">
                <input
                  type="checkbox"
                  className="size-4 accent-indigo-600 cursor-pointer"
                  checked={filtered.length > 0 && filtered.every((p) => selected.has(p.id))}
                  onChange={toggleSelectAll}
                  title="Chọn tất cả"
                />
              </th>
              <th className="text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold px-2 py-3">Sản phẩm</th>
              <th className="text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold px-2 py-3">Danh mục</th>
              <th className="text-right text-[11px] uppercase tracking-wider text-slate-500 font-semibold px-2 py-3">Giá</th>
              <th className="text-center text-[11px] uppercase tracking-wider text-slate-500 font-semibold px-2 py-3">Tồn</th>
              <th className="text-center text-[11px] uppercase tracking-wider text-slate-500 font-semibold px-2 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const isChecked = selected.has(p.id);
              return (
                <tr
                  key={p.id}
                  className={cn(
                    'border-b border-slate-100 hover:bg-slate-50 transition',
                    isChecked && 'bg-indigo-50/60'
                  )}
                >
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-indigo-600 cursor-pointer"
                      checked={isChecked}
                      onChange={() => toggleSelect(p.id)}
                    />
                  </td>
                  <td className="px-2 py-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-9 rounded-lg bg-gradient-to-br from-indigo-100 to-fuchsia-100 flex items-center justify-center text-base shrink-0 overflow-hidden">
                        {p.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={p.image_url} alt="" className="size-full object-cover" />
                        ) : (
                          <span>{p.categories?.icon || '📦'}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[13px] text-slate-900 truncate" title={p.name}>{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{p.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-700 truncate" title={p.categories?.name || ''}>{p.categories?.name || '—'}</td>
                  <td className="px-2 py-2 text-right font-semibold text-[13px] whitespace-nowrap text-slate-900">{formatCurrency(p.price)}</td>
                  <td className="px-2 py-2 text-center">
                    <span className={cn(
                      'inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap',
                      p.stock <= 0 ? 'bg-rose-100 text-rose-700'
                      : p.stock < (p.min_stock || 5) ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                    )} title={`Tồn: ${p.stock} ${p.unit}`}>
                      {p.stock <= 0 ? 'Hết' : `${p.stock}`}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => setEditing(p)}
                        title="Sửa"
                        className="size-8 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center transition"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => remove(p.id)}
                        title="Xoá"
                        className="size-8 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center transition"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr><td colSpan={6} className="text-center text-slate-500 py-10">Chưa có sản phẩm.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* === MODAL THÊM/SỬA SP - SCROLLABLE === */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/40 p-0 md:p-4"
            onClick={() => setEditing(null)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-t-3xl md:rounded-3xl w-full max-w-2xl max-h-[92vh] md:max-h-[88vh] flex flex-col overflow-hidden"
            >
              {/* Header sticky */}
              <div className="shrink-0 px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-100">
                <div className="md:hidden mx-auto absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-200" />
                <h3 className="text-lg md:text-xl font-bold">{editing.id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3>
                <button onClick={() => setEditing(null)} className="size-9 rounded-lg hover:bg-slate-200 flex items-center justify-center">
                  <X className="size-5" />
                </button>
              </div>

              {/* Body scrollable */}
              <form onSubmit={(e) => { e.preventDefault(); save(); }} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-5 space-y-3 overscroll-contain">
                <div>
                  <label className="text-xs text-slate-700">Tên sản phẩm *</label>
                  <input className="input mt-1" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Vd: Coca-Cola lon 330ml" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-700">SKU *</label>
                    <input className="input mt-1" value={editing.sku || ''} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} placeholder="SKU0001" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-700">Đơn vị</label>
                    <input className="input mt-1" value={editing.unit || ''} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} placeholder="cái / lon / chai" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-700">Giá bán *</label>
                    <input type="number" onWheel={(e) => (e.target as HTMLInputElement).blur()} inputMode="numeric" className="input mt-1" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-700">Giá vốn</label>
                    <input type="number" onWheel={(e) => (e.target as HTMLInputElement).blur()} inputMode="numeric" className="input mt-1" value={editing.cost ?? 0} onChange={(e) => setEditing({ ...editing, cost: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-700">Tồn kho</label>
                    <input type="number" onWheel={(e) => (e.target as HTMLInputElement).blur()} inputMode="numeric" className="input mt-1" value={editing.stock ?? 0} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-700">Tồn tối thiểu</label>
                    <input type="number" onWheel={(e) => (e.target as HTMLInputElement).blur()} inputMode="numeric" className="input mt-1" value={editing.min_stock ?? 5} onChange={(e) => setEditing({ ...editing, min_stock: Number(e.target.value) })} />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-700">Mã vạch (Barcode)</label>
                  <div className="relative mt-1">
                    <input
                      className="input pr-12"
                      value={editing.barcode || ''}
                      onChange={(e) => setEditing({ ...editing, barcode: e.target.value })}
                      placeholder="8934588063015 (tùy chọn)"
                    />
                    <button
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      title="Quét mã vạch"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 size-9 rounded-lg flex items-center justify-center text-indigo-600 hover:bg-indigo-50"
                    >
                      <ScanBarcode className="size-5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-700">Danh mục</label>
                  <select className="input mt-1 [&>option]:bg-slate-900" value={editing.category_id || ''} onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })}>
                    <option value="">— Không —</option>
                    {cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-700">Ảnh sản phẩm</label>
                  <div className="mt-1">
                    <ImageUploader
                      value={editing.image_url}
                      onChange={(url) => setEditing({ ...editing, image_url: url })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-700">Mô tả</label>
                  <textarea className="input mt-1" rows={2} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                </div>

                <div className="h-2" />
              </div>

              {/* Footer sticky */}
              <div className="shrink-0 px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
                <button type="button" onClick={() => setEditing(null)} className="btn-ghost">Hủy</button>
                <motion.button type="submit" whileTap={{ scale: 0.97 }} className="btn-primary">
                  <Save className="size-4" /> Lưu
                </motion.button>
              </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => {
          if (editing) setEditing({ ...editing, barcode: code });
        }}
      />

      <BulkImport
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        categories={cats}
        onImported={load}
      />
    </div>
  );
}
