import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { argon2id, hash, verify } from 'argon2';
import { serialTransaction } from '../../common/transaction';
import { PrismaService } from '../persistence/prisma.service';
import { RoomsService } from '../rooms/rooms.service';
import { DAY, digest, fail, mac, token } from './auth-security';
import { AuthSessions, type Principal, type Revocation } from './auth-session.service';
import { AuthThrottle } from './auth-throttle';
import { EmailChallenges } from './email-challenge.service';
import { MailService } from './mail.service';
import { passwordChangedEmail } from './mail-template';

const options = { type: argon2id, memoryCost: 19 * 1024, timeCost: 2, parallelism: 1 } as const;

@Injectable()
export class AuthService {
  private dummy?: Promise<string>;
  private hashing = 0;

  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(AuthSessions) private readonly sessions: AuthSessions,
    @Inject(AuthThrottle) private readonly throttle: AuthThrottle,
    @Inject(EmailChallenges) private readonly challenges: EmailChallenges,
    @Inject(RoomsService) private readonly rooms: RoomsService,
    @Inject(MailService) private readonly mail: MailService,
  ) {}

  private async passwordWork<T>(task: () => Promise<T>) {
    if (this.hashing >= 4) fail(429, 'RATE_LIMITED', 'Đang có nhiều yêu cầu. Hãy thử lại.');
    this.hashing++;
    try {
      return await task();
    } finally {
      this.hashing--;
    }
  }

  async guest(nickname: string, principal?: Principal) {
    if (principal) fail(409, 'CONFLICT', 'Bạn đã có phiên chơi.');
    return serialTransaction(this.db, async (tx) => {
      const player = await tx.player.create({ data: { nickname, wallet: { create: {} } } });
      return this.sessions.issue(tx, player.id, null);
    });
  }

  async migrate(legacy: string, binding: string, principal?: Principal) {
    if (principal) fail(409, 'CONFLICT', 'Bạn đã có phiên chơi.');
    const value = mac('legacy-session', binding, legacy);
    return serialTransaction(this.db, async (tx) => {
      const recovered = await tx.authSession.findUnique({ where: { tokenHash: digest(value) } });
      if (
        recovered &&
        !recovered.revokedAt &&
        !recovered.accountId &&
        Math.min(+recovered.expiresAt, +recovered.lastActiveAt + 7 * DAY) > Date.now()
      )
        return value;
      const legacyHash = digest(legacy);
      const player = await tx.player.findUnique({
        where: { tokenHash: legacyHash },
        include: { account: { select: { id: true } } },
      });
      if (!player || player.account) fail(401, 'UNAUTHORIZED', 'Phiên khách cũ không còn hợp lệ.');
      const result = await tx.player.updateMany({
        where: { id: player.id, tokenHash: legacyHash },
        data: { tokenHash: null },
      });
      if (!result.count) fail(401, 'UNAUTHORIZED', 'Phiên khách đã được chuyển.');
      return this.sessions.issue(tx, player.id, null, value);
    });
  }

  async register(
    binding: string,
    id: string,
    nickname: string,
    password: string,
    principal?: Principal,
  ) {
    if (principal?.accountId) fail(409, 'CONFLICT', 'Hãy đăng xuất trước khi tạo tài khoản khác.');
    await this.challenges.requireVerified('REGISTER', binding, id, principal?.playerId ?? null);
    const passwordHash = await this.passwordWork(() => hash(password, options));
    try {
      return await this.rooms.withoutOpenRoom(principal?.playerId, async () => {
        const value = await serialTransaction(this.db, async (tx) => {
          const challenge = await this.challenges.consume(
            tx,
            'REGISTER',
            binding,
            id,
            principal?.playerId ?? null,
          );
          if (principal) {
            const active = await tx.authSession.findFirst({
              where: { id: principal.sessionId, revokedAt: null },
            });
            if (!active || +active.expiresAt <= Date.now())
              fail(401, 'UNAUTHORIZED', 'Phiên guest đã hết hạn.');
          }
          const player = principal
            ? await tx.player.update({
                where: { id: principal.playerId },
                data: { nickname, tokenHash: null },
              })
            : await tx.player.create({ data: { nickname, wallet: { create: {} } } });
          const account = await tx.account.create({
            data: {
              email: challenge.email,
              playerId: player.id,
              passwordHash,
              emailVerifiedAt: new Date(),
            },
          });
          if (principal)
            await tx.authSession.updateMany({
              where: this.sessions.where({ playerId: player.id }),
              data: { revokedAt: new Date() },
            });
          return this.sessions.issue(tx, player.id, account.id);
        });
        if (principal) this.sessions.invalidate({ playerId: principal.playerId });
        return value;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        fail(409, 'ACCOUNT_CONFLICT', 'Email hoặc hồ sơ này đã liên kết tài khoản.');
      throw error;
    }
  }

  async login(email: string, password: string, ip: string, principal?: Principal) {
    const releaseIp = await this.throttle.reserve('login-ip', ip, 20, 15 * 60_000);
    const releaseEmail = await this.throttle.reserve('login-email', email, 5, 15 * 60_000);
    const account = await this.db.account.findUnique({ where: { email } });
    const valid = await this.passwordWork(async () => {
      const encoded = account?.passwordHash ?? (await (this.dummy ??= hash(token(), options)));
      return verify(encoded, password);
    });
    if (!account || !valid) fail(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.');
    await Promise.all([releaseIp(), releaseEmail()]);
    return this.rooms.withoutOpenRoom(principal?.playerId, async () => {
      const value = await serialTransaction(this.db, async (tx) => {
        const current = await tx.account.findUnique({
          where: { id: account.id },
          select: { passwordHash: true },
        });
        if (current?.passwordHash !== account.passwordHash)
          fail(401, 'INVALID_CREDENTIALS', 'Hãy đăng nhập lại.');
        if (principal)
          await tx.authSession.updateMany({
            where: this.sessions.where({ sessionId: principal.sessionId }),
            data: { revokedAt: new Date() },
          });
        return this.sessions.issue(tx, account.playerId, account.id);
      });
      if (principal) this.sessions.invalidate({ sessionId: principal.sessionId });
      return value;
    });
  }

  async reset(binding: string, id: string, password: string, principal?: Principal) {
    await this.challenges.requireVerified(
      'RESET_PASSWORD',
      binding,
      id,
      principal?.playerId ?? null,
    );
    const passwordHash = await this.passwordWork(() => hash(password, options));
    const account = await serialTransaction(this.db, async (tx) => {
      const challenge = await this.challenges.consume(
        tx,
        'RESET_PASSWORD',
        binding,
        id,
        principal?.playerId ?? null,
      );
      const account = await tx.account.update({
        where: { email: challenge.email },
        data: { passwordHash },
      });
      await tx.emailChallenge.updateMany({
        where: { email: account.email, purpose: 'RESET_PASSWORD', consumedAt: null },
        data: { consumedAt: new Date(), digest: null, sendId: null },
      });
      await tx.authSession.updateMany({
        where: this.sessions.where({ accountId: account.id }),
        data: { revokedAt: new Date() },
      });
      return { id: account.id, email: account.email };
    });
    this.sessions.invalidate({ accountId: account.id });
    this.notifyPasswordChanged(account.email);
    return account.id;
  }

  async change(principal: Principal, currentPassword: string, password: string) {
    if (!principal.accountId) fail(403, 'FORBIDDEN', 'Cần tài khoản để đổi mật khẩu.');
    const account = await this.db.account.findUniqueOrThrow({ where: { id: principal.accountId } });
    const release = await this.throttle.reserve('change-password', account.id, 5, 15 * 60_000);
    const passwordHash = await this.passwordWork(async () => {
      if (!(await verify(account.passwordHash, currentPassword)))
        fail(400, 'INVALID_CREDENTIALS', 'Mật khẩu hiện tại không đúng.');
      return hash(password, options);
    });
    await release();
    const scope: Revocation = { accountId: account.id };
    const value = await serialTransaction(this.db, async (tx) => {
      const changed = await tx.account.updateMany({
        where: { id: account.id, passwordHash: account.passwordHash },
        data: { passwordHash },
      });
      if (!changed.count) fail(409, 'CONFLICT', 'Mật khẩu vừa thay đổi. Hãy đăng nhập lại.');
      await tx.emailChallenge.updateMany({
        where: { email: account.email, purpose: 'RESET_PASSWORD', consumedAt: null },
        data: { consumedAt: new Date(), digest: null, sendId: null },
      });
      await tx.authSession.updateMany({
        where: this.sessions.where(scope),
        data: { revokedAt: new Date() },
      });
      return this.sessions.issue(tx, account.playerId, account.id);
    });
    this.sessions.invalidate(scope);
    this.notifyPasswordChanged(account.email);
    return value;
  }

  private notifyPasswordChanged(email: string) {
    const message = passwordChangedEmail();
    void this.mail.send(email, message.subject, message.text, message.html).catch(() => {});
  }
}
