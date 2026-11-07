'use client';

import { useState, type InputHTMLAttributes, type ReactNode } from 'react';

export function AuthField({
  id,
  label,
  labelExtra,
  hint,
  error,
  ...props
}: {
  id: string;
  label: string;
  labelExtra?: ReactNode;
  hint?: string;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="auth-field-group">
      <div className="auth-label-row">
        <label htmlFor={id} className="auth-label">
          {label}
        </label>
        {labelExtra}
      </div>
      <div className="auth-input-wrap">
        <input id={id} className="auth-input" {...props} />
      </div>
      {hint && <p className="auth-field-hint">{hint}</p>}
      {error && (
        <p className="auth-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function PasswordField({
  id,
  label,
  labelExtra,
  hint,
  toggleAriaLabel = 'Hiện hoặc ẩn mật khẩu',
  ...props
}: {
  id: string;
  label: string;
  labelExtra?: ReactNode;
  hint?: string;
  toggleAriaLabel?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-field-group">
      <div className="auth-label-row">
        <label htmlFor={id} className="auth-label">
          {label}
        </label>
        {labelExtra}
      </div>
      <div className="auth-input-wrap">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="auth-input auth-input-password"
          {...props}
        />
        <button
          type="button"
          className="auth-password-toggle"
          aria-label={toggleAriaLabel}
          aria-pressed={visible}
          onClick={() => setVisible((prev) => !prev)}
        >
          {visible ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
            </svg>
          )}
        </button>
      </div>
      {hint && <p className="auth-field-hint">{hint}</p>}
    </div>
  );
}
