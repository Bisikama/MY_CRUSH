'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card } from '@duoquest/ui';
import { api, authChanged, isLocalAccountHost, type GameIdentity } from '../../lib/client';

export function AccountSettings({ identity }: { identity: GameIdentity }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const account = identity.kind === 'account';
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
    if (
      !account &&
      !window.confirm(
        'Thoát hồ sơ guest sẽ mất quyền truy cập tiến trình này trên trình duyệt. Bạn có thể nâng cấp tài khoản trước khi thoát.',
      )
    )
      return;
    void run(async () => {
      await api(all ? '/auth/logout-all' : '/auth/logout', {});
      authChanged();
      router.replace('/');
    });
  };
  return (
    <Card>
      <h2>Tài khoản</h2>
      {account ? (
        <>
          <p>
            {identity.email} · {identity.role === 'ADMIN' ? 'Admin' : 'Player'}
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                if (Array.from(password).length < 15 || Array.from(password).length > 128)
                  throw new Error('Mật khẩu phải dài 15–128 ký tự.');
                if (password !== confirmation) throw new Error('Hai mật khẩu chưa khớp.');
                await api('/auth/password/change', { currentPassword, password });
                setCurrentPassword('');
                setPassword('');
                setConfirmation('');
                authChanged();
                setMessage('Đã đổi mật khẩu và đăng xuất các phiên cũ.');
              });
            }}
          >
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
            <label htmlFor="new-password">Mật khẩu mới</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              maxLength={256}
              required
            />
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
            <Button type="submit" disabled={busy}>
              Đổi mật khẩu
            </Button>
          </form>
        </>
      ) : (
        <p>
          {typeof window !== 'undefined' && isLocalAccountHost() ? (
            <Link href="/register">Nâng cấp thành tài khoản và giữ tiến trình</Link>
          ) : (
            'Nâng cấp tài khoản hiện được hỗ trợ trên localhost.'
          )}
        </p>
      )}
      <div className="actions">
        <Button variant="outline" disabled={busy} onClick={() => logout(false)}>
          {account ? 'Đăng xuất' : 'Thoát hồ sơ guest'}
        </Button>
        {account && (
          <Button variant="ghost" disabled={busy} onClick={() => logout(true)}>
            Đăng xuất mọi thiết bị
          </Button>
        )}
      </div>
      {message && <p role="status">{message}</p>}
    </Card>
  );
}
