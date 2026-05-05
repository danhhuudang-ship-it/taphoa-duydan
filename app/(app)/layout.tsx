import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

// Tắt static generation cho mọi trang trong nhóm (app) — vì cần auth + dữ liệu động
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}
