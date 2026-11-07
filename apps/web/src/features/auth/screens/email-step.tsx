'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
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
  const isReset = purpose === 'reset';
  const title = isReset ? 'Quên mật khẩu?' : 'Tạo tài khoản';

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
          Đăng ký sẽ giữ tiến trình của hồ sơ <strong>{guestNickname}</strong>.
        </div>
      )}

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

        {isReset && <p className="auth-neutral-note">Nếu email đã đăng ký, bạn sẽ nhận được mã.</p>}

        <AuthSubmitButton busy={submitting} busyLabel="Đang gửi…">
          Gửi mã
        </AuthSubmitButton>
      </form>

      {emailAlreadyRegistered && (
        <p className="auth-extra-row">
          <Link href="/forgot-password" className="auth-inline-link">
            Quên mật khẩu?
          </Link>
        </p>
      )}

      <div className="auth-footer-links auth-footer-single">
        <Link href="/login" className="auth-secondary-link">
          ← Về đăng nhập
        </Link>
      </div>
    </div>
  );
}
