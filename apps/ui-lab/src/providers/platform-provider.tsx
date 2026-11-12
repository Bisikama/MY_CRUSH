'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  createRoomSchema,
  nicknameSchema,
  QUIZ_SKILLS,
  type CreateRoomInput,
  type GameActionCommand,
  type Question,
  type RoomView,
} from '@duoquest/shared-types';
import { shouldConfirmLeaveOnNavigation } from '../features/hub/room-banner.utils';
import { actionId, api, authChanged, onAuthChanged, type GameIdentity } from '../lib/client';
import { labData, playerTwoId, recordLabResult, skillStock } from '../mock/data';
import { LabMatch, labRoomCode, labScenes, type LabScene, type RoomCommand } from '../mock/match';
import { imageSceneQuestion, sceneQuestions, selectLabQuestions } from '../mock/packs';
import { useRoomStore } from '../stores/room.store';

const closedDialog = { open: false, code: '', targetHref: '', busy: false, error: '' };

function useMockPlatform() {
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [identity, setIdentity] = useState<GameIdentity | null>(null);
  const [leaveConfirm, setLeaveConfirm] = useState(closedDialog);
  const [lastScene, setLastScene] = useState<LabScene | null>(null);
  const [pendingScene, setPendingScene] = useState<{ scene: LabScene; match: LabMatch } | null>(
    null,
  );
  const match = useRef<LabMatch | null>(null);
  const preview = useRef(false);
  const trusted = useRef(true);
  const sceneTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { room, currentRoom, connected } = useRoomStore();

  function refreshIdentity() {
    setIdentity(labData.identity);
  }

  const publish = useCallback((now = Date.now()) => {
    const view = match.current?.view(now) ?? null;
    const store = useRoomStore.getState();
    if (view?.game?.result && !preview.current) {
      const playerIds =
        view.layout === 'SHARED_SCREEN'
          ? [view.hostPlayerId]
          : view.players.map(({ playerId }) => playerId);
      recordLabResult(view.game.result, playerIds, trusted.current, now);
    }
    store.setRoom(view);
    store.setConnected(!!match.current?.isConnected);
    return view;
  }, []);

  useEffect(() => {
    refreshIdentity();
    setHydrated(true);
    const unsubscribe = onAuthChanged(refreshIdentity);
    const timer = setInterval(() => {
      const now = Date.now();
      if (sceneTimer.current === undefined && match.current?.tick(now)) publish(now);
    }, 80);
    return () => {
      unsubscribe();
      clearInterval(timer);
      clearTimeout(sceneTimer.current);
      sceneTimer.current = undefined;
    };
  }, [publish]);

  useEffect(() => {
    if (!pendingScene || pathname !== '/play/' + labRoomCode) return;
    const { scene, match: sceneMatch } = pendingScene;
    const delay = 450;
    const now = Date.now();
    sceneMatch.prepareScene(scene, now, delay);
    sceneTimer.current = setTimeout(() => {
      sceneTimer.current = undefined;
      const time = Date.now();
      sceneMatch.playScene(scene, time);
      setPendingScene(null);
      publish(time);
    }, delay);
    publish(now);
    return () => {
      clearTimeout(sceneTimer.current);
      sceneTimer.current = undefined;
    };
  }, [pathname, pendingScene, publish]);

  function buildMatch(
    input: Pick<CreateRoomInput, 'mode' | 'layout' | 'secondNickname'>,
    host: GameIdentity,
    questions: Question[],
    setup?: RoomView['setup'],
  ) {
    const layout = input.mode === 'SOLO' ? 'MULTI_DEVICE' : input.layout;
    const second = layout === 'SHARED_SCREEN' ? 'Người chơi 2' : 'An Demo';
    const players = [{ playerId: host.playerId, nickname: host.nickname }];
    if (input.mode !== 'SOLO') {
      players.push({ playerId: playerTwoId, nickname: input.secondNickname ?? second });
    }
    clearTimeout(sceneTimer.current);
    sceneTimer.current = undefined;
    const previewStock = preview.current
      ? new Map(players.map(({ playerId }) => [playerId, skillStock(playerId)]))
      : null;
    match.current = new LabMatch({
      mode: input.mode,
      layout,
      players,
      questions,
      setup,
      sessionId: actionId,
      stock: (id) =>
        (id === playerTwoId && layout === 'SHARED_SCREEN') ||
        (id === host.playerId && host.kind === 'guest')
          ? {}
          : (previewStock?.get(id) ?? skillStock(id)),
      consume: (id, skill) => {
        if (previewStock) {
          const stock = previewStock.get(id)!;
          stock[skill] = (stock[skill] ?? 0) - 1;
          return;
        }
        const items = labData.progress[id]!.items;
        const itemId = QUIZ_SKILLS[skill].id;
        items[itemId] = (items[itemId] ?? 0) - 1;
      },
    });
  }

  function requireMatch(code: string) {
    if (!match.current || code !== labRoomCode) throw new Error('Không tìm thấy phòng mẫu.');
    return match.current;
  }

  async function createGuest(nickname: string) {
    const guest = await api<GameIdentity>('/players/guest', {
      nickname: nicknameSchema.parse(nickname),
    });
    authChanged();
    return guest;
  }

  async function createRoom(input: CreateRoomInput) {
    const host = labData.identity;
    if (!host) throw new Error('Hãy chọn hồ sơ để chơi.');
    if (match.current) throw new Error('Hãy rời phòng đang mở trước.');
    const validated = createRoomSchema.parse(input);
    const { questions, setup, trusted: trustedPack } = selectLabQuestions(labData.packs, validated);
    trusted.current = trustedPack;
    preview.current = false;
    setLastScene(null);
    buildMatch(validated, host, questions, setup);
    return publish()!;
  }

  async function joinRoom(code: string) {
    const host = labData.identity;
    if (code !== labRoomCode || !host) throw new Error('Mã phòng mẫu là LAB222.');
    if (!match.current) {
      const input = {
        mode: 'DUEL',
        layout: 'MULTI_DEVICE',
        selection: { type: 'CASUAL_RANDOM' },
      } as const;
      const { questions, setup } = selectLabQuestions(labData.packs, input);
      trusted.current = true;
      preview.current = false;
      setLastScene(null);
      buildMatch(input, host, questions, setup);
    }
    match.current!.switchPlayer(1);
    return publish()!;
  }

  async function roomCommand(code: string, event: RoomCommand) {
    const now = Date.now();
    requireMatch(code).command(event, now);
    return publish(now)!;
  }

  async function sendGameAction(command: GameActionCommand) {
    const now = Date.now();
    const receipt = requireMatch(command.code).action(command, now);
    publish(now);
    return receipt;
  }

  function clearRoom() {
    clearTimeout(sceneTimer.current);
    sceneTimer.current = undefined;
    setPendingScene(null);
    match.current = null;
    useRoomStore.getState().resetRoomState();
  }

  async function leaveRoomImmediate(code: string, targetHref?: string) {
    requireMatch(code);
    clearRoom();
    if (targetHref) router.push(targetHref);
  }

  async function requestLeaveRoom(code: string, targetHref = '/play') {
    if (useRoomStore.getState().room?.status === 'IN_PROGRESS') {
      setLeaveConfirm({ ...closedDialog, open: true, code, targetHref });
    } else {
      await leaveRoomImmediate(code, targetHref);
    }
  }

  function navigateSafely(href: string) {
    const current = useRoomStore.getState().room;
    if (current && shouldConfirmLeaveOnNavigation(pathname, href, current.status, current.code)) {
      setLeaveConfirm({ ...closedDialog, open: true, code: current.code, targetHref: href });
      return;
    }
    router.push(href);
  }

  async function confirmLeaveAndNavigate() {
    try {
      await leaveRoomImmediate(leaveConfirm.code, leaveConfirm.targetHref);
      setLeaveConfirm(closedDialog);
    } catch (error) {
      setLeaveConfirm((state) => ({
        ...state,
        error: error instanceof Error ? error.message : 'Không thể rời phòng.',
      }));
    }
  }

  function openScene(scene: LabScene) {
    const host = labData.identity ?? labData.account;
    if (!labData.identity) {
      labData.identity = host;
      authChanged();
    }
    preview.current = true;
    const questions =
      scene === 'image'
        ? [imageSceneQuestion]
        : scene === 'result'
          ? sceneQuestions.slice(0, 1)
          : sceneQuestions;
    buildMatch(labScenes[scene], host, questions);
    setPendingScene(scene === 'lobby' ? null : { scene, match: match.current! });
    setLastScene(scene);
    setLeaveConfirm(closedDialog);
    if (pathname !== '/play/' + labRoomCode) router.push('/play/' + labRoomCode);
    publish();
  }

  const profile = identity ? labData.progress[identity.playerId] : null;
  return {
    hydrated,
    localHost: true,
    identity,
    identityError: '',
    room,
    currentRoom,
    connected: room ? connected : !!identity,
    clockOffset: 0,
    leaveConfirm,
    lastScene,
    previewPending: pendingScene !== null,
    walletBalance: profile?.balance ?? null,
    xp: profile?.xp ?? null,
    profileStatus: profile ? ('ready' as const) : ('idle' as const),
    async retryIdentity() {
      refreshIdentity();
    },
    async refreshProfile() {
      setIdentity(labData.identity && { ...labData.identity });
    },
    createGuest,
    createRoom,
    joinRoom,
    roomCommand,
    sendGameAction,
    requestLeaveRoom,
    navigateSafely,
    confirmLeaveAndNavigate,
    cancelLeaveConfirm: () => setLeaveConfirm(closedDialog),
    async logoutSession(all?: boolean) {
      await api(all ? '/auth/logout-all' : '/auth/logout', {});
      authChanged();
      router.replace('/');
    },
    clearLocalRoomAndGoPlay: () => router.push('/play'),
    canSwitch: match.current?.canSwitch ?? false,
    perspective: match.current?.activePerspective ?? 0,
    switchPlayer(index: 0 | 1) {
      match.current?.switchPlayer(index);
      publish();
    },
    toggleConnection() {
      match.current?.toggleConnection();
      publish();
    },
    openScene,
  };
}

type PlatformContextValue = ReturnType<typeof useMockPlatform>;
const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  return <PlatformContext.Provider value={useMockPlatform()}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (!context) throw new Error('usePlatform must be used within a PlatformProvider');
  return context;
}
