'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Send, AlertTriangle, RotateCcw, Database, Loader2, Eye, EyeOff, CheckCircle2,
  Store, MapPin, Phone, MessageCircle, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { Settings } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function SettingsClient() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [confirmType, setConfirmType] = useState<null | 'reset_orders' | 'reset_all'>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
      if (error) { toast.error('Lỗi tải cài đặt: ' + error.message); return; }
      setS(data || {
        id: 1, shop_name: 'Tạp Hoá Duy Đan', shop_address: '', shop_phone: '',
        telegram_bot_token: '', telegram_chat_id: '', telegram_enabled: false,
      });
    })();
  }, []);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('settings').upsert({
      id: 1,
      shop_name: s.shop_name,
      shop_address: s.shop_address,
      shop_phone: s.shop_phone,
      telegram_bot_token: s.telegram_bot_token,
      telegram_chat_id: s.telegram_chat_id,
      telegram_enabled: s.telegram_enabled,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Đã lưu cài đặt ✨');
  };

  const testTelegram = async () => {
    if (!s?.telegram_bot_token || !s?.telegram_chat_id) {
      return toast.error('Cần điền đủ Bot Token và Chat ID');
    }
    const t = toast.loading('Đang gửi tin thử...');
    try {
      const r = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      });
      const j = await r.json();
      toast.dismiss(t);
      if (j.ok) toast.success('Gửi thành công 🎉 — kiểm tra Telegram');
      else toast.error('Lỗi: ' + (j.error || 'unknown'));
    } catch (e: any) {
      toast.dismiss(t);
      toast.error('Lỗi: ' + e.message);
    }
  };

  const doReset = async (kind: 'reset_orders' | 'reset_all') => {
    setResetting(true);
    const supabase = createClient();
    const fn = kind === 'reset_orders' ? 'reset_orders' : 'reset_all_and_seed';
    const { error } = await supabase.rpc(fn);
    setResetting(false);
    setConfirmType(null);
    if (error) return toast.error(error.message);
    if (kind === 'reset_orders') toast.success('Đã reset đơn hàng & doanh thu ✅');
    else toast.success('Đã reset toàn bộ và nạp lại demo ✅');
  };

  if (!s) return <div className="text-slate-400">Đang tải…</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Shop info */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glow-card p-5">
        <h3 className="font-semibold mb-1 flex items-center gap-2"><Store className="size-4 text-indigo-400" /> Thông tin cửa hàng</h3>
        <p className="text-xs text-slate-400 mb-4">Hiển thị trên giao diện và hóa đơn.</p>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-slate-300">Tên cửa hàng</label>
            <input className="input mt-1" value={s.shop_name || ''} onChange={(e) => setS({ ...s, shop_name: e.target.value })} placeholder="Tạp Hoá Duy Đan" />
          </div>
          <div>
            <label className="text-xs text-slate-300 flex items-center gap-1"><Phone className="size-3.5" /> Số điện thoại</label>
            <input className="input mt-1" value={s.shop_phone || ''} onChange={(e) => setS({ ...s, shop_phone: e.target.value })} placeholder="0901 234 567" />
          </div>
          <div>
            <label className="text-xs text-slate-300 flex items-center gap-1"><MapPin className="size-3.5" /> Địa chỉ</label>
            <input className="input mt-1" value={s.shop_address || ''} onChange={(e) => setS({ ...s, shop_address: e.target.value })} placeholder="123 Lê Lợi, Q.1, TP.HCM" />
          </div>
        </div>
      </motion.div>

      {/* Telegram */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glow-card p-5">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold flex items-center gap-2"><MessageCircle className="size-4 text-cyan-400" /> Thông báo Telegram</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={s.telegram_enabled}
              onChange={(e) => setS({ ...s, telegram_enabled: e.target.checked })}
            />
            <span className="w-10 h-5 bg-slate-700 rounded-full relative transition peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-fuchsia-500">
              <span className="absolute top-0.5 left-0.5 size-4 bg-white rounded-full transition peer-checked:translate-x-5" />
            </span>
            <span className="text-xs">{s.telegram_enabled ? 'Đang bật' : 'Đang tắt'}</span>
          </label>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Khi bật, mỗi đơn POS sẽ tự động gửi tin nhắn vào Telegram của bạn.{' '}
          <a className="underline text-cyan-300" target="_blank" rel="noreferrer" href="https://core.telegram.org/bots/features#botfather">Cách tạo bot</a>
        </p>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-slate-300">Bot Token <span className="text-slate-500">(từ @BotFather)</span></label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                className="input mt-1 pr-10"
                value={s.telegram_bot_token || ''}
                onChange={(e) => setS({ ...s, telegram_bot_token: e.target.value })}
                placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
              />
              <button onClick={() => setShowToken((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-300">Chat ID <span className="text-slate-500">(ID Telegram của bạn)</span></label>
            <input className="input mt-1" value={s.telegram_chat_id || ''} onChange={(e) => setS({ ...s, telegram_chat_id: e.target.value })} placeholder="123456789 hoặc -1001234567890" />
          </div>
        </div>

        <div className="mt-4 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-xs text-cyan-100/80 leading-relaxed">
          <b>Hướng dẫn:</b><br />
          1. Telegram → tìm <code className="px-1 bg-white/10 rounded">@BotFather</code> → <code className="px-1 bg-white/10 rounded">/newbot</code> → đặt tên → bạn nhận <b>Bot Token</b><br />
          2. Tìm bot vừa tạo → bấm <b>Start</b> hoặc nhắn 1 tin bất kỳ<br />
          3. Mở: <code className="px-1 bg-white/10 rounded">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> → tìm <code className="px-1 bg-white/10 rounded">"chat":{"{"}"id":...{"}"}</code> → đó là <b>Chat ID</b>
        </div>

        <div className="mt-4 flex gap-2">
          <motion.button whileTap={{ scale: 0.97 }} onClick={testTelegram} className="btn-ghost"><Send className="size-4" /> Gửi tin thử</motion.button>
        </div>
      </motion.div>

      {/* Save bar */}
      <div className="sticky bottom-4 flex justify-end">
        <motion.button whileTap={{ scale: 0.98 }} onClick={save} disabled={saving} className="btn-primary shadow-glow-lg">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Lưu cài đặt
        </motion.button>
      </div>

      {/* DANGER ZONE */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glow-card p-5 border-rose-500/30">
        <h3 className="font-semibold flex items-center gap-2 text-rose-300"><AlertTriangle className="size-4" /> Vùng nguy hiểm</h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">Các thao tác sau không thể hoàn tác — hãy chắc chắn.</p>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="glass p-4">
            <div className="font-semibold flex items-center gap-2"><RotateCcw className="size-4 text-amber-300" /> Reset đơn hàng & doanh thu</div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Xóa <b>toàn bộ đơn hàng</b>, lịch sử bán, reset chi tiêu khách về 0.
              <br /><span className="text-emerald-300">Giữ lại</span>: sản phẩm, danh mục, khách hàng.
              <br /><i>Phù hợp cuối tháng để bắt đầu kỳ kinh doanh mới.</i>
            </p>
            <button onClick={() => setConfirmType('reset_orders')} className="btn-ghost mt-3 hover:!text-amber-200 hover:!border-amber-500/40">
              <Trash2 className="size-3.5" /> Reset đơn hàng
            </button>
          </div>

          <div className="glass p-4">
            <div className="font-semibold flex items-center gap-2"><Database className="size-4 text-rose-300" /> Reset toàn bộ + nạp lại demo</div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Xóa <b>tất cả</b> (đơn, sản phẩm, danh mục, khách hàng) rồi nạp lại 24 sản phẩm + 5 danh mục + 4 khách mẫu.
              <br /><i>Dùng khi muốn bắt đầu lại từ đầu.</i>
            </p>
            <button onClick={() => setConfirmType('reset_all')} className="btn-ghost mt-3 hover:!text-rose-200 hover:!border-rose-500/40">
              <RotateCcw className="size-3.5" /> Reset toàn bộ
            </button>
          </div>
        </div>
      </motion.div>

      {/* Database hint */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glow-card p-5">
        <h3 className="font-semibold flex items-center gap-2"><Database className="size-4 text-emerald-400" /> Xem database ở đâu?</h3>
        <ol className="text-sm text-slate-300 mt-2 space-y-1 list-decimal pl-5">
          <li>Vào <a className="underline text-emerald-300" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">supabase.com/dashboard</a> → chọn project của bạn</li>
          <li>Sidebar trái → <b>Table Editor</b> (icon hình bảng) — xem & sửa từng dòng</li>
          <li>Hoặc <b>SQL Editor</b> để chạy lệnh SQL tùy ý</li>
          <li>Hoặc <b>Database → Tables</b> để xem cấu trúc bảng</li>
        </ol>
        <p className="text-xs text-slate-400 mt-3">Các bảng: <code className="badge">products</code> <code className="badge">categories</code> <code className="badge">customers</code> <code className="badge">orders</code> <code className="badge">order_items</code> <code className="badge">stock_movements</code> <code className="badge">settings</code></p>
      </motion.div>

      {/* Confirm modal */}
      <AnimatePresence>
        {confirmType && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmType(null)}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass-strong rounded-3xl p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-3">
                <div className="size-11 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
                  <AlertTriangle className="size-5" />
                </div>
                <h3 className="text-lg font-bold">Xác nhận</h3>
              </div>
              <p className="text-sm text-slate-300">
                {confirmType === 'reset_orders'
                  ? 'Bạn chắc chắn muốn XÓA TOÀN BỘ đơn hàng và reset doanh thu? Sản phẩm và khách hàng được giữ nguyên.'
                  : 'Bạn chắc chắn muốn XÓA TẤT CẢ DỮ LIỆU rồi nạp lại bộ demo (24 SP + 5 danh mục + 4 khách)?'}
              </p>
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setConfirmType(null)} className="btn-ghost">Hủy</button>
                <motion.button whileTap={{ scale: 0.97 }} disabled={resetting}
                  onClick={() => doReset(confirmType)}
                  className="btn-primary !bg-gradient-to-r !from-rose-500 !to-orange-500">
                  {resetting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Đồng ý xóa
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
