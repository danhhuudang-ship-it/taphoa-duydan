'use client';
import { useState } from 'react';
import { Plus, Settings as Cog, X, Pencil, Trash2, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';

const ICON_OPTIONS = ['📦', '🥤', '🍔', '🍪', '🏠', '✏️', '👕', '🧴', '🍎', '🥩', '🍞', '🧀', '☕', '🍷', '🧻', '💊', '📱', '🎁', '🛒'];
const COLOR_OPTIONS = ['#6366f1', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#ef4444', '#0ea5e9'];

export default function CategoryManager({
  categories,
  activeCat,
  onSelect,
  onChanged,
}: {
  categories: Category[];
  activeCat: string | 'all';
  onSelect: (id: string | 'all') => void;
  onChanged: () => void;
}) {
  const [manageOpen, setManageOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!editing) return;
    if (!editing.name?.trim()) return toast.error('Tên không được trống');
    setSaving(true);
    const supabase = createClient();
    const payload: any = {
      name: editing.name.trim(),
      icon: editing.icon || '📦',
      color: editing.color || '#6366f1',
    };
    const { error } = editing.id
      ? await supabase.from('categories').update(payload).eq('id', editing.id)
      : await supabase.from('categories').insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing.id ? 'Đã cập nhật' : 'Đã thêm danh mục');
    setEditing(null);
    onChanged();
  };

  const remove = async (id: string) => {
    if (!confirm('Xoá danh mục này? (Sản phẩm trong danh mục sẽ trở thành "không có danh mục")')) return;
    const supabase = createClient();
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Đã xoá');
    onChanged();
  };

  return (
    <>
      {/* Chip filter row */}
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <button
          onClick={() => onSelect('all')}
          className={cn(
            'chip px-3.5 py-2 rounded-full text-sm font-semibold border',
            activeCat === 'all'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
              : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:shadow-sm'
          )}
        >
          Tất cả
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={cn(
              'chip px-3.5 py-2 rounded-full text-sm font-semibold border flex items-center gap-1.5',
              activeCat === c.id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:shadow-sm'
            )}
          >
            <span>{c.icon || '📦'}</span> {c.name}
          </button>
        ))}
        <button
          onClick={() => setEditing({ icon: '📦', color: '#6366f1' })}
          className="chip px-3.5 py-2 rounded-full text-sm font-semibold border border-dashed border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center gap-1"
        >
          <Plus className="size-4" /> Thêm danh mục
        </button>
        <button
          onClick={() => setManageOpen(true)}
          className="chip px-3 py-2 rounded-full text-sm font-medium border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400 flex items-center gap-1"
          title="Quản lý danh mục"
        >
          <Cog className="size-4" />
        </button>
      </div>

      {/* Manage list modal */}
      {manageOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/40 p-0 md:p-4" onClick={() => setManageOpen(false)}>
          <div className="modal-panel bg-white rounded-t-3xl md:rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white relative">
              <div className="md:hidden mx-auto absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-300" />
              <h3 className="text-lg font-bold text-slate-900">Quản lý danh mục</h3>
              <button onClick={() => setManageOpen(false)} className="size-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="size-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {categories.length === 0 && (
                <div className="text-center text-slate-400 py-8">Chưa có danh mục nào.</div>
              )}
              {categories.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="size-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: (c.color || '#6366f1') + '22' }}>
                    {c.icon || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{c.name}</div>
                  </div>
                  <button onClick={() => { setManageOpen(false); setEditing(c); }} className="btn-edit !min-h-9 !py-1.5 !px-2.5"><Pencil className="size-3.5" /></button>
                  <button onClick={() => remove(c.id)} className="btn-delete !min-h-9 !py-1.5 !px-2.5"><Trash2 className="size-3.5" /></button>
                </div>
              ))}
              <button onClick={() => { setManageOpen(false); setEditing({ icon: '📦', color: '#6366f1' }); }}
                className="w-full p-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-2 font-semibold">
                <Plus className="size-4" /> Thêm danh mục mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/40 p-0 md:p-4" onClick={() => setEditing(null)}>
          <div className="modal-panel bg-white rounded-t-3xl md:rounded-3xl w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white relative">
              <div className="md:hidden mx-auto absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-300" />
              <h3 className="text-lg font-bold text-slate-900">{editing.id ? 'Sửa danh mục' : 'Thêm danh mục'}</h3>
              <button onClick={() => setEditing(null)} className="size-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="size-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); save(); }} className="flex-1 flex flex-col min-h-0"><div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">Tên danh mục *</label>
                <input
                  className="input mt-1"
                  placeholder="Vd: Đồ uống, Bánh kẹo..."
                  value={editing.name || ''}
                  autoFocus
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Biểu tượng (emoji)</label>
                <div className="grid grid-cols-10 gap-1 mt-2">
                  {ICON_OPTIONS.map((ico) => (
                    <button key={ico} type="button" onClick={() => setEditing({ ...editing, icon: ico })}
                      className={cn(
                        'aspect-square rounded-lg text-xl flex items-center justify-center border-2 bounce',
                        editing.icon === ico ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                      )}>
                      {ico}
                    </button>
                  ))}
                </div>
                <input
                  className="input mt-2 text-center text-2xl py-1"
                  placeholder="hoặc gõ emoji khác..."
                  maxLength={4}
                  value={editing.icon || ''}
                  onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Màu chủ đạo</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {COLOR_OPTIONS.map((col) => (
                    <button key={col} type="button" onClick={() => setEditing({ ...editing, color: col })}
                      className={cn(
                        'size-9 rounded-xl border-2 bounce',
                        editing.color === col ? 'border-slate-900 scale-110' : 'border-slate-200'
                      )}
                      style={{ background: col }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="shrink-0 px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
              <button type="button" onClick={() => setEditing(null)} className="btn-ghost">Huỷ</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Lưu
              </button>
            </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
