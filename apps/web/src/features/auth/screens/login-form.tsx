'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
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
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="auth-screen-enter">
      <div className="auth-header-block">
        <div className="auth-kicker">
          <span className="auth-kicker-dot" aria-hidden="true" />
          <span>Đăng nhập</span>
        </div>
        <h1 className="auth-title">Chào bạn trở lại</h1>
      </div>

      <AuthFeedback variant="error">{error}</AuthFeedback>

      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthField
          id="auth-email"
          label="Email"
          type="email"
          autoComplete="email"
          maxLength={254}
          placeholder="banthan@duoquest.vn"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          required
        />

        <PasswordField
          id="auth-password"
          label="Mật khẩu"
          labelExtra={
            <Link href="/forgot-password" className="auth-inline-link">
              Quên mật khẩu?
            </Link>
          }
          autoComplete="current-password"
          maxLength={256}
          placeholder="•••••••••••••••"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          required
        />

        <AuthSubmitButton busy={submitting} busyLabel="Đang đăng nhập…">
          Đăng nhập
        </AuthSubmitButton>
      </form>

      <div className="auth-footer-links">
        <Link href="/register" className="auth-secondary-link">
          Tạo tài khoản
        </Link>
        <Link href="/" className="auth-guest-pill">
          Chơi dưới dạng khách ⚡
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
