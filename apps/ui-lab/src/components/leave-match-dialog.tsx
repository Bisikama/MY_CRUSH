'use client';

import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n';
import { usePlatform } from '../providers/platform-provider';
import styles from './leave-match-dialog.module.css';

export function LeaveMatchDialog() {
  const { t } = useI18n();
  const { leaveConfirm, confirmLeaveAndNavigate, cancelLeaveConfirm } = usePlatform();
  const stayButtonRef = useRef<HTMLButtonElement | null>(null);
  const leaveButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!leaveConfirm.open) return;
    const active = document.activeElement as HTMLElement | null;
    const previousFocus =
      active && active !== document.body
        ? active
        : document.querySelector<HTMLElement>('button[class*="leaveMatch"]');
    stayButtonRef.current?.focus();
    return () => {
      previousFocus?.focus?.();
    };
  }, [leaveConfirm.open]);

  useEffect(() => {
    if (!leaveConfirm.open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!leaveConfirm.busy) cancelLeaveConfirm();
        return;
      }
      if (event.key === 'Tab') {
        const focusables = [
          stayButtonRef.current,
          leaveButtonRef.current,
          closeButtonRef.current,
        ].filter((el): el is HTMLButtonElement => Boolean(el && !el.disabled));
        if (focusables.length < 2) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [cancelLeaveConfirm, leaveConfirm.busy, leaveConfirm.open]);

  if (!leaveConfirm.open) return null;

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !leaveConfirm.busy) {
          cancelLeaveConfirm();
        }
      }}
    >
      <div
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-match-title"
        aria-describedby="leave-match-desc"
      >
        <div className={styles.content}>
          <div className={styles.copy}>
            <h2 id="leave-match-title" className={styles.title}>
              {t('nav.leaveDialog.title', { code: leaveConfirm.code })}
            </h2>
            <p id="leave-match-desc" className={styles.description}>
              {t('nav.leaveDialog.inProgressLead')}{' '}
              <strong>{t('nav.leaveDialog.inProgressWarning')}</strong>
            </p>
            {leaveConfirm.error && (
              <div className={styles.error} role="alert">
                {leaveConfirm.error}
              </div>
            )}
          </div>
          <div className={styles.actions}>
            <button
              ref={stayButtonRef}
              type="button"
              disabled={leaveConfirm.busy}
              className={styles.stay}
              onClick={cancelLeaveConfirm}
            >
              {t('nav.leaveDialog.stayButton')}
            </button>
            <button
              ref={leaveButtonRef}
              type="button"
              disabled={leaveConfirm.busy}
              className={styles.leave}
              onClick={() => void confirmLeaveAndNavigate()}
            >
              <span className={styles.exitIcon} aria-hidden="true">
                ➜
              </span>
              {leaveConfirm.busy
                ? t('nav.leaveDialog.leavingButton')
                : t('nav.leaveDialog.leaveButton')}
            </button>
          </div>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          className={styles.close}
          aria-label={t('nav.leaveDialog.closeAria')}
          disabled={leaveConfirm.busy}
          onClick={cancelLeaveConfirm}
        >
          ×
        </button>
      </div>
    </div>
  );
}
