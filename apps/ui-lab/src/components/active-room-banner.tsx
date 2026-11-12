'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePlatform } from '../providers/platform-provider';
import { useRoomStore } from '../stores/room.store';
import { getRoomBannerDescriptor } from '../features/hub/room-banner.utils';

export function ActiveRoomBanner() {
  const pathname = usePathname();
  const { currentRoom } = usePlatform();
  const { dismissedBannerKey, dismissBanner } = useRoomStore();

  const banner = getRoomBannerDescriptor(currentRoom, pathname, dismissedBannerKey);
  if (!banner) return null;

  return (
    <div
      className={`room-banner room-banner-${banner.tone}`}
      role="region"
      aria-label="Phòng chơi hiện tại"
    >
      <div className="room-banner-info">
        <span className="room-banner-dot" aria-hidden="true" />
        <div className="room-banner-text">
          <strong className="room-banner-headline">{banner.headline}</strong>
          <span className="room-banner-game">Quiz Battle</span>
          <span className="room-banner-code">Mã phòng: {banner.code}</span>
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
          aria-label="Đóng thông báo phòng đang mở"
          onClick={() => dismissBanner(banner.key)}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
