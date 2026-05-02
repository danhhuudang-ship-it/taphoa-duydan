'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Receipt, BarChart3, LogOut, Store, Settings as SettingsIcon,
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
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2 py-3 mb-3">
        <div className="size-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
          <Store className="size-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-slate-900 truncate text-[15px]">{shopName}</div>
          <div className="text-[11px] text-slate-500">cùng Danh Hữu Đang</div>
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
