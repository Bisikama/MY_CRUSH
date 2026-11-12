'use client';

import { useRef, useState } from 'react';

export function sanitizeOtpCode(raw: string): string {
  return raw.replace(/[^0-9]/g, '').slice(0, 6);
}

export function OtpInput({
  id = 'auth-code',
  label = 'Mã xác minh 6 số',
  value,
  onChange,
  disabled = false,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [focused, setFocused] = useState(false);
  const digits = sanitizeOtpCode(value);
  const activeSlot = Math.min(digits.length, 5);

  return (
    <div className="auth-field-group">
      <div className="auth-label-row">
        <label htmlFor={id} className="auth-label">
          {label}
        </label>
      </div>
      <div
        className="auth-otp-wrapper"
        onClick={() => {
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={digits}
          disabled={disabled}
          className="auth-otp-real-input"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => {
            onChange(sanitizeOtpCode(event.target.value));
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData?.getData('text') ?? '';
            const cleaned = sanitizeOtpCode(pasted);
            if (cleaned) {
              event.preventDefault();
              onChange(cleaned);
            }
          }}
          required
        />
        <div className="auth-otp-slots" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => {
            const char = digits[index] ?? '';
            const isSlotActive = focused && index === activeSlot;
            return (
              <div
                key={index}
                className={[
                  'auth-otp-slot',
                  char ? 'auth-otp-slot-filled' : '',
                  isSlotActive ? 'auth-otp-slot-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {char}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
