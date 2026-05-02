import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import BackgroundFX from '@/components/BackgroundFX';

export const metadata: Metadata = {
  title: 'Bán hàng thông minh cùng Danh Hữu Đang',
  description: 'Phần mềm bán hàng thông minh — POS, quản lý kho, khách hàng, báo cáo',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        {/* Set theme before paint — tránh flash sai theme */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <BackgroundFX />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'dark:bg-slate-900 dark:text-slate-100',
            style: {
              background: '#ffffff',
              color: '#111827',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
            },
          }}
        />
      </body>
    </html>
  );
}
