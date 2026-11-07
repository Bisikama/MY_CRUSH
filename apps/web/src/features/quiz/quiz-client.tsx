'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';
import { Button, Card } from '@duoquest/ui';
import type {
  ActionReceipt,
  ClientToServerEvents,
  GameLayout,
  GameMode,
  PackSummary,
  QuizAction,
  RoomView,
  ServerToClientEvents,
} from '@duoquest/shared-types';
import {
  actionId,
  api,
  apiOrigin,
  copyText,
  loadIdentity,
  onAuthChanged,
  authChanged,
  type GameIdentity,
  request,
  roomStorageKey,
} from '../../lib/client';
import { QuizSetup } from './quiz-setup';
import { QuizStage } from './quiz-stage';
import { useRoomStore } from '../../stores/room.store';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Có lỗi xảy ra');

export function QuizClient({ code }: { code?: string }) {
  const router = useRouter();
  const { room, connected, setRoom, setConnected } = useRoomStore();
  const [identity, setIdentity] = useState<GameIdentity | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [nickname, setNickname] = useState('');
  const [secondNickname, setSecondNickname] = useState('Người chơi 2');
  const [mode, setMode] = useState<GameMode>('SOLO');
  const [layout, setLayout] = useState<GameLayout>('MULTI_DEVICE');
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [packId, setPackId] = useState('');
  const [joinCode, setJoinCode] = useState(code ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  const [clockOffset, setClockOffset] = useState(0);
  const [resumeCode, setResumeCode] = useState<string | null>(null);
  const socketRef = useRef<GameSocket | null>(null);
  const activeRoom = room && room.code === code ? room : null;

  const acceptRoom = useCallback(
    (view: RoomView) => {
      if (view.game) setClockOffset(view.game.serverNow - Date.now());
      if (identity) {
        if (view.status === 'CANCELLED') localStorage.removeItem(roomStorageKey(identity.playerId));
        else localStorage.setItem(roomStorageKey(identity.playerId), view.code);
      }
      setResumeCode(view.status === 'CANCELLED' ? null : view.code);
      setRoom(view);
    },
    [identity, setRoom],
  );

  function clearRoom() {
    if (identity) localStorage.removeItem(roomStorageKey(identity.playerId));
    setResumeCode(null);
    setRoom(null);
    router.push('/');
  }

  async function leaveRoom(targetCode: string) {
    const socket = socketRef.current;
    if (socket)
      await run(async () => {
        await request<null>((ack) => socket.emit('room:leave', { code: targetCode }, ack));
        clearRoom();
      });
  }

  useEffect(() => {
    let live = true;
    const refresh = () => {
      void loadIdentity()
        .then((value) => {
          if (live) setIdentity(value);
        })
        .catch(() => {
          if (live) setError('Không thể tải phiên chơi. Hãy kiểm tra API và tải lại trang.');
        })
        .finally(() => {
          if (live) setHydrated(true);
        });
    };
    refresh();
    const unsubscribe = onAuthChanged(refresh);
    return () => {
      live = false;
      unsubscribe();
    };
  }, []);
  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    if (!identity) return;
    let cancelled = false;
    void api<PackSummary[]>('/question-packs')
      .then((data) => {
        if (!cancelled) {
          setPacks(data);
          setPackId((id) => id || data[0]?.id || '');
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(errorText(cause));
      });
    const socket: GameSocket = io(apiOrigin(), {
      withCredentials: true,
      autoConnect: false,
    });
    socketRef.current = socket;
    const accept = acceptRoom;
    socket.on('room:state', accept);
    socket.on('connect', () => {
      setConnected(true);
      setError('');
      if (code)
        void request<RoomView>((ack) => socket.emit('room:sync', { code }, ack))
          .then(accept)
          .catch((cause: unknown) => setError(errorText(cause)));
      else {
        const savedCode = localStorage.getItem(roomStorageKey(identity.playerId));
        if (savedCode)
          socket.emit('room:sync', { code: savedCode }, (result) => {
            if (result.ok) accept(result.data);
            else if (result.error.code === 'NOT_FOUND' || result.error.code === 'FORBIDDEN') {
              localStorage.removeItem(roomStorageKey(identity.playerId));
              setResumeCode(null);
            }
          });
      }
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (cause) => {
      setConnected(false);
      setError(
        cause.message === 'UNAUTHORIZED'
          ? 'Phiên chơi không hợp lệ. Hãy đăng nhập hoặc tạo guest mới.'
          : 'Không kết nối được API. Kiểm tra host, cổng 4000 và WEB_ORIGINS.',
      );
    });
    socket.connect();
    return () => {
      cancelled = true;
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [identity, code, acceptRoom, setConnected]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  const sendAction = useCallback(
    async (playerId: string, payload: QuizAction) => {
      const socket = socketRef.current;
      const currentRoom = useRoomStore.getState().room;
      if (!socket?.connected || !currentRoom?.game || !code) return;
      const game = currentRoom.game;
      await run(async () => {
        await request<ActionReceipt>((ack) =>
          socket.emit(
            'game:action',
            {
              code,
              sessionId: game.sessionId,
              roundId: game.roundId,
              actionId: actionId(),
              playerId,
              payload,
            },
            ack,
          ),
        );
      });
    },
    [code, run],
  );
  useEffect(() => {
    if (!activeRoom || activeRoom.mode !== 'DUEL' || activeRoom.layout !== 'SHARED_SCREEN') return;
    const onKey = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        /INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement)?.tagName)
      )
        return;
      const index = event.code === 'KeyA' ? 0 : event.code === 'KeyL' ? 1 : -1;
      const id = activeRoom.controlledPlayerIds[index];
      if (
        id &&
        activeRoom.game?.phase === 'QUESTION' &&
        !activeRoom.game.buzzerPlayerId &&
        !activeRoom.game.answeredPlayerIds.includes(id)
      ) {
        event.preventDefault();
        void sendAction(id, { type: 'BUZZ' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeRoom, sendAction]);

  async function createIdentity() {
    await run(async () => {
      const guest = await api<GameIdentity>('/players/guest', { nickname });
      authChanged();
      setIdentity(guest);
    });
  }
  async function createRoom() {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    await run(async () => {
      const view = await request<RoomView>((ack) =>
        socket.emit(
          'room:create',
          {
            mode,
            layout,
            packVersionId: packId,
            ...(layout === 'SHARED_SCREEN' && mode !== 'SOLO' ? { secondNickname } : {}),
          },
          ack,
        ),
      );
      acceptRoom(view);
      router.push(`/play/${view.code}`);
    });
  }
  async function joinRoom() {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    await run(async () => {
      const view = await request<RoomView>((ack) =>
        socket.emit('room:join', { code: joinCode.trim().toUpperCase() }, ack),
      );
      acceptRoom(view);
      router.push(`/play/${view.code}`);
    });
  }
  async function roomCommand(event: 'room:ready' | 'match:start' | 'room:rematch' | 'room:sync') {
    const socket = socketRef.current;
    if (!socket?.connected || !code) return;
    await run(async () => {
      const view = await request<RoomView>((ack) => socket.emit(event, { code }, ack));
      acceptRoom(view);
    });
  }

  if (!hydrated)
    return (
      <div className="empty-state" role="status">
        Đang chuẩn bị sân chơi…
      </div>
    );
  const notice = error && (
    <div className="notice" role="alert">
      {error}
    </div>
  );
  if (!identity)
    return (
      <div className="welcome-grid">
        <div>
          <p className="eyebrow">HỌC • CHƠI • KẾT NỐI</p>
          <h1>
            Kiến thức vui hơn
            <br />
            khi có <em>bạn chơi.</em>
          </h1>
          <p className="lead">
            Một bộ câu hỏi. Nhiều cách khám phá. Chọn tên của bạn để bắt đầu một vòng Quiz Battle.
          </p>
          <div className="intro-art" aria-hidden="true">
            <span>?</span>
            <i>✦</i>
            <b>A</b>
            <small>+ kiến thức mới</small>
          </div>
        </div>
        <Card className="guest-card">
          <span className="tag">CHÀO NGƯỜI CHƠI MỚI</span>
          <h2>Bạn muốn được gọi là gì?</h2>
          <p>Tạo hồ sơ khách trên máy này để chơi và lưu kết quả.</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void createIdentity();
            }}
          >
            <label htmlFor="nickname">Biệt danh</label>
            <input
              id="nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              minLength={2}
              maxLength={30}
              required
              placeholder="Ví dụ: Mèo ham học"
            />
            <Button disabled={busy} type="submit">
              {busy ? 'Đang tạo…' : 'Vào sân chơi →'}
            </Button>
          </form>
          {notice}
          <p className="small muted">
            Hồ sơ khách gắn với trình duyệt. Chưa hỗ trợ đăng nhập hoặc khôi phục tài khoản.
          </p>
        </Card>
      </div>
    );

  if (!code)
    return (
      <QuizSetup
        identity={identity}
        resumeCode={resumeCode}
        mode={mode}
        setMode={setMode}
        layout={layout}
        setLayout={setLayout}
        packs={packs}
        packId={packId}
        setPackId={setPackId}
        secondNickname={secondNickname}
        setSecondNickname={setSecondNickname}
        joinCode={joinCode}
        setJoinCode={setJoinCode}
        busy={busy}
        connected={connected}
        notice={notice}
        createRoom={createRoom}
        joinRoom={joinRoom}
        leaveRoom={leaveRoom}
      />
    );

  if (!activeRoom)
    return (
      <Card className="narrow">
        <p className="eyebrow">PHÒNG {code}</p>
        <h1>Hẹn bạn ở đây.</h1>
        <p>Đồng bộ phòng đã tham gia hoặc nhận chỗ trong phòng qua mã mời.</p>
        {notice}
        <div className="actions">
          <Button disabled={busy || !connected} onClick={() => void joinRoom()}>
            Tham gia phòng
          </Button>
          <Button
            variant="outline"
            disabled={busy || !connected}
            onClick={() => void roomCommand('room:sync')}
          >
            Đồng bộ lại
          </Button>
          <Button variant="ghost" onClick={clearRoom}>
            Về sân chơi
          </Button>
        </div>
      </Card>
    );

  return (
    <QuizStage
      activeRoom={activeRoom}
      connected={connected}
      busy={busy}
      now={now}
      clockOffset={clockOffset}
      identityPlayerId={identity.playerId}
      notice={notice}
      onCopy={() => run(() => copyText(`${window.location.origin}/play/${code}`))}
      onLeave={() => leaveRoom(code)}
      onHome={clearRoom}
      onCommand={roomCommand}
      onAction={sendAction}
    />
  );
}
