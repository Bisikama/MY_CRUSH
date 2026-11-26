import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { LabControls } from '../components/lab-controls';
import { I18nHtmlSync } from '../i18n';
import { PlatformProvider } from '../providers/platform-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'DuoQuest UI Lab',
  description: 'Thử sức một mình, rủ người ấy so tài hoặc cùng nhau vượt ải trong Quiz Battle.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <I18nHtmlSync />
        <PlatformProvider>
          {children}
          <LabControls />
        </PlatformProvider>
      </body>
    </html>
  );
}
