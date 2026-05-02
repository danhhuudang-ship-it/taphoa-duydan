'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { Product, Category } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';
import ImageUploader from '@/components/ImageUploader';

export default function ProductsClient() {
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats]   = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Product> | null>(null);

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

  const filtered = items.filter((p) => {
    const q = search.toLowerCase();
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
      <div className="flex flex-wrap items-center gap-2">
        <div className="glass flex items-center gap-2 px-3 py-2 flex-1 min-w-[200px]">
          <Search className="size-4 text-slate-400" />
          <input className="bg-transparent outline-none text-sm flex-1" placeholder="Tìm theo tên hoặc SKU..."
                 value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <motion.button whileHover={{ y:-2 }} whileTap={{ scale: 0.97 }}
          onClick={() => setEditing({ active: true, stock: 0, min_stock: 5, price: 0, cost: 0, unit: 'cái' })}
          className="btn-primary"><Plus className="size-4" /> <span className="hidden sm:inline">Thêm sản phẩm</span><span className="sm:hidden">Thêm</span></motion.button>
      </div>

      {/* MOBILE: Card list */}
      <div className="md:hidden space-y-2">
        <AnimatePresence>
          {filtered.map((p) => (
            <motion.div
              key={p.id} layout
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glow-card p-3"
            >
              <div className="flex items-start gap-3">
                <div className="size-12 rounded-xl bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/30 flex items-center justify-center text-xl shrink-0 overflow-hidden">
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
                    <div className="font-bold text-sm text-gradient">{formatCurrency(p.price)}</div>
                    <span className={cn('badge text-[10px]', p.stock <= 0 ? 'badge-danger' : p.stock < (p.min_stock || 5) ? 'badge-warn' : 'badge-success')}>
                      {p.stock} {p.unit}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => setEditing(p)} className="size-8 rounded-lg bg-indigo-500/20 active:bg-indigo-500/30 text-indigo-200 flex items-center justify-center"><Pencil className="size-3.5" /></button>
                  <button onClick={() => remove(p.id)} className="size-8 rounded-lg bg-rose-500/20 active:bg-rose-500/30 text-rose-200 flex items-center justify-center"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {!filtered.length && <div className="text-center text-slate-500 py-10">Chưa có sản phẩm.</div>}
      </div>

      {/* DESKTOP: Compact table - không cần scroll ngang */}
      <div className="hidden md:block glass-strong rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="text-left text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-4 py-3">Sản phẩm</th>
              <th className="text-left text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-3 py-3 w-32">Danh mục</th>
              <th className="text-right text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-3 py-3 w-32">Giá</th>
              <th className="text-center text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-3 py-3 w-28">Tồn</th>
              <th className="text-right text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-3 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map((p) => (
                <motion.tr
                  key={p.id} layout
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="border-b border-white/5 hover:bg-white/[0.03] transition"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-lg bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/30 flex items-center justify-center text-base shrink-0 overflow-hidden">
                        {p.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={p.image_url} alt="" className="size-full object-cover" />
                        ) : (
                          <span>{p.categories?.icon || '📦'}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{p.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">{p.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-slate-300 truncate">{p.categories?.name || '—'}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-sm whitespace-nowrap">{formatCurrency(p.price)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={cn('badge whitespace-nowrap', p.stock <= 0 ? 'badge-danger' : p.stock < (p.min_stock || 5) ? 'badge-warn' : 'badge-success')}>
                      {p.stock} {p.unit}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => setEditing(p)} title="Sửa" className="size-8 rounded-lg bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-200 flex items-center justify-center transition"><Pencil className="size-4" /></button>
                      <button onClick={() => remove(p.id)} title="Xoá" className="size-8 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-200 flex items-center justify-center transition"><Trash2 className="size-4" /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {!filtered.length && (
              <tr><td colSpan={5} className="text-center text-slate-500 py-10">Chưa có sản phẩm.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* === MODAL THÊM/SỬA SP - SCROLLABLE === */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4"
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
              <div className="shrink-0 px-5 py-4 border-b border-white/10 flex items-center justify-between bg-black/20">
                <div className="md:hidden mx-auto absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20" />
                <h3 className="text-lg md:text-xl font-bold">{editing.id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3>
                <button onClick={() => setEditing(null)} className="size-9 rounded-lg hover:bg-white/10 flex items-center justify-center">
                  <X className="size-5" />
                </button>
              </div>

              {/* Body scrollable */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 overscroll-contain">
                <div>
                  <label className="text-xs text-slate-300">Tên sản phẩm *</label>
                  <input className="input mt-1" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Vd: Coca-Cola lon 330ml" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-300">SKU *</label>
                    <input className="input mt-1" value={editing.sku || ''} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} placeholder="SKU0001" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300">Đơn vị</label>
                    <input className="input mt-1" value={editing.unit || ''} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} placeholder="cái / lon / chai" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-300">Giá bán *</label>
                    <input type="number" inputMode="numeric" className="input mt-1" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300">Giá vốn</label>
                    <input type="number" inputMode="numeric" className="input mt-1" value={editing.cost ?? 0} onChange={(e) => setEditing({ ...editing, cost: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-300">Tồn kho</label>
                    <input type="number" inputMode="numeric" className="input mt-1" value={editing.stock ?? 0} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300">Tồn tối thiểu</label>
                    <input type="number" inputMode="numeric" className="input mt-1" value={editing.min_stock ?? 5} onChange={(e) => setEditing({ ...editing, min_stock: Number(e.target.value) })} />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-300">Danh mục</label>
                  <select className="input mt-1 [&>option]:bg-slate-900" value={editing.category_id || ''} onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })}>
                    <option value="">— Không —</option>
                    {cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300">Ảnh sản phẩm</label>
                  <div className="mt-1">
                    <ImageUploader
                      value={editing.image_url}
                      onChange={(url) => setEditing({ ...editing, image_url: url })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-300">Mô tả</label>
                  <textarea className="input mt-1" rows={2} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                </div>

                <div className="h-2" />
              </div>

              {/* Footer sticky */}
              <div className="shrink-0 px-5 py-3 border-t border-white/10 bg-black/20 flex justify-end gap-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
                <button onClick={() => setEditing(null)} className="btn-ghost">Hủy</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={save} className="btn-primary">
                  <Save className="size-4" /> Lưu
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
