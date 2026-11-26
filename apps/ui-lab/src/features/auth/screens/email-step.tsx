'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useI18n } from '../../../i18n';
import { AuthField } from '../components/auth-field';
import { AuthFeedback, AuthStepIndicator, AuthSubmitButton } from '../components/auth-ui';
import type { ChallengePurpose } from '../auth-api';

export function EmailStep({
  purpose,
  email,
  onEmailChange,
  submitting,
  error,
  emailAlreadyRegistered,
  guestNickname,
  onSubmit,
}: {
  purpose: ChallengePurpose;
  email: string;
  onEmailChange: (value: string) => void;
  submitting: boolean;
  error: string;
  emailAlreadyRegistered?: boolean;
  guestNickname?: string;
  onSubmit: () => void;
}) {
  const { t } = useI18n();
  const isReset = purpose === 'reset';
  const title = isReset ? t('auth.emailStep.resetTitle') : t('auth.emailStep.registerTitle');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="auth-screen-enter">
      <div className="auth-header-block">
        <AuthStepIndicator step={1} />
        <h1 className="auth-title">{title}</h1>
      </div>

      {!isReset && guestNickname && (
        <div className="auth-info-banner">
          {t('auth.emailStep.guestUpgradePrefix')}
          <strong>{guestNickname}</strong>
          {t('auth.emailStep.guestUpgradeSuffix')}
        </div>
      )}

      <AuthFeedback variant="error">{error}</AuthFeedback>

      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthField
          id="auth-email"
          label={t('auth.login.emailLabel')}
          type="email"
          autoComplete="email"
          maxLength={254}
          placeholder={t('auth.login.emailPlaceholder')}
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          required
        />

        {isReset && <p className="auth-neutral-note">{t('auth.emailStep.resetNote')}</p>}

        <AuthSubmitButton busy={submitting} busyLabel={t('auth.emailStep.submitting')}>
          {t('auth.emailStep.submit')}
        </AuthSubmitButton>
      </form>

      {emailAlreadyRegistered && (
        <p className="auth-extra-row">
          <Link href="/forgot-password" className="auth-inline-link">
            {t('auth.emailStep.forgotLink')}
          </Link>
        </p>
      )}

      <div className="auth-footer-links auth-footer-single">
        <Link href="/login" className="auth-secondary-link">
          {t('auth.emailStep.backToLogin')}
        </Link>
      </div>
    </div>
  );
}
