'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
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
  const isReset = purpose === 'reset';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="auth-screen-enter">
      <div className="auth-header-block">
        <AuthStepIndicator step={2} />
        <h1 className="auth-title">Nhập mã xác minh</h1>
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
          Đổi email
        </button>
      </div>

      <p className="auth-neutral-note">
        {isReset
          ? 'Nếu có tài khoản với email này, mã sẽ được gửi tới hộp thư của bạn.'
          : 'Mã xác minh đã được gửi. Hãy kiểm tra hộp thư.'}
      </p>

      <AuthFeedback variant="error">{error}</AuthFeedback>

      <form className="auth-form" onSubmit={handleSubmit}>
        <OtpInput
          id="auth-code"
          label="Mã xác minh 6 số"
          value={code}
          onChange={onCodeChange}
          disabled={submitting}
        />

        <AuthSubmitButton busy={submitting} busyLabel="Đang kiểm tra…">
          Xác minh mã
        </AuthSubmitButton>
      </form>

      <div className="auth-otp-actions">
        <button
          type="button"
          disabled={submitting || remainingSeconds > 0}
          className="auth-resend-btn"
          onClick={onResend}
        >
          {remainingSeconds > 0 ? `Gửi lại sau ${remainingSeconds} giây` : 'Gửi lại mã'}
        </button>
        <span className="auth-otp-validity">Mã có hiệu lực 5 phút.</span>
      </div>

      <div className="auth-footer-links auth-footer-single">
        <Link href="/login" className="auth-secondary-link">
          ← Về đăng nhập
        </Link>
      </div>
    </div>
  );
}
