'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { LanguageSwitcher } from '../../../components/language-switcher';
import { useI18n } from '../../../i18n';
import { AuthIllustration, type AuthIllustrationVariant } from './auth-illustration';

export function AuthShell({
  variant,
  captionOverride,
  children,
}: {
  variant: AuthIllustrationVariant;
  captionOverride?: string;
  children: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="auth-page-bg">
      <main className="auth-shell-card">
        <section className="auth-col-illustration" aria-label={t('auth.shell.illustrationAria')}>
          <div
            className="auth-brand-row"
            style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
          >
            <Link href="/" className="auth-brand-link" title="DuoQuest">
              <span className="auth-brand-badge">DQ</span>
              <span className="auth-brand-name">DuoQuest</span>
            </Link>
            <LanguageSwitcher variant="compact" />
          </div>
          <AuthIllustration variant={variant} captionOverride={captionOverride} />
          <div className="auth-illustration-footer" aria-hidden="true" />
        </section>
        <section className="auth-col-form">
          <div className="auth-form-box">{children}</div>
        </section>
      </main>
    </div>
  );
}
