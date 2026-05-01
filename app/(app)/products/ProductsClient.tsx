'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, X, Save } from 'lucide-react';
import ImageUploader from '@/components/ImageUploader';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { Product, Category } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';

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
        <div className="glass flex items-center gap-2 px-3 py-2 flex-1 min-w-[260px]">
          <Search className="size-4 text-slate-400" />
          <input className="bg-transparent outline-none text-sm flex-1" placeholder="Tìm theo tên hoặc SKU..."
                 value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <motion.button whileHover={{ y:-2 }} whileTap={{ scale: 0.97 }}
          onClick={() => setEditing({ active: true, stock: 0, min_stock: 5, price: 0, cost: 0, unit: 'cái' })}
          className="btn-primary"><Plus className="size-4" /> Thêm sản phẩm</motion.button>
      </div>

      <div className="glass-strong rounded-2xl overflow-hidden">
        <div className="overflow-x-auto -mx-2 md:mx-0">
          <table className="tbl text-sm">
            <thead>
              <tr>
                <th>SKU</th><th>Tên</th><th>Danh mục</th>
                <th className="text-right">Giá</th>
                <th className="text-right">Tồn</th>
                <th className="text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((p) => (
                  <motion.tr key={p.id} layout
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <td className="font-mono text-xs text-slate-400">{p.sku}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/30 flex items-center justify-center">
                          {p.categories?.icon || '📦'}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{p.name}</div>
                          {p.description && <div className="text-xs text-slate-400 line-clamp-1">{p.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">{p.categories?.name || '—'}</td>
                    <td className="text-right font-semibold">{formatCurrency(p.price)}</td>
                    <td className="text-right">
                      <span className={cn('badge', p.stock <= 0 ? 'badge-danger' : p.stock < (p.min_stock || 5) ? 'badge-warn' : 'badge-success')}>
                        {p.stock} {p.unit}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => setEditing(p)} className="size-8 rounded-lg bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-200 flex items-center justify-center transition"><Pencil className="size-4" /></button>
                        <button onClick={() => remove(p.id)} className="size-8 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-200 flex items-center justify-center transition"><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {!filtered.length && (
                <tr><td colSpan={6} className="text-center text-slate-500 py-10">Chưa có sản phẩm.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setEditing(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-3xl p-6 w-full max-w-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{editing.id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3>
                <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-white"><X /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-xs">Tên sản phẩm *</label>
                  <input className="input mt-1" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div><label className="text-xs">SKU *</label>
                  <input className="input mt-1" value={editing.sku || ''} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} /></div>
                <div><label className="text-xs">Đơn vị</label>
                  <input className="input mt-1" value={editing.unit || ''} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} /></div>
                <div><label className="text-xs">Giá bán *</label>
                  <input type="number" className="input mt-1" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>
                <div><label className="text-xs">Giá vốn</label>
                  <input type="number" className="input mt-1" value={editing.cost ?? 0} onChange={(e) => setEditing({ ...editing, cost: Number(e.target.value) })} /></div>
                <div><label className="text-xs">Tồn kho</label>
                  <input type="number" className="input mt-1" value={editing.stock ?? 0} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} /></div>
                <div><label className="text-xs">Tồn tối thiểu</label>
                  <input type="number" className="input mt-1" value={editing.min_stock ?? 5} onChange={(e) => setEditing({ ...editing, min_stock: Number(e.target.value) })} /></div>
                <div className="col-span-2"><label className="text-xs">Danh mục</label>
                  <select className="input mt-1 [&>option]:bg-slate-900" value={editing.category_id || ''} onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })}>
                    <option value="">— Không —</option>
                    {cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select></div>
                <div className="col-span-2"><label className="text-xs">Ảnh sản phẩm</label>
                  <div className="mt-1">
                    <ImageUploader
                      value={editing.image_url}
                      onChange={(url) => setEditing({ ...editing, image_url: url })}
                    />
                  </div></div>
                <div className="col-span-2"><label className="text-xs">Mô tả</label>
                  <textarea className="input mt-1" rows={2} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setEditing(null)} className="btn-ghost">Hủy</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={save} className="btn-primary"><Save className="size-4" /> Lưu</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
