'use client';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

export default function StatCard({
  label, value, currency, delta, icon: Icon, color = 'from-indigo-500 to-fuchsia-500',
}: {
  label: string;
  value: number;
  currency?: boolean;
  delta?: number;
  icon: LucideIcon;
  color?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glow-card p-4 md:p-5 group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] md:text-xs font-medium uppercase tracking-wider text-slate-400 truncate">{label}</div>
          <div className="mt-1 text-lg md:text-2xl lg:text-3xl font-bold text-white leading-tight break-words">
            {currency ? formatCurrency(value) : formatNumber(value)}
          </div>
          {delta !== undefined && (
            <div className={cn('mt-1 text-[10px] md:text-xs font-semibold', delta >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% so với hôm qua
            </div>
          )}
        </div>
        <motion.div
          whileHover={{ rotate: 12, scale: 1.1 }}
          className={cn(
            'shrink-0 size-10 md:size-12 rounded-xl md:rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-glow',
            color
          )}
        >
          <Icon className="size-4 md:size-5 text-white shrink-0" />
        </motion.div>
      </div>
    </motion.div>
  );
}
