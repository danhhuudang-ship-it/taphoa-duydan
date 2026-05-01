'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
    <aside className="hidden md:flex w-64 shrink-0 flex-col gap-2 p-4 sticky top-0 h-screen">
      <Link href="/dashboard" className="flex items-center gap-2 px-2 py-3 group">
        <motion.div
          whileHover={{ rotate: 12, scale: 1.08 }}
          className="size-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-pink-500 shadow-glow"
        >
          <Sparkles className="size-5" />
        </motion.div>
        <div className="min-w-0">
          <div className="font-bold text-gradient truncate">{shopName}</div>
          <div className="text-[11px] text-slate-400">cùng Danh Hữu Đang</div>
        </div>
      </Link>

      <nav className="mt-3 flex flex-col gap-1">
        {links.map((l) => {
          const Icon = l.icon;
          const active = pathname?.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn('nav-link group', active && 'active')}
            >
              <motion.span whileHover={{ scale: 1.15, rotate: -6 }} className="text-slate-300 group-hover:text-white">
                <Icon className="size-[18px]" />
              </motion.span>
              <span className="text-sm font-medium">{l.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto glass p-3 text-xs text-slate-400">
        <div className="text-gradient font-semibold mb-1">Mẹo nhanh</div>
        Nhấn <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10">F2</kbd> để mở thanh toán nhanh trên POS.
      </div>

      <button onClick={logout} className="nav-link mt-1 hover:!text-rose-300">
        <LogOut className="size-[18px]" />
        <span className="text-sm">Đăng xuất</span>
      </button>
    </aside>
  );
}
