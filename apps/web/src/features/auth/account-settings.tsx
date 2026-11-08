'use client';

import { passwordRequirementsMessage } from '@duoquest/shared-types';
import { validatePassword } from './auth-api';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@duoquest/ui';
import { api, authChanged, isLocalAccountHost, type GameIdentity } from '../../lib/client';
import { usePlatform } from '../../providers/platform-provider';

export function AccountSettings({ identity }: { identity: GameIdentity }) {
  const { currentRoom, logoutSession } = usePlatform();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const account = identity.kind === 'account';
  const localHost = typeof window !== 'undefined' && isLocalAccountHost();

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setMessage('');
    try {
      await task();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể hoàn thành thao tác.');
    } finally {
      setBusy(false);
    }
  }

  const logout = (all: boolean) => {
    if (currentRoom) {
      setMessage(`Hãy rời phòng ${currentRoom.code} trước khi đăng xuất hoặc thoát hồ sơ.`);
      return;
    }
    if (
      !account &&
      !window.confirm(
        'Thoát hồ sơ guest sẽ mất quyền truy cập tiến trình này trên trình duyệt. Bạn có thể tạo tài khoản để giữ tiến trình trước khi thoát.',
      )
    )
      return;
    void run(async () => {
      await logoutSession(all);
    });
  };

  return (
    <section className="profile-section-card" aria-labelledby="profile-security-heading">
      <div className="profile-section-header">
        <h2 id="profile-security-heading" className="profile-section-title">
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="profile-section-icon"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Bảo mật tài khoản
        </h2>
      </div>

      <div className="profile-security-list">
        {account ? (
          <>
            <button
              type="button"
              className="profile-security-row"
              aria-expanded={showPasswordForm}
              disabled={busy}
              onClick={() => {
                setShowPasswordForm((prev) => !prev);
                setMessage('');
              }}
            >
              <span className="profile-security-row-main">
                <span className="profile-security-badge profile-security-badge--purple">
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="7.5" cy="15.5" r="5.5" />
                    <path d="m21 2-9.6 9.6" />
                    <path d="m15.5 7.5 3 3L22 7l-3-3" />
                  </svg>
                </span>
                <span className="profile-security-row-label">Đổi mật khẩu</span>
              </span>
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`profile-security-chevron ${
                  showPasswordForm ? 'profile-security-chevron--open' : ''
                }`}
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>

            {showPasswordForm && (
              <form
                className="profile-password-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(async () => {
                    if (!validatePassword(password)) throw new Error(passwordRequirementsMessage);
                    if (password !== confirmation) throw new Error('Hai mật khẩu chưa khớp.');
                    await api('/auth/password/change', { currentPassword, password });
                    setCurrentPassword('');
                    setPassword('');
                    setConfirmation('');
                    setShowPasswordForm(false);
                    authChanged();
                    setMessage('Đã đổi mật khẩu và đăng xuất các phiên cũ.');
                  });
                }}
              >
                <div className="profile-password-field">
                  <label htmlFor="current-password">Mật khẩu hiện tại</label>
                  <input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    maxLength={256}
                    required
                  />
                </div>
                <div className="profile-password-field">
                  <label htmlFor="new-password">Mật khẩu mới</label>
                  <p className="profile-password-hint">{passwordRequirementsMessage}</p>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    maxLength={256}
                    required
                  />
                </div>
                <div className="profile-password-field">
                  <label htmlFor="repeat-password">Xác nhận mật khẩu mới</label>
                  <input
                    id="repeat-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    maxLength={256}
                    required
                  />
                </div>
                <div className="profile-password-actions">
                  <Button type="submit" disabled={busy}>
                    Lưu mật khẩu mới
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setShowPasswordForm(false)}
                  >
                    Đóng
                  </Button>
                </div>
              </form>
            )}

            <button
              type="button"
              className="profile-security-row"
              disabled={busy}
              onClick={() => logout(true)}
            >
              <span className="profile-security-row-main">
                <span className="profile-security-badge profile-security-badge--sky">
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8" />
                    <path d="M12 17v4" />
                  </svg>
                </span>
                <span className="profile-security-row-label">Đăng xuất mọi thiết bị</span>
              </span>
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="profile-security-chevron"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </>
        ) : localHost ? (
          <Link href="/register" className="profile-security-row">
            <span className="profile-security-row-main">
              <span className="profile-security-badge profile-security-badge--purple">
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              <span className="profile-security-row-text">
                <span className="profile-security-row-label">Tạo tài khoản để giữ tiến trình</span>
                <span className="profile-security-row-sub">
                  Giữ nguyên Coins, XP, vật phẩm và lịch sử chơi hiện tại
                </span>
              </span>
            </span>
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="profile-security-chevron"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        ) : (
          <div className="profile-guest-lan-note">
            Tạo tài khoản để giữ tiến trình hiện được hỗ trợ trên localhost.
          </div>
        )}

        <div className="profile-security-divider">
          <button
            type="button"
            className="profile-security-row profile-security-row--danger"
            disabled={busy}
            onClick={() => logout(false)}
          >
            <span className="profile-security-row-main">
              <span className="profile-security-badge profile-security-badge--danger">
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
              <span className="profile-security-row-label">
                {account ? 'Đăng xuất' : 'Thoát hồ sơ guest'}
              </span>
            </span>
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="profile-security-danger-icon"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {message && (
        <p role="status" className="profile-security-status">
          {message}
        </p>
      )}
    </section>
  );
}
