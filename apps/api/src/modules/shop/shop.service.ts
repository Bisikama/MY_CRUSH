import { Inject, Injectable } from '@nestjs/common';
import { assertDomain } from '@duoquest/game-core';
import { serialTransaction } from '../../common/transaction';
import { PrismaService } from '../persistence/prisma.service';

@Injectable()
export class ShopService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  list() {
    return this.db.itemDefinition.findMany({ where: { kind: { in: ['COSMETIC', 'SKILL'] } } });
  }
  async purchase(playerId: string, itemId: string, requestId: string, hasAccount = false) {
    return serialTransaction(this.db, async (tx) => {
      const key = `purchase:${playerId}:${requestId}`;
      const existing = await tx.coinTransaction.findUnique({ where: { idempotencyKey: key } });
      if (existing) {
        assertDomain(
          existing.reason === `PURCHASE:${itemId}`,
          'CONFLICT',
          'Mã giao dịch đã dùng cho vật phẩm khác',
        );
        return { purchased: true, itemId };
      }
      const item = await tx.itemDefinition.findUnique({ where: { id: itemId } });
      assertDomain(
        item && (item.kind === 'COSMETIC' || item.kind === 'SKILL'),
        'NOT_FOUND',
        'Vật phẩm không có trong cửa hàng',
      );
      if (item.kind === 'SKILL') {
        assertDomain(hasAccount, 'FORBIDDEN', 'Cần đăng nhập tài khoản để mua Skill');
      } else {
        assertDomain(
          !(await tx.inventory.findUnique({ where: { playerId_itemId: { playerId, itemId } } })),
          'CONFLICT',
          'Bạn đã sở hữu vật phẩm',
        );
      }
      const debit = await tx.wallet.updateMany({
        where: { playerId, balance: { gte: item.price } },
        data: { balance: { decrement: item.price } },
      });
      assertDomain(debit.count === 1, 'CONFLICT', 'Không đủ Coins');
      if (item.kind === 'SKILL') {
        await tx.inventory.upsert({
          where: { playerId_itemId: { playerId, itemId } },
          create: { playerId, itemId },
          update: { quantity: { increment: 1 } },
        });
      } else {
        await tx.inventory.create({ data: { playerId, itemId } });
      }
      await tx.coinTransaction.create({
        data: { playerId, delta: -item.price, reason: `PURCHASE:${itemId}`, idempotencyKey: key },
      });
      return { purchased: true, itemId };
    });
  }
}
