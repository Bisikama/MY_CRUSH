import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SiteHeader } from '../components/site-header';
import './globals.css';
export const metadata: Metadata = {
  title: 'DuoQuest — Học • Chơi • Kết nối',
  description: 'Quiz Battle cho một người, đấu bạn bè hoặc cùng vượt ải qua mạng LAN.',
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <div className="app-shell">
          <SiteHeader />
          <main>{children}</main>
          <footer>
            DuoQuest <span>Học một chút. Chơi một trận. Kết nối nhiều hơn.</span>
            <span>QUIZ FOUNDATION · V1</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
