'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, Mail, Store, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Vui lòng nhập đầy đủ');
    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Đăng nhập thành công ✨');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Tạo tài khoản OK');
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
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl flex items-center justify-center bg-white/20 backdrop-blur">
              <Store className="size-6" />
            </div>
            <div>
              <div className="text-xl font-bold">Bán hàng thông minh</div>
              <div className="text-sm text-white/80">cùng Danh Hữu Đang</div>
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
            <h3 className="text-2xl font-bold text-slate-900">{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h3>
            <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-sm text-indigo-600 hover:underline">
              {mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
            </button>
          </div>

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input className="input pl-10" placeholder="ban@cuahang.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Mật khẩu</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input className="input pl-10" placeholder="••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>

            <button disabled={loading} className="btn-primary w-full !text-base !py-3">
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Mẹo: Nếu Supabase project mới, hãy tắt <span className="text-slate-700 font-medium">Confirm email</span> trong{' '}
            <span className="text-slate-700 font-medium">Auth → Providers → Email</span> để đăng nhập ngay.
          </div>
        </div>
      </div>
    </div>
  );
}
