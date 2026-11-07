'use client';
import { useEffect, useState } from 'react';
import { Card } from '@duoquest/ui';
import { api, loadIdentity, onAuthChanged, type GameIdentity } from '../../lib/client';
import { AccountSettings } from '../../features/auth/account-settings';
interface Profile {
  nickname: string;
  xp: number;
  wallet: { balance: number } | null;
}
interface HistoryRow {
  score: number;
  session: { id: string; mode: string; finishedAt: string };
}
export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [identity, setIdentity] = useState<GameIdentity | null>(null);
  const [message, setMessage] = useState('Đang tải hồ sơ…');
  useEffect(() => {
    let live = true;
    const refresh = () =>
      void (async () => {
        const identity = await loadIdentity();
        if (!live) return;
        setIdentity(identity);
        if (!identity) {
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
    <div className="narrow">
      <p className="eyebrow">TIẾN TRÌNH CỦA BẠN</p>
      <h1>{profile?.nickname ?? 'Hồ sơ người chơi'}</h1>
      {message && <p role="status">{message}</p>}
      {profile && (
        <div className="scoreboard">
          <Card>
            <span className="tag">COINS</span>
            <h2>{profile.wallet?.balance ?? 0}</h2>
          </Card>
          <Card>
            <span className="tag">XP</span>
            <h2>{profile.xp}</h2>
          </Card>
        </div>
      )}
      <Card>
        <h2>Những vòng chơi gần đây</h2>
        {history.length ? (
          history.map((row) => (
            <div className="history-row" key={row.session.id}>
              <span>{row.session.mode}</span>
              <span>{new Date(row.session.finishedAt).toLocaleString('vi-VN')}</span>
              <strong>{row.score} điểm</strong>
            </div>
          ))
        ) : (
          <p className="muted">Chưa có trận hoàn tất.</p>
        )}
      </Card>
      {identity && <AccountSettings identity={identity} />}
    </div>
  );
}
