'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useI18n } from '../../../i18n';
import { OtpInput } from '../components/otp-input';
import { AuthFeedback, AuthStepIndicator, AuthSubmitButton } from '../components/auth-ui';
import type { ChallengePurpose } from '../auth-api';

export function VerificationStep({
  purpose,
  email,
  code,
  onCodeChange,
  remainingSeconds,
  submitting,
  error,
  onSubmit,
  onResend,
  onChangeEmail,
}: {
  purpose: ChallengePurpose;
  email: string;
  code: string;
  onCodeChange: (value: string) => void;
  remainingSeconds: number;
  submitting: boolean;
  error: string;
  onSubmit: () => void;
  onResend: () => void;
  onChangeEmail: () => void;
}) {
  const { t } = useI18n();
  const isReset = purpose === 'reset';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="auth-screen-enter">
      <div className="auth-header-block">
        <AuthStepIndicator step={2} />
        <h1 className="auth-title">{t('auth.verification.title')}</h1>
      </div>

      <div className="auth-email-pill-row">
        <span className="auth-email-pill-text" title={email}>
          {email}
        </span>
        <button
          type="button"
          disabled={submitting}
          className="auth-text-action"
          onClick={onChangeEmail}
        >
          {t('auth.verification.changeEmail')}
        </button>
      </div>

      <p className="auth-neutral-note">
        {isReset ? t('auth.verification.resetNote') : t('auth.verification.registerNote')}
      </p>

      <AuthFeedback variant="error">{error}</AuthFeedback>

      <form className="auth-form" onSubmit={handleSubmit}>
        <OtpInput
          id="auth-code"
          label={t('auth.verification.otpLabel')}
          value={code}
          onChange={onCodeChange}
          disabled={submitting}
        />

        <AuthSubmitButton busy={submitting} busyLabel={t('auth.verification.submitting')}>
          {t('auth.verification.submit')}
        </AuthSubmitButton>
      </form>

      <div className="auth-otp-actions">
        <button
          type="button"
          disabled={submitting || remainingSeconds > 0}
          className="auth-resend-btn"
          onClick={onResend}
        >
          {remainingSeconds > 0
            ? t('auth.verification.resendCountdown', { seconds: remainingSeconds })
            : t('auth.verification.resendButton')}
        </button>
        <span className="auth-otp-validity">{t('auth.verification.validityNote')}</span>
      </div>

      <div className="auth-footer-links auth-footer-single">
        <Link href="/login" className="auth-secondary-link">
          {t('auth.emailStep.backToLogin')}
        </Link>
      </div>
    </div>
  );
}
