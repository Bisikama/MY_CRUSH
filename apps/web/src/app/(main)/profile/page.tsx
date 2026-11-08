'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  api,
  isLocalAccountHost,
  loadIdentity,
  onAuthChanged,
  type GameIdentity,
} from '../../../lib/client';
import { AccountSettings } from '../../../features/auth/account-settings';
import {
  formatProfileMatchTime,
  getProfileModeDescriptor,
} from '../../../features/profile/profile.utils';

interface Profile {
  id: string;
  nickname: string;
  xp: number;
  wallet: { balance: number } | null;
}

interface HistoryRow {
  score: number;
  session: { id: string; mode: string; finishedAt: string | null };
}

function ModeIcon({ tone }: { tone: 'solo' | 'duel' | 'coop' }) {
  if (tone === 'duel') {
    return (
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
      >
        <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
        <line x1="13" y1="19" x2="19" y2="13" />
        <line x1="16" y1="16" x2="20" y2="20" />
        <line x1="19" y1="21" x2="21" y2="19" />
        <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
        <line x1="5" y1="14" x2="9" y2="18" />
        <line x1="7" y1="17" x2="4" y2="20" />
        <line x1="3" y1="19" x2="5" y2="21" />
      </svg>
    );
  }
  if (tone === 'coop') {
    return (
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
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  return (
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
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [identity, setIdentity] = useState<GameIdentity | null>(null);
  const [message, setMessage] = useState('Đang tải hồ sơ…');
  const localHost = typeof window !== 'undefined' && isLocalAccountHost();

  useEffect(() => {
    let live = true;
    const refresh = () =>
      void (async () => {
        const nextIdentity = await loadIdentity();
        if (!live) return;
        setIdentity(nextIdentity);
        if (!nextIdentity) {
          setProfile(null);
          setHistory([]);
          setMessage('Đăng nhập hoặc tạo hồ sơ khách tại trang Chơi.');
          return;
        }
        const [data, rows] = await Promise.all([
          api<Profile>('/players/me'),
          api<HistoryRow[]>('/players/me/history'),
        ]);
        if (!live) return;
        setProfile(data);
        setHistory(rows);
        setMessage('');
      })().catch((error: unknown) => {
        if (live) setMessage(error instanceof Error ? error.message : 'Không thể tải hồ sơ');
      });
    refresh();
    const unsubscribe = onAuthChanged(refresh);
    return () => {
      live = false;
      unsubscribe();
    };
  }, []);

  return (
    <div className="profile-shell">
      <header className="profile-page-header">
        <div className="profile-breadcrumb-row">
          <Link href="/" className="profile-breadcrumb-pill">
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3 3 10v11h6v-6h6v6h6V10L12 3z" />
            </svg>
            Trang chủ / Hồ sơ
          </Link>
        </div>
        <h1 className="profile-page-title">
          Góc của bạn <span aria-hidden="true">✨</span>
        </h1>
        <p className="profile-page-subtitle">
          Không gian cá nhân ấm cúng của bạn trong thế giới DuoQuest.
        </p>
      </header>

      {message && (
        <div className="profile-empty-card" role="status">
          <p className="profile-empty-text">{message}</p>
          {!identity && (
            <div className="profile-empty-actions">
              <Link href="/play" className="hub-btn-primary">
                Tạo hồ sơ khách tại trang Chơi →
              </Link>
              {localHost && (
                <Link href="/login" className="site-header-btn site-header-btn--outline">
                  Đăng nhập tài khoản
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {profile && (
        <div className="profile-stack">
          {/* 1. USER PROFILE CARD (Horizontal Layout: Avatar Left, Info Right) */}
          <section className="profile-identity-card" aria-label="Thông tin người chơi">
            <div
              className="profile-identity-bloom profile-identity-bloom--top"
              aria-hidden="true"
            />
            <div
              className="profile-identity-bloom profile-identity-bloom--bottom"
              aria-hidden="true"
            />
            <div className="profile-identity-content">
              <div className="profile-avatar-wrap">
                <div className="profile-avatar-ring">
                  <div className="profile-avatar-inner">
                    <img
                      src="/images/profile/default-avatar.jpg"
                      alt={`Ảnh đại diện ${profile.nickname}`}
                      className="profile-avatar-img"
                    />
                  </div>
                </div>
                <span
                  className="profile-avatar-sticker profile-avatar-sticker--star"
                  aria-hidden="true"
                >
                  ★
                </span>
                <span
                  className="profile-avatar-sticker profile-avatar-sticker--companion"
                  aria-hidden="true"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="8.5" cy="8.5" r="2.2" />
                    <circle cx="15.5" cy="8.5" r="2.2" />
                    <circle cx="5.5" cy="13" r="2" />
                    <circle cx="18.5" cy="13" r="2" />
                    <path d="M12 13c-3 0-5 2.2-5 4.5 0 1.4 1.2 2.5 2.7 2.5.9 0 1.6-.3 2.3-.3s1.4.3 2.3.3c1.5 0 2.7-1.1 2.7-2.5 0-2.3-2-4.5-5-4.5z" />
                  </svg>
                </span>
              </div>

              <div className="profile-identity-info">
                <div className="profile-identity-title-row">
                  <h2 className="profile-identity-name">{profile.nickname}</h2>
                  <span className="profile-identity-badge">
                    <svg
                      aria-hidden="true"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1.4 14.6L6.8 11.8l1.4-1.4 2.4 2.4 5.2-5.2 1.4 1.4-6.6 6.6z" />
                    </svg>
                    <span>{identity?.kind === 'account' ? 'Tài khoản' : 'Khách'}</span>
                  </span>
                </div>

                <p className="profile-identity-email">
                  {identity?.kind === 'account' && identity.email
                    ? identity.email
                    : 'Đang chơi với hồ sơ khách trên trình duyệt này'}
                </p>

                <div className="profile-identity-member">
                  <span className="profile-identity-dot" aria-hidden="true" />
                  <span>
                    {identity?.role === 'ADMIN'
                      ? 'Quản trị viên · Thành viên học tập DuoQuest'
                      : 'Thành viên học tập DuoQuest'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 2. STATS GRID (Coins & Tổng XP) */}
          <section className="profile-stats-grid" aria-label="Chỉ số tích lũy">
            <div className="profile-stat-card">
              <div className="profile-stat-icon profile-stat-icon--coins" aria-hidden="true">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M14.8 9A2 2 0 0 0 13 8h-2a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-2a2 2 0 0 1-1.8-1" />
                  <path d="M12 6v2m0 8v2" />
                </svg>
              </div>
              <div className="profile-stat-body">
                <span className="profile-stat-label">Coins</span>
                <strong className="profile-stat-value">
                  {(profile.wallet?.balance ?? 0).toLocaleString('vi-VN')}
                </strong>
              </div>
            </div>

            <div className="profile-stat-card">
              <div className="profile-stat-icon profile-stat-icon--xp" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2 14.6 8.4 21 11l-6.4 2.6L12 20l-2.6-6.4L3 11l6.4-2.6L12 2zm7 13 1.1 2.9L23 19l-2.9 1.1L19 23l-1.1-2.9L15 19l2.9-1.1L19 15zM5 15l.9 2.1L8 18l-2.1.9L5 21l-.9-2.1L2 18l2.1-.9L5 15z" />
                </svg>
              </div>
              <div className="profile-stat-body">
                <span className="profile-stat-label">Tổng XP</span>
                <strong className="profile-stat-value">
                  {profile.xp.toLocaleString('vi-VN')} XP
                </strong>
              </div>
            </div>
          </section>

          {/* 3. RECENT MATCHES ("Trận gần đây") */}
          <section className="profile-section-card" aria-labelledby="profile-history-heading">
            <div className="profile-section-header">
              <h2 id="profile-history-heading" className="profile-section-title">
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
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M12 7v5l4 2" />
                </svg>
                Trận gần đây
              </h2>
              <span className="profile-section-pill">
                {history.length ? `${history.length} lượt chơi gần nhất` : 'Chưa có lượt chơi'}
              </span>
            </div>

            {history.length ? (
              <div className="profile-match-list">
                {history.map((row) => {
                  const descriptor = getProfileModeDescriptor(row.session.mode);
                  return (
                    <div className="history-row profile-match-row" key={row.session.id}>
                      <div className="profile-match-left">
                        <div
                          className={`profile-match-mode-icon profile-match-mode-icon--${descriptor.tone}`}
                        >
                          <ModeIcon tone={descriptor.tone} />
                        </div>
                        <div className="profile-match-meta">
                          <div className="profile-match-title-row">
                            <span className="profile-match-mode-name">{descriptor.title}</span>
                            <span
                              className={`profile-match-mode-tag profile-match-mode-tag--${descriptor.tone}`}
                            >
                              {descriptor.tag}
                            </span>
                          </div>
                          <span className="profile-match-time">
                            {formatProfileMatchTime(row.session.finishedAt)}
                          </span>
                        </div>
                      </div>
                      <div className="profile-match-right">
                        <span className="profile-match-score-label">Điểm trận</span>
                        <strong className="profile-match-score">
                          {row.score.toLocaleString('vi-VN')} điểm
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="profile-history-empty">Chưa có trận hoàn tất.</p>
            )}
          </section>

          {/* 4. TITLES / BADGES ("Bộ sưu tập danh hiệu" — Future Concept Placeholders) */}
          <section className="profile-section-card" aria-labelledby="profile-titles-heading">
            <div className="profile-section-header">
              <h2 id="profile-titles-heading" className="profile-section-title">
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
                  <circle cx="12" cy="8" r="6" />
                  <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                </svg>
                Bộ sưu tập danh hiệu
              </h2>
              <span className="profile-section-pill">Sắp ra mắt</span>
            </div>

            <div className="profile-titles-grid" aria-label="Ô danh hiệu dự kiến">
              <div className="profile-title-slot">
                <div className="profile-title-silhouette" aria-hidden="true">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
              </div>

              <div className="profile-title-slot">
                <div className="profile-title-silhouette" aria-hidden="true">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </div>
              </div>

              <div className="profile-title-slot">
                <div className="profile-title-silhouette" aria-hidden="true">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>
                </div>
              </div>
            </div>
          </section>

          {/* 5. ACCOUNT SECURITY ("Bảo mật tài khoản") */}
          {identity && <AccountSettings identity={identity} />}
        </div>
      )}
    </div>
  );
}
