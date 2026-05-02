'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Receipt, BarChart3, LogOut, Sparkles, Settings as SettingsIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Tổng quan',       icon: LayoutDashboard },
  { href: '/pos',       label: 'Bán hàng (POS)',  icon: ShoppingCart },
  { href: '/products',  label: 'Sản phẩm & Kho',  icon: Package },
  { href: '/customers', label: 'Khách hàng',      icon: Users },
  { href: '/orders',    label: 'Đơn hàng',        icon: Receipt },
  { href: '/reports',   label: 'Báo cáo',         icon: BarChart3 },
  { href: '/settings',  label: 'Cài đặt',         icon: SettingsIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [shopName, setShopName] = useState('Bán hàng thông minh');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from('settings').select('shop_name').eq('id', 1).maybeSingle();
      if (data?.shop_name) setShopName(data.shop_name);
    })();
  }, [pathname]);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col gap-1 p-4 sticky top-0 h-screen bg-white border-r border-slate-200">
      <Link href="/dashboard" className="flex items-center gap-3 px-2 py-3 mb-3 group">
        <div className="relative shrink-0">
          {/* Glow halo behind icon */}
          <div className="absolute inset-0 rounded-2xl blur-md opacity-70 bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-pink-500 animate-glow-pulse" />
          <div className="relative size-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-pink-500 shadow-md">
            <Sparkles className="size-[22px] text-white animate-wobble" />
          </div>
        </div>
        <div className="min-w-0">
          <div className="font-extrabold text-slate-900 text-[15px] leading-tight tracking-tight truncate shimmer-text">{shopName}</div>
          <div className="text-[11px] text-slate-500 font-medium">cùng Danh Hữu Đang</div>
        </div>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {links.map((l) => {
          const Icon = l.icon;
          const active = pathname?.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className={cn('nav-link', active && 'active')}>
              <Icon className="size-[20px] shrink-0" />
              <span className="text-[14px]">{l.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-slate-600">
        <div className="font-semibold text-indigo-700 mb-1">Mẹo nhanh</div>
        Nhấn <kbd>F2</kbd> để mở thanh toán nhanh trên POS.
      </div>

      <button onClick={logout} className="nav-link mt-1 hover:!bg-rose-50 hover:!text-rose-600">
        <LogOut className="size-[20px]" />
        <span className="text-[14px]">Đăng xuất</span>
      </button>
    </aside>
  );
}
