'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, User, Sparkles, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

const FAKE_EMAIL_DOMAIN = '@taphoa-duydan.local';

/** Cho phép đăng nhập bằng tên ngắn (vd: "admin") hoặc email đầy đủ */
function toEmail(u: string): string {
  const v = u.trim();
  if (v.includes('@')) return v.toLowerCase();
  return `${v.toLowerCase()}${FAKE_EMAIL_DOMAIN}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return toast.error('Vui lòng nhập đầy đủ');
    setLoading(true);
    const supabase = createClient();
    const email = toEmail(username);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Đăng nhập thành công ✨');
      } else {
        if (password.length < 5) {
          throw new Error('Mật khẩu phải có ít nhất 5 ký tự');
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Tạo tài khoản thành công');
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-0 bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200 motion-fade-up">
        <div className="relative p-10 hidden md:flex flex-col justify-between bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-2xl blur-md opacity-40 bg-white" />
              <div className="relative size-14 rounded-2xl flex items-center justify-center bg-white/25 backdrop-blur border border-white/30">
                <Sparkles className="size-7 animate-wobble" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-xl font-extrabold tracking-tight leading-tight">Bán hàng thông minh</div>
              <div className="text-sm text-white/85 font-medium">cùng Danh Hữu Đang</div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl lg:text-4xl font-bold leading-tight">Bán nhanh hơn,<br />báo cáo thông minh hơn.</h2>
            <p className="text-white/85 text-sm leading-relaxed">
              Tất cả nghiệp vụ POS — bán hàng tại quầy, kho, khách hàng, công nợ, báo cáo — gói gọn trong 1 ứng dụng siêu mượt.
            </p>
            <ul className="space-y-2 text-sm">
              {['Thanh toán cực nhanh, hỗ trợ phím tắt', 'Tồn kho realtime, cảnh báo hết hàng', 'Dashboard biểu đồ trực quan'].map((t) => (
                <li key={t} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-white" />{t}</li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/70">
            <ShoppingBag className="size-4" /> Powered by Next.js + Supabase
          </div>
        </div>

        <div className="p-8 md:p-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-extrabold text-slate-900">{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h3>
            <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-sm text-indigo-600 hover:underline font-medium">
              {mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
            </button>
          </div>

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">Tên đăng nhập</label>
              <div className="relative mt-1">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 size-[18px] text-slate-400" />
                <input
                  className="input !pl-12"
                  placeholder="admin"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Có thể dùng tên ngắn (admin) hoặc email đầy đủ (a@b.com)
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Mật khẩu</label>
              <div className="relative mt-1">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-[18px] text-slate-400" />
                <input
                  className="input !pl-12"
                  placeholder="••••••••"
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button disabled={loading} className="btn-primary w-full !text-base !py-3">
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
