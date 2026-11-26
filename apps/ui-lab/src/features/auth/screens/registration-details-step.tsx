'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useI18n } from '../../../i18n';
import { AuthField, PasswordField } from '../components/auth-field';
import { AuthFeedback, AuthStepIndicator, AuthSubmitButton } from '../components/auth-ui';

export function RegistrationDetailsStep({
  email,
  nickname,
  onNicknameChange,
  password,
  onPasswordChange,
  confirmation,
  onConfirmationChange,
  submitting,
  error,
  onSubmit,
  onChangeEmail,
}: {
  email: string;
  nickname: string;
  onNicknameChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  confirmation: string;
  onConfirmationChange: (value: string) => void;
  submitting: boolean;
  error: string;
  onSubmit: () => void;
  onChangeEmail: () => void;
}) {
  const { t } = useI18n();
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="auth-screen-enter">
      <div className="auth-header-block">
        <AuthStepIndicator step={3} />
        <h1 className="auth-title">{t('auth.registration.title')}</h1>
      </div>

      <div className="auth-email-pill-row">
        <span className="auth-email-pill-text" title={email}>
          ✓ {email}
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

      <AuthFeedback variant="error">{error}</AuthFeedback>

      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthField
          id="auth-nickname"
          label={t('auth.registration.nicknameLabel')}
          autoComplete="nickname"
          minLength={2}
          maxLength={30}
          placeholder={t('auth.registration.nicknamePlaceholder')}
          value={nickname}
          onChange={(event) => onNicknameChange(event.target.value)}
          required
        />

        <PasswordField
          id="auth-password"
          label={t('auth.registration.passwordLabel')}
          autoComplete="new-password"
          maxLength={256}
          placeholder={t('auth.registration.passwordPlaceholder')}
          showQualityMeter
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          required
        />

        <PasswordField
          id="auth-confirm"
          label={t('auth.registration.confirmLabel')}
          autoComplete="new-password"
          maxLength={256}
          placeholder={t('auth.registration.confirmPlaceholder')}
          toggleAriaLabel={t('auth.registration.confirmToggleAria')}
          value={confirmation}
          onChange={(event) => onConfirmationChange(event.target.value)}
          required
        />

        <AuthSubmitButton busy={submitting} busyLabel={t('auth.registration.submitting')}>
          {t('auth.registration.submit')}
        </AuthSubmitButton>
      </form>

      <div className="auth-footer-links auth-footer-single">
        <Link href="/login" className="auth-secondary-link">
          {t('auth.emailStep.backToLogin')}
        </Link>
      </div>
    </div>
  );
}
