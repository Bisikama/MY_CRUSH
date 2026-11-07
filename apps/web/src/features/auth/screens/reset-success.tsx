'use client';

import Link from 'next/link';

export function ResetSuccess() {
  return (
    <div className="auth-screen-enter auth-success-box">
      <div className="auth-success-badge-wrap">
        <div className="auth-success-badge auth-sparkle-pop" aria-hidden="true">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <span className="auth-success-sparkle" aria-hidden="true">
          ✦
        </span>
      </div>

      <h1 className="auth-title">Đã đổi mật khẩu!</h1>
      <p className="auth-success-desc">Mật khẩu đã được đặt lại. Đăng nhập để chơi tiếp.</p>

      <Link href="/login" className="auth-submit-btn auth-btn-squish auth-success-cta">
        <span>Đăng nhập</span>
      </Link>
    </div>
  );
}
