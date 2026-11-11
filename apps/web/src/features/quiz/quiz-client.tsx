'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@duoquest/ui';
import {
  matchesQuestion,
  type QuizSelection,
  type CasualCustomSelection,
  type CasualCatalog,
  type QuestionFilter,
  type GameLayout,
  type GameMode,
  type PackSummary,
  type QuizAction,
} from '@duoquest/shared-types';
import { actionId, api, copyText } from '../../lib/client';
import type { KnowledgeTypeFilter } from '../../lib/knowledge-type';
import { usePlatform } from '../../providers/platform-provider';
import { useRoomStore } from '../../stores/room.store';
import { QuizSetup } from './quiz-setup';
import { QuizStage } from './quiz-stage';

const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Có lỗi xảy ra');

export function QuizClient({ code }: { code?: string }) {
  const router = useRouter();
  const {
    hydrated,
    localHost,
    identity,
    identityError,
    room,
    currentRoom,
    connected,
    clockOffset,
    createGuest,
    createRoom: platformCreateRoom,
    joinRoom: platformJoinRoom,
    roomCommand: platformRoomCommand,
    requestLeaveRoom,
    sendGameAction,
    clearLocalRoomAndGoPlay,
  } = usePlatform();

  const [nickname, setNickname] = useState('');
  const [secondNickname, setSecondNickname] = useState('Người chơi 2');
  const [mode, setMode] = useState<GameMode>('SOLO');
  const [layout, setLayout] = useState<GameLayout>('MULTI_DEVICE');
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [packId, setPackId] = useState('');
  const [filter, setFilter] = useState<QuestionFilter>({});
  const [selectionType, setSelectionType] = useState<QuizSelection['type']>('CASUAL_RANDOM');
  const [casualCatalog, setCasualCatalog] = useState<CasualCatalog>([]);
  const [casualSelection, setCasualSelection] = useState<CasualCustomSelection>({
    type: 'CASUAL_CUSTOM',
    categories: [],
    topics: [],
    difficulty: 'mixed',
  });
  const [knowledgeType, setKnowledgeType] = useState<KnowledgeTypeFilter>('all');
  const visiblePacks = packs.filter(
    (pack) => knowledgeType === 'all' || (pack.knowledgeType ?? 'unclassified') === knowledgeType,
  );
  const eligiblePack = visiblePacks.find(
    (pack) =>
      pack.id === packId &&
      pack.groups.some((group) => matchesQuestion(pack.category, group, filter)),
  );
  const [joinCode, setJoinCode] = useState(code ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);

  const activeRoom = room && room.code === code ? room : null;
  const resumeCode = currentRoom?.code ?? null;

  useEffect(() => {
    if (code) setJoinCode(code);
  }, [code]);

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
    return () => {
      cancelled = true;
    };
  }, [identity]);

  useEffect(() => {
    if (!identity) return;
    let cancelled = false;
    void api<CasualCatalog>('/question-packs/casual-catalog')
      .then((data) => {
        if (!cancelled) setCasualCatalog(data);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(errorText(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [identity]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  const sendAction = useCallback(
    async (playerId: string, payload: QuizAction) => {
      const currentRoomView = useRoomStore.getState().room;
      if (!connected || !currentRoomView?.game || !code) return;
      const game = currentRoomView.game;
      await run(async () => {
        await sendGameAction({
          code,
          sessionId: game.sessionId,
          roundId: game.roundId,
          actionId: actionId(),
          playerId,
          payload,
        });
      });
    },
    [code, connected, run, sendGameAction],
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
      await createGuest(nickname);
    });
  }

  async function handleCreateRoom() {
    if (selectionType === 'STUDY' && !eligiblePack) return;
    await run(async () => {
      const selection: QuizSelection =
        selectionType === 'STUDY'
          ? { type: 'STUDY', packVersionId: eligiblePack!.id, filter }
          : selectionType === 'CASUAL_RANDOM'
            ? { type: 'CASUAL_RANDOM' }
            : casualSelection;
      const view = await platformCreateRoom({
        mode,
        layout: mode === 'SOLO' ? 'MULTI_DEVICE' : layout,
        selection,
        ...(layout === 'SHARED_SCREEN' && mode !== 'SOLO' ? { secondNickname } : {}),
      });
      router.push(`/play/${view.code}`);
    });
  }

  async function handleJoinRoom() {
    await run(async () => {
      const view = await platformJoinRoom(joinCode);
      router.push(`/play/${view.code}`);
    });
  }

  async function handleRoomCommand(
    event: 'room:ready' | 'match:start' | 'room:rematch' | 'room:sync',
  ) {
    if (!code) return;
    await run(async () => {
      await platformRoomCommand(code, event);
    });
  }

  async function handleLeaveRoom(targetCode: string) {
    await run(async () => {
      await requestLeaveRoom(targetCode, '/play');
    });
  }

  if (!hydrated)
    return (
      <div className="empty-state" role="status">
        Đang chuẩn bị sân chơi…
      </div>
    );

  const combinedError = error || identityError;
  const notice = combinedError && (
    <div className="notice" role="alert">
      {combinedError}
    </div>
  );

  if (!identity)
    return (
      <div className="welcome-grid">
        <div>
          <p className="eyebrow">HỌC • CHƠI • KẾT NỐI</p>
          <h1>
            Một câu đố nhỏ
            <br />
            cho <em>hai người.</em>
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
          <p>
            {code
              ? `Tạo hồ sơ khách để tiếp tục vào phòng mời ${code}.`
              : 'Tạo hồ sơ khách trên máy này để chơi Solo, Duel, Co-op và lưu kết quả.'}
          </p>
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
          {localHost && (
            <div className="guest-auth-links">
              <Link href="/register" className="guest-auth-primary-link">
                Tạo tài khoản để giữ tiến trình
              </Link>
              <span>·</span>
              <Link href="/login" className="guest-auth-secondary-link">
                Đăng nhập
              </Link>
            </div>
          )}
          <p className="small muted">
            Hồ sơ khách gắn với trình duyệt hiện tại. Trên localhost, bạn có thể tạo tài khoản để
            giữ tiến trình; không hỗ trợ khôi phục khách nếu đã xóa cookie.
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
        selectionType={selectionType}
        setSelectionType={setSelectionType}
        casualCatalog={casualCatalog}
        casualSelection={casualSelection}
        setCasualSelection={setCasualSelection}
        packs={visiblePacks}
        hasUnclassifiedPacks={packs.some((pack) => !pack.knowledgeType)}
        knowledgeType={knowledgeType}
        setKnowledgeType={(next) => {
          setKnowledgeType(next);
          setFilter({ difficulty: filter.difficulty });
          setPackId('');
        }}
        packId={packId}
        setPackId={setPackId}
        filter={filter}
        setFilter={(next) => {
          setFilter(next);
          if (
            !visiblePacks.some(
              (pack) =>
                pack.id === packId &&
                pack.groups.some((group) => matchesQuestion(pack.category, group, next)),
            )
          )
            setPackId('');
        }}
        secondNickname={secondNickname}
        setSecondNickname={setSecondNickname}
        joinCode={joinCode}
        setJoinCode={setJoinCode}
        busy={busy}
        connected={connected}
        notice={notice}
        createRoom={handleCreateRoom}
        joinRoom={handleJoinRoom}
        leaveRoom={handleLeaveRoom}
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
          <Button disabled={busy || !connected} onClick={() => void handleJoinRoom()}>
            Tham gia phòng
          </Button>
          <Button
            variant="outline"
            disabled={busy || !connected}
            onClick={() => void handleRoomCommand('room:sync')}
          >
            Đồng bộ lại
          </Button>
          <Button variant="ghost" onClick={clearLocalRoomAndGoPlay}>
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
      onLeave={() => handleLeaveRoom(code)}
      onHome={clearLocalRoomAndGoPlay}
      onCommand={handleRoomCommand}
      onAction={sendAction}
    />
  );
}
