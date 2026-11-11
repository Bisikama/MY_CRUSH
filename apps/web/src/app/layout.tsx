import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'DuoQuest — Học • Chơi • Kết nối',
  description: 'Thử sức một mình, rủ người ấy so tài hoặc cùng nhau vượt ải trong Quiz Battle.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
