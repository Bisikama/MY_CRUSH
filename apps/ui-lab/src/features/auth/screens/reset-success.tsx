'use client';

import Link from 'next/link';
import { useI18n } from '../../../i18n';

export function ResetSuccess() {
  const { t } = useI18n();
  return (
    <div className="auth-screen-enter auth-success-box">
      <div className="auth-success-badge-wrap">
        <div className="auth-success-badge auth-sparkle-pop" aria-hidden="true">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <span className="auth-success-sparkle" aria-hidden="true">
          ✦
        </span>
      </div>

      <h1 className="auth-title">{t('auth.resetSuccess.title')}</h1>
      <p className="auth-success-desc">{t('auth.resetSuccess.description')}</p>

      <Link href="/login" className="auth-submit-btn auth-btn-squish auth-success-cta">
        <span>{t('auth.resetSuccess.cta')}</span>
      </Link>
    </div>
  );
}
