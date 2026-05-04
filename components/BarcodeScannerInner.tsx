'use client';
import { useEffect, useRef, useState } from 'react';
import { X, ScanBarcode, Camera, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
};

export default function BarcodeScannerInner({ open, onClose, onScan }: Props) {
  const containerId = 'barcode-reader';
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string>('');
  const [starting, setStarting] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCam, setActiveCam] = useState<string>('');

  const start = async (camId?: string) => {
    setError('');
    setStarting(true);
    try {
      // Dynamic import — only loaded when scanner opens, never during SSR/build
      const mod: any = await import('html5-qrcode');
      const { Html5Qrcode } = mod;

      if (cameras.length === 0) {
        const devices = await Html5Qrcode.getCameras();
        const list = devices.map((d: any) => ({ id: d.id, label: d.label || 'Camera' }));
        setCameras(list);
        camId = camId || (devices.find((d: any) => /back|rear|sau/i.test(d.label))?.id || devices[0]?.id);
        if (camId) setActiveCam(camId);
      }

      if (!camId) throw new Error('Không tìm thấy camera nào');

      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {}
      }

      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        camId,
        {
          fps: 12,
          qrbox: (vw: number, vh: number) => {
            const m = Math.min(vw, vh);
            return { width: Math.floor(m * 0.85), height: Math.floor(m * 0.55) };
          },
          aspectRatio: 1.6,
        },
        (decoded: string) => {
          onScan(decoded.trim());
          stop();
          onClose();
        },
        () => {}
      );
    } catch (e: any) {
      setError(e?.message || String(e));
      toast.error('Không mở được camera: ' + (e?.message || 'unknown'));
    } finally {
      setStarting(false);
    }
  };

  const stop = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      try { scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    if (open) start();
    return () => { stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center bg-black/80 p-0 md:p-4" onClick={() => { stop(); onClose(); }}>
      <div className="bg-slate-900 text-white rounded-t-3xl md:rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
           onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/10 bg-slate-900 relative">
          <div className="md:hidden mx-auto absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/30" />
          <h3 className="text-base font-bold flex items-center gap-2"><ScanBarcode className="size-5 text-indigo-400" /> Quét mã vạch / QR</h3>
          <button onClick={() => { stop(); onClose(); }} className="size-9 rounded-lg hover:bg-white/10 flex items-center justify-center"><X className="size-5" /></button>
        </div>

        <div className="relative aspect-square w-full bg-black overflow-hidden">
          <div id={containerId} className="absolute inset-0 [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />
          <div className="pointer-events-none absolute inset-6 border-2 border-indigo-400 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-1/2 w-[80%] h-[2px] bg-rose-500/80 animate-pulse" />
          {starting && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80 gap-2">
              <RefreshCw className="size-4 animate-spin" /> Đang khởi động camera...
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-rose-300 text-sm">
              {error}
            </div>
          )}
        </div>

        {cameras.length > 1 && (
          <div className="shrink-0 px-4 py-2 bg-slate-800 border-t border-white/5">
            <label className="text-xs text-white/70">Camera</label>
            <select
              value={activeCam}
              onChange={(e) => { setActiveCam(e.target.value); start(e.target.value); }}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm outline-none"
            >
              {cameras.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        )}

        <div className="shrink-0 px-4 py-3 text-xs text-white/60 text-center bg-slate-900 border-t border-white/10 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <Camera className="size-3 inline mr-1" /> Hướng camera vào mã vạch — tự nhận dạng và đóng khi quét được
        </div>
      </div>
    </div>
  );
}
