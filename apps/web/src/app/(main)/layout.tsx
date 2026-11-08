import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import { PlatformProvider } from '../../providers/platform-provider';
import { SiteHeader } from '../../components/site-header';
import { ActiveRoomBanner } from '../../components/active-room-banner';
import { LeaveMatchDialog } from '../../components/leave-match-dialog';

const quicksand = localFont({
  src: [
    {
      path: '../../assets/fonts/quicksand-vietnamese.woff2',
      weight: '500 700',
      style: 'normal',
    },
    {
      path: '../../assets/fonts/quicksand-latin-ext.woff2',
      weight: '500 700',
      style: 'normal',
    },
    {
      path: '../../assets/fonts/quicksand-latin.woff2',
      weight: '500 700',
      style: 'normal',
    },
  ],
  variable: '--font-hub-heading',
  display: 'swap',
});

const nunitoSans = localFont({
  src: [
    {
      path: '../../assets/fonts/nunito-sans-vietnamese.woff2',
      weight: '400 800',
      style: 'normal',
    },
    {
      path: '../../assets/fonts/nunito-sans-latin-ext.woff2',
      weight: '400 800',
      style: 'normal',
    },
    {
      path: '../../assets/fonts/nunito-sans-latin.woff2',
      weight: '400 800',
      style: 'normal',
    },
  ],
  variable: '--font-hub-body',
  display: 'swap',
});

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <PlatformProvider>
      <div className={`lavender-shell-bg ${quicksand.variable} ${nunitoSans.variable}`}>
        <SiteHeader />
        <div className="app-shell">
          <ActiveRoomBanner />
          <main>{children}</main>
          <footer>
            DuoQuest <span>Học một chút. Chơi một trận. Kết nối nhiều hơn.</span>
            <span>DUOQUEST HUB · V1</span>
          </footer>
        </div>
        <LeaveMatchDialog />
      </div>
    </PlatformProvider>
  );
}
