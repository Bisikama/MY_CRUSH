import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service';
import { fail, mac } from './auth-security';

@Injectable()
export class AuthThrottle {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  async reserve(bucket: string, subject: string, limit: number, duration: number) {
    const key = mac('rate-limit', bucket, subject);
    const now = new Date();
    const expiry = new Date(+now + duration);
    const rows = await this.db.$queryRaw<{ expiresAt: Date }[]>`
      INSERT INTO "AuthRateLimit" ("key", "count", "expiresAt") VALUES (${key}, 1, ${expiry})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "AuthRateLimit"."expiresAt" <= ${now} THEN 1 ELSE "AuthRateLimit"."count" + 1 END,
        "expiresAt" = CASE WHEN "AuthRateLimit"."expiresAt" <= ${now} THEN ${expiry} ELSE "AuthRateLimit"."expiresAt" END
      WHERE "AuthRateLimit"."expiresAt" <= ${now} OR "AuthRateLimit"."count" < ${limit}
      RETURNING "expiresAt"
    `;
    const row = rows[0];
    if (!row) fail(429, 'RATE_LIMITED', 'Đã đạt giới hạn thử. Hãy đợi rồi thử lại.');
    return async () => {
      await this.db.authRateLimit.updateMany({
        where: { key, expiresAt: row.expiresAt, count: { gt: 0 } },
        data: { count: { decrement: 1 } },
      });
    };
  }
}
