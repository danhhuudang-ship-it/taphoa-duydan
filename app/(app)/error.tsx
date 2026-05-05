'use client';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 shadow-lg p-6 text-center">
        <div className="size-14 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
          <AlertTriangle className="size-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Đã có lỗi xảy ra</h2>
        <p className="text-sm text-slate-600 mb-1">
          Trang gặp sự cố tạm thời. Có thể do:
        </p>
        <ul className="text-sm text-slate-600 text-left list-disc pl-5 mb-4 space-y-0.5">
          <li>Một SQL migration chưa chạy trên Supabase</li>
          <li>Mất kết nối tạm thời</li>
          <li>Dữ liệu có giá trị bất thường</li>
        </ul>
        {error.message && (
          <details className="mb-4 text-xs text-left bg-slate-50 border border-slate-200 rounded-lg p-2">
            <summary className="cursor-pointer text-slate-700 font-medium">Chi tiết lỗi</summary>
            <code className="block mt-2 text-rose-600 break-words">{error.message}</code>
            {error.digest && <code className="block mt-1 text-slate-500">Digest: {error.digest}</code>}
          </details>
        )}
        <div className="flex gap-2">
          <button onClick={reset} className="btn-primary flex-1 !py-3">
            <RefreshCw className="size-4" /> Thử lại
          </button>
          <Link href="/dashboard" className="btn-ghost flex-1 !py-3 justify-center">
            <Home className="size-4" /> Tổng quan
          </Link>
        </div>
      </div>
    </div>
  );
}
