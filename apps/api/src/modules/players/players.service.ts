import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { assertDomain } from '@duoquest/game-core';
import { PlatformStore } from '../persistence/store';

const hash = (token: string) => createHash('sha256').update(token).digest('hex');
@Injectable()
export class PlayersService {
  constructor(@Inject(PlatformStore) private readonly store: PlatformStore) {}
  async create(nickname: string) {
    const token = randomBytes(32).toString('base64url');
    const player = await this.store.createPlayer(nickname, hash(token));
    return { playerId: player.id, nickname: player.nickname, token };
  }
  async authenticate(token: unknown) {
    assertDomain(
      typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token),
      'UNAUTHORIZED',
      'Cần guest token hợp lệ',
    );
    const player = await this.store.findPlayer(hash(token));
    assertDomain(player, 'UNAUTHORIZED', 'Phiên khách không còn hợp lệ');
    return player;
  }
  async fromHeader(authorization?: string) {
    return this.authenticate(
      authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined,
    );
  }
}
