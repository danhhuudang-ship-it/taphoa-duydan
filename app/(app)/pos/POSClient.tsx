'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Minus, Trash2, ScanBarcode, X, CreditCard, Banknote, QrCode,
  ShoppingCart as CartIcon, Receipt, Tag, UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { Product, Category, CartItem, Customer } from '@/lib/types';
import { cn, formatCurrency, genOrderCode } from '@/lib/utils';

export default function POSClient() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers]   = useState<Customer[]>([]);
  const [activeCat, setActiveCat]   = useState<string | 'all'>('all');
  const [search, setSearch]         = useState('');
  const [cart, setCart]             = useState<CartItem[]>([]);
  const [discount, setDiscount]     = useState(0);
  const [paid, setPaid]             = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'card'|'qr'>('cash');
  const [customerId, setCustomerId] = useState<string | ''>('');
  const [showPay, setShowPay]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cartOpen, setCartOpen]     = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [p, c, cu] = await Promise.all([
        supabase.from('products').select('*, categories(*)').eq('active', true).order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('customers').select('*').order('name'),
      ]);
      setProducts((p.data as any) || []);
      setCategories(c.data || []);
      setCustomers(cu.data || []);
    })();
  }, []);

  // F2 phím tắt mở thanh toán
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); if (cart.length) setShowPay(true); }
      if (e.key === 'Escape') setShowPay(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cart.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCat !== 'all' && p.category_id !== activeCat) return false;
      if (q && !(p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [products, activeCat, search]);

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = Math.max(0, subtotal - Number(discount || 0));
  const change = Math.max(0, Number(paid || 0) - total);

  const addToCart = (p: Product) => {
    if (p.stock <= 0) return toast.error('Hết hàng');
    setCart((cur) => {
      const ex = cur.find((i) => i.product_id === p.id);
      if (ex) {
        if (ex.quantity + 1 > p.stock) {
          toast.error('Vượt tồn kho');
          return cur;
        }
        return cur.map((i) => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...cur, {
        product_id: p.id, product_name: p.name, product_sku: p.sku,
        price: Number(p.price), quantity: 1, stock: p.stock, image_url: p.image_url,
      }];
    });
  };

  const updateQty = (pid: string, q: number) =>
    setCart((cur) => cur.map((i) => i.product_id === pid ? { ...i, quantity: Math.max(1, Math.min(q, i.stock)) } : i));

  const removeItem = (pid: string) => setCart((cur) => cur.filter((i) => i.product_id !== pid));

  const clearCart = () => { setCart([]); setDiscount(0); setPaid(0); };

  const submit = async () => {
    if (!cart.length) return;
    setSubmitting(true);
    const supabase = createClient();
    const code = genOrderCode();
    const customer = customers.find((c) => c.id === customerId);
    const payload = {
      p_code: code,
      p_customer_id: customerId || null,
      p_customer_name: customer?.name || 'Khách lẻ',
      p_items: cart.map((i) => ({
        product_id:  i.product_id,
        product_name: i.product_name,
        product_sku:  i.product_sku,
        price:        i.price,
        quantity:     i.quantity,
      })),
      p_discount: Number(discount || 0),
      p_tax: 0,
      p_payment_method: paymentMethod,
      p_paid: Number(paid || total),
      p_notes: null,
    };
    const { error } = await supabase.rpc('create_order', payload);
    setSubmitting(false);
    if (error) {
      toast.error('Tạo đơn lỗi: ' + error.message);
      return;
    }
    toast.success(`✅ Đã tạo đơn ${code}`);
    setShowPay(false);

    // 🚀 Gửi Telegram nếu được bật
    try {
      const { data: cfg } = await supabase.from('settings').select('telegram_enabled').eq('id', 1).maybeSingle();
      if (cfg?.telegram_enabled) {
        fetch('/api/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            customer: customer?.name || 'Khách lẻ',
            items: cart.map((i) => ({
              name: i.product_name, qty: i.quantity,
              price: i.price, total: i.price * i.quantity,
            })),
            subtotal,
            discount: Number(discount || 0),
            total,
            paid: Number(paid || total),
            paymentMethod,
          }),
        }).catch(() => {});
      }
    } catch {}

    clearCart();
    // refresh stocks
    const { data } = await supabase.from('products').select('*, categories(*)').eq('active', true).order('name');
    setProducts((data as any) || []);
  };

  return (
    <div className="lg:grid lg:grid-cols-[1fr_420px] gap-4 p-3 md:p-6">
      {/* LEFT — products */}
      <div className="min-w-0">
        {/* search + categories */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="glass flex items-center gap-2 px-3 py-2 flex-1 min-w-[240px]">
            <Search className="size-4 text-slate-400" />
            <input
              autoFocus
              className="bg-transparent outline-none text-sm flex-1"
              placeholder="Tìm theo tên, SKU, quét mã vạch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <ScanBarcode className="size-4 text-slate-400" />
          </div>
          <button onClick={() => setActiveCat('all')} className={cn('btn-ghost', activeCat === 'all' && '!bg-white/10 !border-white/20 !text-white')}>
            Tất cả
          </button>
          {categories.map((c) => (
            <motion.button
              key={c.id}
              whileHover={{ y: -2 }}
              onClick={() => setActiveCat(c.id)}
              className={cn('btn-ghost', activeCat === c.id && '!bg-white/10 !border-white/20 !text-white')}
              style={{ borderColor: activeCat === c.id ? (c.color || undefined) : undefined }}
            >
              <span>{c.icon}</span> {c.name}
            </motion.button>
          ))}
        </div>

        {/* product grid */}
        <motion.div
          initial="hidden" animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }}
          className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3"
        >
          <AnimatePresence>
            {filtered.map((p) => (
              <motion.button
                layout
                key={p.id}
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => addToCart(p)}
                className="glow-card text-left p-3 group"
              >
                <div className="aspect-square rounded-xl bg-gradient-to-br from-indigo-500/20 via-fuchsia-500/15 to-pink-500/20 mb-2 flex items-center justify-center text-3xl overflow-hidden">
                  {p.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition" />
                  ) : (
                    <span className="opacity-80">{p.categories?.icon || '🛒'}</span>
                  )}
                </div>
                <div className="text-xs text-slate-400">{p.sku}</div>
                <div className="font-semibold text-sm leading-tight line-clamp-2 min-h-[2.4em]">{p.name}</div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="text-gradient font-bold text-sm">{formatCurrency(p.price)}</div>
                  <span className={cn('badge', p.stock <= 0 ? 'badge-danger' : p.stock < (p.min_stock || 5) ? 'badge-warn' : 'badge-success')}>
                    {p.stock <= 0 ? 'Hết' : `Còn ${p.stock}`}
                  </span>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
          {!filtered.length && (
            <div className="col-span-full text-center text-slate-400 py-10 motion-fade-up">
              Không tìm thấy sản phẩm phù hợp.
            </div>
          )}
        </motion.div>
      </div>

      {/* RIGHT — cart */}
      <aside className="hidden lg:flex glass-strong rounded-2xl p-4 flex-col h-[calc(100vh-7rem)] sticky top-24">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2"><CartIcon className="size-4" /> Giỏ hàng <span className="badge">{cart.length}</span></h3>
          {!!cart.length && (
            <button onClick={clearCart} className="text-xs text-rose-300 hover:text-rose-200 flex items-center gap-1">
              <Trash2 className="size-3.5" /> Xóa hết
            </button>
          )}
        </div>

        {/* customer selector */}
        <div className="glass flex items-center gap-2 px-3 py-2 mb-3">
          <UserPlus className="size-4 text-slate-400" />
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm appearance-none [&>option]:bg-slate-900 [&>option]:text-slate-100"
          >
            <option value="">Khách lẻ</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} {c.phone ? `· ${c.phone}` : ''}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2">
          <AnimatePresence>
            {cart.map((it) => (
              <motion.div
                layout
                key={it.product_id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                className="glass p-3 flex items-center gap-3"
              >
                <div className="size-12 rounded-lg bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 flex items-center justify-center text-lg shrink-0">
                  {it.image_url ? <img src={it.image_url} alt="" className="size-full object-cover rounded-lg" /> : '🛒'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{it.product_name}</div>
                  <div className="text-xs text-slate-400">{formatCurrency(it.price)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => updateQty(it.product_id, it.quantity - 1)} className="size-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center"><Minus className="size-3.5" /></motion.button>
                  <input
                    type="number"
                    value={it.quantity}
                    onChange={(e) => updateQty(it.product_id, Number(e.target.value))}
                    className="w-10 text-center text-sm bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => updateQty(it.product_id, it.quantity + 1)} className="size-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center"><Plus className="size-3.5" /></motion.button>
                </div>
                <button onClick={() => removeItem(it.product_id)} className="text-rose-300 hover:text-rose-200">
                  <X className="size-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {!cart.length && (
            <div className="text-center text-slate-500 py-12">
              <CartIcon className="size-10 mx-auto mb-2 opacity-50" />
              Giỏ hàng trống — chọn sản phẩm bên trái
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-3 mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Tạm tính</span><span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span className="flex items-center gap-1"><Tag className="size-3.5" /> Giảm giá</span>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-28 text-right bg-transparent outline-none input !py-1 !px-2"
            />
          </div>
          <div className="flex items-center justify-between text-base font-bold pt-2 border-t border-white/10">
            <span>Tổng tiền</span>
            <span className="text-gradient text-lg">{formatCurrency(total)}</span>
          </div>

          <motion.button
            whileHover={{ scale: cart.length ? 1.01 : 1 }}
            whileTap={{ scale: 0.98 }}
            disabled={!cart.length}
            onClick={() => { setPaid(total); setShowPay(true); }}
            className={cn('btn-primary w-full mt-1', !cart.length && 'opacity-50 cursor-not-allowed')}
          >
            <Receipt className="size-4" /> Thanh toán (F2)
          </motion.button>
        </div>
      </aside>

      {/* === MOBILE FLOATING CART BUTTON === */}
      {cart.length > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setCartOpen(true)}
          className="lg:hidden fixed bottom-20 right-4 z-30 btn-primary !rounded-full !px-5 !py-3 shadow-glow-lg flex items-center gap-2"
        >
          <CartIcon className="size-5" />
          <span className="font-bold">{cart.length}</span>
          <span className="opacity-80">·</span>
          <span>{formatCurrency(total)}</span>
        </motion.button>
      )}

      {/* === MOBILE BOTTOM SHEET CART === */}
      <AnimatePresence>
        {cartOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 inset-x-0 max-h-[88vh] glass-strong rounded-t-3xl p-4 flex flex-col"
            >
              <div className="mx-auto w-12 h-1.5 rounded-full bg-white/20 mb-3" />
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold flex items-center gap-2"><CartIcon className="size-4" /> Giỏ hàng <span className="badge">{cart.length}</span></h3>
                <button onClick={() => setCartOpen(false)} className="text-slate-400"><X className="size-5" /></button>
              </div>

              <div className="glass flex items-center gap-2 px-3 py-2 mb-3">
                <UserPlus className="size-4 text-slate-400" />
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm appearance-none [&>option]:bg-slate-900 [&>option]:text-slate-100"
                >
                  <option value="">Khách lẻ</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name} {c.phone ? `· ${c.phone}` : ''}</option>)}
                </select>
              </div>

              <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2">
                <AnimatePresence>
                  {cart.map((it) => (
                    <motion.div
                      layout
                      key={it.product_id}
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                      className="glass p-3 flex items-center gap-3"
                    >
                      <div className="size-12 rounded-lg bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                        {it.image_url ? <img src={it.image_url} alt="" className="size-full object-cover" /> : '🛒'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{it.product_name}</div>
                        <div className="text-xs text-slate-400">{formatCurrency(it.price)}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(it.product_id, it.quantity - 1)} className="size-8 rounded-lg bg-white/10 active:bg-white/20 flex items-center justify-center"><Minus className="size-3.5" /></button>
                        <span className="w-7 text-center text-sm font-semibold">{it.quantity}</span>
                        <button onClick={() => updateQty(it.product_id, it.quantity + 1)} className="size-8 rounded-lg bg-white/10 active:bg-white/20 flex items-center justify-center"><Plus className="size-3.5" /></button>
                      </div>
                      <button onClick={() => removeItem(it.product_id)} className="text-rose-300"><X className="size-4" /></button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="border-t border-white/10 pt-3 mt-3 space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Tạm tính</span><span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span className="flex items-center gap-1"><Tag className="size-3.5" /> Giảm giá</span>
                  <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-28 text-right input !py-1 !px-2" />
                </div>
                <div className="flex items-center justify-between text-base font-bold pt-2 border-t border-white/10">
                  <span>Tổng tiền</span>
                  <span className="text-gradient text-lg">{formatCurrency(total)}</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setPaid(total); setShowPay(true); setCartOpen(false); }}
                  className="btn-primary w-full mt-1"
                >
                  <Receipt className="size-4" /> Thanh toán
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PAYMENT MODAL */}
      <AnimatePresence>
        {showPay && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowPay(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-3xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gradient">Thanh toán</h3>
                <button onClick={() => setShowPay(false)} className="text-slate-400 hover:text-white"><X /></button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {([
                  { id: 'cash', label: 'Tiền mặt', icon: Banknote },
                  { id: 'card', label: 'Thẻ',      icon: CreditCard },
                  { id: 'qr',   label: 'QR',       icon: QrCode },
                ] as const).map(({ id, label, icon: Ic }) => (
                  <motion.button
                    key={id} whileHover={{ y:-2 }} whileTap={{ scale: 0.96 }}
                    onClick={() => setPaymentMethod(id)}
                    className={cn('glow-card p-3 text-sm flex flex-col items-center gap-1', paymentMethod === id && 'border-indigo-400/60 shadow-glow')}
                  >
                    <Ic className="size-5" /> {label}
                  </motion.button>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Tổng tiền</span>
                  <span className="font-bold text-gradient text-xl">{formatCurrency(total)}</span>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Khách đưa</label>
                  <input
                    type="number"
                    autoFocus
                    value={paid}
                    onChange={(e) => setPaid(Number(e.target.value))}
                    className="input mt-1 text-right text-lg font-bold"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[total, 100000, 200000, 500000].map((v, i) => (
                    <button
                      key={i}
                      onClick={() => setPaid(v)}
                      className="btn-ghost !py-1.5 text-xs"
                    >
                      {formatCurrency(v)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-sm text-slate-300">Tiền thừa</span>
                  <span className="font-bold text-emerald-400">{formatCurrency(change)}</span>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                disabled={submitting}
                onClick={submit}
                className="btn-primary w-full mt-5"
              >
                {submitting ? 'Đang xử lý...' : 'Hoàn tất đơn'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
