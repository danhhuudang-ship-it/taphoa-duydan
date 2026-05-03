'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Search, Plus, Minus, Trash2, ScanBarcode, X, CreditCard, Banknote, QrCode,
  ShoppingCart as CartIcon, Receipt, Tag, UserPlus, CheckCircle2, Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { Product, Category, CartItem, Customer, Order, OrderItem } from '@/lib/types';
import { cn, formatCurrency, genOrderCode } from '@/lib/utils';
import { useGlow } from '@/components/HoverGlow';
import PrintReceipt from '@/components/PrintReceipt';

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
  const glow = useGlow();
  const [lastOrder, setLastOrder] = useState<{ order: Order; items: OrderItem[] } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [autoPrint, setAutoPrint] = useState<boolean>(true);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [p, c, cu, st] = await Promise.all([
        supabase.from('products').select('*, categories(*)').eq('active', true).order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('customers').select('*').order('name'),
        supabase.from('settings').select('shop_name, shop_address, shop_phone').eq('id', 1).maybeSingle(),
      ]);
      setProducts((p.data as any) || []);
      setCategories(c.data || []);
      setCustomers(cu.data || []);
      setSettings(st.data || null);

      // Load auto-print preference từ localStorage
      try {
        const v = localStorage.getItem('pos_auto_print');
        if (v !== null) setAutoPrint(v === '1');
      } catch {}
    })();
  }, []);

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

  const subtotal = cart.reduce((s, i) => s + (i.price - (i.discount || 0)) * i.quantity, 0);
  const total = Math.max(0, subtotal - Number(discount || 0));
  const change = Math.max(0, Number(paid || 0) - total);

  const addToCart = (p: Product) => {
    if (p.stock <= 0) return toast.error('Hết hàng');
    setCart((cur) => {
      const ex = cur.find((i) => i.product_id === p.id);
      if (ex) {
        if (ex.quantity + 1 > p.stock) { toast.error('Vượt tồn kho'); return cur; }
        return cur.map((i) => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...cur, {
        product_id: p.id, product_name: p.name, product_sku: p.sku,
        price: Number(p.price), quantity: 1, stock: p.stock, image_url: p.image_url,
        discount: 0,
      }];
    });
  };

  const updateQty = (pid: string, q: number) =>
    setCart((cur) => cur.map((i) => i.product_id === pid ? { ...i, quantity: Math.max(1, Math.min(q, i.stock)) } : i));

  const updateDiscount = (pid: string, d: number) =>
    setCart((cur) => cur.map((i) => i.product_id === pid ? { ...i, discount: Math.max(0, Math.min(Number(d) || 0, i.price)) } : i));

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
        product_id: i.product_id, product_name: i.product_name, product_sku: i.product_sku,
        price: i.price, quantity: i.quantity, discount: i.discount || 0,
      })),
      p_discount: Number(discount || 0),
      p_tax: 0,
      p_payment_method: paymentMethod,
      p_paid: Number(paid || total),
      p_notes: null,
    };
    const { error } = await supabase.rpc('create_order', payload);
    setSubmitting(false);
    if (error) { toast.error('Tạo đơn lỗi: ' + error.message); return; }

    // Build order snapshot cho việc in hoá đơn
    const snapshot: Order = {
      id: '',
      code,
      customer_id: customerId || null,
      customer_name: customer?.name || 'Khách lẻ',
      subtotal,
      discount: Number(discount || 0),
      tax: 0,
      total,
      paid: Number(paid || total),
      payment_method: paymentMethod,
      status: 'completed',
      created_at: new Date().toISOString(),
    };
    const itemSnapshot: OrderItem[] = cart.map((i, idx) => ({
      id: String(idx),
      order_id: '',
      product_id: i.product_id,
      product_name: i.product_name,
      product_sku: i.product_sku,
      quantity: i.quantity,
      price: i.price,
      total: (i.price - (i.discount || 0)) * i.quantity,
      ...(i.discount ? { discount: i.discount } : {}),
    } as OrderItem));

    setLastOrder({ order: snapshot, items: itemSnapshot });
    toast.success(`Đã tạo đơn ${code}`);
    setShowPay(false);
    setShowSuccess(true);

    // Auto print nếu user bật
    if (autoPrint) {
      // chờ DOM render xong để PrintReceipt có data
      setTimeout(() => { window.print(); }, 250);
    }

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
              price: i.price - (i.discount || 0),
              total: (i.price - (i.discount || 0)) * i.quantity,
            })),
            subtotal, discount: Number(discount || 0), total, paid: Number(paid || total), paymentMethod,
          }),
        }).catch(() => {});
      }
    } catch {}

    // refresh stocks (background)
    (async () => {
      const { data } = await supabase.from('products').select('*, categories(*)').eq('active', true).order('name');
      setProducts((data as any) || []);
    })();
  };

  const startNewOrder = () => {
    setShowSuccess(false);
    setLastOrder(null);
    clearCart();
  };

  return (
    <div className="lg:grid lg:grid-cols-[1fr_400px] gap-4 p-3 md:p-6">
      {/* LEFT — products */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex items-center gap-2 px-3 py-2 flex-1 min-w-[220px] rounded-xl bg-white border border-slate-200">
            <Search className="size-4 text-slate-400" />
            <input
              autoFocus
              className="bg-transparent outline-none text-[15px] flex-1 text-slate-700"
              placeholder="Tìm tên/SKU/mã vạch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <ScanBarcode className="size-4 text-slate-400" />
          </div>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => setActiveCat('all')}
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
              onClick={() => setActiveCat(c.id)}
              className={cn(
                'chip px-3.5 py-2 rounded-full text-sm font-semibold border flex items-center gap-1.5',
                activeCat === c.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:shadow-sm'
              )}
            >
              <span>{c.icon}</span> {c.name}
            </button>
          ))}
        </div>

        {/* Product grid - không dùng AnimatePresence để click chuyển danh mục mượt */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              onMouseMove={glow.onMouseMove}
              className="glow-card bounce p-2.5 text-left flex flex-col gap-2"
              style={{ willChange: 'transform' }}
            >
              <div className="aspect-square rounded-lg bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center text-3xl overflow-hidden">
                {p.image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span>{p.categories?.icon || '🛒'}</span>
                )}
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <div className="text-[10px] text-slate-500 font-mono">{p.sku}</div>
                <div className="font-semibold text-[13px] leading-tight line-clamp-2 text-slate-900 min-h-[2.4em]">{p.name}</div>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <div className="font-bold text-[14px] text-indigo-700 whitespace-nowrap">{formatCurrency(p.price)}</div>
                  <span className={cn('badge', p.stock <= 0 ? 'badge-danger' : p.stock < (p.min_stock || 5) ? 'badge-warn' : 'badge-success')}>
                    {p.stock <= 0 ? 'Hết' : `Còn ${p.stock}`}
                  </span>
                </div>
              </div>
            </button>
          ))}
          {!filtered.length && (
            <div className="col-span-full text-center text-slate-400 py-10">
              Không tìm thấy sản phẩm phù hợp.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — desktop cart */}
      <aside className="hidden lg:flex card-strong p-4 flex-col h-[calc(100vh-7rem)] sticky top-24">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><CartIcon className="size-5" /> Giỏ hàng <span className="badge">{cart.length}</span></h3>
          {!!cart.length && (
            <button onClick={clearCart} className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium">
              <Trash2 className="size-3.5" /> Xóa hết
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-xl bg-slate-50 border border-slate-200">
          <UserPlus className="size-4 text-slate-400" />
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm text-slate-700"
          >
            <option value="">Khách lẻ</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} {c.phone ? `· ${c.phone}` : ''}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {cart.map((it) => (
            <div key={it.product_id} className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-lg bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                  {it.image_url ? <img src={it.image_url} alt="" className="size-full object-cover" /> : '🛒'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate text-slate-900">{it.product_name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    {(it.discount || 0) > 0 ? (
                      <>
                        <span className="line-through opacity-60">{formatCurrency(it.price)}</span>
                        <span className="text-emerald-600 font-semibold">{formatCurrency(it.price - (it.discount || 0))}</span>
                      </>
                    ) : (
                      <span>{formatCurrency(it.price)}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => removeItem(it.product_id)} className="size-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center">
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 pl-[60px]">
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(it.product_id, it.quantity - 1)} className="size-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Minus className="size-4" /></button>
                  <input
                    type="number"
                    value={it.quantity}
                    onChange={(e) => updateQty(it.product_id, Number(e.target.value))}
                    className="w-10 text-center text-sm font-semibold bg-transparent outline-none text-slate-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button onClick={() => updateQty(it.product_id, it.quantity + 1)} className="size-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Plus className="size-4" /></button>
                </div>
                <div className="flex items-center gap-1 ml-auto">
                  <Tag className="size-3.5 text-amber-500" />
                  <input
                    type="number"
                    placeholder="Giảm/sp"
                    value={it.discount || ''}
                    onChange={(e) => updateDiscount(it.product_id, Number(e.target.value))}
                    title="Giảm trên 1 đơn vị (giá sỉ)"
                    className="w-24 text-right text-xs px-2 py-1.5 rounded-md bg-amber-50 border border-amber-200 outline-none focus:border-amber-500 text-slate-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="font-bold text-sm w-20 text-right shrink-0 text-slate-900">{formatCurrency((it.price - (it.discount || 0)) * it.quantity)}</div>
              </div>
            </div>
          ))}
          {!cart.length && (
            <div className="text-center text-slate-400 py-12">
              <CartIcon className="size-10 mx-auto mb-2 opacity-50" />
              Giỏ hàng trống
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-3 mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Tạm tính</span><span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span className="flex items-center gap-1"><Tag className="size-3.5" /> Giảm thêm</span>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-28 text-right input !py-1 !px-2 !min-h-0"
            />
          </div>
          <div className="flex items-center justify-between text-base font-bold pt-2 border-t border-slate-200">
            <span className="text-slate-900">Tổng tiền</span>
            <span className="text-indigo-700 text-xl">{formatCurrency(total)}</span>
          </div>

          <button
            disabled={!cart.length}
            onClick={() => { setPaid(total); setShowPay(true); }}
            className={cn('btn-primary w-full mt-1 !text-base !py-3', !cart.length && 'opacity-50 cursor-not-allowed')}
          >
            <Receipt className="size-5" /> Thanh toán (F2)
          </button>
        </div>
      </aside>

      {/* MOBILE FLOATING CART BUTTON */}
      {cart.length > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="lg:hidden fixed bottom-20 right-4 z-30 rounded-full px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg flex items-center gap-2 font-bold"
        >
          <CartIcon className="size-5" />
          <span>{cart.length}</span>
          <span className="opacity-80">·</span>
          <span>{formatCurrency(total)}</span>
        </button>
      )}

      {/* MOBILE CART BOTTOM SHEET */}
      {cartOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-slate-900/40" onClick={() => setCartOpen(false)}>
          <div
            className="absolute bottom-0 inset-x-0 max-h-[88vh] bg-white rounded-t-3xl p-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-12 h-1.5 rounded-full bg-slate-300 mb-3" />
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><CartIcon className="size-5" /> Giỏ hàng <span className="badge">{cart.length}</span></h3>
              <button onClick={() => setCartOpen(false)} className="size-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="size-5" /></button>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-xl bg-slate-50 border border-slate-200">
              <UserPlus className="size-4 text-slate-400" />
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="flex-1 bg-transparent outline-none text-sm text-slate-700">
                <option value="">Khách lẻ</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} {c.phone ? `· ${c.phone}` : ''}</option>)}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {cart.map((it) => (
                <div key={it.product_id} className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-lg bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                      {it.image_url ? <img src={it.image_url} alt="" className="size-full object-cover" /> : '🛒'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate text-slate-900">{it.product_name}</div>
                      <div className="text-xs text-slate-500">
                        {(it.discount || 0) > 0 ? (
                          <><span className="line-through opacity-60">{formatCurrency(it.price)}</span> <span className="text-emerald-600 font-semibold">{formatCurrency(it.price - (it.discount || 0))}</span></>
                        ) : formatCurrency(it.price)}
                      </div>
                    </div>
                    <button onClick={() => removeItem(it.product_id)} className="size-8 rounded-lg bg-rose-50 text-rose-600"><X className="size-4 mx-auto" /></button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(it.product_id, it.quantity - 1)} className="size-9 rounded-lg bg-slate-100 active:bg-slate-200 flex items-center justify-center"><Minus className="size-4" /></button>
                      <span className="w-9 text-center text-sm font-bold">{it.quantity}</span>
                      <button onClick={() => updateQty(it.product_id, it.quantity + 1)} className="size-9 rounded-lg bg-slate-100 active:bg-slate-200 flex items-center justify-center"><Plus className="size-4" /></button>
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                      <Tag className="size-3.5 text-amber-500" />
                      <input type="number" placeholder="Giảm/sp" value={it.discount || ''}
                        onChange={(e) => updateDiscount(it.product_id, Number(e.target.value))}
                        className="w-24 text-right text-xs px-2 py-1.5 rounded-md bg-amber-50 border border-amber-200 outline-none focus:border-amber-500 text-slate-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                    <div className="font-bold text-sm w-20 text-right text-slate-900">{formatCurrency((it.price - (it.discount || 0)) * it.quantity)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-3 mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Tạm tính</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 flex items-center gap-1"><Tag className="size-3.5" /> Giảm thêm</span>
                <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-28 text-right input !py-1 !px-2 !min-h-0" />
              </div>
              <div className="flex items-center justify-between text-base font-bold pt-2 border-t border-slate-200">
                <span>Tổng tiền</span>
                <span className="text-indigo-700 text-xl">{formatCurrency(total)}</span>
              </div>
              <button onClick={() => { setPaid(total); setShowPay(true); setCartOpen(false); }} className="btn-primary w-full !text-base !py-3 mt-1">
                <Receipt className="size-5" /> Thanh toán
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPay && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={() => setShowPay(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md border border-slate-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Thanh toán</h3>
              <button onClick={() => setShowPay(false)} className="size-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="size-5" /></button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {([
                { id: 'cash', label: 'Tiền mặt', icon: Banknote },
                { id: 'card', label: 'Thẻ',      icon: CreditCard },
                { id: 'qr',   label: 'QR',       icon: QrCode },
              ] as const).map(({ id, label, icon: Ic }) => (
                <button
                  key={id}
                  onClick={() => setPaymentMethod(id)}
                  className={cn(
                    'rounded-xl p-3 text-sm flex flex-col items-center gap-1 border font-semibold transition',
                    paymentMethod === id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                  )}
                >
                  <Ic className="size-5" /> {label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Tổng tiền</span>
                <span className="font-bold text-indigo-700 text-xl">{formatCurrency(total)}</span>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Khách đưa</label>
                <input
                  type="number" autoFocus value={paid}
                  onChange={(e) => setPaid(Number(e.target.value))}
                  className="input mt-1 text-right text-lg font-bold"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[total, 100000, 200000, 500000].map((v, i) => (
                  <button key={i} onClick={() => setPaid(v)} className="btn-ghost !py-2 text-xs justify-center">
                    {formatCurrency(v)}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-sm text-slate-600">Tiền thừa</span>
                <span className="font-bold text-emerald-600 text-lg">{formatCurrency(change)}</span>
              </div>

              <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoPrint}
                  onChange={(e) => {
                    setAutoPrint(e.target.checked);
                    try { localStorage.setItem('pos_auto_print', e.target.checked ? '1' : '0'); } catch {}
                  }}
                  className="size-4 accent-indigo-600"
                />
                <span className="text-sm text-slate-700 flex items-center gap-1">
                  <Printer className="size-4 text-indigo-600" /> In hoá đơn ngay sau khi thanh toán
                </span>
              </label>
            </div>

            <button disabled={submitting} onClick={submit} className="btn-primary w-full mt-5 !text-base !py-3">
              {submitting ? 'Đang xử lý...' : 'Hoàn tất đơn'}
            </button>
          </div>
        </div>
      )}
      {/* === SUCCESS MODAL sau khi tạo đơn === */}
      {showSuccess && lastOrder && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 no-print" onClick={startNewOrder}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md border border-slate-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="size-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="size-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Tạo đơn thành công</h3>
                <div className="text-sm text-slate-500 font-mono">{lastOrder.order.code}</div>
              </div>
            </div>

            <div className="space-y-1.5 text-sm border-y border-slate-200 py-3 mb-4">
              <div className="flex justify-between"><span className="text-slate-600">Khách:</span><b>{lastOrder.order.customer_name}</b></div>
              <div className="flex justify-between"><span className="text-slate-600">Tạm tính:</span><b>{formatCurrency(lastOrder.order.subtotal)}</b></div>
              {Number(lastOrder.order.discount) > 0 && (
                <div className="flex justify-between"><span className="text-slate-600">Giảm:</span><b>-{formatCurrency(lastOrder.order.discount)}</b></div>
              )}
              <div className="flex justify-between text-base font-bold pt-1 border-t border-slate-200">
                <span>Tổng:</span><span className="text-indigo-700 text-lg">{formatCurrency(lastOrder.order.total)}</span>
              </div>
              <div className="flex justify-between"><span className="text-slate-600">Khách trả:</span><b>{formatCurrency(lastOrder.order.paid)}</b></div>
              <div className="flex justify-between text-emerald-600"><span>Tiền thừa:</span><b>{formatCurrency(Math.max(0, Number(lastOrder.order.paid) - Number(lastOrder.order.total)))}</b></div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => window.print()}
                className="btn-ghost !justify-center !py-3 !text-base"
              >
                <Printer className="size-5" /> In hoá đơn
              </button>
              <button onClick={startNewOrder} className="btn-primary !justify-center !py-3 !text-base">
                Đơn mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === HIDDEN PRINT RECEIPT === */}
      {lastOrder && (
        <PrintReceipt order={lastOrder.order} items={lastOrder.items} settings={settings} />
      )}
    </div>
  );
}
