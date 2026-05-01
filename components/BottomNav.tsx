'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ShoppingCart, Package, Receipt, Settings as SettingsIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/pos',       label: 'Bán hàng',  icon: ShoppingCart },
  { href: '/products',  label: 'Sản phẩm', icon: Package },
  { href: '/orders',    label: 'Đơn',       icon: Receipt },
  { href: '/settings',  label: 'Cài đặt',  icon: SettingsIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-black/40 backdrop-blur-xl border-t border-white/10 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]"
    >
      <ul className="grid grid-cols-5 gap-1">
        {items.map((it) => {
          const Ic = it.icon;
          const active = pathname?.startsWith(it.href);
          return (
            <li key={it.href} className="flex">
              <Link
                href={it.href}
                className={cn(
                  'relative flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition',
                  active ? 'text-white' : 'text-slate-400 active:bg-white/5'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="bottomBarActive"
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/30 via-fuchsia-500/20 to-pink-500/20 border border-white/10"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <Ic className="size-[20px] relative" />
                <span className="text-[10px] font-medium relative leading-tight">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
