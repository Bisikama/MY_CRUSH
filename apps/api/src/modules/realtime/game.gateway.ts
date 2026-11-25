import { Inject, Logger, type OnModuleDestroy } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, type OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ZodError } from 'zod';
import { DomainError } from '@duoquest/game-core';
import {
  createRoomSchema,
  gameActionSchema,
  joinRoomSchema,
  roomCommandSchema,
  type Ack,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@duoquest/shared-types';
import { webOrigins } from '../../common/config';
import { resolveClientIp } from '../../common/client-ip';
import { formatZodError, serializeErrorForLog } from '../../common/error-utils';
import { AuthSessions, type Principal, type Revocation } from '../auth/auth-session.service';
import { readCookie, SESSION_COOKIE } from '../auth/auth-security';
import { RoomsService } from '../rooms/rooms.service';

const SOCKET_LIMITS = {
  maxPerPlayer: 4,
  maxPerIp: 20,
  roomCreateLimitPerIp: 15,
  roomCreateWindowMs: 15 * 60_000,
} as const;

type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  { principal: Principal; credential: string; clientIp: string; revoked?: boolean }
>;
@WebSocketGateway({
  cors: { origin: webOrigins, credentials: true },
  allowRequest: (request, callback) =>
    callback(null, !!request.headers.origin && webOrigins.includes(request.headers.origin)),
  maxHttpBufferSize: 16_384,
  transports: ['websocket', 'polling'],
})
export class GameGateway implements OnGatewayInit, OnModuleDestroy {
  @WebSocketServer() server!: Server<ClientToServerEvents, ServerToClientEvents>;
  private readonly logger = new Logger(GameGateway.name);
  private readonly cache = new Map<string, { principal: Principal; until: number }>();
  private readonly pending = new Map<string, Promise<Principal>>();
  private readonly socketsByIp = new Map<string, Set<string>>();
  private readonly socketsByPlayer = new Map<string, Set<string>>();
  private readonly roomCreateLimits = new Map<string, { count: number; resetAt: number }>();
  private generation = 0;
  private expiryTimer?: ReturnType<typeof setInterval>;

  private async authenticate(credential: string, touch: boolean): Promise<Principal> {
    const cached = this.cache.get(credential);
    if (cached && cached.until > Date.now()) return cached.principal;
    const inFlight = this.pending.get(credential);
    if (inFlight) return inFlight;
    const generation = this.generation;
    const lookup = this.sessions
      .resolve(credential, touch)
      .then((principal) => {
        if (!principal || generation !== this.generation || principal.validUntil <= Date.now())
          throw new DomainError('UNAUTHORIZED', 'Phiên đã hết hạn hoặc bị thu hồi.');
        if (this.cache.size >= 2048) this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(credential, {
          principal,
          until: Math.min(Date.now() + 5000, principal.validUntil),
        });
        return principal;
      })
      .finally(() => {
        this.pending.delete(credential);
      });
    this.pending.set(credential, lookup);
    return lookup;
  }

  private readonly revoke = (scope: Revocation) => {
    this.generation++;
    const matches = (principal: Principal) =>
      'sessionId' in scope
        ? principal.sessionId === scope.sessionId
        : 'accountId' in scope
          ? principal.accountId === scope.accountId
          : principal.playerId === scope.playerId;
    for (const [credential, entry] of this.cache)
      if (matches(entry.principal)) this.cache.delete(credential);
    for (const raw of this.server.sockets.sockets.values()) {
      const socket = raw as GameSocket;
      if (matches(socket.data.principal)) {
        socket.data.revoked = true;
        socket.disconnect(true);
      }
    }
  };
  private readonly publish = (code: string) => {
    for (const socket of this.server.sockets.sockets.values()) {
      const client = socket as GameSocket;
      if (
        !client.rooms.has(code) ||
        client.data.revoked ||
        client.data.principal.validUntil <= Date.now()
      )
        continue;
      try {
        client.emit('room:state', this.rooms.viewFor(code, client.data.principal.playerId));
      } catch (error) {
        this.logger.warn(
          JSON.stringify({
            event: 'room:state:publish',
            code,
            socketId: client.id,
            playerId: client.data.principal.playerId,
            error: serializeErrorForLog(error),
          }),
        );
        void client.leave(code);
      }
    }
  };
  constructor(
    @Inject(AuthSessions) private readonly sessions: AuthSessions,
    @Inject(RoomsService) private readonly rooms: RoomsService,
  ) {}
  private trackSocket(map: Map<string, Set<string>>, key: string, socketId: string) {
    const group = map.get(key) ?? new Set<string>();
    group.add(socketId);
    map.set(key, group);
  }

  private untrackSocket(map: Map<string, Set<string>>, key: string, socketId: string) {
    const group = map.get(key);
    if (!group) return;
    group.delete(socketId);
    if (group.size === 0) map.delete(key);
  }

  private reserveRoomCreate(clientIp: string) {
    const now = Date.now();
    const current = this.roomCreateLimits.get(clientIp);
    if (!current || current.resetAt <= now) {
      this.roomCreateLimits.set(clientIp, {
        count: 1,
        resetAt: now + SOCKET_LIMITS.roomCreateWindowMs,
      });
      return;
    }
    if (current.count >= SOCKET_LIMITS.roomCreateLimitPerIp) {
      throw new DomainError('RATE_LIMITED', 'Tạo phòng quá nhanh. Hãy đợi rồi thử lại.');
    }
    current.count++;
  }

  afterInit(server: Server<ClientToServerEvents, ServerToClientEvents>) {
    server.use((socket, next) => {
      const credential = readCookie(socket.handshake.headers.cookie, SESSION_COOKIE);
      if (!credential) return next(new Error('UNAUTHORIZED'));
      const clientIp = resolveClientIp(socket.handshake.address, socket.handshake.headers);
      if ((this.socketsByIp.get(clientIp)?.size ?? 0) >= SOCKET_LIMITS.maxPerIp) {
        this.logger.warn(JSON.stringify({ event: 'ws:handshake', code: 'RATE_LIMITED', clientIp }));
        return next(new Error('RATE_LIMITED'));
      }
      void this.authenticate(credential, false).then(
        (principal) => {
          if (
            (this.socketsByPlayer.get(principal.playerId)?.size ?? 0) >= SOCKET_LIMITS.maxPerPlayer
          ) {
            this.logger.warn(
              JSON.stringify({
                event: 'ws:handshake',
                code: 'RATE_LIMITED',
                playerId: principal.playerId,
              }),
            );
            return next(new Error('RATE_LIMITED'));
          }
          socket.data.principal = principal;
          socket.data.credential = credential;
          socket.data.clientIp = clientIp;
          next();
        },
        (error: unknown) => {
          if (!(error instanceof DomainError && error.code === 'UNAUTHORIZED')) {
            this.logger.warn(
              JSON.stringify({
                event: 'ws:handshake',
                socketId: socket.id,
                error: serializeErrorForLog(error),
              }),
            );
          }
          next(new Error('UNAUTHORIZED'));
        },
      );
    });
    this.sessions.events.on('revoked', this.revoke);
    this.expiryTimer = setInterval(() => {
      const now = Date.now();
      for (const [credential, entry] of this.cache)
        if (entry.until <= now) this.cache.delete(credential);
      for (const [ipKey, entry] of this.roomCreateLimits)
        if (entry.resetAt <= now) this.roomCreateLimits.delete(ipKey);
      for (const raw of server.sockets.sockets.values()) {
        const socket = raw as GameSocket;
        if (socket.data.principal.validUntil <= now) socket.disconnect(true);
      }
    }, 30_000);
    this.expiryTimer.unref();
    server.on('connection', (raw) => {
      void this.bind(raw as GameSocket).catch((error: unknown) => {
        this.logger.error(
          JSON.stringify({
            event: 'ws:bind',
            socketId: raw.id,
            playerId: (raw as GameSocket).data.principal?.playerId ?? null,
            error: serializeErrorForLog(error),
          }),
        );
        raw.disconnect(true);
      });
    });
    this.rooms.events.on('changed', this.publish);
  }
  onModuleDestroy() {
    this.rooms.events.off('changed', this.publish);
    this.sessions.events.off('revoked', this.revoke);
    clearInterval(this.expiryTimer);
    this.cache.clear();
    this.socketsByIp.clear();
    this.socketsByPlayer.clear();
    this.roomCreateLimits.clear();
  }
  private async bind(socket: GameSocket) {
    const principal = socket.data.principal;
    const clientIp = socket.data.clientIp ?? 'unknown';
    const player = { id: principal.playerId, nickname: principal.nickname, tokenHash: null };
    this.trackSocket(this.socketsByIp, clientIp, socket.id);
    this.trackSocket(this.socketsByPlayer, player.id, socket.id);
    const check = async () => {
      if (socket.data.revoked || !socket.connected)
        throw new DomainError('UNAUTHORIZED', 'Phiên socket đã đóng.');
      const current = await this.authenticate(socket.data.credential, true);
      if (socket.data.revoked || !socket.connected)
        throw new DomainError('UNAUTHORIZED', 'Phiên socket đã đóng.');
      socket.data.principal = current;
    };
    let windowStart = Date.now();
    let count = 0;
    const execute = async <T>(
      eventName: keyof ClientToServerEvents,
      ack: ((result: Ack<T>) => void) | undefined,
      task: () => Promise<T>,
    ) => {
      if (typeof ack !== 'function') return;
      try {
        if (Date.now() - windowStart > 1000) {
          count = 0;
          windowStart = Date.now();
        }
        if (++count > 25) throw new DomainError('RATE_LIMITED', 'Thao tác quá nhanh');
        await check();
        ack({ ok: true, data: await task() });
      } catch (error) {
        const context = { event: eventName, socketId: socket.id, playerId: player.id };
        if (error instanceof DomainError) {
          if (error.code === 'UNAUTHORIZED') socket.disconnect(true);
          if (error.code === 'RATE_LIMITED' || error.code === 'UNAUTHORIZED') {
            this.logger.warn(JSON.stringify({ ...context, code: error.code }));
          } else {
            this.logger.debug(JSON.stringify({ ...context, code: error.code }));
          }
          ack({ ok: false, error: { code: error.code, message: error.message } });
        } else if (error instanceof ZodError) {
          this.logger.debug(
            JSON.stringify({ ...context, code: 'INVALID_INPUT', issues: error.issues.length }),
          );
          ack({
            ok: false,
            error: {
              code: 'INVALID_INPUT',
              message: formatZodError(error),
            },
          });
        } else {
          this.logger.error(
            JSON.stringify({
              ...context,
              code: 'INTERNAL',
              error: serializeErrorForLog(error),
            }),
          );
          ack({ ok: false, error: { code: 'INTERNAL', message: 'Không thể hoàn thành thao tác' } });
        }
      }
    };
    socket.on('room:create', (data, ack) => {
      void execute('room:create', ack, async () => {
        this.reserveRoomCreate(clientIp);
        const view = await this.rooms.create(player, createRoomSchema.parse(data), check, clientIp);
        await socket.join(view.code);
        return view;
      });
    });
    socket.on('room:join', (data, ack) => {
      void execute('room:join', ack, async () => {
        const view = await this.rooms.join(joinRoomSchema.parse(data).code, player, check);
        await socket.join(view.code);
        return view;
      });
    });
    socket.on('room:sync', (data, ack) => {
      void execute('room:sync', ack, async () => {
        const view = await this.rooms.sync(roomCommandSchema.parse(data).code, player.id, check);
        await socket.join(view.code);
        return view;
      });
    });
    socket.on('room:ready', (data, ack) => {
      void execute('room:ready', ack, () =>
        this.rooms.ready(roomCommandSchema.parse(data).code, player.id, check),
      );
    });
    socket.on('match:start', (data, ack) => {
      void execute('match:start', ack, () =>
        this.rooms.start(roomCommandSchema.parse(data).code, player.id, check),
      );
    });
    socket.on('room:rematch', (data, ack) => {
      void execute('room:rematch', ack, () =>
        this.rooms.rematch(roomCommandSchema.parse(data).code, player.id, check),
      );
    });
    socket.on('room:leave', (data, ack) => {
      void execute('room:leave', ack, async () => {
        const code = roomCommandSchema.parse(data).code;
        await this.rooms.leave(code, player.id, check);
        await socket.leave(code);
        return null;
      });
    });
    socket.on('game:action', (data, ack) => {
      void execute('game:action', ack, () =>
        this.rooms.action(
          gameActionSchema.parse(data),
          player.id,
          check,
          !!socket.data.principal.accountId,
        ),
      );
    });
    socket.on('disconnect', () => {
      this.untrackSocket(this.socketsByIp, clientIp, socket.id);
      this.untrackSocket(this.socketsByPlayer, player.id, socket.id);
      void this.rooms.disconnect(player.id, socket.id).catch((error: unknown) =>
        this.logger.error(
          JSON.stringify({
            event: 'ws:disconnect',
            socketId: socket.id,
            playerId: player.id,
            error: serializeErrorForLog(error),
          }),
        ),
      );
    });
    await this.rooms.connect(player.id, socket.id);
  }
}
