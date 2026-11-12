'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function AuthStepIndicator({ step, total = 3 }: { step: 1 | 2 | 3; total?: number }) {
  return (
    <div className="auth-step-indicator">
      <span className="auth-step-badge">
        Bước {step} / {total}
      </span>
      <div className="auth-step-dots" aria-hidden="true">
        {Array.from({ length: total }, (_, idx) => (
          <span
            key={idx}
            className={`auth-step-dot ${idx + 1 <= step ? 'auth-step-dot-active' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}

export function AuthFeedback({
  variant = 'error',
  children,
}: {
  variant?: 'error' | 'info' | 'success';
  children: ReactNode;
}) {
  if (!children) return null;
  const isAlert = variant === 'error';
  return (
    <p
      className={`auth-feedback auth-feedback-${variant} notice`}
      role={isAlert ? 'alert' : 'status'}
    >
      {children}
    </p>
  );
}

export function AuthSubmitButton({
  busy = false,
  busyLabel = 'Đang xử lý…',
  children,
  ...props
}: {
  busy?: boolean;
  busyLabel?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      disabled={busy || props.disabled}
      className="auth-submit-btn auth-btn-squish"
      {...props}
    >
      {busy ? (
        <span className="auth-btn-content">
          <svg
            className="auth-spinner"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeOpacity="0.3"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
          <span>{busyLabel}</span>
        </span>
      ) : (
        <span className="auth-btn-content">{children}</span>
      )}
    </button>
  );
}
