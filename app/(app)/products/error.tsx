'use client';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Products page error:', error);
  }, [error]);

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900">Trang sản phẩm bị lỗi</h3>
            <p className="text-sm text-slate-600 mt-1">Thử lại hoặc kiểm tra console (F12).</p>
            {error.message && (
              <code className="block mt-2 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded p-2 break-words">
                {error.message}
              </code>
            )}
            <button onClick={reset} className="btn-primary mt-3">
              <RefreshCw className="size-4" /> Thử lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
