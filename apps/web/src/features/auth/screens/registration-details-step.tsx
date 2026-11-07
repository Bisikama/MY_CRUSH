'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
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
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="auth-screen-enter">
      <div className="auth-header-block">
        <AuthStepIndicator step={3} />
        <h1 className="auth-title">Hoàn tất tài khoản</h1>
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
          Đổi email
        </button>
      </div>

      <AuthFeedback variant="error">{error}</AuthFeedback>

      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthField
          id="auth-nickname"
          label="Nickname"
          autoComplete="nickname"
          minLength={2}
          maxLength={30}
          placeholder="Tên hiển thị (2–30 ký tự)"
          value={nickname}
          onChange={(event) => onNicknameChange(event.target.value)}
          required
        />

        <PasswordField
          id="auth-password"
          label="Mật khẩu"
          autoComplete="new-password"
          maxLength={256}
          placeholder="Tối thiểu 9 ký tự, có ký tự đặc biệt"
          hint="Dùng 9–128 ký tự, có ít nhất 1 ký tự đặc biệt như !, @, #."
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          required
        />

        <PasswordField
          id="auth-confirm"
          label="Xác nhận mật khẩu"
          autoComplete="new-password"
          maxLength={256}
          placeholder="Nhập lại mật khẩu"
          toggleAriaLabel="Hiện hoặc ẩn mật khẩu xác nhận"
          value={confirmation}
          onChange={(event) => onConfirmationChange(event.target.value)}
          required
        />

        <AuthSubmitButton busy={submitting} busyLabel="Đang tạo tài khoản…">
          Tạo tài khoản
        </AuthSubmitButton>
      </form>

      <div className="auth-footer-links auth-footer-single">
        <Link href="/login" className="auth-secondary-link">
          ← Về đăng nhập
        </Link>
      </div>
    </div>
  );
}
