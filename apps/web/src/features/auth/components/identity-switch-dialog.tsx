'use client';

import { useEffect, useRef } from 'react';

export function IdentitySwitchDialog({
  open,
  guestNickname,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  guestNickname?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousActive = document.activeElement as HTMLElement | null;
    confirmBtnRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!busy) onCancel();
        return;
      }
      if (event.key === 'Tab') {
        const focusables = [cancelBtnRef.current, confirmBtnRef.current].filter(
          (el): el is HTMLButtonElement => Boolean(el && !el.disabled),
        );
        if (focusables.length < 2) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousActive?.focus?.();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="auth-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className="auth-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="identity-switch-title"
        aria-describedby="identity-switch-desc"
      >
        <div className="auth-modal-icon" aria-hidden="true">
          🎒 👜
        </div>
        <h2 id="identity-switch-title" className="auth-modal-title">
          Tách biệt túi đồ
        </h2>
        <p id="identity-switch-desc" className="auth-modal-desc">
          Đăng nhập sẽ thoát hồ sơ khách{guestNickname ? ` (${guestNickname})` : ''} hiện tại. Tiến
          trình khách không tự chuyển sang tài khoản này.
        </p>
        <div className="auth-modal-actions">
          <button
            ref={cancelBtnRef}
            type="button"
            disabled={busy}
            className="auth-secondary-btn auth-btn-squish"
            onClick={onCancel}
          >
            Ở lại
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            disabled={busy}
            className="auth-primary-modal-btn auth-btn-squish"
            onClick={onConfirm}
          >
            Tiếp tục đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}
