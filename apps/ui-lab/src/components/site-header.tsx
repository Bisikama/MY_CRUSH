'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type MouseEvent } from 'react';
import { useI18n } from '../i18n';
import { usePlatform } from '../providers/platform-provider';
import { shouldConfirmLeaveOnNavigation } from '../features/hub/room-banner.utils';
import { LanguageSwitcher } from './language-switcher';

export function SiteHeader() {
  const pathname = usePathname();
  const { localeMeta, t } = useI18n();
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

  const [roomAuthWarningCode, setRoomAuthWarningCode] = useState<string | null>(null);

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
    setRoomAuthWarningCode(null);
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
      setRoomAuthWarningCode(currentRoom.code);
      return;
    }
    setRoomAuthWarningCode(null);
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

        <nav className="lavender-nav" aria-label={t('nav.ariaMain')}>
          <Link
            href="/"
            className={`lavender-nav-link ${isHubActive ? 'active' : ''}`}
            aria-current={isHubActive ? 'page' : undefined}
            onClick={(e) => handleNavClick(e, '/')}
          >
            {t('nav.games')}
          </Link>
          <Link
            href="/play"
            className={`lavender-nav-link ${isQuizActive ? 'active' : ''}`}
            aria-current={isQuizActive ? 'page' : undefined}
            onClick={(e) => handleNavClick(e, '/play')}
          >
            {t('nav.quizBattle')}
          </Link>
          <Link
            href="/packs"
            className={`lavender-nav-link ${isPacksActive ? 'active' : ''}`}
            aria-current={isPacksActive ? 'page' : undefined}
            onClick={(e) => handleNavClick(e, '/packs')}
          >
            {t('nav.packs')}
          </Link>
          <Link
            href="/shop"
            className={`lavender-nav-link ${isShopActive ? 'active' : ''}`}
            aria-current={isShopActive ? 'page' : undefined}
            onClick={(e) => handleNavClick(e, '/shop')}
          >
            {t('nav.shop')}
          </Link>
        </nav>

        <div className="lavender-account-cluster">
          <LanguageSwitcher variant="compact" />

          {!hydrated ? (
            <span className="lavender-status-pill" role="status">
              {t('nav.loading')}
            </span>
          ) : identityError && !identity ? (
            <button
              type="button"
              className="lavender-retry-btn"
              onClick={() => void retryIdentity()}
            >
              {t('nav.retrySession')}
            </button>
          ) : !identity ? (
            localHost ? (
              <Link
                href="/login"
                className="lavender-auth-cta"
                onClick={(e) => handleAuthActionClick(e, '/login')}
              >
                {t('nav.login')}
              </Link>
            ) : (
              <Link
                href="/play"
                className="lavender-auth-cta"
                onClick={(e) => handleNavClick(e, '/play')}
              >
                {t('nav.playAsGuest')}
              </Link>
            )
          ) : (
            <>
              {profileStatus === 'ready' && walletBalance !== null ? (
                <div
                  className="lavender-coins-chip"
                  aria-label={t('nav.coinsBalanceAria', { balance: walletBalance })}
                >
                  <span className="lavender-coin-icon" aria-hidden="true">
                    ★
                  </span>
                  <span>{walletBalance} Coins</span>
                </div>
              ) : (
                <div
                  className="lavender-coins-chip lavender-coins-loading"
                  aria-label={t('nav.coinsLoadingAria')}
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
                    {t('nav.upgradeAccount')}
                  </Link>
                  <Link
                    href="/login"
                    className="lavender-signin-link"
                    onClick={(e) => handleAuthActionClick(e, '/login')}
                  >
                    {t('nav.login')}
                  </Link>
                </>
              )}

              <Link
                href="/profile"
                className={`lavender-profile-pill ${isProfileActive ? 'active' : ''}`}
                aria-label={t('nav.profileAria', { nickname: identity.nickname })}
                onClick={(e) => handleNavClick(e, '/profile')}
              >
                <span className="lavender-avatar-badge" aria-hidden="true">
                  {identity.nickname.slice(0, 1).toLocaleUpperCase(localeMeta.code)}
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
            {t('nav.retrySession')}
          </button>
        </div>
      )}
      {roomAuthWarningCode && (
        <div className="lavender-header-warning" role="alert">
          <span>{t('nav.roomAuthWarning', { code: roomAuthWarningCode })}</span>
          {currentRoom && (
            <Link
              href={`/play/${currentRoom.code}`}
              className="lavender-warning-link"
              onClick={() => setRoomAuthWarningCode(null)}
            >
              {t('nav.backToRoomCode', { code: currentRoom.code })}
            </Link>
          )}
          <button
            type="button"
            className="lavender-warning-close"
            aria-label={t('nav.closeWarningAria')}
            onClick={() => setRoomAuthWarningCode(null)}
          >
            ✕
          </button>
        </div>
      )}
    </header>
  );
}
