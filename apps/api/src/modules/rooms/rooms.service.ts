import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { assertDomain, KeyedQueue } from '@duoquest/game-core';
import type {
  GameActionCommand,
  GameLayout,
  GameMode,
  PlayerSlot,
  RoomStatus,
  RoomView,
} from '@duoquest/shared-types';
import { PlatformStore, type PackRecord, type PlayerRecord } from '../persistence/store';
import { PlayersService } from '../players/players.service';
import { SessionsService, type LiveSession } from '../sessions/sessions.service';

interface Participant extends PlayerSlot {
  controllerId: string;
  disconnectedAt: number | null;
}
interface LiveRoom {
  code: string;
  hostPlayerId: string;
  mode: GameMode;
  layout: GameLayout;
  status: RoomStatus;
  players: Participant[];
  pack: PackRecord;
  session: LiveSession | null;
  rematchVotes: Set<string>;
  touchedAt: number;
}
// PROPOSAL: continue clocks during reconnect; cancel without rewards after 30s offline.
export const ROOM_POLICY = { reconnectGraceMs: 30_000, idleTtlMs: 15 * 60_000, maxRooms: 128 };
@Injectable()
export class RoomsService implements OnModuleInit, OnModuleDestroy {
  readonly events = new EventEmitter();
  private readonly logger = new Logger(RoomsService.name);
  private readonly rooms = new Map<string, LiveRoom>();
  private readonly queue = new KeyedQueue();
  private readonly connections = new Map<string, Set<string>>();
  private timer?: ReturnType<typeof setInterval>;
  private ticking = false;
  constructor(
    @Inject(PlatformStore) private readonly store: PlatformStore,
    @Inject(PlayersService) private readonly playersService: PlayersService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      if (this.ticking) return;
      this.ticking = true;
      void this.tick(Date.now())
        .catch((error: unknown) => this.logger.error(error))
        .finally(() => {
          this.ticking = false;
        });
    }, 250);
    this.timer.unref();
  }
  onModuleDestroy() {
    clearInterval(this.timer);
    this.events.removeAllListeners();
  }
  async connect(playerId: string, socketId: string) {
    const sockets = this.connections.get(playerId) ?? new Set<string>();
    sockets.add(socketId);
    this.connections.set(playerId, sockets);
    for (const room of this.rooms.values())
      if (room.players.some((p) => p.controllerId === playerId))
        await this.queue.run(room.code, () => {
          room.players
            .filter((p) => p.controllerId === playerId)
            .forEach((p) => {
              p.connected = true;
              p.disconnectedAt = null;
            });
          this.changed(room);
        });
  }
  async disconnect(playerId: string, socketId: string) {
    const sockets = this.connections.get(playerId);
    sockets?.delete(socketId);
    if (sockets?.size) return;
    this.connections.delete(playerId);
    for (const room of this.rooms.values())
      if (room.players.some((p) => p.controllerId === playerId))
        await this.queue.run(room.code, () => {
          room.players
            .filter((p) => p.controllerId === playerId)
            .forEach((p) => {
              p.connected = false;
              p.disconnectedAt = Date.now();
            });
          this.changed(room);
        });
  }
  async create(
    player: PlayerRecord,
    input: { mode: GameMode; layout: GameLayout; packVersionId: string; secondNickname?: string },
  ) {
    return this.queue.run('__membership__', async () => {
      assertDomain(
        this.rooms.size < ROOM_POLICY.maxRooms,
        'RATE_LIMITED',
        'Host đã đạt giới hạn phòng',
      );
      assertDomain(
        ![...this.rooms.values()].some(
          (r) => r.status !== 'CANCELLED' && r.players.some((p) => p.controllerId === player.id),
        ),
        'CONFLICT',
        'Hãy rời phòng hiện tại trước',
      );
      const pack = await this.store.getPack(input.packVersionId, player.id);
      assertDomain(pack, 'NOT_FOUND', 'Không có quyền dùng bộ đề này');
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code: string;
      do {
        code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
      } while (this.rooms.has(code));
      const slots: Participant[] = [
        {
          playerId: player.id,
          nickname: player.nickname,
          ready: false,
          connected: true,
          controllerId: player.id,
          disconnectedAt: null,
        },
      ];
      if (input.mode !== 'SOLO' && input.layout === 'SHARED_SCREEN') {
        const second = await this.playersService.create(input.secondNickname ?? 'Người chơi 2');
        slots.push({
          playerId: second.playerId,
          nickname: second.nickname,
          ready: false,
          connected: true,
          controllerId: player.id,
          disconnectedAt: null,
        });
      }
      const room: LiveRoom = {
        code,
        hostPlayerId: player.id,
        mode: input.mode,
        layout: input.layout,
        status: 'WAITING',
        players: slots,
        pack,
        session: null,
        rematchVotes: new Set(),
        touchedAt: Date.now(),
      };
      this.rooms.set(code, room);
      this.changed(room);
      return this.view(room, player.id);
    });
  }
  async join(code: string, player: PlayerRecord) {
    return this.queue.run('__membership__', () =>
      this.queue.run(code, () => {
        const room = this.find(code);
        if (room.players.some((p) => p.controllerId === player.id))
          return this.view(room, player.id);
        assertDomain(
          ![...this.rooms.values()].some(
            (r) =>
              r !== room &&
              r.status !== 'CANCELLED' &&
              r.players.some((p) => p.controllerId === player.id),
          ),
          'CONFLICT',
          'Hãy rời phòng hiện tại trước',
        );
        assertDomain(
          room.layout === 'MULTI_DEVICE' &&
            room.mode !== 'SOLO' &&
            room.status === 'WAITING' &&
            room.players.length < 2,
          'CONFLICT',
          'Phòng không thể nhận thêm người',
        );
        room.players.push({
          playerId: player.id,
          nickname: player.nickname,
          ready: false,
          connected: true,
          controllerId: player.id,
          disconnectedAt: null,
        });
        this.changed(room);
        return this.view(room, player.id);
      }),
    );
  }
  ready(code: string, playerId: string) {
    return this.queue.run(code, () => {
      const room = this.authorize(code, playerId);
      assertDomain(
        room.status === 'WAITING' || room.status === 'READY',
        'CONFLICT',
        'Không thể Ready lúc này',
      );
      room.players
        .filter((p) => p.controllerId === playerId)
        .forEach((p) => {
          p.ready = true;
        });
      if (
        room.players.length === (room.mode === 'SOLO' ? 1 : 2) &&
        room.players.every((p) => p.ready && p.connected)
      )
        room.status = 'READY';
      this.changed(room);
      return this.view(room, playerId);
    });
  }
  start(code: string, playerId: string) {
    return this.queue.run(code, async () => {
      const room = this.authorize(code, playerId);
      assertDomain(room.hostPlayerId === playerId, 'FORBIDDEN', 'Chỉ host được bắt đầu');
      assertDomain(
        room.status === 'READY' && room.players.every((p) => p.connected),
        'CONFLICT',
        'Chờ tất cả Ready và kết nối',
      );
      await this.startSession(room);
      return this.view(room, playerId);
    });
  }
  sync(code: string, playerId: string) {
    return this.queue.run(code, () => this.view(this.authorize(code, playerId), playerId));
  }
  action(command: GameActionCommand, controllerId: string) {
    return this.queue.run(command.code, async () => {
      const room = this.authorize(command.code, controllerId);
      assertDomain(
        room.players.some(
          (p) => p.playerId === command.playerId && p.controllerId === controllerId,
        ),
        'FORBIDDEN',
        'Không có quyền điều khiển slot',
      );
      assertDomain(
        room.session && (room.status === 'IN_PROGRESS' || room.status === 'FINISHED'),
        'CONFLICT',
        'Trận chưa chạy',
      );
      const receipt = await this.sessions.apply(room.session, command, Date.now());
      this.changed(room);
      return receipt;
    });
  }
  rematch(code: string, playerId: string) {
    return this.queue.run(code, async () => {
      const room = this.authorize(code, playerId);
      assertDomain(
        room.status === 'FINISHED' && room.players.every((p) => p.connected),
        'CONFLICT',
        'Chờ kết quả và đủ người kết nối',
      );
      room.rematchVotes.add(playerId);
      const controllers = new Set(room.players.map((p) => p.controllerId));
      if ([...controllers].every((id) => room.rematchVotes.has(id))) await this.startSession(room);
      this.changed(room);
      return this.view(room, playerId);
    });
  }
  leave(code: string, playerId: string) {
    return this.queue.run(code, async () => {
      const room = this.authorize(code, playerId);
      if (room.session && room.status === 'IN_PROGRESS') await this.sessions.cancel(room.session);
      room.status = 'CANCELLED';
      this.changed(room);
      // Cancel entire room in V1. Historical session/results remain in PostgreSQL.
      this.rooms.delete(code);
      return null;
    });
  }
  viewFor(code: string, playerId: string) {
    return this.view(this.authorize(code, playerId), playerId);
  }
  async tick(now: number) {
    for (const code of this.rooms.keys())
      await this.queue.run(code, async () => {
        const room = this.rooms.get(code);
        if (!room) return;
        if (
          room.status === 'IN_PROGRESS' &&
          room.players.some(
            (p) =>
              p.disconnectedAt !== null && now - p.disconnectedAt >= ROOM_POLICY.reconnectGraceMs,
          )
        ) {
          if (room.session) await this.sessions.cancel(room.session);
          room.status = 'CANCELLED';
          this.changed(room);
          this.rooms.delete(code);
          return;
        }
        if (room.status !== 'IN_PROGRESS' && now - room.touchedAt >= ROOM_POLICY.idleTtlMs) {
          room.status = 'CANCELLED';
          this.changed(room);
          this.rooms.delete(code);
          return;
        }
        if (
          room.status === 'IN_PROGRESS' &&
          room.session &&
          (await this.sessions.tick(room.session, now))
        ) {
          if (room.session.state.phase === 'FINISHED') room.status = 'FINISHED';
          this.changed(room);
        }
      });
  }
  private async startSession(room: LiveRoom) {
    room.session = await this.sessions.create(
      room.code,
      room.mode,
      room.layout,
      room.players.map((p) => p.playerId),
      room.pack,
      Date.now(),
    );
    room.status = 'IN_PROGRESS';
    room.rematchVotes.clear();
    this.changed(room);
  }
  private find(code: string) {
    const room = this.rooms.get(code);
    assertDomain(room, 'NOT_FOUND', 'Phòng không tồn tại hoặc đã hết hạn');
    return room;
  }
  private authorize(code: string, playerId: string) {
    const room = this.find(code);
    assertDomain(
      room.players.some((p) => p.controllerId === playerId),
      'FORBIDDEN',
      'Bạn không thuộc phòng',
    );
    return room;
  }
  private changed(room: LiveRoom) {
    room.touchedAt = Date.now();
    this.events.emit('changed', room.code);
  }
  private view(room: LiveRoom, controllerId: string): RoomView {
    const controlledPlayerIds = room.players
      .filter((p) => p.controllerId === controllerId)
      .map((p) => p.playerId);
    return {
      code: room.code,
      hostPlayerId: room.hostPlayerId,
      mode: room.mode,
      layout: room.layout,
      status: room.status,
      players: room.players.map(({ playerId, nickname, ready, connected }) => ({
        playerId,
        nickname,
        ready,
        connected,
      })),
      controlledPlayerIds,
      rematchVotes: [...room.rematchVotes],
      game: room.session
        ? this.sessions.engine.getPlayerView(room.session.state, controlledPlayerIds, Date.now())
        : null,
    };
  }
}
