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
import { PlayersService } from '../players/players.service';
import { RoomsService } from '../rooms/rooms.service';
import type { PlayerRecord } from '../persistence/store';

type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  { player: PlayerRecord }
>;
@WebSocketGateway({
  cors: { origin: webOrigins },
  maxHttpBufferSize: 16_384,
  transports: ['websocket', 'polling'],
})
export class GameGateway implements OnGatewayInit, OnModuleDestroy {
  @WebSocketServer() server!: Server<ClientToServerEvents, ServerToClientEvents>;
  private readonly logger = new Logger(GameGateway.name);
  private readonly publish = (code: string) => {
    for (const socket of this.server.sockets.sockets.values()) {
      const client = socket as GameSocket;
      if (!client.rooms.has(code)) continue;
      try {
        client.emit('room:state', this.rooms.viewFor(code, client.data.player.id));
      } catch {
        void client.leave(code);
      }
    }
  };
  constructor(
    @Inject(PlayersService) private readonly players: PlayersService,
    @Inject(RoomsService) private readonly rooms: RoomsService,
  ) {}
  afterInit(server: Server<ClientToServerEvents, ServerToClientEvents>) {
    server.use((socket, next) => {
      void this.players.authenticate(socket.handshake.auth.token).then(
        (player) => {
          socket.data.player = player;
          next();
        },
        () => next(new Error('UNAUTHORIZED')),
      );
    });
    server.on('connection', (raw) => {
      void this.bind(raw as GameSocket).catch((error: unknown) => {
        this.logger.error(error);
        raw.disconnect(true);
      });
    });
    this.rooms.events.on('changed', this.publish);
  }
  onModuleDestroy() {
    this.rooms.events.off('changed', this.publish);
  }
  private async bind(socket: GameSocket) {
    const player = socket.data.player;
    let windowStart = Date.now();
    let count = 0;
    const execute = async <T>(
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
        ack({ ok: true, data: await task() });
      } catch (error) {
        if (error instanceof DomainError)
          ack({ ok: false, error: { code: error.code, message: error.message } });
        else if (error instanceof ZodError)
          ack({
            ok: false,
            error: {
              code: 'INVALID_INPUT',
              message: error.issues.map((i) => i.message).join('; '),
            },
          });
        else {
          this.logger.error(error);
          ack({ ok: false, error: { code: 'INTERNAL', message: 'Không thể hoàn thành thao tác' } });
        }
      }
    };
    socket.on('room:create', (data, ack) => {
      void execute(ack, async () => {
        const view = await this.rooms.create(player, createRoomSchema.parse(data));
        await socket.join(view.code);
        return view;
      });
    });
    socket.on('room:join', (data, ack) => {
      void execute(ack, async () => {
        const view = await this.rooms.join(joinRoomSchema.parse(data).code, player);
        await socket.join(view.code);
        return view;
      });
    });
    socket.on('room:sync', (data, ack) => {
      void execute(ack, async () => {
        const view = await this.rooms.sync(roomCommandSchema.parse(data).code, player.id);
        await socket.join(view.code);
        return view;
      });
    });
    socket.on('room:ready', (data, ack) => {
      void execute(ack, () => this.rooms.ready(roomCommandSchema.parse(data).code, player.id));
    });
    socket.on('match:start', (data, ack) => {
      void execute(ack, () => this.rooms.start(roomCommandSchema.parse(data).code, player.id));
    });
    socket.on('room:rematch', (data, ack) => {
      void execute(ack, () => this.rooms.rematch(roomCommandSchema.parse(data).code, player.id));
    });
    socket.on('room:leave', (data, ack) => {
      void execute(ack, async () => {
        const code = roomCommandSchema.parse(data).code;
        await this.rooms.leave(code, player.id);
        await socket.leave(code);
        return null;
      });
    });
    socket.on('game:action', (data, ack) => {
      void execute(ack, () => this.rooms.action(gameActionSchema.parse(data), player.id));
    });
    socket.on('disconnect', () => {
      void this.rooms
        .disconnect(player.id, socket.id)
        .catch((error: unknown) => this.logger.error(error));
    });
    await this.rooms.connect(player.id, socket.id);
  }
}
