'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
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
  return (
    <div className="auth-page-bg">
      <main className="auth-shell-card">
        <section className="auth-col-illustration" aria-label="Hình ảnh minh họa DuoQuest">
          <div className="auth-brand-row">
            <Link href="/" className="auth-brand-link" title="DuoQuest">
              <span className="auth-brand-badge">DQ</span>
              <span className="auth-brand-name">DuoQuest</span>
            </Link>
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
