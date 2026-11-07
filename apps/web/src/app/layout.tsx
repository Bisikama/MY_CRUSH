import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'DuoQuest — Học • Chơi • Kết nối',
  description: 'Quiz Battle cho một người, đấu bạn bè hoặc cùng vượt ải qua mạng LAN.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
