'use client';
import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Loader2, Image as ImgIcon, Link2, HardDrive, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type Tab = 'upload' | 'url';

/**
 * Convert Google Drive sharing link → direct image URL.
 * Hỗ trợ các format:
 *   https://drive.google.com/file/d/<ID>/view?usp=sharing
 *   https://drive.google.com/open?id=<ID>
 *   https://drive.google.com/uc?id=<ID>
 */
function normalizeImageUrl(input: string): string {
  const url = input.trim();
  if (!url) return '';

  // Drive: /file/d/<ID>/...
  let m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;

  // Drive: ?id=<ID>
  m = url.match(/drive\.google\.com\/(?:open|uc).*?[?&]id=([^&]+)/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;

  return url;
}

export default function ImageUploader({
  value,
  onChange,
  className,
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
  className?: string;
}) {
  const [tab, setTab] = useState<Tab>('upload');
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlPreview, setUrlPreview] = useState('');
  const [urlError, setUrlError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Chỉ chấp nhận file ảnh');
    if (file.size > 5 * 1024 * 1024) return toast.error('Ảnh tối đa 5MB');

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      onChange(data.publicUrl);
      toast.success('Tải ảnh lên thành công');
    } catch (e: any) {
      toast.error('Lỗi upload: ' + (e.message || 'unknown'));
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const tryPreviewUrl = () => {
    const u = normalizeImageUrl(urlInput);
    if (!u) { setUrlError(true); return; }
    setUrlError(false);
    setUrlPreview(u);
  };

  const useUrl = () => {
    const u = normalizeImageUrl(urlInput);
    if (!u) return toast.error('URL không hợp lệ');
    onChange(u);
    setUrlInput('');
    setUrlPreview('');
    toast.success('Đã dùng ảnh từ URL');
  };

  return (
    <div className={cn('w-full', className)}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />

      {value ? (
        <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="preview" className="w-full h-44 object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost !bg-white/20 !text-white">
              <Upload className="size-4" /> Đổi ảnh
            </button>
            <button type="button" onClick={() => onChange(null)} className="btn-ghost !bg-rose-500/30 !text-white !border-rose-500/40">
              <X className="size-4" /> Xoá
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* TABS */}
          <div className="flex gap-2 p-1 rounded-lg bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setTab('upload')}
              className={cn(
                'flex-1 px-3 py-1.5 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition',
                tab === 'upload' ? 'bg-gradient-to-r from-indigo-500/30 to-fuchsia-500/30 text-white shadow-glow' : 'text-slate-400 hover:text-white'
              )}
            >
              <Upload className="size-4" /> Tải lên
            </button>
            <button
              type="button"
              onClick={() => setTab('url')}
              className={cn(
                'flex-1 px-3 py-1.5 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition',
                tab === 'url' ? 'bg-gradient-to-r from-indigo-500/30 to-fuchsia-500/30 text-white shadow-glow' : 'text-slate-400 hover:text-white'
              )}
            >
              <HardDrive className="size-4" /> Từ Drive / URL
            </button>
          </div>

          <AnimatePresence mode="wait">
            {tab === 'upload' ? (
              <motion.button
                key="upload"
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                whileHover={{ scale: 1.01 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className={cn(
                  'w-full h-44 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 text-sm transition',
                  drag ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/15 hover:border-white/30 bg-white/[0.03]',
                  uploading && 'opacity-60 pointer-events-none'
                )}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="size-6 animate-spin text-indigo-400" />
                    <span className="text-slate-300">Đang tải lên...</span>
                  </>
                ) : (
                  <>
                    <div className="size-12 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/30 flex items-center justify-center">
                      <ImgIcon className="size-5 text-white" />
                    </div>
                    <div className="font-medium">Click hoặc kéo ảnh vào đây</div>
                    <div className="text-xs text-slate-400">JPG / PNG / WebP — tối đa 5MB</div>
                  </>
                )}
              </motion.button>
            ) : (
              <motion.div
                key="url"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => { setUrlInput(e.target.value); setUrlError(false); setUrlPreview(''); }}
                      onPaste={(e) => {
                        // Auto preview after paste
                        setTimeout(tryPreviewUrl, 50);
                      }}
                      placeholder="Dán link Drive hoặc URL ảnh..."
                      className="input pl-10"
                    />
                  </div>
                  <button type="button" onClick={tryPreviewUrl} className="btn-ghost shrink-0">Xem</button>
                </div>

                {urlPreview && !urlError && (
                  <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={urlPreview}
                      alt="preview"
                      className="w-full h-36 object-cover"
                      onError={() => { setUrlError(true); setUrlPreview(''); toast.error('Không tải được ảnh — kiểm tra link'); }}
                    />
                    <button type="button" onClick={useUrl} className="absolute bottom-2 right-2 btn-primary !py-1.5 !px-3 text-sm">
                      <Check className="size-3.5" /> Dùng ảnh này
                    </button>
                  </div>
                )}

                <div className="text-[11px] text-slate-400 leading-relaxed bg-cyan-500/5 border border-cyan-500/15 rounded-lg p-2.5">
                  <b className="text-cyan-200">Mẹo Google Drive:</b> mở ảnh trên Drive → bấm <b>Share</b> → đổi quyền sang
                  <b> "Anyone with the link"</b> → copy link → dán vào đây. App tự động chuyển sang định dạng ảnh trực tiếp.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
