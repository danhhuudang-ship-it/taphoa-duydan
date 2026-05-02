'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, X, Save, Phone, Mail, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { Customer } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export default function CustomersClient() {
  const [items, setItems] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Customer> | null>(null);

  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q);
  });

  const save = async () => {
    if (!editing) return;
    if (!editing.name) return toast.error('Tên khách không được trống');
    const supabase = createClient();
    const payload: any = {
      name: editing.name, phone: editing.phone || null, email: editing.email || null,
      address: editing.address || null, notes: editing.notes || null,
    };
    const { error } = editing.id
      ? await supabase.from('customers').update(payload).eq('id', editing.id)
      : await supabase.from('customers').insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing.id ? 'Đã cập nhật' : 'Đã thêm');
    setEditing(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Xóa khách hàng này?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Đã xóa'); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="glass flex items-center gap-2 px-3 py-2 flex-1 min-w-[260px]">
          <Search className="size-4 text-slate-400" />
          <input className="bg-transparent outline-none text-sm flex-1" placeholder="Tìm tên, SĐT, email..."
                 value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => setEditing({})} className="btn-primary">
          <Plus className="size-4" /> Thêm khách
        </motion.button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <AnimatePresence>
          {filtered.map((c) => (
            <motion.div
              key={c.id} layout
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ y: -3 }}
              className="glow-card p-4"
            >
              <div className="flex items-start gap-3">
                <div className="size-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-glow">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{c.name}</div>
                  {c.phone && <div className="text-xs text-slate-400 flex items-center gap-1"><Phone className="size-3" />{c.phone}</div>}
                  {c.email && <div className="text-xs text-slate-400 flex items-center gap-1 truncate"><Mail className="size-3" />{c.email}</div>}
                  {c.address && <div className="text-xs text-slate-400 flex items-center gap-1 truncate"><MapPin className="size-3" />{c.address}</div>}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="glass px-3 py-2">
                  <div className="text-slate-400">Tổng chi tiêu</div>
                  <div className="font-bold text-gradient">{formatCurrency(c.total_spent || 0)}</div>
                </div>
                <div className="glass px-3 py-2">
                  <div className="text-slate-400">Điểm tích lũy</div>
                  <div className="font-bold">{c.points || 0}</div>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setEditing(c)} className="btn-ghost !py-1 text-xs"><Pencil className="size-3.5" /> Sửa</button>
                <button onClick={() => remove(c.id)} className="btn-ghost !py-1 text-xs hover:!text-rose-300"><Trash2 className="size-3.5" /> Xóa</button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {!filtered.length && <div className="col-span-full text-center text-slate-500 py-10">Chưa có khách hàng.</div>}
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditing(null)}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
            <motion.div onClick={(e) => e.stopPropagation()}
              initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="glass-strong rounded-t-3xl md:rounded-3xl w-full max-w-md max-h-[92vh] md:max-h-[88vh] flex flex-col overflow-hidden">
              <div className="shrink-0 px-5 py-4 border-b border-white/10 flex items-center justify-between bg-black/20 relative">
                <div className="md:hidden mx-auto absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20" />
                <h3 className="text-lg md:text-xl font-bold">{editing.id ? 'Sửa khách hàng' : 'Thêm khách hàng'}</h3>
                <button onClick={() => setEditing(null)} className="size-9 rounded-lg hover:bg-white/10 flex items-center justify-center"><X className="size-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3 overscroll-contain">
                <div><label className="text-xs">Tên *</label><input className="input mt-1" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs">SĐT</label><input className="input mt-1" value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
                  <div><label className="text-xs">Email</label><input className="input mt-1" value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
                </div>
                <div><label className="text-xs">Địa chỉ</label><input className="input mt-1" value={editing.address || ''} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>
                <div><label className="text-xs">Ghi chú</label><textarea className="input mt-1" rows={2} value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
              </div>
              <div className="shrink-0 px-5 py-3 border-t border-white/10 bg-black/20 flex justify-end gap-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
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
