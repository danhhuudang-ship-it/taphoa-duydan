'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Package, Receipt, Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/pos',       label: 'Bán hàng', icon: ShoppingCart },
  { href: '/products',  label: 'Sản phẩm', icon: Package },
  { href: '/orders',    label: 'Đơn',      icon: Receipt },
  { href: '/debts',     label: 'Công nợ',  icon: Wallet },
  { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-2px_10px_rgba(15,23,42,0.04)]">
      <ul className="grid grid-cols-5 gap-1">
        {items.map((it) => {
          const Ic = it.icon;
          const active = pathname?.startsWith(it.href);
          return (
            <li key={it.href} className="flex">
              <Link
                href={it.href}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition',
                  active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 active:bg-slate-100'
                )}
              >
                <Ic className="size-[22px] shrink-0" />
                <span className="text-[11px] font-medium leading-tight">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
