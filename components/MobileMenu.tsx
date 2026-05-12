'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Receipt, BarChart3,
  LogOut, Sparkles, Settings as SettingsIcon, Wallet, X, Menu,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Tổng quan',       icon: LayoutDashboard },
  { href: '/pos',       label: 'Bán hàng (POS)',  icon: ShoppingCart },
  { href: '/products',  label: 'Sản phẩm & Kho',  icon: Package },
  { href: '/customers', label: 'Khách hàng',      icon: Users },
  { href: '/orders',    label: 'Đơn hàng',        icon: Receipt },
  { href: '/debts',     label: 'Công nợ',         icon: Wallet },
  { href: '/reports',   label: 'Báo cáo',         icon: BarChart3 },
  { href: '/settings',  label: 'Cài đặt',         icon: SettingsIcon },
];

export default function MobileMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [shopName, setShopName] = useState('Bán hàng thông minh');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from('settings').select('shop_name').eq('id', 1).maybeSingle();
      if (data?.shop_name) setShopName(data.shop_name);
    })();
  }, []);

  // Đóng drawer khi đổi trang
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock scroll khi mở
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {/* Hamburger button — chỉ hiện trên mobile */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden size-10 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 transition shrink-0"
        aria-label="Mở menu"
      >
        <Menu className="size-6" />
      </button>

      {/* Drawer */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-[90] bg-slate-900/50"
          onClick={() => setOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 bottom-0 w-[78vw] max-w-[320px] bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideIn 0.22s cubic-bezier(.2,.8,.2,1)' }}
          >
            <style>{`@keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>

            {/* Header drawer */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-4 border-b border-slate-200 bg-gradient-to-br from-indigo-50 to-violet-50">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-2xl blur-md opacity-70 bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-pink-500 animate-glow-pulse" />
                <div className="relative size-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-pink-500 shadow-md">
                  <Sparkles className="size-[22px] text-white animate-wobble" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-slate-900 text-[15px] leading-tight tracking-tight truncate shimmer-text">{shopName}</div>
                <div className="text-[11px] text-slate-500 font-medium">cùng Danh Hữu Đang</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="size-9 rounded-lg hover:bg-white flex items-center justify-center"
                aria-label="Đóng"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
              {links.map((l) => {
                const Icon = l.icon;
                const active = pathname?.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-xl transition',
                      active
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span className="text-[15px]">{l.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Footer + logout */}
            <div className="shrink-0 p-3 border-t border-slate-200 space-y-2">
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-slate-600">
                <div className="font-semibold text-indigo-700 mb-1">Mẹo nhanh</div>
                Nhấn <kbd>F2</kbd> trên bàn phím (PC) để thanh toán nhanh trong POS.
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-rose-600 hover:bg-rose-50 font-medium"
              >
                <LogOut className="size-5" />
                <span className="text-[15px]">Đăng xuất</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
