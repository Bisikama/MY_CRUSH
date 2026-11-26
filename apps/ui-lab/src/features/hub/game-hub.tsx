'use client';

import Link from 'next/link';
import { useI18n } from '../../i18n';
import { usePlatform } from '../../providers/platform-provider';

export function GameHub() {
  const { t } = useI18n();
  const { identity } = usePlatform();

  return (
    <div className="hub-container">
      {/* 1. SHORT WELCOME HERO SECTION */}
      <section className="hub-welcome-card" aria-labelledby="hub-welcome-heading">
        <div className="hub-welcome-glow hub-welcome-glow-right" aria-hidden="true" />
        <div className="hub-welcome-glow hub-welcome-glow-left" aria-hidden="true" />

        <div className="hub-welcome-content">
          <div className="hub-welcome-copy">
            <div className="hub-eyebrow-pill">
              <span aria-hidden="true">✦</span>
              <span>{t('hub.eyebrow')}</span>
            </div>
            <h1 id="hub-welcome-heading" className="hub-welcome-title">
              {t('hub.welcomeTitle')}
            </h1>
            <p className="hub-welcome-subtitle">{t('hub.welcomeSubtitle')}</p>
          </div>

          <div className="hub-welcome-art-wrap">
            <div className="hub-welcome-art-frame">
              <img
                src="/images/hub/hero-mascots.jpg"
                alt={t('hub.heroAlt')}
                className="hub-welcome-art-img"
              />
            </div>
            <div className="hub-welcome-sticker">
              <span className="hub-sticker-star" aria-hidden="true">
                ★
              </span>
              <span>
                {identity
                  ? t('hub.stickerWithName', { nickname: identity.nickname })
                  : t('hub.stickerDefault')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. GAME SELECTION SECTION */}
      <section className="hub-games-section" aria-labelledby="hub-games-heading">
        <div className="hub-section-header">
          <div className="hub-section-title-group">
            <h2 id="hub-games-heading" className="hub-section-title">
              {t('hub.sectionTitle')}
            </h2>
            <span className="hub-count-badge">{t('hub.countBadge')}</span>
          </div>
          <span className="hub-section-hint">{t('hub.sectionHint')}</span>
        </div>

        <div className="hub-cards-grid">
          {/* CARD 1: PLAYABLE QUIZ BATTLE */}
          <article className="hub-game-card hub-game-card-playable">
            <div className="hub-card-media">
              <img
                src="/images/hub/quiz-battle.jpg"
                alt={t('hub.quizCard.imageAlt')}
                className="hub-card-img"
              />
              <div className="hub-card-top-left">
                <span className="hub-media-pill hub-media-pill-players">
                  {t('hub.quizCard.playersPill')}
                </span>
              </div>
              <div className="hub-card-top-right">
                <span className="hub-media-pill hub-media-pill-ready">
                  {t('hub.quizCard.readyPill')}
                </span>
              </div>
            </div>

            <div className="hub-card-body">
              <div>
                <div className="hub-card-tags">
                  <span className="hub-tag-chip">{t('hub.quizCard.modesTag')}</span>
                  <span className="hub-tag-chip">{t('hub.quizCard.layoutTag')}</span>
                </div>
                <h3 className="hub-card-title">{t('hub.quizCard.title')}</h3>
                <p className="hub-card-desc">{t('hub.quizCard.description')}</p>
              </div>

              <Link href="/play" className="hub-play-cta">
                <span>{t('hub.quizCard.cta')}</span>
                <span className="hub-play-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          </article>

          {/* CARD 2: FUTURE GAME 1 */}
          <article
            className="hub-game-card hub-game-card-future"
            aria-label={t('hub.futureCard.ariaLabel')}
          >
            <div className="hub-card-media hub-card-media-muted">
              <img
                src="/images/hub/mystery-chest.jpg"
                alt={t('hub.futureCard.chestAlt')}
                className="hub-card-img hub-card-img-muted"
              />
              <div className="hub-card-top-left">
                <span className="hub-media-pill hub-media-pill-muted">
                  {t('hub.futureCard.statusPill')}
                </span>
              </div>
              <div className="hub-mystery-center-badge" aria-hidden="true">
                ?
              </div>
            </div>

            <div className="hub-card-body">
              <div>
                <div className="hub-card-tags">
                  <span className="hub-tag-chip hub-tag-chip-muted">
                    {t('hub.futureCard.statusPill')}
                  </span>
                </div>
                <h3 className="hub-card-title hub-card-title-muted">{t('hub.futureCard.title')}</h3>
                <p className="hub-card-desc hub-card-desc-muted">
                  {t('hub.futureCard.description')}
                </p>
              </div>

              <div className="hub-future-status" aria-disabled="true">
                <span>{t('hub.futureCard.statusPill')}</span>
              </div>
            </div>
          </article>

          {/* CARD 3: FUTURE GAME 2 */}
          <article
            className="hub-game-card hub-game-card-future"
            aria-label={t('hub.futureCard.ariaLabel')}
          >
            <div className="hub-card-media hub-card-media-muted">
              <img
                src="/images/hub/mystery-gift.jpg"
                alt={t('hub.futureCard.giftAlt')}
                className="hub-card-img hub-card-img-muted"
              />
              <div className="hub-card-top-left">
                <span className="hub-media-pill hub-media-pill-muted">
                  {t('hub.futureCard.statusPill')}
                </span>
              </div>
              <div className="hub-mystery-center-badge" aria-hidden="true">
                ✦
              </div>
            </div>

            <div className="hub-card-body">
              <div>
                <div className="hub-card-tags">
                  <span className="hub-tag-chip hub-tag-chip-muted">
                    {t('hub.futureCard.statusPill')}
                  </span>
                </div>
                <h3 className="hub-card-title hub-card-title-muted">{t('hub.futureCard.title')}</h3>
                <p className="hub-card-desc hub-card-desc-muted">
                  {t('hub.futureCard.description')}
                </p>
              </div>

              <div className="hub-future-status" aria-disabled="true">
                <span>{t('hub.futureCard.statusPill')}</span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
