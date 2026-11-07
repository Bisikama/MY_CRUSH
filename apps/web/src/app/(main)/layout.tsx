import type { ReactNode } from 'react';
import { SiteHeader } from '../../components/site-header';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <SiteHeader />
      <main>{children}</main>
      <footer>
        DuoQuest <span>Học một chút. Chơi một trận. Kết nối nhiều hơn.</span>
        <span>QUIZ FOUNDATION · V1</span>
      </footer>
    </div>
  );
}
