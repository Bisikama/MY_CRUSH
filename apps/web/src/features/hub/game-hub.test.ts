import { beforeEach, describe, expect, it } from 'vitest';
import type { RoomView } from '@duoquest/shared-types';
import {
  createSequenceGuard,
  createRoomRequestGuard,
  getRoomBannerDescriptor,
  shouldConfirmLeaveOnNavigation,
} from './room-banner.utils';
import { formatProfileMatchTime, getProfileModeDescriptor } from '../profile/profile.utils';
import { useRoomStore } from '../../stores/room.store';

describe('Game Hub banner, navigation guard & room store', () => {
  beforeEach(() => {
    useRoomStore.getState().resetRoomState();
  });

  it('rejects a delayed absent-room read after create/start or a newer socket snapshot', () => {
    const guard = createRoomRequestGuard();
    const absentBeforeCreate = guard.read();
    const create = guard.beginMutation();
    const readDuringCreate = guard.read();
    expect(guard.accepts(absentBeforeCreate)).toBe(false);
    expect(guard.accepts(readDuringCreate)).toBe(false);
    guard.finishMutation(create);
    expect(guard.accepts(readDuringCreate)).toBe(false);
    const beforeBroadcast = guard.read();
    guard.invalidate();
    expect(guard.accepts(beforeBroadcast)).toBe(false);
    expect(guard.accepts(guard.read())).toBe(true);
  });

  it('only applies the most recent read and invalidates old reads after leave or identity reset', () => {
    const guard = createRoomRequestGuard();
    const first = guard.read();
    const second = guard.read();
    expect(guard.accepts(first)).toBe(false);
    expect(guard.accepts(second)).toBe(true);
    const leave = guard.beginMutation();
    guard.finishMutation(leave);
    expect(guard.accepts(second)).toBe(false);
    const beforeReset = guard.read();
    const oldMutation = guard.beginMutation();
    guard.reset();
    const newIdentityRead = guard.read();
    guard.finishMutation(oldMutation);
    expect(guard.accepts(beforeReset)).toBe(false);
    expect(guard.accepts(newIdentityRead)).toBe(true);
  });

  it('keeps reads blocked until all concurrent room commands settle', () => {
    const guard = createRoomRequestGuard();
    const ready = guard.beginMutation();
    const start = guard.beginMutation();
    guard.finishMutation(ready);
    expect(guard.accepts(guard.read())).toBe(false);
    guard.finishMutation(start);
    expect(guard.accepts(guard.read())).toBe(true);
  });

  it('applies authoritative room absence and room changes without retaining the previous snapshot', () => {
    const view: RoomView = {
      code: 'ABC234',
      hostPlayerId: 'p1',
      mode: 'SOLO',
      layout: 'MULTI_DEVICE',
      status: 'WAITING',
      players: [],
      controlledPlayerIds: ['p1'],
      rematchVotes: [],
      game: null,
    };
    const store = useRoomStore.getState();
    store.setRoom(view);
    store.setCurrentRoom({ code: view.code, gameId: 'quiz', status: 'READY' });
    expect(useRoomStore.getState().room).toBe(view);
    store.setCurrentRoom({ code: 'OTHER2', gameId: 'quiz', status: 'WAITING' });
    expect(useRoomStore.getState().room).toBeNull();
    expect(useRoomStore.getState().currentRoom?.code).toBe('OTHER2');
    store.setRoom(view);
    store.setCurrentRoom(null);
    expect(useRoomStore.getState().room).toBeNull();
    expect(useRoomStore.getState().currentRoom).toBeNull();
  });

  it('rejects a lower game version without letting its summary rewind the current status', () => {
    const view = {
      code: 'ABC234',
      hostPlayerId: 'p1',
      mode: 'SOLO',
      layout: 'MULTI_DEVICE',
      status: 'IN_PROGRESS',
      players: [],
      controlledPlayerIds: ['p1'],
      rematchVotes: [],
      game: { sessionId: 's1', version: 5 },
    } as unknown as RoomView;
    const store = useRoomStore.getState();
    expect(store.setRoom(view)).toBe(true);
    expect(store.setRoom({ ...view, status: 'READY', game: { ...view.game!, version: 4 } })).toBe(
      false,
    );
    expect(useRoomStore.getState().room).toBe(view);
    expect(useRoomStore.getState().currentRoom?.status).toBe('IN_PROGRESS');
  });

  it('maps WAITING, READY, IN_PROGRESS and FINISHED rooms to exact Vietnamese banner copy and CTAs', () => {
    expect(
      getRoomBannerDescriptor({ code: 'ABC234', gameId: 'quiz', status: 'WAITING' }, '/', null),
    ).toEqual({
      key: 'ABC234:WAITING',
      code: 'ABC234',
      status: 'WAITING',
      headline: 'Bạn có phòng đang mở',
      ctaLabel: 'Quay lại phòng',
      href: '/play/ABC234',
      tone: 'waiting',
    });

    expect(
      getRoomBannerDescriptor({ code: 'ABC234', gameId: 'quiz', status: 'READY' }, '/shop', null),
    ).toMatchObject({
      headline: 'Bạn có phòng đang mở',
      ctaLabel: 'Quay lại phòng',
      href: '/play/ABC234',
    });

    expect(
      getRoomBannerDescriptor({ code: 'ABC234', gameId: 'quiz', status: 'IN_PROGRESS' }, '/', null),
    ).toMatchObject({
      headline: 'Trận Quiz Battle đang diễn ra',
      ctaLabel: 'Quay lại trận',
      href: '/play/ABC234',
      tone: 'live',
    });

    expect(
      getRoomBannerDescriptor(
        { code: 'ABC234', gameId: 'quiz', status: 'FINISHED' },
        '/profile',
        null,
      ),
    ).toMatchObject({
      headline: 'Phòng đã hoàn tất trận',
      ctaLabel: 'Xem kết quả / Về phòng',
      href: '/play/ABC234',
      tone: 'finished',
    });
  });

  it('hides banner on the active room route or when dismissed for the current status key only', () => {
    const summary = { code: 'ABC234', gameId: 'quiz' as const, status: 'WAITING' as const };
    expect(getRoomBannerDescriptor(summary, '/play/ABC234', null)).toBeNull();
    expect(getRoomBannerDescriptor(summary, '/', 'ABC234:WAITING')).toBeNull();
    // Status transition to IN_PROGRESS shows the banner again
    expect(
      getRoomBannerDescriptor(
        { code: 'ABC234', gameId: 'quiz', status: 'IN_PROGRESS' },
        '/',
        'ABC234:WAITING',
      ),
    ).not.toBeNull();
  });

  it('requires leave confirmation only when navigating away from an IN_PROGRESS room screen', () => {
    expect(shouldConfirmLeaveOnNavigation('/play/ABC234', '/', 'IN_PROGRESS', 'ABC234')).toBe(true);
    expect(shouldConfirmLeaveOnNavigation('/play/ABC234', '/shop', 'IN_PROGRESS', 'ABC234')).toBe(
      true,
    );
    expect(
      shouldConfirmLeaveOnNavigation('/play/ABC234', '/play/ABC234', 'IN_PROGRESS', 'ABC234'),
    ).toBe(false);
    expect(shouldConfirmLeaveOnNavigation('/play/ABC234', '/', 'WAITING', 'ABC234')).toBe(false);
    expect(shouldConfirmLeaveOnNavigation('/play/ABC234', '/', 'READY', 'ABC234')).toBe(false);
    expect(shouldConfirmLeaveOnNavigation('/play/ABC234', '/', 'FINISHED', 'ABC234')).toBe(false);
    expect(shouldConfirmLeaveOnNavigation('/', '/shop', 'IN_PROGRESS', 'ABC234')).toBe(false);
  });

  it('invalidates stale async responses when identity sequence advances', () => {
    const guard = createSequenceGuard();
    const guestSeq = guard.next();
    expect(guard.isCurrent(guestSeq)).toBe(true);
    const accountSeq = guard.next();
    expect(guard.isCurrent(guestSeq)).toBe(false);
    expect(guard.isCurrent(accountSeq)).toBe(true);
  });

  it('synchronizes currentRoom summary with room view and clears everything on resetRoomState', () => {
    const baseRoom: RoomView = {
      code: 'ROOM22',
      hostPlayerId: 'p1',
      mode: 'SOLO',
      layout: 'MULTI_DEVICE',
      status: 'WAITING',
      players: [{ playerId: 'p1', nickname: 'Mây', ready: false, connected: true }],
      controlledPlayerIds: ['p1'],
      rematchVotes: [],
      game: null,
    };
    useRoomStore.getState().setRoom(baseRoom);
    expect(useRoomStore.getState().currentRoom).toEqual({
      code: 'ROOM22',
      gameId: 'quiz',
      status: 'WAITING',
    });

    useRoomStore.getState().setRoom({ ...baseRoom, status: 'CANCELLED' });
    expect(useRoomStore.getState().currentRoom).toBeNull();

    useRoomStore.getState().setRoom({ ...baseRoom, status: 'FINISHED' });
    expect(useRoomStore.getState().currentRoom).toEqual({
      code: 'ROOM22',
      gameId: 'quiz',
      status: 'FINISHED',
    });

    useRoomStore.getState().resetRoomState();
    expect(useRoomStore.getState().room).toBeNull();
    expect(useRoomStore.getState().currentRoom).toBeNull();
  });

  it('maps quiz match modes and timestamps to Pastel Lavender profile labels', () => {
    expect(getProfileModeDescriptor('SOLO')).toEqual({
      title: 'Solo',
      tag: 'Luyện tập',
      tone: 'solo',
    });
    expect(getProfileModeDescriptor('DUEL')).toEqual({
      title: 'Duel',
      tag: 'Đối kháng',
      tone: 'duel',
    });
    expect(getProfileModeDescriptor('COOP')).toEqual({
      title: 'Co-op',
      tag: 'Đồng đội',
      tone: 'coop',
    });

    const now = new Date(2026, 10, 8, 15, 30, 0);
    const todayMatch = new Date(2026, 10, 8, 14, 20, 0).toISOString();
    const yesterdayMatch = new Date(2026, 10, 7, 20, 15, 0).toISOString();
    const olderMatch = new Date(2026, 9, 12, 9, 5, 0).toISOString();
    expect(formatProfileMatchTime(todayMatch, now)).toBe('Hôm nay, 14:20');
    expect(formatProfileMatchTime(yesterdayMatch, now)).toBe('Hôm qua, 20:15');
    expect(formatProfileMatchTime(olderMatch, now)).toBe('12/10/2026, 09:05');
    expect(formatProfileMatchTime(null, now)).toBe('Vừa hoàn tất');
  });
});
