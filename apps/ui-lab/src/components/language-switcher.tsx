'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n, type LocaleCode } from '../i18n';
import styles from './language-switcher.module.css';

interface LanguageSwitcherProps {
  variant?: 'compact' | 'cards';
  className?: string;
}

export function LanguageSwitcher({ variant = 'compact', className }: LanguageSwitcherProps) {
  const { locale, localeMeta, supportedLocales, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function handleSelect(nextLocale: LocaleCode) {
    setLocale(nextLocale);
    setOpen(false);
  }

  if (variant === 'cards') {
    return (
      <div
        className={`${styles.cardsGrid} ${className ?? ''}`}
        role="group"
        aria-label={t('common.language.switcherAria')}
      >
        {supportedLocales.map((item) => {
          const active = item.code === locale;
          return (
            <button
              key={item.code}
              type="button"
              aria-pressed={active}
              className={`${styles.cardBtn} ${active ? styles.cardBtnActive : ''}`}
              onClick={() => handleSelect(item.code)}
            >
              <span className={styles.cardLabelWrap}>
                <span className={styles.cardNativeName}>{item.nativeName}</span>
                <span className={styles.cardCode}>{item.shortLabel}</span>
              </span>
              {active && (
                <span className={styles.cardActiveBadge}>{t('common.language.activeTag')}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`${styles.wrapper} ${className ?? ''}`}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('common.language.switcherAria')}
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg
          className={styles.globe}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9.5" />
          <path d="M2.5 12h19" />
          <path d="M12 2.5a14.5 14.5 0 0 1 0 19 14.5 14.5 0 0 1 0-19Z" />
        </svg>
        <span>{localeMeta.shortLabel}</span>
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className={styles.menu} role="menu" aria-label={t('common.language.switcherAria')}>
          {supportedLocales.map((item) => {
            const active = item.code === locale;
            return (
              <button
                key={item.code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={`${styles.option} ${active ? styles.optionActive : ''}`}
                onClick={() => handleSelect(item.code)}
              >
                <span>{item.nativeName}</span>
                <span className={styles.optionCode}>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
