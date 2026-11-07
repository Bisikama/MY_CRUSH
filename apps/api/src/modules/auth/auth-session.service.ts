import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { EventEmitter } from 'node:events';
import type { AccountRole, Prisma } from '@prisma/client';
import { PrismaService } from '../persistence/prisma.service';
import { DAY, digest, fail, token, tokenSchema } from './auth-security';

export interface Principal {
  sessionId: string;
  playerId: string;
  nickname: string;
  accountId: string | null;
  email: string | null;
  role: AccountRole | null;
  validUntil: number;
}
export type Revocation = { sessionId: string } | { accountId: string } | { playerId: string };
const TOUCH_MS = 15 * 60_000;

@Injectable()
export class AuthSessions implements OnModuleInit, OnModuleDestroy {
  readonly events = new EventEmitter();
  private readonly logger = new Logger(AuthSessions.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      const now = new Date();
      void this.db
        .$transaction([
          this.db.authSession.deleteMany({
            where: {
              OR: [
                { expiresAt: { lte: now } },
                { revokedAt: { not: null } },
                { lastActiveAt: { lte: new Date(+now - 7 * DAY) } },
              ],
            },
          }),
          this.db.emailChallenge.deleteMany({ where: { expiresAt: { lt: new Date(+now - DAY) } } }),
          this.db.authRateLimit.deleteMany({ where: { expiresAt: { lte: now } } }),
        ])
        .catch(() => this.logger.warn('Không dọn được bản ghi Auth hết hạn.'));
    }, 60 * 60_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  async issue(
    tx: Prisma.TransactionClient,
    playerId: string,
    accountId: string | null,
    value = token(),
  ) {
    await tx.authSession.create({
      data: {
        playerId,
        accountId,
        tokenHash: digest(value),
        expiresAt: new Date(Date.now() + 30 * DAY),
      },
    });
    return value;
  }

  async resolve(value: string | undefined, touch = false): Promise<Principal | null> {
    if (!value || !tokenSchema.safeParse(value).success) return null;
    const row = await this.db.authSession.findUnique({
      where: { tokenHash: digest(value) },
      include: {
        player: { select: { nickname: true } },
        account: { select: { email: true, role: true } },
      },
    });
    const now = Date.now();
    if (!row || row.revokedAt) return null;
    let validUntil = Math.min(+row.expiresAt, +row.lastActiveAt + 7 * DAY);
    if (validUntil <= now) return null;
    if (touch && +row.lastActiveAt <= now - TOUCH_MS) {
      const result = await this.db.authSession.updateMany({
        where: { id: row.id, revokedAt: null, lastActiveAt: row.lastActiveAt },
        data: { lastActiveAt: new Date(now) },
      });
      if (!result.count) return this.resolve(value);
      validUntil = Math.min(+row.expiresAt, now + 7 * DAY);
    }
    return {
      sessionId: row.id,
      playerId: row.playerId,
      nickname: row.player.nickname,
      accountId: row.accountId,
      email: row.account?.email ?? null,
      role: row.account?.role ?? null,
      validUntil,
    };
  }

  async require(value: string | undefined, touch = false) {
    const principal = await this.resolve(value, touch);
    if (!principal) fail(401, 'UNAUTHORIZED', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    return principal;
  }

  async revoke(scope: Revocation) {
    await this.db.authSession.updateMany({
      where: this.where(scope),
      data: { revokedAt: new Date() },
    });
    this.invalidate(scope);
  }

  where(scope: Revocation): Prisma.AuthSessionWhereInput {
    return { revokedAt: null, ...('sessionId' in scope ? { id: scope.sessionId } : scope) };
  }

  invalidate(scope: Revocation) {
    this.events.emit('revoked', scope);
  }
}

export function publicIdentity(principal: Principal | null) {
  return principal
    ? {
        kind: principal.accountId ? ('account' as const) : ('guest' as const),
        playerId: principal.playerId,
        nickname: principal.nickname,
        email: principal.email,
        role: principal.role,
      }
    : { kind: 'anonymous' as const };
}
