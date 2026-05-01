import './globals.css';
import type { Metadata } from 'next';
import { ToastProvider } from '@/components/Toast';

export const metadata: Metadata = {
  title: 'KeyOne — مساعد المبيعات الذكي على واتساب',
  description:
    'مساعد مبيعات ذكي على واتساب بزنس يرد على العملاء، يفرز العملاء المحتملين، ويُنبهك لحظة جاهزية العميل للشراء.',
  icons: { icon: '/favicon.svg' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#06030d',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-[Cairo,ui-sans-serif,system-ui] antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
