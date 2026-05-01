import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import BackgroundFX from '@/components/BackgroundFX';

export const metadata: Metadata = {
  title: 'Sapo POS — Bán hàng thông minh',
  description: 'Phần mềm POS hiện đại — bán hàng, quản lý kho, khách hàng, báo cáo',
};

export const viewport: Viewport = {
  themeColor: '#0b0d1a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <BackgroundFX />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(20,22,40,0.9)',
              color: '#e6e8ee',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(12px)',
            },
          }}
        />
      </body>
    </html>
  );
}
