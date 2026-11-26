'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useI18n } from '../../../i18n';
import { AuthField, PasswordField } from '../components/auth-field';
import { AuthFeedback, AuthSubmitButton } from '../components/auth-ui';
import { IdentitySwitchDialog } from '../components/identity-switch-dialog';

export function LoginForm({
  email,
  onEmailChange,
  password,
  onPasswordChange,
  submitting,
  error,
  guestNickname,
  confirmSwitchOpen,
  onSubmit,
  onConfirmSwitch,
  onCancelSwitch,
}: {
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  submitting: boolean;
  error: string;
  guestNickname?: string;
  confirmSwitchOpen: boolean;
  onSubmit: () => void;
  onConfirmSwitch: () => void;
  onCancelSwitch: () => void;
}) {
  const { t } = useI18n();
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="auth-screen-enter">
      <div className="auth-header-block">
        <div className="auth-kicker">
          <span className="auth-kicker-dot" aria-hidden="true" />
          <span>{t('auth.login.kicker')}</span>
        </div>
        <h1 className="auth-title">{t('auth.login.title')}</h1>
      </div>

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

        <PasswordField
          id="auth-password"
          label={t('auth.login.passwordLabel')}
          labelExtra={
            <Link href="/forgot-password" className="auth-inline-link">
              {t('auth.login.forgotLink')}
            </Link>
          }
          autoComplete="current-password"
          maxLength={256}
          placeholder="•••••••••••••••"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          required
        />

        <AuthSubmitButton busy={submitting} busyLabel={t('auth.login.submitting')}>
          {t('auth.login.submit')}
        </AuthSubmitButton>
      </form>

      <div className="auth-footer-links">
        <Link href="/register" className="auth-secondary-link">
          {guestNickname ? t('auth.login.createWithProgress') : t('auth.login.createAccount')}
        </Link>
        <Link href="/play" className="auth-guest-pill">
          {t('auth.login.playAsGuest')}
        </Link>
      </div>

      <IdentitySwitchDialog
        open={confirmSwitchOpen}
        guestNickname={guestNickname}
        busy={submitting}
        onConfirm={onConfirmSwitch}
        onCancel={onCancelSwitch}
      />
    </div>
  );
}
