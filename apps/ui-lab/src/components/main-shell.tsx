'use client';

import { usePathname } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { useActiveQuizTheme } from '../features/quiz/themes/quiz-preferences.store';
import { usePlatform } from '../providers/platform-provider';
import { ActiveRoomBanner } from './active-room-banner';
import { LeaveMatchDialog } from './leave-match-dialog';
import { SiteHeader } from './site-header';
import styles from './main-shell.module.css';

export function MainShell({ children, fonts }: { children: ReactNode; fonts: string }) {
  const pathname = usePathname();
  const { matchFocused } = usePlatform();
  const theme = useActiveQuizTheme();
  const isWideRoute =
    pathname === '/' || pathname === '/shop' || pathname === '/packs' || pathname === '/profile';
  const shellStyle = matchFocused
    ? ({ '--quiz-shell-bg': theme.visuals.shellBgColor } as CSSProperties)
    : undefined;

  return (
    <div
      className={`${matchFocused ? styles.focused : 'lavender-shell-bg'} ${fonts}`}
      style={shellStyle}
    >
      {!matchFocused && <SiteHeader />}
      <div
        className={
          matchFocused ? styles.match : isWideRoute ? 'app-shell app-shell-wide' : 'app-shell'
        }
      >
        {!matchFocused && <ActiveRoomBanner />}
        <main>{children}</main>
        {!matchFocused && (
          <footer>
            DuoQuest <span>Học một chút. Chơi một trận. Kết nối nhiều hơn.</span>
            <span>DUOQUEST HUB · V1</span>
          </footer>
        )}
      </div>
      <LeaveMatchDialog />
    </div>
  );
}
