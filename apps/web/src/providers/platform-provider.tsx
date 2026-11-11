'use client';

import type { CreateRoomInput } from '@duoquest/shared-types';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';
import type {
  ActionReceipt,
  ClientToServerEvents,
  CurrentRoomResponse,
  CurrentRoomSummary,
  GameActionCommand,
  RoomView,
  ServerToClientEvents,
} from '@duoquest/shared-types';
import {
  api,
  ApiError,
  apiOrigin,
  authChanged,
  isLocalAccountHost,
  loadIdentity,
  onAuthChanged,
  request,
  roomStorageKey,
  type GameIdentity,
} from '../lib/client';
import { useRoomStore } from '../stores/room.store';
import {
  createSequenceGuard,
  createRoomRequestGuard,
  shouldConfirmLeaveOnNavigation,
} from '../features/hub/room-banner.utils';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type ProfileLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ProfileSummary {
  nickname: string;
  xp: number;
  wallet: { balance: number } | null;
}

export interface LeaveConfirmState {
  open: boolean;
  code: string;
  targetHref: string;
  busy: boolean;
  error: string;
}

export interface PlatformContextValue {
  hydrated: boolean;
  localHost: boolean;
  identity: GameIdentity | null;
  identityError: string;
  walletBalance: number | null;
  xp: number | null;
  profileStatus: ProfileLoadStatus;
  room: RoomView | null;
  currentRoom: CurrentRoomSummary | null;
  connected: boolean;
  clockOffset: number;
  leaveConfirm: LeaveConfirmState;
  retryIdentity: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshCurrentRoom: () => Promise<CurrentRoomSummary | null>;
  createGuest: (nickname: string) => Promise<GameIdentity>;
  createRoom: (input: CreateRoomInput) => Promise<RoomView>;
  joinRoom: (code: string) => Promise<RoomView>;
  roomCommand: (
    code: string,
    event: 'room:ready' | 'match:start' | 'room:rematch' | 'room:sync',
  ) => Promise<RoomView>;
  leaveRoomImmediate: (code: string, targetHref?: string) => Promise<void>;
  requestLeaveRoom: (code: string, targetHref?: string) => Promise<void>;
  navigateSafely: (href: string) => void;
  confirmLeaveAndNavigate: () => Promise<void>;
  cancelLeaveConfirm: () => void;
  sendGameAction: (command: GameActionCommand) => Promise<ActionReceipt>;
  logoutSession: (all?: boolean) => Promise<void>;
  clearLocalRoomAndGoPlay: () => void;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

const errorMessage = (cause: unknown, fallback = 'Có lỗi xảy ra.') =>
  cause instanceof Error ? cause.message : fallback;

export function PlatformProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    room,
    currentRoom,
    connected,
    clockOffset,
    setRoom,
    setCurrentRoom,
    setConnected,
    setClockOffset,
    resetRoomState,
  } = useRoomStore();

  const [hydrated, setHydrated] = useState(false);
  const [localHost, setLocalHost] = useState(true);
  const [identity, setIdentity] = useState<GameIdentity | null>(null);
  const [identityError, setIdentityError] = useState('');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [xp, setXp] = useState<number | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileLoadStatus>('idle');
  const [leaveConfirm, setLeaveConfirm] = useState<LeaveConfirmState>({
    open: false,
    code: '',
    targetHref: '/play',
    busy: false,
    error: '',
  });

  const seqGuardRef = useRef(createSequenceGuard());
  const roomGuardRef = useRef(createRoomRequestGuard());
  const identityRef = useRef<GameIdentity | null>(null);
  const socketRef = useRef<GameSocket | null>(null);
  const socketPlayerIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);
  const lastFocusRefreshRef = useRef(0);
  const sessionCheckRef = useRef<Promise<void> | null>(null);
  const recoveryRef = useRef<(refreshData?: boolean) => Promise<void>>(async () => {});
  const reconnectAttemptedRef = useRef(new WeakSet<GameSocket>());

  const stopSocket = useCallback(() => {
    const socket = socketRef.current;
    // Detach first: intentional cleanup must never start session recovery.
    socketRef.current = null;
    socketPlayerIdRef.current = null;
    socket?.removeAllListeners();
    socket?.disconnect();
    setConnected(false);
  }, [setConnected]);

  const isCurrentSocket = useCallback(
    (socket: GameSocket, token: number) =>
      mountedRef.current && socketRef.current === socket && seqGuardRef.current.isCurrent(token),
    [],
  );

  const recoverSession = useCallback(() => {
    if (!mountedRef.current) return;
    if (sessionCheckRef.current) return;
    // Coalesce only in-flight validation: a later revocation must never be throttled away.
    void recoveryRef.current(false);
  }, []);

  const handleUnauthorized = useCallback(
    (cause: unknown) => {
      if (cause instanceof ApiError && cause.status === 401) recoverSession();
    },
    [recoverSession],
  );

  const acceptRoomView = useCallback(
    (view: RoomView, forPlayerId?: string) => {
      if (!setRoom(view)) return;
      roomGuardRef.current.invalidate();
      const activePlayerId = forPlayerId ?? identityRef.current?.playerId;
      if (view.game) setClockOffset(view.game.serverNow - Date.now());
      if (activePlayerId) {
        try {
          if (view.status === 'CANCELLED') localStorage.removeItem(roomStorageKey(activePlayerId));
          else localStorage.setItem(roomStorageKey(activePlayerId), view.code);
        } catch {
          /* Browser storage may be unavailable. */
        }
      }
    },
    [setClockOffset, setRoom],
  );

  const syncCodeOverSocket = useCallback(
    (targetCode: string, expectedToken: number, playerId: string) => {
      const socket = socketRef.current;
      if (!socket?.connected || !targetCode) return;
      const ticket = roomGuardRef.current.read();
      socket.emit('room:sync', { code: targetCode }, (result) => {
        if (!isCurrentSocket(socket, expectedToken)) return;
        if (!result.ok && result.error.code === 'UNAUTHORIZED') recoverSession();
        if (!roomGuardRef.current.accepts(ticket)) return;
        if (result.ok) {
          acceptRoomView(result.data, playerId);
        } else if (result.error.code === 'NOT_FOUND' || result.error.code === 'FORBIDDEN') {
          try {
            if (localStorage.getItem(roomStorageKey(playerId)) === targetCode)
              localStorage.removeItem(roomStorageKey(playerId));
          } catch {
            /* Browser storage may be unavailable. */
          }
          if (useRoomStore.getState().currentRoom?.code === targetCode) {
            roomGuardRef.current.invalidate();
            setCurrentRoom(null);
          }
        }
      });
    },
    [acceptRoomView, isCurrentSocket, recoverSession, setCurrentRoom],
  );

  const fetchProfileForToken = useCallback(
    async (expectedToken: number) => {
      if (!seqGuardRef.current.isCurrent(expectedToken) || !identityRef.current) return;
      setProfileStatus((prev) => (prev === 'ready' ? 'ready' : 'loading'));
      try {
        const profile = await api<ProfileSummary | null>('/players/me');
        if (!mountedRef.current || !seqGuardRef.current.isCurrent(expectedToken)) return;
        if (profile) {
          setWalletBalance(profile.wallet?.balance ?? 0);
          setXp(profile.xp);
          setProfileStatus('ready');
        } else setProfileStatus('error');
      } catch (cause) {
        if (!mountedRef.current || !seqGuardRef.current.isCurrent(expectedToken)) return;
        setProfileStatus('error');
        handleUnauthorized(cause);
      }
    },
    [handleUnauthorized],
  );

  const fetchCurrentRoomForToken = useCallback(
    async (expectedToken: number, playerId: string): Promise<CurrentRoomSummary | null> => {
      if (!seqGuardRef.current.isCurrent(expectedToken)) return null;
      const ticket = roomGuardRef.current.read();
      try {
        const data = await api<CurrentRoomResponse>('/rooms/current');
        if (!mountedRef.current || !seqGuardRef.current.isCurrent(expectedToken)) return null;
        if (!roomGuardRef.current.accepts(ticket)) return useRoomStore.getState().currentRoom;
        try {
          if (data.room) localStorage.setItem(roomStorageKey(playerId), data.room.code);
          else localStorage.removeItem(roomStorageKey(playerId));
        } catch {
          /* Browser storage may be unavailable. */
        }
        setCurrentRoom(data.room);
        if (data.room) syncCodeOverSocket(data.room.code, expectedToken, playerId);
        return data.room;
      } catch (cause) {
        if (!mountedRef.current || !seqGuardRef.current.isCurrent(expectedToken)) return null;
        handleUnauthorized(cause);
        // A failed read never means the room disappeared.
        return useRoomStore.getState().currentRoom;
      }
    },
    [handleUnauthorized, setCurrentRoom, syncCodeOverSocket],
  );

  const ensureSocket = useCallback(
    (playerId: string) => {
      const existing = socketRef.current;
      if (existing && socketPlayerIdRef.current === playerId) {
        // Server disconnects disable Socket.IO's automatic reconnection.
        if (!existing.connected && !existing.active) {
          if (reconnectAttemptedRef.current.has(existing)) {
            setIdentityError('Không thể kết nối phiên chơi. Hãy thử lại.');
          } else {
            reconnectAttemptedRef.current.add(existing);
            existing.connect();
          }
        }
        return;
      }
      stopSocket();
      const token = seqGuardRef.current.value();
      const socket: GameSocket = io(apiOrigin(), { withCredentials: true, autoConnect: false });
      socketRef.current = socket;
      socketPlayerIdRef.current = playerId;
      socket.on('room:state', (view) => {
        if (!isCurrentSocket(socket, token)) return;
        const previousPhase = useRoomStore.getState().room?.game?.phase;
        acceptRoomView(view, playerId);
        if (view.game?.phase === 'FINISHED' && previousPhase !== 'FINISHED')
          void fetchProfileForToken(token);
      });
      socket.on('connect', () => {
        if (!isCurrentSocket(socket, token)) return;
        setConnected(true);
        reconnectAttemptedRef.current.delete(socket);
        setIdentityError('');
        void fetchProfileForToken(token);
        void fetchCurrentRoomForToken(token, playerId).then((serverRoom) => {
          if (!isCurrentSocket(socket, token)) return;
          const routeCode = /^\/play\/([A-Za-z0-9]{6})$/i
            .exec(window.location.pathname)?.[1]
            ?.toUpperCase();
          if (routeCode && routeCode !== serverRoom?.code)
            syncCodeOverSocket(routeCode, token, playerId);
        });
      });
      socket.on('disconnect', (reason) => {
        if (!isCurrentSocket(socket, token)) return;
        setConnected(false);
        if (reason === 'io server disconnect') recoverSession();
      });
      socket.on('connect_error', (cause) => {
        if (!isCurrentSocket(socket, token)) return;
        setConnected(false);
        const data = (cause as Error & { data?: { code?: string } }).data;
        if (cause.message === 'UNAUTHORIZED' || data?.code === 'UNAUTHORIZED') recoverSession();
      });
      socket.connect();
    },
    [
      acceptRoomView,
      fetchCurrentRoomForToken,
      fetchProfileForToken,
      isCurrentSocket,
      recoverSession,
      setConnected,
      stopSocket,
      syncCodeOverSocket,
    ],
  );

  const loadSessionAndData = useCallback(
    (refreshData = true): Promise<void> => {
      if (sessionCheckRef.current) return sessionCheckRef.current;
      const token = seqGuardRef.current.value();
      const check = (async () => {
        try {
          // Recovery/auth changes must not reuse a lookup started with an older cookie.
          const nextIdentity = await loadIdentity({ fresh: true });
          if (!mountedRef.current || !seqGuardRef.current.isCurrent(token)) return;
          const previous = identityRef.current;
          const changed =
            previous?.playerId !== nextIdentity?.playerId || previous?.kind !== nextIdentity?.kind;
          if (changed || !nextIdentity) {
            seqGuardRef.current.next();
            roomGuardRef.current.reset();
            stopSocket();
            resetRoomState();
            setWalletBalance(null);
            setXp(null);
            setProfileStatus(nextIdentity ? 'loading' : 'idle');
            setLeaveConfirm({ open: false, code: '', targetHref: '/play', busy: false, error: '' });
          }
          identityRef.current = nextIdentity;
          setIdentity(nextIdentity);
          setIdentityError('');
          setHydrated(true);
          if (nextIdentity) {
            ensureSocket(nextIdentity.playerId);
            if (refreshData) {
              const currentToken = seqGuardRef.current.value();
              void fetchProfileForToken(currentToken);
              void fetchCurrentRoomForToken(currentToken, nextIdentity.playerId);
            }
          }
        } catch (cause) {
          if (!mountedRef.current || !seqGuardRef.current.isCurrent(token)) return;
          setIdentityError(errorMessage(cause, 'Không thể xác minh phiên. Hãy thử lại.'));
          setHydrated(true);
        }
      })();
      sessionCheckRef.current = check;
      void check.finally(() => {
        if (sessionCheckRef.current === check) sessionCheckRef.current = null;
      });
      return check;
    },
    [ensureSocket, fetchCurrentRoomForToken, fetchProfileForToken, resetRoomState, stopSocket],
  );

  useEffect(() => {
    recoveryRef.current = loadSessionAndData;
  }, [loadSessionAndData]);

  useEffect(() => {
    mountedRef.current = true;
    setLocalHost(isLocalAccountHost());
    void loadSessionAndData();
    const unsubscribe = onAuthChanged(() => {
      seqGuardRef.current.next();
      roomGuardRef.current.reset();
      sessionCheckRef.current = null;
      stopSocket();
      void loadSessionAndData();
    });
    return () => {
      mountedRef.current = false;
      seqGuardRef.current.next();
      roomGuardRef.current.reset();
      sessionCheckRef.current = null;
      unsubscribe();
      stopSocket();
    };
  }, [loadSessionAndData, stopSocket]);

  // Sync room when navigating to /play/[code]
  useEffect(() => {
    if (!identity || !connected) return;
    const match = /^\/play\/([A-Za-z0-9]{6})$/i.exec(pathname ?? '');
    const routeCode = match?.[1]?.toUpperCase();
    if (!routeCode) return;
    if (room?.code === routeCode && room.status !== 'CANCELLED') return;
    syncCodeOverSocket(routeCode, seqGuardRef.current.value(), identity.playerId);
  }, [connected, identity, pathname, room?.code, room?.status, syncCodeOverSocket]);

  // Refresh profile and current room when returning to tab
  useEffect(() => {
    if (!identity) return;
    const onResume = () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastFocusRefreshRef.current < 3000) return;
      lastFocusRefreshRef.current = now;
      if (socketRef.current) reconnectAttemptedRef.current.delete(socketRef.current);
      void loadSessionAndData();
    };
    window.addEventListener('focus', onResume);
    document.addEventListener('visibilitychange', onResume);
    return () => {
      window.removeEventListener('focus', onResume);
      document.removeEventListener('visibilitychange', onResume);
    };
  }, [loadSessionAndData, identity]);

  // Warn before closing/reloading browser tab while match is IN_PROGRESS
  const effectiveStatus = room?.status ?? currentRoom?.status;
  const effectiveCode = room?.code ?? currentRoom?.code;
  useEffect(() => {
    if (effectiveStatus !== 'IN_PROGRESS') return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [effectiveStatus]);

  const retryIdentity = useCallback(async () => {
    if (socketRef.current) reconnectAttemptedRef.current.delete(socketRef.current);
    await loadSessionAndData();
  }, [loadSessionAndData]);

  const refreshProfile = useCallback(async () => {
    await fetchProfileForToken(seqGuardRef.current.value());
  }, [fetchProfileForToken]);

  const refreshCurrentRoom = useCallback(async () => {
    if (!identityRef.current) return null;
    return fetchCurrentRoomForToken(seqGuardRef.current.value(), identityRef.current.playerId);
  }, [fetchCurrentRoomForToken]);

  const createGuest = useCallback(
    async (nickname: string) => {
      const previousToken = seqGuardRef.current.value();
      let guest: GameIdentity;
      try {
        guest = await api<GameIdentity>('/players/guest', { nickname });
      } catch (cause) {
        if (seqGuardRef.current.isCurrent(previousToken)) handleUnauthorized(cause);
        throw cause;
      }
      if (!mountedRef.current || !seqGuardRef.current.isCurrent(previousToken))
        throw new Error('Phiên chơi đã thay đổi. Hãy thử lại.');
      const token = seqGuardRef.current.next();
      roomGuardRef.current.reset();
      stopSocket();
      resetRoomState();
      identityRef.current = guest;
      setIdentity(guest);
      setIdentityError('');
      setProfileStatus('loading');
      ensureSocket(guest.playerId);
      authChanged();
      void fetchProfileForToken(token);
      void fetchCurrentRoomForToken(token, guest.playerId);
      return guest;
    },
    [
      ensureSocket,
      fetchCurrentRoomForToken,
      fetchProfileForToken,
      handleUnauthorized,
      resetRoomState,
      stopSocket,
    ],
  );

  const runRoomMutation = useCallback(
    async <T,>(
      operation: (socket: GameSocket) => Promise<T>,
      apply: (value: T) => void,
      alwaysApply = false,
    ): Promise<T> => {
      const socket = socketRef.current;
      if (!socket?.connected) throw new Error('Chưa kết nối máy chủ. Hãy thử lại.');
      const token = seqGuardRef.current.value();
      const guard = roomGuardRef.current;
      const mutation = guard.beginMutation();
      const generation = guard.generation();
      try {
        const value = await operation(socket);
        if (!isCurrentSocket(socket, token))
          throw new Error('Phiên chơi đã thay đổi. Hãy thử lại.');
        const newerSnapshot = guard.generation() !== generation;
        guard.finishMutation(mutation);
        // An ACK may precede a newer broadcast but arrive later. Do not rewind it.
        if (alwaysApply || !newerSnapshot) apply(value);
        return value;
      } catch (cause) {
        guard.finishMutation(mutation);
        if (isCurrentSocket(socket, token)) {
          handleUnauthorized(cause);
          const playerId = identityRef.current?.playerId;
          if (playerId) void fetchCurrentRoomForToken(token, playerId);
        }
        throw cause;
      }
    },
    [fetchCurrentRoomForToken, handleUnauthorized, isCurrentSocket],
  );

  const createRoom = useCallback(
    (input: CreateRoomInput) =>
      runRoomMutation(
        (socket) => request<RoomView>((ack) => socket.emit('room:create', input, ack)),
        acceptRoomView,
      ),
    [acceptRoomView, runRoomMutation],
  );

  const joinRoom = useCallback(
    (code: string) =>
      runRoomMutation(
        (socket) =>
          request<RoomView>((ack) =>
            socket.emit('room:join', { code: code.trim().toUpperCase() }, ack),
          ),
        acceptRoomView,
      ),
    [acceptRoomView, runRoomMutation],
  );

  const roomCommand = useCallback(
    (code: string, event: 'room:ready' | 'match:start' | 'room:rematch' | 'room:sync') =>
      runRoomMutation(
        (socket) => request<RoomView>((ack) => socket.emit(event, { code }, ack)),
        acceptRoomView,
      ),
    [acceptRoomView, runRoomMutation],
  );

  const clearLocalRoomAndGoPlay = useCallback(() => {
    const latest = useRoomStore.getState();
    const active = latest.room ?? latest.currentRoom;
    if (active?.status === 'IN_PROGRESS') {
      setLeaveConfirm({
        open: true,
        code: active.code,
        targetHref: '/play',
        busy: false,
        error: '',
      });
      return;
    }
    roomGuardRef.current.invalidate();
    const playerId = identityRef.current?.playerId;
    try {
      if (playerId) localStorage.removeItem(roomStorageKey(playerId));
    } catch {
      /* Browser storage may be unavailable. */
    }
    setCurrentRoom(null);
    router.push('/play');
  }, [router, setCurrentRoom]);

  const leaveRoomImmediate = useCallback(
    async (code: string, targetHref = '/play') => {
      await runRoomMutation(
        (socket) => request<null>((ack) => socket.emit('room:leave', { code }, ack)),
        () => {
          const playerId = identityRef.current?.playerId;
          try {
            if (playerId) localStorage.removeItem(roomStorageKey(playerId));
          } catch {
            /* Browser storage may be unavailable. */
          }
          const latest = useRoomStore.getState().currentRoom;
          if (!latest || latest.code === code) setCurrentRoom(null);
          router.push(targetHref);
        },
        true,
      );
    },
    [router, runRoomMutation, setCurrentRoom],
  );

  const requestLeaveRoom = useCallback(
    async (code: string, targetHref = '/play') => {
      const status =
        room?.code === code
          ? room.status
          : currentRoom?.code === code
            ? currentRoom.status
            : undefined;
      if (status === 'IN_PROGRESS') {
        setLeaveConfirm({
          open: true,
          code,
          targetHref,
          busy: false,
          error: '',
        });
        return;
      }
      await leaveRoomImmediate(code, targetHref);
    },
    [currentRoom?.code, currentRoom?.status, leaveRoomImmediate, room?.code, room?.status],
  );

  const navigateSafely = useCallback(
    (href: string) => {
      if (shouldConfirmLeaveOnNavigation(pathname, href, effectiveStatus, effectiveCode)) {
        setLeaveConfirm({
          open: true,
          code: effectiveCode!,
          targetHref: href,
          busy: false,
          error: '',
        });
        return;
      }
      router.push(href);
    },
    [effectiveCode, effectiveStatus, pathname, router],
  );

  const confirmLeaveAndNavigate = useCallback(async () => {
    if (!leaveConfirm.open || leaveConfirm.busy || !leaveConfirm.code) return;
    setLeaveConfirm((prev) => ({ ...prev, busy: true, error: '' }));
    try {
      await leaveRoomImmediate(leaveConfirm.code, leaveConfirm.targetHref);
      setLeaveConfirm({ open: false, code: '', targetHref: '/play', busy: false, error: '' });
    } catch (cause) {
      setLeaveConfirm((prev) => ({
        ...prev,
        busy: false,
        error: errorMessage(cause, 'Không thể rời phòng lúc này. Hãy thử lại.'),
      }));
    }
  }, [leaveConfirm, leaveRoomImmediate]);

  const cancelLeaveConfirm = useCallback(() => {
    setLeaveConfirm((prev) => {
      if (prev.busy) return prev;
      return { open: false, code: '', targetHref: '/play', busy: false, error: '' };
    });
  }, []);

  const sendGameAction = useCallback(async (command: GameActionCommand) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      throw new Error('Chưa kết nối máy chủ.');
    }
    return request<ActionReceipt>((ack) => socket.emit('game:action', command, ack));
  }, []);

  const logoutSession = useCallback(
    async (all = false) => {
      if (currentRoom) {
        throw new Error('Hãy rời phòng hiện tại trước khi đăng xuất hoặc chuyển danh tính.');
      }
      try {
        await api(all ? '/auth/logout-all' : '/auth/logout', {});
      } catch (cause) {
        handleUnauthorized(cause);
        throw cause;
      }
      const token = seqGuardRef.current.next();
      roomGuardRef.current.reset();
      sessionCheckRef.current = null;
      stopSocket();
      identityRef.current = null;
      setIdentity(null);
      setWalletBalance(null);
      setXp(null);
      setProfileStatus('idle');
      resetRoomState();
      authChanged();
      if (seqGuardRef.current.isCurrent(token)) {
        router.replace('/');
      }
    },
    [currentRoom, handleUnauthorized, resetRoomState, router, stopSocket],
  );

  const value = useMemo<PlatformContextValue>(
    () => ({
      hydrated,
      localHost,
      identity,
      identityError,
      walletBalance,
      xp,
      profileStatus,
      room,
      currentRoom,
      connected,
      clockOffset,
      leaveConfirm,
      retryIdentity,
      refreshProfile,
      refreshCurrentRoom,
      createGuest,
      createRoom,
      joinRoom,
      roomCommand,
      leaveRoomImmediate,
      requestLeaveRoom,
      navigateSafely,
      confirmLeaveAndNavigate,
      cancelLeaveConfirm,
      sendGameAction,
      logoutSession,
      clearLocalRoomAndGoPlay,
    }),
    [
      hydrated,
      localHost,
      identity,
      identityError,
      walletBalance,
      xp,
      profileStatus,
      room,
      currentRoom,
      connected,
      clockOffset,
      leaveConfirm,
      retryIdentity,
      refreshProfile,
      refreshCurrentRoom,
      createGuest,
      createRoom,
      joinRoom,
      roomCommand,
      leaveRoomImmediate,
      requestLeaveRoom,
      navigateSafely,
      confirmLeaveAndNavigate,
      cancelLeaveConfirm,
      sendGameAction,
      logoutSession,
      clearLocalRoomAndGoPlay,
    ],
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformContextValue {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
}
