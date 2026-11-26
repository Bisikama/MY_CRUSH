'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '../i18n';
import { usePlatform } from '../providers/platform-provider';
import { useRoomStore } from '../stores/room.store';
import { getRoomBannerDescriptor } from '../features/hub/room-banner.utils';

export function ActiveRoomBanner() {
  const pathname = usePathname();
  const { locale, t } = useI18n();
  const { currentRoom } = usePlatform();
  const { dismissedBannerKey, dismissBanner } = useRoomStore();

  const banner = getRoomBannerDescriptor(currentRoom, pathname, dismissedBannerKey, locale);
  if (!banner) return null;

  return (
    <div
      className={`room-banner room-banner-${banner.tone}`}
      role="region"
      aria-label={t('nav.banner.regionAria')}
    >
      <div className="room-banner-info">
        <span className="room-banner-dot" aria-hidden="true" />
        <div className="room-banner-text">
          <strong className="room-banner-headline">{banner.headline}</strong>
          <span className="room-banner-game">{t('nav.quizBattle')}</span>
          <span className="room-banner-code">
            {t('nav.banner.roomCode', { code: banner.code })}
          </span>
        </div>
      </div>
      <div className="room-banner-actions">
        <Link href={banner.href} className="room-banner-cta">
          <span>{banner.ctaLabel}</span>
          <span aria-hidden="true">→</span>
        </Link>
        <button
          type="button"
          className="room-banner-close"
          aria-label={t('nav.banner.closeAria')}
          onClick={() => dismissBanner(banner.key)}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
