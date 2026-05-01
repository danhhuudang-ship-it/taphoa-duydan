import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string | null | undefined) {
  const n = Number(value || 0);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatNumber(value: number | string | null | undefined) {
  const n = Number(value || 0);
  return new Intl.NumberFormat('vi-VN').format(n);
}

export function formatDate(value: string | Date) {
  const d = new Date(value);
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDateShort(value: string | Date) {
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit',
  });
}

export function genOrderCode() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    'HD' +
    String(d.getFullYear()).slice(2) +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}
