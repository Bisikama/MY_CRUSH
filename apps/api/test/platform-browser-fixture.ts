import { createServer, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import type { Ack, RoomView } from '@duoquest/shared-types';

/** No Prisma/Nest/bootstrap: a per-test, loopback-only HTTP + Socket.IO fixture. */
export class PlatformBrowserFixture {
  identity: {
    kind: 'guest' | 'account';
    playerId: string;
    nickname: string;
    email: string | null;
    role: 'PLAYER' | null;
  } | null = {
    kind: 'guest',
    playerId: '11111111-1111-4111-8111-111111111111',
    nickname: 'Lifecycle Guest',
    email: null,
    role: null,
  };
  room: RoomView | null = null;
  expired = false;
  rejectConnections = false;
  authStatus = 200;
  authDelay = 0;
  profileStatus = 200;
  roomStatus = 200;
  holdRoomReads = false;
  holdLeave = false;
  dropCreateAck = false;
  readonly heldReads: Array<() => void> = [];
  releaseLeave: (() => void) | null = null;
  authReads = 0;
  roomReads = 0;
  connections = 0;
  maxConnections = 0;
  leaves = 0;
  syncs = 0;
  origin = '';

  private readonly server = createServer(async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', request.headers.origin ?? '*');
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Access-Control-Allow-Headers', 'content-type,x-csrf-token');
    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }
    const send = (value: unknown, status = 200) => this.send(response, value, status);
    const path = request.url?.split('?')[0];
    if (path === '/api/auth/me') {
      this.authReads++;
      const value = this.expired ? { kind: 'anonymous' } : (this.identity ?? { kind: 'anonymous' });
      if (this.authDelay) await new Promise((resolve) => setTimeout(resolve, this.authDelay));
      send(
        this.authStatus === 200 ? value : { message: 'Session lookup unavailable' },
        this.authStatus,
      );
    } else if (path === '/api/auth/csrf') send({ csrfToken: 'fixture-csrf' });
    else if (path === '/api/players/me') {
      const status = this.expired ? 401 : this.profileStatus;
      send(
        status === 200
          ? { nickname: this.identity?.nickname, xp: 20, wallet: { balance: 10 } }
          : { code: 'UNAUTHORIZED', message: 'Profile unavailable' },
        status,
      );
    } else if (path === '/api/rooms/current') {
      this.roomReads++;
      const status = this.expired ? 401 : this.roomStatus;
      const value =
        status === 200
          ? {
              room:
                this.room && this.room.controlledPlayerIds.includes(this.identity?.playerId ?? '')
                  ? {
                      code: this.room.code,
                      gameId: 'quiz',
                      status: this.room.status,
                    }
                  : null,
            }
          : { code: 'UNAUTHORIZED', message: 'Room unavailable' };
      const captured = JSON.stringify(value);
      const finish = () => {
        if (!response.destroyed) {
          response.writeHead(status, { 'Content-Type': 'application/json' });
          response.end(captured);
        }
      };
      if (this.holdRoomReads) this.heldReads.push(finish);
      else finish();
    } else if (path === '/api/question-packs')
      send([
        {
          id: '33333333-3333-4333-8333-333333333333',
          title: 'Lifecycle pack',
          questionCount: 1,
        },
      ]);
    else if (path === '/api/players/me/history') send([]);
    else if (path === '/api/players/guest') {
      let body = '';
      for await (const chunk of request) body += String(chunk);
      this.expired = false;
      this.identity = {
        kind: 'guest',
        playerId: '44444444-4444-4444-8444-444444444444',
        nickname: (JSON.parse(body) as { nickname: string }).nickname,
        email: null,
        role: null,
      };
      send(this.identity);
    } else if (path === '/api/auth/logout' || path === '/api/auth/logout-all') {
      this.identity = null;
      send({ ok: true });
    } else send({ message: 'Unknown fixture route' }, 404);
  });

  // Polling is proxied by Playwright to an ephemeral fixture port; no dependency on port 4000.
  readonly io = new Server(this.server, {
    cors: { origin: true, credentials: true },
    allowUpgrades: false,
  });

  constructor() {
    this.io.use((_socket, next) => {
      if (this.expired || !this.identity || this.rejectConnections) next(new Error('UNAUTHORIZED'));
      else next();
    });
    this.io.on('connection', (socket) => {
      this.connections++;
      this.maxConnections = Math.max(this.maxConnections, this.io.sockets.sockets.size);
      socket.on('room:create', (_input: unknown, ack: (value: Ack<RoomView>) => void) => {
        const playerId = this.identity!.playerId;
        this.room = {
          code: 'ABC234',
          hostPlayerId: playerId,
          mode: 'SOLO',
          layout: 'MULTI_DEVICE',
          status: 'WAITING',
          players: [{ playerId, nickname: this.identity!.nickname, ready: false, connected: true }],
          controlledPlayerIds: [playerId],
          rematchVotes: [],
          game: null,
        };
        if (!this.dropCreateAck) ack({ ok: true, data: this.room });
      });
      socket.on('room:sync', (_input: unknown, ack: (value: Ack<RoomView>) => void) => {
        this.syncs++;
        ack(
          this.room && this.room.controlledPlayerIds.includes(this.identity?.playerId ?? '')
            ? { ok: true, data: this.room }
            : { ok: false, error: { code: 'NOT_FOUND', message: 'No fixture room' } },
        );
      });
      socket.on('room:ready', (_input: unknown, ack: (value: Ack<RoomView>) => void) => {
        this.room!.status = 'READY';
        this.room!.players[0]!.ready = true;
        this.io.emit('room:state', this.room);
        ack({ ok: true, data: this.room! });
      });
      socket.on('match:start', (_input: unknown, ack: (value: Ack<RoomView>) => void) => {
        const id = this.identity!.playerId;
        this.room!.status = 'IN_PROGRESS';
        this.room!.game = {
          mode: 'SOLO',
          layout: 'MULTI_DEVICE',
          sessionId: '22222222-2222-4222-8222-222222222222',
          phase: 'QUESTION',
          version: 1,
          roundId: 'r1',
          questionNumber: 1,
          questionCount: 1,
          question: {
            id: 'q1',
            topic: 'Lifecycle',
            difficulty: 'easy',
            prompt: 'Lifecycle question',
            options: [
              { id: 'A', text: 'One' },
              { id: 'B', text: 'Two' },
            ],
          },
          deadline: Date.now() + 120_000,
          serverNow: Date.now(),
          scores: { [id]: 0 },
          answeredPlayerIds: [],
          ownAnswers: {},
          buzzerPlayerId: null,
          captainId: null,
          teamScore: 0,
          lives: 3,
          stage: 1,
          stageCount: 1,
          reveal: null,
          result: null,
        };
        this.io.emit('room:state', this.room);
        ack({ ok: true, data: this.room! });
      });
      socket.on('room:leave', (_input: unknown, ack: (value: Ack<null>) => void) => {
        this.leaves++;
        const finish = () => {
          if (this.room) this.io.emit('room:state', { ...this.room, status: 'CANCELLED' });
          this.room = null;
          ack({ ok: true, data: null });
        };
        if (this.holdLeave) this.releaseLeave = finish;
        else finish();
      });
    });
  }

  private send(response: ServerResponse, value: unknown, status: number) {
    if (response.destroyed) return;
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(value));
  }

  async start() {
    await new Promise<void>((resolve) => this.server.listen(0, '127.0.0.1', resolve));
    this.origin = 'http://127.0.0.1:' + (this.server.address() as AddressInfo).port;
  }

  releaseReads() {
    this.holdRoomReads = false;
    this.heldReads.splice(0).forEach((finish) => finish());
  }

  async close() {
    this.releaseReads();
    this.io.disconnectSockets(true);
    const closed = new Promise<void>((resolve) => this.io.close(() => resolve()));
    this.server.closeAllConnections();
    await closed;
  }
}
