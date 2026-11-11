import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Module, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { io, type Socket } from 'socket.io-client';
import type { AddressInfo } from 'node:net';
import type {
  Ack,
  GameMode,
  GameLayout,
  ActionReceipt,
  ClientToServerEvents,
  RoomView,
  ServerToClientEvents,
} from '@duoquest/shared-types';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { AuthSessions } from '../src/modules/auth/auth-session.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { PlatformStore } from '../src/modules/persistence/store';
import { PlayersModule } from '../src/modules/players/players.module';
import { PlayersService } from '../src/modules/players/players.service';
import { RoomsService } from '../src/modules/rooms/rooms.service';
import { RealtimeModule } from '../src/modules/realtime/realtime.module';
import { MemoryStore } from './memory.store';

const store = new MemoryStore();
@Module({
  imports: [PlayersModule, RealtimeModule],
  providers: [{ provide: PlatformStore, useValue: store }],
  exports: [PlatformStore],
})
class TestRoot {}
// Make persistence visible in imported modules while keeping real transport/controllers/services.
import { Global } from '@nestjs/common';
@Global()
@Module({
  providers: [
    { provide: PlatformStore, useValue: store },
    { provide: AuthService, useValue: {} },
    {
      provide: AuthSessions,
      useValue: {
        events: new EventEmitter(),
        resolve: async (value: string) => {
          const player = await store.findPlayer(createHash('sha256').update(value).digest('hex'));
          return (
            player && {
              playerId: player.id,
              nickname: player.nickname,
              sessionId: player.id,
              accountId: null,
              role: null,
              email: null,
              validUntil: Date.now() + 60_000,
            }
          );
        },
      },
    },
  ],
  exports: [PlatformStore, AuthSessions, AuthService],
})
class TestPersistence {}
@Module({ imports: [TestPersistence, TestRoot] })
class TestApp {}
type Client = Socket<ServerToClientEvents, ClientToServerEvents>;
function ack<T>(send: (callback: (result: Ack<T>) => void) => void) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('socket ACK timed out')), 3000);
    send((result) => {
      clearTimeout(timer);
      if (result.ok) resolve(result.data);
      else reject(new Error(result.error.message));
    });
  });
}
describe('real Socket.IO transport with two authenticated clients', () => {
  let app: INestApplication;
  let origin: string;
  let a: Client;
  let b: Client;
  let aToken: string;
  let aId: string;
  let bId: string;
  let room: RoomView;
  const clients: Client[] = [];
  async function connect(token: string) {
    const client: Client = io(origin, {
      extraHeaders: { Cookie: 'dq_session=' + token, Origin: 'http://localhost:3000' },
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      autoConnect: false,
    });
    clients.push(client);
    await new Promise<void>((resolve, reject) => {
      client.once('connect', () => resolve());
      client.once('connect_error', reject);
      client.connect();
    });
    return client;
  }
  beforeAll(async () => {
    app = await NestFactory.create(TestApp, { logger: false, abortOnError: false });
    await app.listen(0, '127.0.0.1');
    origin = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
    const players = app.get(PlayersService);
    const one = await players.create('Alice');
    const two = await players.create('Bob');
    aToken = one.token;
    aId = one.playerId;
    bId = two.playerId;
    a = await connect(one.token);
    b = await connect(two.token);
  });
  afterAll(async () => {
    clients.forEach((client) => client.disconnect());
    await app?.close();
  });
  it('rejects an unauthenticated connection', async () => {
    await expect(connect('forged')).rejects.toThrow('UNAUTHORIZED');
  });
  it('creates/joins/readies/starts the same session on two clients', async () => {
    room = await ack<RoomView>((cb) =>
      a.emit(
        'room:create',
        { mode: 'DUEL', layout: 'MULTI_DEVICE', packVersionId: store.pack.id },
        cb,
      ),
    );
    const joined = await ack<RoomView>((cb) => b.emit('room:join', { code: room.code }, cb));
    expect(joined.controlledPlayerIds).toEqual([bId]);
    await ack<RoomView>((cb) => a.emit('room:ready', { code: room.code }, cb));
    await ack<RoomView>((cb) => b.emit('room:ready', { code: room.code }, cb));
    room = await ack<RoomView>((cb) => a.emit('match:start', { code: room.code }, cb));
    const synced = await ack<RoomView>((cb) => b.emit('room:sync', { code: room.code }, cb));
    expect(synced.game!.sessionId).toBe(room.game!.sessionId);
  });
  it('rejects slot impersonation and malicious score claims', async () => {
    const command = {
      code: room.code,
      sessionId: room.game!.sessionId,
      roundId: room.game!.roundId,
      actionId: randomUUID(),
      playerId: bId,
      payload: { type: 'ANSWER' as const, optionId: 'A' as const },
    };
    await expect(ack<ActionReceipt>((cb) => a.emit('game:action', command, cb))).rejects.toThrow(
      'quyền điều khiển',
    );
    await expect(
      ack<ActionReceipt>((cb) =>
        a.emit(
          'game:action',
          {
            ...command,
            playerId: aId,
            payload: { ...command.payload, score: 1000 },
          } as typeof command,
          cb,
        ),
      ),
    ).rejects.toThrow();
  });
  it('hides opponent answers during play and recovers a snapshot after reconnect', async () => {
    await ack<ActionReceipt>((cb) =>
      a.emit(
        'game:action',
        {
          code: room.code,
          sessionId: room.game!.sessionId,
          roundId: room.game!.roundId,
          actionId: randomUUID(),
          playerId: aId,
          payload: { type: 'ANSWER', optionId: 'A' },
        },
        cb,
      ),
    );
    const opponent = await ack<RoomView>((cb) => b.emit('room:sync', { code: room.code }, cb));
    expect(opponent.game!.ownAnswers).toEqual({});
    expect(opponent.game!.reveal).toBeNull();
    a.disconnect();
    a = await connect(aToken);
    const recovered = await ack<RoomView>((cb) => a.emit('room:sync', { code: room.code }, cb));
    expect(recovered.game!.ownAnswers[aId]).toBe('A');
  });
  it('persists exactly one result then starts a fresh session after both rematch votes', async () => {
    await ack<ActionReceipt>((cb) =>
      b.emit(
        'game:action',
        {
          code: room.code,
          sessionId: room.game!.sessionId,
          roundId: room.game!.roundId,
          actionId: randomUUID(),
          playerId: bId,
          payload: { type: 'ANSWER', optionId: 'B' },
        },
        cb,
      ),
    );
    await app.get(RoomsService).tick(Date.now() + 4000);
    const finished = await ack<RoomView>((cb) => a.emit('room:sync', { code: room.code }, cb));
    expect(finished.status).toBe('FINISHED');
    expect(store.results.size).toBe(1);
    await ack<RoomView>((cb) => a.emit('room:rematch', { code: room.code }, cb));
    const fresh = await ack<RoomView>((cb) => b.emit('room:rematch', { code: room.code }, cb));
    expect(fresh.game!.sessionId).not.toBe(room.game!.sessionId);
    expect(store.results.size).toBe(1);
  });
  it.each([
    ['SOLO', 'MULTI_DEVICE'],
    ['DUEL', 'MULTI_DEVICE'],
    ['DUEL', 'SHARED_SCREEN'],
    ['COOP', 'MULTI_DEVICE'],
    ['COOP', 'SHARED_SCREEN'],
  ] as [GameMode, GameLayout][])(
    'prepares casual %s/%s through real socket commands',
    async (mode, layout) => {
      if (room) {
        await ack<null>((cb) => a.emit('room:leave', { code: room.code }, cb));
      }
      room = await ack<RoomView>((cb) =>
        a.emit(
          'room:create',
          {
            mode,
            layout,
            selection: { type: 'CASUAL_RANDOM' },
          },
          cb,
        ),
      );
      if (mode !== 'SOLO' && layout === 'MULTI_DEVICE') {
        await ack<RoomView>((cb) => b.emit('room:join', { code: room.code }, cb));
        await ack<RoomView>((cb) => b.emit('room:ready', { code: room.code }, cb));
      }
      await ack<RoomView>((cb) => a.emit('room:ready', { code: room.code }, cb));
      const started = await ack<RoomView>((cb) => a.emit('match:start', { code: room.code }, cb));
      expect(started.setup?.selection?.type).toBe('CASUAL_RANDOM');
      expect(started.game?.questionCount).toBe(1);
      expect(JSON.stringify(started)).not.toContain('correctOptionId');
      if (mode !== 'SOLO' && layout === 'MULTI_DEVICE') {
        const synced = await ack<RoomView>((cb) => b.emit('room:sync', { code: room.code }, cb));
        expect(synced.game?.question).toEqual(started.game?.question);
      }
    },
  );
});
