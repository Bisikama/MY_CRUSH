'use client';

import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { evaluatePasswordQuality } from '../auth-api';

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
  showQualityMeter = false,
  toggleAriaLabel = 'Hiện hoặc ẩn mật khẩu',
  value,
  ...props
}: {
  id: string;
  label: string;
  labelExtra?: ReactNode;
  hint?: string;
  showQualityMeter?: boolean;
  toggleAriaLabel?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);
  const stringValue = typeof value === 'string' ? value : '';
  const quality = showQualityMeter ? evaluatePasswordQuality(stringValue) : null;

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
          value={value}
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

      {quality ? (
        <div className="auth-pwd-meter">
          <div className="auth-pwd-meter-header">
            <span className="auth-pwd-meter-title">Chất lượng mật khẩu</span>
            <span className={`auth-pwd-meter-badge auth-pwd-meter-badge--${quality.tone}`}>
              {quality.levelLabel}
            </span>
          </div>

          <div
            className="auth-pwd-meter-track"
            role="progressbar"
            aria-label="Chất lượng mật khẩu"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={quality.percent}
          >
            {[1, 2, 3].map((step) => (
              <span
                key={step}
                className={`auth-pwd-segment ${
                  step <= quality.activeSegments
                    ? `auth-pwd-segment--active auth-pwd-segment--${quality.tone}`
                    : ''
                }`}
              />
            ))}
          </div>

          <ul className="auth-pwd-checklist" aria-label="Tiêu chí mật khẩu">
            <li
              className={`auth-pwd-check-item ${
                quality.lengthOk
                  ? 'auth-pwd-check-item--met'
                  : quality.tooLong
                    ? 'auth-pwd-check-item--warn'
                    : ''
              }`}
            >
              <span className="auth-pwd-check-icon" aria-hidden="true">
                {quality.lengthOk ? '✓' : quality.tooLong ? '!' : '○'}
              </span>
              <span>
                {quality.tooLong
                  ? `Tối đa 128 ký tự (${quality.length}/128)`
                  : `Độ dài 9–128 ký tự (${quality.length}/9+)`}
              </span>
            </li>
            <li
              className={`auth-pwd-check-item ${
                quality.specialOk ? 'auth-pwd-check-item--met' : ''
              }`}
            >
              <span className="auth-pwd-check-icon" aria-hidden="true">
                {quality.specialOk ? '✓' : '○'}
              </span>
              <span>Có ít nhất 1 ký tự đặc biệt (!, @, #, $...)</span>
            </li>
          </ul>

          <p className={`auth-pwd-guidance auth-pwd-guidance--${quality.tone}`} aria-live="polite">
            {quality.guidance}
          </p>
        </div>
      ) : (
        hint && <p className="auth-field-hint">{hint}</p>
      )}
    </div>
  );
}
