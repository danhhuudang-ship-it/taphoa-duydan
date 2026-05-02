'use client';
import { LucideIcon } from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { useGlow } from '@/components/HoverGlow';

export default function StatCard({
  label, value, currency, delta, icon: Icon, color = 'from-indigo-500 to-violet-600',
}: {
  label: string;
  value: number;
  currency?: boolean;
  delta?: number;
  icon: LucideIcon;
  color?: string;
}) {
  const glow = useGlow();
  return (
    <div onMouseMove={glow.onMouseMove} className="glow-card bounce p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] md:text-xs font-semibold uppercase tracking-wide text-slate-500 truncate">{label}</div>
          <div className="mt-1 text-lg md:text-2xl lg:text-[26px] font-bold text-slate-900 leading-tight break-words">
            {currency ? formatCurrency(value) : formatNumber(value)}
          </div>
          {delta !== undefined && (
            <div className={cn('mt-1 text-[11px] md:text-xs font-semibold', delta >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% so với hôm qua
            </div>
          )}
        </div>
        <div className={cn(
          'shrink-0 size-10 md:size-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-md',
          color
        )}>
          <Icon className="size-5 text-white shrink-0" />
        </div>
      </div>
    </div>
  );
}
