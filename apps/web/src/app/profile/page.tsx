'use client';
import { useEffect, useState } from 'react';
import { Button, Card } from '@duoquest/ui';
import { api, identityKey, readIdentity } from '../../lib/client';
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
  const [message, setMessage] = useState('Đang tải hồ sơ…');
  useEffect(() => {
    const guest = readIdentity();
    if (!guest) {
      setMessage('Hãy tạo hồ sơ khách tại trang Chơi.');
      return;
    }
    void Promise.all([
      api<Profile>('/players/me', guest.token),
      api<HistoryRow[]>('/players/me/history', guest.token),
    ])
      .then(([data, rows]) => {
        setProfile(data);
        setHistory(rows);
        setMessage('');
      })
      .catch((error: unknown) =>
        setMessage(error instanceof Error ? error.message : 'Không thể tải hồ sơ'),
      );
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
      <p className="small muted">
        Token khách được lưu trên trình duyệt hiện tại. Xóa phiên sẽ mất khả năng truy cập hồ sơ từ
        trình duyệt này; chưa có cơ chế khôi phục.
      </p>
      <Button
        variant="ghost"
        onClick={() => {
          if (
            window.confirm(
              'Xóa phiên khách trên trình duyệt? Bạn sẽ không thể khôi phục hồ sơ cũ trong bản nền tảng này.',
            )
          ) {
            localStorage.removeItem(identityKey);
            window.location.assign('/');
          }
        }}
      >
        Xóa phiên khách trên máy này
      </Button>
    </div>
  );
}
