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
  CurrentRoomSummary,
  GameActionCommand,
  GameLayout,
  GameMode,
  PlayerSlot,
  RoomStatus,
  RoomView,
  createRoomSchema,
} from '@duoquest/shared-types';
import { type PlayerRecord } from '../persistence/store';
import { PlayersService } from '../players/players.service';
import { SessionsService, type LiveSession } from '../sessions/sessions.service';
import {
  QuizPreparationService,
  type PreparedQuiz,
} from '../question-packs/quiz-preparation.service';

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
  prepared: PreparedQuiz;
  cancelRequested: boolean;
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
    @Inject(PlayersService) private readonly playersService: PlayersService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
    @Inject(QuizPreparationService) private readonly preparation: QuizPreparationService,
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
  withoutOpenRoom<T>(playerId: string | undefined, task: () => Promise<T>) {
    return this.queue.run('__membership__', () => {
      assertDomain(
        !playerId ||
          ![...this.rooms.values()].some(
            (room) =>
              room.status !== 'CANCELLED' &&
              room.players.some((slot) => slot.controllerId === playerId),
          ),
        'CONFLICT',
        'Hãy rời phòng hiện tại trước khi chuyển danh tính',
      );
      return task();
    });
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
    input: import('zod').infer<typeof createRoomSchema>,
    check?: () => Promise<void>,
  ) {
    return this.queue.run('__membership__', async () => {
      await check?.();
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
      const prepared = await this.preparation.prepare(
        player.id,
        input.mode,
        input.selection ?? {
          type: 'STUDY',
          packVersionId: input.packVersionId!,
          filter: input.filter,
        },
      );
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
        prepared,
        cancelRequested: false,
        session: null,
        rematchVotes: new Set(),
        touchedAt: Date.now(),
      };
      this.rooms.set(code, room);
      this.changed(room);
      return this.view(room, player.id);
    });
  }
  async join(code: string, player: PlayerRecord, check?: () => Promise<void>) {
    return this.queue.run('__membership__', () =>
      this.queue.run(code, async () => {
        await check?.();
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
  ready(code: string, playerId: string, check?: () => Promise<void>) {
    return this.queue.run(code, async () => {
      await check?.();
      const room = this.authorize(code, playerId);
      assertDomain(!room.cancelRequested, 'CONFLICT', 'Phòng đang chờ đóng');
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
  start(code: string, playerId: string, check?: () => Promise<void>) {
    return this.queue.run(code, async () => {
      await check?.();
      const room = this.authorize(code, playerId);
      assertDomain(!room.cancelRequested, 'CONFLICT', 'Phòng đang chờ đóng');
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
  sync(code: string, playerId: string, check?: () => Promise<void>) {
    return this.queue.run(code, async () => {
      await check?.();
      return this.view(this.authorize(code, playerId), playerId);
    });
  }
  action(
    command: GameActionCommand,
    controllerId: string,
    check?: () => Promise<void>,
    hasAccount = false,
  ) {
    return this.queue.run(command.code, async () => {
      await check?.();
      const room = this.authorize(command.code, controllerId);
      assertDomain(!room.cancelRequested, 'CONFLICT', 'Phòng đang chờ đóng');
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
      const receipt = await this.sessions.apply(
        room.session,
        command,
        Date.now(),
        hasAccount && command.playerId === controllerId,
      );
      this.changed(room);
      return receipt;
    });
  }
  rematch(code: string, playerId: string, check?: () => Promise<void>) {
    return this.queue.run(code, async () => {
      await check?.();
      const room = this.authorize(code, playerId);
      assertDomain(!room.cancelRequested, 'CONFLICT', 'Phòng đang chờ đóng');
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
  leave(code: string, playerId: string, check?: () => Promise<void>) {
    return this.queue.run(code, async () => {
      await check?.();
      const room = this.authorize(code, playerId);
      await this.cancelRoom(room);
      return null;
    });
  }
  viewFor(code: string, playerId: string) {
    return this.view(this.authorize(code, playerId), playerId);
  }
  currentFor(playerId: string): Promise<CurrentRoomSummary | null> {
    return this.queue.run('__membership__', async () => {
      const target = [...this.rooms.values()].find(
        (room) =>
          room.status !== 'CANCELLED' &&
          room.players.some((slot) => slot.controllerId === playerId),
      );
      if (!target) return null;
      return this.queue.run(target.code, () => {
        const fresh = this.rooms.get(target.code);
        if (
          !fresh ||
          fresh.status === 'CANCELLED' ||
          !fresh.players.some((slot) => slot.controllerId === playerId)
        )
          return null;
        return {
          code: fresh.code,
          gameId: 'quiz' as const,
          status: fresh.status,
        };
      });
    });
  }
  async tick(now: number) {
    for (const code of this.rooms.keys())
      await this.queue.run(code, async () => {
        const room = this.rooms.get(code);
        if (!room) return;
        if (
          room.cancelRequested ||
          (room.status === 'IN_PROGRESS' &&
            room.players.some(
              (p) =>
                p.disconnectedAt !== null && now - p.disconnectedAt >= ROOM_POLICY.reconnectGraceMs,
            ))
        ) {
          await this.cancelRoom(room);
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
    const prepared = room.session
      ? await this.preparation.prepare(
          room.hostPlayerId,
          room.mode,
          room.prepared.snapshot.selection,
        )
      : room.prepared;
    room.session = await this.sessions.create(
      room.code,
      room.mode,
      room.layout,
      room.players.map((p) => p.playerId),
      prepared,
      Date.now(),
    );
    room.prepared = prepared;
    room.status = 'IN_PROGRESS';
    room.rematchVotes.clear();
    this.changed(room);
  }
  private async cancelRoom(room: LiveRoom) {
    room.cancelRequested = true;
    if (room.session && room.status === 'IN_PROGRESS') await this.sessions.cancel(room.session);
    room.status = 'CANCELLED';
    this.changed(room);
    this.rooms.delete(room.code);
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
    const game = room.session
      ? this.sessions.engine.getPlayerView(room.session.state, controlledPlayerIds, Date.now())
      : null;
    if (game && room.session) {
      for (const slot of game.skillSlots)
        if (slot.playerId === controllerId) slot.stock = { ...room.session.stock[slot.playerId] };
    }
    return {
      setup: {
        title: room.prepared.title,
        category: room.prepared.category,
        filter:
          room.prepared.snapshot.selection.type === 'STUDY'
            ? (room.prepared.snapshot.selection.filter ?? {})
            : {},
        selection: room.prepared.snapshot.selection,
        questionCount: room.prepared.questions.length,
      },
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
      game,
    };
  }
}
