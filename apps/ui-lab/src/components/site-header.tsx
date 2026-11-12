'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type MouseEvent } from 'react';
import { usePlatform } from '../providers/platform-provider';
import { shouldConfirmLeaveOnNavigation } from '../features/hub/room-banner.utils';

export function SiteHeader() {
  const pathname = usePathname();
  const {
    hydrated,
    localHost,
    identity,
    identityError,
    walletBalance,
    profileStatus,
    room,
    currentRoom,
    retryIdentity,
    navigateSafely,
  } = usePlatform();

  const [roomAuthWarning, setRoomAuthWarning] = useState('');

  const activeStatus = room?.status ?? currentRoom?.status;
  const activeCode = room?.code ?? currentRoom?.code;

  function handleNavClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    setRoomAuthWarning('');
    if (shouldConfirmLeaveOnNavigation(pathname, href, activeStatus, activeCode)) {
      event.preventDefault();
      navigateSafely(href);
    }
  }

  function handleAuthActionClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    if (currentRoom) {
      event.preventDefault();
      setRoomAuthWarning(
        `Hãy rời phòng ${currentRoom.code} trước khi đăng nhập hoặc chuyển danh tính.`,
      );
      return;
    }
    setRoomAuthWarning('');
    if (shouldConfirmLeaveOnNavigation(pathname, href, activeStatus, activeCode)) {
      event.preventDefault();
      navigateSafely(href);
    }
  }

  const isHubActive = pathname === '/';
  const isQuizActive = pathname === '/play' || Boolean(pathname?.startsWith('/play/'));
  const isPacksActive = pathname === '/packs';
  const isShopActive = pathname === '/shop';
  const isProfileActive = pathname === '/profile';

  return (
    <header id="site-header" className="site-header lavender-header">
      <div className="lavender-header-inner">
        <Link className="logo lavender-logo" href="/" onClick={(e) => handleNavClick(e, '/')}>
          <span className="logo-mark lavender-logo-mark" aria-hidden="true">
            DQ
          </span>
          <span className="lavender-logo-text">DuoQuest</span>
        </Link>

        <nav className="lavender-nav" aria-label="Điều hướng chính">
          <Link
            href="/"
            className={`lavender-nav-link ${isHubActive ? 'active' : ''}`}
            aria-current={isHubActive ? 'page' : undefined}
            onClick={(e) => handleNavClick(e, '/')}
          >
            Các trò chơi
          </Link>
          <Link
            href="/play"
            className={`lavender-nav-link ${isQuizActive ? 'active' : ''}`}
            aria-current={isQuizActive ? 'page' : undefined}
            onClick={(e) => handleNavClick(e, '/play')}
          >
            Quiz Battle
          </Link>
          <Link
            href="/packs"
            className={`lavender-nav-link ${isPacksActive ? 'active' : ''}`}
            aria-current={isPacksActive ? 'page' : undefined}
            onClick={(e) => handleNavClick(e, '/packs')}
          >
            Bộ câu hỏi
          </Link>
          <Link
            href="/shop"
            className={`lavender-nav-link ${isShopActive ? 'active' : ''}`}
            aria-current={isShopActive ? 'page' : undefined}
            onClick={(e) => handleNavClick(e, '/shop')}
          >
            Shop
          </Link>
        </nav>

        <div className="lavender-account-cluster">
          {!hydrated ? (
            <span className="lavender-status-pill" role="status">
              Đang tải…
            </span>
          ) : identityError && !identity ? (
            <button
              type="button"
              className="lavender-retry-btn"
              onClick={() => void retryIdentity()}
            >
              Thử lại phiên
            </button>
          ) : !identity ? (
            localHost ? (
              <Link
                href="/login"
                className="lavender-auth-cta"
                onClick={(e) => handleAuthActionClick(e, '/login')}
              >
                Đăng nhập
              </Link>
            ) : (
              <Link
                href="/play"
                className="lavender-auth-cta"
                onClick={(e) => handleNavClick(e, '/play')}
              >
                Chơi với tên khách
              </Link>
            )
          ) : (
            <>
              {profileStatus === 'ready' && walletBalance !== null ? (
                <div className="lavender-coins-chip" aria-label={`Số dư ${walletBalance} Coins`}>
                  <span className="lavender-coin-icon" aria-hidden="true">
                    ★
                  </span>
                  <span>{walletBalance} Coins</span>
                </div>
              ) : (
                <div
                  className="lavender-coins-chip lavender-coins-loading"
                  aria-label="Đang tải số dư Coins"
                >
                  <span className="lavender-coin-icon" aria-hidden="true">
                    ★
                  </span>
                  <span>••• Coins</span>
                </div>
              )}

              {identity.kind === 'guest' && localHost && (
                <>
                  <Link
                    href="/register"
                    className="lavender-upgrade-link"
                    onClick={(e) => handleAuthActionClick(e, '/register')}
                  >
                    Tạo tài khoản để giữ tiến trình
                  </Link>
                  <Link
                    href="/login"
                    className="lavender-signin-link"
                    onClick={(e) => handleAuthActionClick(e, '/login')}
                  >
                    Đăng nhập
                  </Link>
                </>
              )}

              <Link
                href="/profile"
                className={`lavender-profile-pill ${isProfileActive ? 'active' : ''}`}
                aria-label={`Hồ sơ của ${identity.nickname}`}
                onClick={(e) => handleNavClick(e, '/profile')}
              >
                <span className="lavender-avatar-badge" aria-hidden="true">
                  {identity.nickname.slice(0, 1).toLocaleUpperCase('vi')}
                </span>
                <span className="lavender-profile-name">{identity.nickname}</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {identity && identityError && (
        <div className="lavender-header-warning" role="alert">
          <span>{identityError}</span>
          <button type="button" className="lavender-retry-btn" onClick={() => void retryIdentity()}>
            Thử lại phiên
          </button>
        </div>
      )}
      {roomAuthWarning && (
        <div className="lavender-header-warning" role="alert">
          <span>{roomAuthWarning}</span>
          {currentRoom && (
            <Link
              href={`/play/${currentRoom.code}`}
              className="lavender-warning-link"
              onClick={() => setRoomAuthWarning('')}
            >
              Về phòng {currentRoom.code}
            </Link>
          )}
          <button
            type="button"
            className="lavender-warning-close"
            aria-label="Đóng cảnh báo"
            onClick={() => setRoomAuthWarning('')}
          >
            ✕
          </button>
        </div>
      )}
    </header>
  );
}
