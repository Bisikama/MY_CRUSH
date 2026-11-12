'use client';

import { useEffect, useRef } from 'react';
import { usePlatform } from '../providers/platform-provider';

export function LeaveMatchDialog() {
  const { leaveConfirm, confirmLeaveAndNavigate, cancelLeaveConfirm } = usePlatform();
  const stayButtonRef = useRef<HTMLButtonElement | null>(null);
  const leaveButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!leaveConfirm.open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    stayButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!leaveConfirm.busy) cancelLeaveConfirm();
        return;
      }
      if (event.key === 'Tab') {
        const focusables = [stayButtonRef.current, leaveButtonRef.current].filter(
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

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus?.();
    };
  }, [cancelLeaveConfirm, leaveConfirm.busy, leaveConfirm.open]);

  if (!leaveConfirm.open) return null;

  return (
    <div
      className="auth-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !leaveConfirm.busy) {
          cancelLeaveConfirm();
        }
      }}
    >
      <div
        className="auth-modal-card leave-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-match-title"
        aria-describedby="leave-match-desc"
      >
        <div className="auth-modal-icon" aria-hidden="true">
          ⚠️
        </div>
        <h2 id="leave-match-title" className="auth-modal-title">
          Xác nhận rời phòng {leaveConfirm.code}
        </h2>
        <p id="leave-match-desc" className="auth-modal-desc">
          Trận đấu đang diễn ra.{' '}
          <strong>Rời phòng sẽ hủy trận cho cả hai người, trận bị hủy không được thưởng.</strong>
        </p>
        {leaveConfirm.error && (
          <div className="auth-feedback auth-feedback-error" role="alert">
            {leaveConfirm.error}
          </div>
        )}
        <div className="auth-modal-actions">
          <button
            ref={stayButtonRef}
            type="button"
            disabled={leaveConfirm.busy}
            className="auth-secondary-btn auth-btn-squish"
            onClick={cancelLeaveConfirm}
          >
            Ở lại trận
          </button>
          <button
            ref={leaveButtonRef}
            type="button"
            disabled={leaveConfirm.busy}
            className="auth-primary-modal-btn auth-btn-squish"
            onClick={() => void confirmLeaveAndNavigate()}
          >
            {leaveConfirm.busy ? 'Đang rời phòng…' : 'Rời phòng'}
          </button>
        </div>
      </div>
    </div>
  );
}
