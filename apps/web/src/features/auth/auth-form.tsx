'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card } from '@duoquest/ui';
import {
  api,
  ApiError,
  authChanged,
  isLocalAccountHost,
  loadIdentity,
  type GameIdentity,
} from '../../lib/client';

type Flow = {
  challengeId: string;
  email: string;
  verified: boolean;
  resendAt: string;
};
type Mode = 'register' | 'login' | 'reset';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [local, setLocal] = useState(false);
  const [identity, setIdentity] = useState<GameIdentity | null>(null);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [now, setNow] = useState(0);
  const path = mode === 'reset' ? '/auth/password-reset' : '/auth/register';
  const title = { register: 'Tạo tài khoản', login: 'Đăng nhập', reset: 'Đặt lại mật khẩu' }[mode];

  useEffect(() => {
    let alive = true;
    const hostIsLocal = isLocalAccountHost();
    setLocal(hostIsLocal);
    if (!hostIsLocal) {
      setLoaded(true);
      return;
    }
    void (async () => {
      const user = await loadIdentity();
      if (!alive) return;
      setIdentity(user);
      setNickname(user?.nickname ?? '');
      if (mode !== 'login') {
        const saved = await api<{ register: Flow | null; reset: Flow | null }>('/auth/flow');
        if (!alive) return;
        const active = mode === 'reset' ? saved.reset : saved.register;
        setFlow(active);
        if (active) setEmail(active.email);
      }
    })()
      .catch((cause: unknown) => {
        if (alive) setError(cause instanceof Error ? cause.message : 'Không thể tải phiên.');
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [mode]);

  useEffect(() => {
    if (!flow || flow.verified) return;
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, [flow]);
  const remaining =
    flow && now ? Math.max(0, Math.ceil((Date.parse(flow.resendAt) - now) / 1000)) : 0;

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError('');
    setRegistered(false);
    try {
      await task();
    } catch (cause) {
      setRegistered(cause instanceof ApiError && cause.code === 'EMAIL_ALREADY_REGISTERED');
      setError(cause instanceof Error ? cause.message : 'Không thể hoàn thành yêu cầu.');
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      if (mode === 'login') {
        if (
          identity?.kind === 'guest' &&
          !window.confirm(
            'Đăng nhập sẽ thoát hồ sơ guest hiện tại. Tiến trình guest sẽ không chuyển vào tài khoản này. Tiếp tục?',
          )
        )
          return;
        await api('/auth/login', { email, password });
        authChanged();
        router.replace('/');
      } else if (!flow) {
        setFlow(await api<Flow>(path + '/start', { email }));
        setNow(Date.now());
      } else if (!flow.verified) {
        setFlow(await api<Flow>(path + '/verify', { challengeId: flow.challengeId, code }));
        setCode('');
      } else {
        if (Array.from(password).length < 15 || Array.from(password).length > 128)
          throw new Error('Mật khẩu phải dài 15–128 ký tự.');
        if (password !== confirmation) throw new Error('Hai mật khẩu chưa khớp.');
        await api(path + '/complete', {
          challengeId: flow.challengeId,
          password,
          ...(mode === 'register' ? { nickname } : {}),
        });
        setPassword('');
        setConfirmation('');
        authChanged();
        if (mode === 'register') router.replace('/');
        else setDone(true);
      }
    });
  }

  return (
    <div className="narrow">
      <Card className="guest-card">
        <h1>{title}</h1>
        {!loaded ? (
          <p role="status">Đang tải phiên…</p>
        ) : !local ? (
          <p>
            Đăng nhập tài khoản hiện dùng trên localhost. <Link href="/">Chơi dưới dạng khách</Link>{' '}
            trên máy này.
          </p>
        ) : done ? (
          <p>
            Mật khẩu đã được đặt lại. <Link href="/login">Đăng nhập</Link> để tiếp tục.
          </p>
        ) : identity?.kind === 'account' && mode !== 'reset' ? (
          <p>
            Bạn đang đăng nhập với email {identity.email}. <Link href="/profile">Mở hồ sơ</Link>.
          </p>
        ) : (
          <>
            {mode !== 'login' && (
              <p className="small muted">Bước {flow?.verified ? 3 : flow ? 2 : 1} / 3</p>
            )}
            {identity?.kind === 'guest' && mode === 'register' && (
              <p>Đăng ký sẽ giữ tiến trình của hồ sơ {identity.nickname}.</p>
            )}
            <form onSubmit={submit}>
              {!flow || mode === 'login' ? (
                <>
                  <label htmlFor="auth-email">Email</label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </>
              ) : (
                <p>{flow.email}</p>
              )}
              {flow && !flow.verified && (
                <>
                  <p>
                    {mode === 'reset'
                      ? 'Nếu có tài khoản với email này, mã sẽ được gửi tới hộp thư của bạn.'
                      : 'Mã xác minh đã được gửi. Hãy kiểm tra hộp thư.'}
                  </p>
                  <label htmlFor="auth-code">Mã xác minh 6 số</label>
                  <input
                    id="auth-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ''))}
                    required
                  />
                </>
              )}
              {flow?.verified && mode === 'register' && (
                <>
                  <label htmlFor="auth-nickname">Nickname</label>
                  <input
                    id="auth-nickname"
                    autoComplete="nickname"
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    minLength={2}
                    maxLength={30}
                    required
                  />
                </>
              )}
              {(mode === 'login' || flow?.verified) && (
                <>
                  <label htmlFor="auth-password">Mật khẩu</label>
                  <input
                    id="auth-password"
                    type="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    maxLength={256}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  {mode !== 'login' && (
                    <>
                      <p className="small muted">Dùng cụm từ dễ nhớ, ít nhất 15 ký tự.</p>
                      <label htmlFor="auth-confirm">Xác nhận mật khẩu</label>
                      <input
                        id="auth-confirm"
                        type="password"
                        autoComplete="new-password"
                        maxLength={256}
                        value={confirmation}
                        onChange={(event) => setConfirmation(event.target.value)}
                        required
                      />
                    </>
                  )}
                </>
              )}
              <Button disabled={busy} type="submit">
                {busy
                  ? 'Đang xử lý…'
                  : mode === 'login'
                    ? 'Đăng nhập'
                    : !flow
                      ? 'Gửi mã'
                      : !flow.verified
                        ? 'Xác minh mã'
                        : mode === 'register'
                          ? 'Tạo tài khoản'
                          : 'Lưu mật khẩu'}
              </Button>
            </form>
            {flow && (
              <div className="actions">
                {!flow.verified && (
                  <Button
                    variant="outline"
                    disabled={busy || remaining > 0}
                    onClick={() =>
                      void run(async () => {
                        setFlow(
                          await api<Flow>(path + '/resend', { challengeId: flow.challengeId }),
                        );
                        setNow(Date.now());
                        setCode('');
                      })
                    }
                  >
                    {remaining > 0 ? 'Gửi lại sau ' + remaining + ' giây' : 'Gửi lại mã'}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await api('/auth/flow/cancel', {
                        purpose: mode === 'reset' ? 'RESET_PASSWORD' : 'REGISTER',
                      });
                      setFlow(null);
                      setCode('');
                      setPassword('');
                      setConfirmation('');
                    })
                  }
                >
                  Đổi email
                </Button>
              </div>
            )}
            {(mode === 'login' || registered) && (
              <p>
                <Link href="/forgot-password">Quên mật khẩu?</Link>
              </p>
            )}
            <p>
              {mode === 'login' ? (
                <Link href="/register">Tạo tài khoản</Link>
              ) : (
                <Link href="/login">Về đăng nhập</Link>
              )}
            </p>
          </>
        )}
        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
      </Card>
    </div>
  );
}
