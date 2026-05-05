'use client';
import { useEffect, useRef, useState } from 'react';
import { X, ScanBarcode, Camera, RefreshCw, Lightbulb, ZoomIn, ZoomOut } from 'lucide-react';
import toast from 'react-hot-toast';

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
};

/**
 * Scanner mã vạch / QR — tối ưu cho 1D barcode (EAN/UPC/Code128) phổ biến trên SP tạp hoá.
 * - Dùng native BarcodeDetector API nếu trình duyệt hỗ trợ (nhanh & chính xác hơn nhiều)
 * - FPS cao + qrbox dạng chữ nhật dài
 * - Yêu cầu camera độ phân giải cao + autofocus
 * - Hỗ trợ bật đèn flash + zoom (nếu camera cho phép)
 */
export default function BarcodeScanner({ open, onClose, onScan }: Props) {
  const containerId = 'barcode-reader';
  const scannerRef = useRef<any>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [error, setError] = useState<string>('');
  const [starting, setStarting] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCam, setActiveCam] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number } | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const start = async (camId?: string) => {
    if (typeof window === 'undefined') return;
    setError('');
    setStarting(true);
    try {
      const mod: any = await import('html5-qrcode');
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = mod;

      // Lấy danh sách camera nếu chưa có
      if (cameras.length === 0) {
        const devices: any[] = await Html5Qrcode.getCameras();
        setCameras(devices.map((d: any) => ({ id: d.id, label: d.label || 'Camera' })));
        if (!camId) {
          const back = devices.find((d: any) => /back|rear|sau|environment/i.test(d.label));
          camId = back?.id || devices[devices.length - 1]?.id || devices[0]?.id;
        }
        if (camId) setActiveCam(camId);
      }
      if (!camId) throw new Error('Không tìm thấy camera nào');

      // Stop scanner cũ nếu có
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {}
      }

      const html5QrCode = new Html5Qrcode(containerId, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
        useBarCodeDetectorIfSupported: true,
      });
      scannerRef.current = html5QrCode;

      // Cấu hình quét
      const config: any = {
        fps: 30,
        qrbox: (vw: number, vh: number) => {
          // qrbox dạng RECTANGLE NGANG cho 1D barcode (EAN/UPC dài)
          const w = Math.min(vw * 0.92, 480);
          const h = Math.min(vh * 0.5, 200);
          return { width: Math.floor(w), height: Math.floor(h) };
        },
        aspectRatio: 1.7777,
        disableFlip: false, // cho phép flip để bắt được mã ngược
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
        videoConstraints: {
          facingMode: { ideal: 'environment' },
          width:  { min: 640, ideal: 1920, max: 2560 },
          height: { min: 480, ideal: 1080, max: 1440 },
          // ép autofocus nếu hỗ trợ
          advanced: [
            { focusMode: 'continuous' as any },
            { focusMode: 'auto' as any },
          ],
        },
      };

      await html5QrCode.start(
        camId,
        config,
        (decoded: string) => {
          // Rung điện thoại 1 phát khi quét được
          try { if (navigator.vibrate) navigator.vibrate(80); } catch {}
          // Beep âm thanh ngắn
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = 1200;
            osc.connect(gain); gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
            osc.start(); osc.stop(ctx.currentTime + 0.12);
          } catch {}
          onScan(decoded.trim());
          stop();
          onClose();
        },
        () => {/* ignore frame errors */}
      );

      // Sau khi start, lấy MediaStreamTrack để bật flash/zoom
      try {
        const videoEl = document.querySelector(`#${containerId} video`) as HTMLVideoElement | null;
        const stream = (videoEl?.srcObject as MediaStream | null);
        const track = stream?.getVideoTracks?.()?.[0];
        trackRef.current = track || null;

        if (track && 'getCapabilities' in track) {
          const caps: any = (track as any).getCapabilities?.() || {};
          if (caps.torch) setTorchAvailable(true);
          if (caps.zoom) {
            setZoomRange({
              min: caps.zoom.min ?? 1,
              max: caps.zoom.max ?? 4,
              step: caps.zoom.step ?? 0.1,
            });
            setZoom(((track as any).getSettings?.()?.zoom) ?? 1);
          }
        }
      } catch {}
    } catch (e: any) {
      setError(e?.message || String(e));
      toast.error('Không mở được camera: ' + (e?.message || 'unknown'));
    } finally {
      setStarting(false);
    }
  };

  const toggleTorch = async () => {
    const track = trackRef.current as any;
    if (!track) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch (e) {
      toast.error('Không bật được đèn flash trên thiết bị này');
    }
  };

  const setZoomValue = async (z: number) => {
    const track = trackRef.current as any;
    if (!track || !zoomRange) return;
    const clamped = Math.max(zoomRange.min, Math.min(zoomRange.max, z));
    try {
      await track.applyConstraints({ advanced: [{ zoom: clamped }] });
      setZoom(clamped);
    } catch {}
  };

  const stop = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      try { scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
    trackRef.current = null;
    setTorchOn(false);
  };

  useEffect(() => {
    if (open && mounted) start();
    return () => { stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mounted]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center bg-black/85 p-0 md:p-4" onClick={() => { stop(); onClose(); }}>
      <div className="bg-slate-900 text-white rounded-t-3xl md:rounded-3xl w-full max-w-md max-h-[95vh] flex flex-col overflow-hidden shadow-2xl"
           onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/10 bg-slate-900 relative">
          <div className="md:hidden mx-auto absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/30" />
          <h3 className="text-base font-bold flex items-center gap-2"><ScanBarcode className="size-5 text-indigo-400" /> Quét mã vạch / QR</h3>
          <button onClick={() => { stop(); onClose(); }} className="size-9 rounded-lg hover:bg-white/10 flex items-center justify-center"><X className="size-5" /></button>
        </div>

        <div className="relative aspect-[16/10] w-full bg-black overflow-hidden">
          <div id={containerId} className="absolute inset-0 [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />

          {/* Khung quét hình chữ nhật ngang cho mã vạch 1D */}
          <div className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 h-[40%] border-2 border-indigo-400 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.50)]" />
          {/* Đường laser chạy */}
          <div className="pointer-events-none absolute left-6 right-6 top-1/2 h-[2px] bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
            style={{ animation: 'scan-line 1.2s ease-in-out infinite alternate' }}
          />
          <style>{`@keyframes scan-line { 0% { transform: translateY(-22%); } 100% { transform: translateY(22%); } }`}</style>

          {/* Controls overlay: torch + zoom */}
          <div className="absolute top-2 right-2 flex flex-col gap-2">
            {torchAvailable && (
              <button onClick={toggleTorch} className={`size-10 rounded-full flex items-center justify-center shadow-lg transition ${torchOn ? 'bg-yellow-400 text-slate-900' : 'bg-black/50 text-white hover:bg-black/70'}`} title="Đèn flash">
                <Lightbulb className="size-5" />
              </button>
            )}
            {zoomRange && (
              <>
                <button onClick={() => setZoomValue(zoom + (zoomRange.step || 0.5))} className="size-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center shadow-lg" title="Phóng to"><ZoomIn className="size-5" /></button>
                <button onClick={() => setZoomValue(zoom - (zoomRange.step || 0.5))} className="size-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center shadow-lg" title="Thu nhỏ"><ZoomOut className="size-5" /></button>
              </>
            )}
          </div>

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

        <div className="shrink-0 px-4 py-3 text-xs text-white/70 bg-slate-900 border-t border-white/10 pb-[max(env(safe-area-inset-bottom),0.75rem)] space-y-1.5">
          <div className="flex items-start gap-2">
            <Camera className="size-3.5 mt-0.5 shrink-0 text-indigo-400" />
            <span>Đặt mã vào giữa khung — giữ <b>thẳng</b>, không bị nghiêng. Cách <b>10–20 cm</b>.</span>
          </div>
          <div className="text-[11px] text-white/50">
            💡 Mã mờ: bật <b>đèn flash</b> hoặc tăng <b>zoom</b> ở góc phải.
          </div>
        </div>
      </div>
    </div>
  );
}
