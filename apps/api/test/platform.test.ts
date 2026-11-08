import { beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { GameActionCommand, GameLayout, GameMode } from '@duoquest/shared-types';
import { MemoryStore } from './memory.store';
import { PlayersService } from '../src/modules/players/players.service';
import { SessionsService } from '../src/modules/sessions/sessions.service';
import { GameRegistry } from '../src/modules/sessions/game-registry';
import { RewardsService } from '../src/modules/rewards/rewards.service';
import { RoomsService } from '../src/modules/rooms/rooms.service';

describe('Room/session orchestration', () => {
  let store: MemoryStore;
  let players: PlayersService;
  let sessions: SessionsService;
  let rooms: RoomsService;
  beforeEach(() => {
    store = new MemoryStore();
    players = new PlayersService(store);
    sessions = new SessionsService(store, new GameRegistry(), new RewardsService());
    rooms = new RoomsService(store, players, sessions);
  });
  async function start(mode: GameMode = 'SOLO', layout: GameLayout = 'MULTI_DEVICE') {
    const guest = await players.create('Player one');
    const player = await players.authenticate(guest.token);
    let view = await rooms.create(player, { mode, layout, packVersionId: store.pack.id });
    if (mode !== 'SOLO' && layout === 'MULTI_DEVICE') {
      const second = await players.create('Player two');
      const record = await players.authenticate(second.token);
      await rooms.join(view.code, record);
      await rooms.ready(view.code, record.id);
    }
    await rooms.ready(view.code, player.id);
    view = await rooms.start(view.code, player.id);
    return { view, player, guest };
  }
  function action(
    view: Awaited<ReturnType<typeof start>>['view'],
    playerId: string,
  ): GameActionCommand {
    return {
      code: view.code,
      sessionId: view.game!.sessionId,
      roundId: view.game!.roundId,
      actionId: randomUUID(),
      playerId,
      payload: { type: 'ANSWER', optionId: 'A' },
    };
  }
  it('stores only guest token hashes', async () => {
    const guest = await players.create('Guest');
    const player = await players.authenticate(guest.token);
    expect(player.tokenHash).not.toBe(guest.token);
    expect(player).not.toHaveProperty('token');
  });
  it('rejects invalid guest tokens', async () => {
    await expect(players.authenticate('forged')).rejects.toThrow('token');
  });
  it('authorizes both shared-screen slots to their controller', async () => {
    const { view } = await start('DUEL', 'SHARED_SCREEN');
    expect(view.controlledPlayerIds).toHaveLength(2);
  });
  it('forbids controlling the other device slot', async () => {
    const { view, player } = await start('DUEL');
    const other = view.players.find((p) => p.playerId !== player.id)!;
    await expect(rooms.action(action(view, other.playerId), player.id)).rejects.toThrow(
      'quyền điều khiển',
    );
  });
  it('deduplicates retry actions and rejects changed payloads reusing the key', async () => {
    const { view, player } = await start('DUEL');
    const command = action(view, player.id);
    const first = await rooms.action(command, player.id);
    expect(await rooms.action(command, player.id)).toEqual(first);
    expect(store.answers.size).toBe(1);
    await expect(
      rooms.action({ ...command, payload: { type: 'ANSWER', optionId: 'B' } }, player.id),
    ).rejects.toThrow('actionId');
  });
  it('rejects stale round and session identifiers', async () => {
    const { view, player } = await start();
    const command = action(view, player.id);
    await expect(rooms.action({ ...command, roundId: 'old-round' }, player.id)).rejects.toThrow(
      'Câu hỏi',
    );
    await expect(rooms.action({ ...command, sessionId: randomUUID() }, player.id)).rejects.toThrow(
      'Session',
    );
  });
  it('acknowledges a previously accepted action after the result is finalized', async () => {
    const { view, player } = await start();
    const command = action(view, player.id);
    const receipt = await rooms.action(command, player.id);
    await rooms.tick(Date.now() + 4000);
    expect(await rooms.action(command, player.id)).toEqual(receipt);
    expect(store.results.size).toBe(1);
    expect(store.grants).toHaveLength(1);
  });
  it('does not let one identity concurrently create and join different rooms', async () => {
    const host = await players.authenticate((await players.create('Other host')).token);
    const target = await rooms.create(host, {
      mode: 'DUEL',
      layout: 'MULTI_DEVICE',
      packVersionId: store.pack.id,
    });
    const candidate = await players.authenticate((await players.create('Candidate')).token);
    const outcomes = await Promise.allSettled([
      rooms.create(candidate, {
        mode: 'SOLO',
        layout: 'MULTI_DEVICE',
        packVersionId: store.pack.id,
      }),
      rooms.join(target.code, candidate),
    ]);
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  });
  it('accepts only one of two simultaneous buzzer commands', async () => {
    const { view, player } = await start('DUEL', 'SHARED_SCREEN');
    const results = await Promise.allSettled(
      view.controlledPlayerIds.map((id) =>
        rooms.action({ ...action(view, id), payload: { type: 'BUZZ' } }, player.id),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
  it('retries result persistence without publishing FINISHED or doubling rewards', async () => {
    const { view, player } = await start();
    await rooms.action(action(view, player.id), player.id);
    store.failFinish = true;
    await expect(rooms.tick(Date.now() + 4000)).rejects.toThrow('database outage');
    expect((await rooms.sync(view.code, player.id)).game!.phase).toBe('REVEAL');
    store.failFinish = false;
    await rooms.tick(Date.now() + 4000);
    await rooms.tick(Date.now() + 5000);
    expect(store.results.size).toBe(1);
    expect(store.grants).toHaveLength(1);
  });
  it('creates a new session for rematch and preserves the previous result', async () => {
    const { view, player } = await start();
    await rooms.action(action(view, player.id), player.id);
    await rooms.tick(Date.now() + 4000);
    const rematch = await rooms.rematch(view.code, player.id);
    expect(rematch.game!.sessionId).not.toBe(view.game!.sessionId);
    expect(store.results.has(view.game!.sessionId)).toBe(true);
  });
  it('retains live state on reconnect and cancels after grace expiry', async () => {
    const { view, player } = await start();
    await rooms.connect(player.id, 'socket-1');
    await rooms.disconnect(player.id, 'socket-1');
    await rooms.connect(player.id, 'socket-2');
    expect((await rooms.sync(view.code, player.id)).game!.sessionId).toBe(view.game!.sessionId);
    await rooms.disconnect(player.id, 'socket-2');
    await rooms.tick(Date.now() + 31000);
    expect(store.cancelled.has(view.game!.sessionId)).toBe(true);
    expect(store.results.size).toBe(0);
  });
  it('does not disconnect a player while another authenticated tab is connected', async () => {
    const { view, player } = await start();
    await rooms.connect(player.id, 'one');
    await rooms.connect(player.id, 'two');
    await rooms.disconnect(player.id, 'one');
    expect((await rooms.sync(view.code, player.id)).players[0]!.connected).toBe(true);
  });
  it('does not award imported packs', async () => {
    store.pack.trusted = false;
    const { view, player } = await start();
    await rooms.action(action(view, player.id), player.id);
    await rooms.tick(Date.now() + 4000);
    expect(store.results.size).toBe(1);
    expect(store.grants).toHaveLength(0);
  });
  it('returns current room by controller membership across lifecycle without mutating presence or idle TTL', async () => {
    const hostIdentity = await players.create('Host');
    const host = await players.authenticate(hostIdentity.token);
    const joinerIdentity = await players.create('Joiner');
    const joiner = await players.authenticate(joinerIdentity.token);
    const outsiderIdentity = await players.create('Outsider');
    const outsider = await players.authenticate(outsiderIdentity.token);

    expect(await rooms.currentFor(host.id)).toBeNull();
    const created = await rooms.create(host, {
      mode: 'DUEL',
      layout: 'MULTI_DEVICE',
      packVersionId: store.pack.id,
    });
    expect(await rooms.currentFor(host.id)).toEqual({
      code: created.code,
      gameId: 'quiz',
      status: 'WAITING',
    });
    expect(await rooms.currentFor(joiner.id)).toBeNull();
    expect(await rooms.currentFor(outsider.id)).toBeNull();

    await rooms.join(created.code, joiner);
    expect(await rooms.currentFor(joiner.id)).toEqual({
      code: created.code,
      gameId: 'quiz',
      status: 'WAITING',
    });

    await rooms.ready(created.code, host.id);
    await rooms.ready(created.code, joiner.id);
    expect(await rooms.currentFor(host.id)).toEqual({
      code: created.code,
      gameId: 'quiz',
      status: 'READY',
    });

    // Disconnect joiner, verify currentFor does not flip connected back to true or extend idle TTL
    await rooms.connect(joiner.id, 'sock-j');
    await rooms.disconnect(joiner.id, 'sock-j');
    expect((await rooms.sync(created.code, host.id)).players[1]!.connected).toBe(false);
    expect(await rooms.currentFor(joiner.id)).toEqual({
      code: created.code,
      gameId: 'quiz',
      status: 'READY',
    });
    expect((await rooms.sync(created.code, host.id)).players[1]!.connected).toBe(false);

    // Reconnect and start match -> IN_PROGRESS -> FINISHED
    await rooms.connect(joiner.id, 'sock-j2');
    const started = await rooms.start(created.code, host.id);
    expect(await rooms.currentFor(host.id)).toEqual({
      code: created.code,
      gameId: 'quiz',
      status: 'IN_PROGRESS',
    });

    await rooms.action(action(started, host.id), host.id);
    await rooms.action(action(started, joiner.id), joiner.id);
    await rooms.tick(Date.now() + 4000);
    expect(await rooms.currentFor(host.id)).toEqual({
      code: created.code,
      gameId: 'quiz',
      status: 'FINISHED',
    });
    expect(await rooms.currentFor(joiner.id)).toEqual({
      code: created.code,
      gameId: 'quiz',
      status: 'FINISHED',
    });
    expect(await rooms.currentFor(outsider.id)).toBeNull();

    // Verify reading currentFor does not extend idle TTL when room is idle
    const beforeIdleExpiry = Date.now() + 14 * 60_000;
    await rooms.currentFor(host.id);
    await rooms.tick(beforeIdleExpiry + 2 * 60_000);
    expect(await rooms.currentFor(host.id)).toBeNull();
    expect(await rooms.currentFor(joiner.id)).toBeNull();
  });
});
