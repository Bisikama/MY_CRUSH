import { HttpException, Inject, Injectable } from '@nestjs/common';
import { randomInt, randomUUID } from 'node:crypto';
import type { EmailChallenge, Prisma } from '@prisma/client';
import { PrismaService } from '../persistence/prisma.service';
import { serialTransaction } from '../../common/transaction';
import { digest, equal, fail, mac } from './auth-security';
import { AuthThrottle } from './auth-throttle';
import { MailService } from './mail.service';

export type Purpose = 'REGISTER' | 'RESET_PASSWORD';
const MINUTE = 60_000;

@Injectable()
export class EmailChallenges {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(AuthThrottle) private readonly throttle: AuthThrottle,
    @Inject(MailService) private readonly mail: MailService,
  ) {}

  private codeHash(challenge: Pick<EmailChallenge, 'id' | 'email' | 'purpose'>, code: string) {
    return mac('otp', challenge.id, challenge.email, challenge.purpose, code);
  }

  async send(
    purpose: Purpose,
    binding: string,
    ip: string,
    email: string | undefined,
    playerId: string | null,
    id?: string,
  ) {
    await this.throttle.reserve('send-ip-minute', ip, 10, MINUTE);
    await this.throttle.reserve('send-ip-hour', ip, 20, 60 * MINUTE);
    const flowHash = digest(binding);
    const now = new Date();
    const sendId = randomUUID();
    const challenge = await serialTransaction(this.db, async (tx) => {
      const previous = await tx.emailChallenge.findUnique({
        where: { flowHash_purpose: { flowHash, purpose } },
      });
      if (
        id &&
        (!previous ||
          previous.id !== id ||
          previous.playerId !== playerId ||
          previous.verifiedAt ||
          previous.consumedAt)
      )
        fail(400, 'FLOW_INVALID', 'Quy trình đã hết hạn. Hãy bắt đầu lại.');
      const target = email ?? previous?.email;
      if (!target) fail(400, 'FLOW_INVALID', 'Không tìm thấy email của quy trình.');
      if (previous && previous.email === target && +now - +previous.lastSentAt < MINUTE)
        fail(429, 'RESEND_COOLDOWN', 'Hãy đợi 60 giây trước khi gửi lại.');
      const same =
        previous &&
        previous.email === target &&
        previous.playerId === playerId &&
        !previous.verifiedAt &&
        !previous.consumedAt &&
        (id || +previous.expiresAt > +now);
      if (same && previous.attempts >= 5)
        fail(429, 'RATE_LIMITED', 'Đã hết lượt thử mã. Hãy đợi mã hết hạn và bắt đầu lại.');
      if (
        purpose === 'REGISTER' &&
        (await tx.account.findUnique({ where: { email: target }, select: { id: true } }))
      )
        fail(
          409,
          'EMAIL_ALREADY_REGISTERED',
          'Email đã đăng ký. Hãy đăng nhập hoặc đặt lại mật khẩu.',
        );
      if (same)
        return tx.emailChallenge.update({
          where: { id: previous.id },
          data: { lastSentAt: now, sendId },
        });
      if (previous) await tx.emailChallenge.delete({ where: { id: previous.id } });
      return tx.emailChallenge.create({
        data: {
          id: randomUUID(),
          flowHash,
          purpose,
          email: target,
          playerId,
          lastSentAt: now,
          expiresAt: new Date(+now + 5 * MINUTE),
          sendId,
        },
      });
    });

    let code: string;
    do {
      code = String(randomInt(1_000_000)).padStart(6, '0');
    } while (challenge.digest === this.codeHash(challenge, code));
    let outcome: 'accepted' | 'rejected' | 'unknown' = 'rejected';
    try {
      const release = await this.throttle.reserve(
        'mail-recipient',
        challenge.email,
        5,
        60 * MINUTE,
      );
      if (
        purpose === 'REGISTER' ||
        (await this.db.account.findUnique({
          where: { email: challenge.email },
          select: { id: true },
        }))
      ) {
        outcome = await this.mail.send(
          challenge.email,
          'Mã xác minh DuoQuest',
          'Mã của bạn là ' + code + '. Mã có hiệu lực trong 5 phút.',
        );
      }
      if (outcome === 'rejected') await release();
    } catch (error) {
      if (!(
        purpose === 'RESET_PASSWORD' &&
        error instanceof HttpException &&
        error.getStatus() === 429
      ))
        throw error;
    } finally {
      await this.db.emailChallenge.updateMany({
        where: { id: challenge.id, sendId, consumedAt: null, verifiedAt: null },
        data: {
          sendId: null,
          ...(outcome === 'accepted'
            ? {
                digest: this.codeHash(challenge, code),
                expiresAt: new Date(Date.now() + 5 * MINUTE),
              }
            : {}),
        },
      });
    }
    if (purpose === 'REGISTER' && outcome !== 'accepted')
      fail(503, 'MAIL_UNAVAILABLE', 'Chưa gửi được mã. Hãy thử lại sau 60 giây.');
    return this.view(challenge, false);
  }

  private view(challenge: EmailChallenge, verified: boolean) {
    return {
      challengeId: challenge.id,
      email: challenge.email,
      purpose: challenge.purpose,
      verified,
      resendAt: new Date(+challenge.lastSentAt + MINUTE).toISOString(),
    };
  }

  async current(binding: string, purpose: Purpose) {
    const row = await this.db.emailChallenge.findUnique({
      where: { flowHash_purpose: { flowHash: digest(binding), purpose } },
    });
    if (!row || row.consumedAt || +row.expiresAt <= Date.now()) return null;
    return this.view(row, row.verifiedAt !== null);
  }

  async cancel(binding: string, purpose: Purpose) {
    await this.db.emailChallenge.updateMany({
      where: { flowHash: digest(binding), purpose, consumedAt: null },
      data: { consumedAt: new Date(), digest: null, sendId: null },
    });
  }

  async verify(purpose: Purpose, binding: string, ip: string, id: string, code: string) {
    await this.throttle.reserve('verify-ip', ip, 20, 15 * MINUTE);
    const row = await this.db.emailChallenge.findFirst({
      where: { id, purpose, flowHash: digest(binding) },
    });
    if (!row) fail(400, 'CODE_INVALID', 'Mã sai hoặc hết hạn.');
    await this.throttle.reserve('verify-email', purpose + ':' + row.email, 10, 15 * MINUTE);
    const result = await serialTransaction(this.db, async (tx) => {
      const current = await tx.emailChallenge.findUnique({ where: { id } });
      if (
        !current ||
        current.consumedAt ||
        current.verifiedAt ||
        +current.expiresAt <= Date.now() ||
        current.attempts >= 5
      )
        return null;
      if (!current.digest || !equal(current.digest, this.codeHash(current, code))) {
        await tx.emailChallenge.update({ where: { id }, data: { attempts: { increment: 1 } } });
        return null;
      }
      return tx.emailChallenge.update({
        where: { id },
        data: {
          verifiedAt: new Date(),
          digest: null,
          sendId: null,
          expiresAt: new Date(Date.now() + 10 * MINUTE),
        },
      });
    });
    if (!result) fail(400, 'CODE_INVALID', 'Mã sai hoặc hết hạn.');
    return this.view(result, true);
  }

  private verifiedChallenge(
    purpose: Purpose,
    binding: string,
    id: string,
    playerId: string | null,
  ) {
    return {
      id,
      purpose,
      flowHash: digest(binding),
      playerId,
      verifiedAt: { not: null },
      consumedAt: null,
      expiresAt: { gt: new Date() },
    };
  }

  async requireVerified(purpose: Purpose, binding: string, id: string, playerId: string | null) {
    const verified = await this.db.emailChallenge.findFirst({
      where: this.verifiedChallenge(purpose, binding, id, playerId),
      select: { id: true },
    });
    if (!verified) fail(400, 'FLOW_INVALID', 'Xác minh email đã hết hạn hoặc đã được sử dụng.');
  }

  async consume(
    tx: Prisma.TransactionClient,
    purpose: Purpose,
    binding: string,
    id: string,
    playerId: string | null,
  ) {
    const result = await tx.emailChallenge.updateMany({
      where: this.verifiedChallenge(purpose, binding, id, playerId),
      data: { consumedAt: new Date() },
    });
    if (!result.count) fail(400, 'FLOW_INVALID', 'Xác minh email đã hết hạn hoặc đã được sử dụng.');
    return tx.emailChallenge.findUniqueOrThrow({ where: { id } });
  }
}
