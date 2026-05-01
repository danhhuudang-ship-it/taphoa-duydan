'use client';
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Loader2, Image as ImgIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export default function ImageUploader({
  value,
  onChange,
  className,
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
  className?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      return toast.error('Chỉ chấp nhận file ảnh');
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast.error('Ảnh tối đa 5MB');
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

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
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn-ghost !bg-white/20 !text-white"
            >
              <Upload className="size-4" /> Đổi ảnh
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="btn-ghost !bg-rose-500/30 !text-white !border-rose-500/40"
            >
              <X className="size-4" /> Xoá
            </button>
          </div>
        </div>
      ) : (
        <motion.button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          whileHover={{ scale: 1.01 }}
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
      )}
    </div>
  );
}
