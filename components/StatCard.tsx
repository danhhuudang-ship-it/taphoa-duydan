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
      className="glow-card p-5 group"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</div>
          <div className="mt-1 text-2xl md:text-3xl font-bold text-white">
            {currency ? formatCurrency(value) : formatNumber(value)}
          </div>
          {delta !== undefined && (
            <div className={cn('mt-1 text-xs font-semibold', delta >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% so với hôm qua
            </div>
          )}
        </div>
        <motion.div
          whileHover={{ rotate: 12, scale: 1.1 }}
          className={cn('size-12 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-glow', color)}
        >
          <Icon className="size-5 text-white" />
        </motion.div>
      </div>
    </motion.div>
  );
}
