'use client';

import type { CSSProperties } from 'react';
import { useI18n } from '../../../i18n';
import styles from './shop.module.css';

export function ShopCloudTitle() {
  const { t } = useI18n();
  const titleText = t('shop.titleText');
  const accentCount = Number.parseInt(t('shop.titleAccentCount'), 10) || 1;
  const words = titleText.split(' ');
  const accentStart = Math.max(0, words.length - accentCount);

  return (
    <section className={styles.heroSection} aria-label={t('shop.titleAria')}>
      <div className={styles.titleCloudWrap}>
        <svg
          className={styles.titleCloudSvg}
          viewBox="0 0 640 165"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="shopBigCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="68%" stopColor="#FCF9FF" />
              <stop offset="100%" stopColor="#EBDCFF" />
            </linearGradient>
            <linearGradient id="shopBigCloudHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M112 138 C62 138 30 114 30 85 C30 61 52 43 82 41 C95 19 130 8 170 14 C198 2 246 0 282 14 C314 2 366 2 398 16 C438 6 488 12 518 35 C556 32 608 49 610 83 C612 115 574 138 524 138 C492 146 446 146 410 140 C370 150 304 150 264 140 C218 148 156 146 112 138 Z"
            fill="url(#shopBigCloudGrad)"
            stroke="#FFFFFF"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <ellipse cx="320" cy="42" rx="195" ry="22" fill="url(#shopBigCloudHighlight)" />
        </svg>

        <svg
          className={`${styles.titleStar} ${styles.titleStarLeft}`}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 1.5L14.8 9.2L22.5 12L14.8 14.8L12 22.5L9.2 14.8L1.5 12L9.2 9.2L12 1.5Z" />
        </svg>

        <h1 className={styles.titleBouncy} aria-label={titleText}>
          {words.map((word, index) => (
            <span
              key={`${word}-${index}`}
              className={`${styles.titleWord} ${index >= accentStart ? styles.titleWordAccent : ''}`}
              style={{ '--wi': index } as CSSProperties}
            >
              {word}
            </span>
          ))}
        </h1>

        <div className={styles.titleStarCluster} aria-hidden="true">
          <svg
            className={`${styles.titleStarDelay} ${styles.titleStarPink}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
          </svg>
          <svg
            className={`${styles.titleStar} ${styles.titleStarMini}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
          </svg>
        </div>
      </div>
    </section>
  );
}
