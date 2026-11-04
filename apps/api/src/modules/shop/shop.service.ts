import { Inject, Injectable } from '@nestjs/common';
import { assertDomain } from '@duoquest/game-core';
import { serialTransaction } from '../../common/transaction';
import { PrismaService } from '../persistence/prisma.service';

@Injectable()
export class ShopService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  list() {
    return this.db.itemDefinition.findMany({ where: { kind: 'COSMETIC' } });
  }
  async purchase(playerId: string, itemId: string, requestId: string) {
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
        item && item.kind === 'COSMETIC',
        'NOT_FOUND',
        'Chỉ có cosmetic khả dụng trong bản nền tảng',
      );
      assertDomain(
        !(await tx.inventory.findUnique({ where: { playerId_itemId: { playerId, itemId } } })),
        'CONFLICT',
        'Bạn đã sở hữu vật phẩm',
      );
      const debit = await tx.wallet.updateMany({
        where: { playerId, balance: { gte: item.price } },
        data: { balance: { decrement: item.price } },
      });
      assertDomain(debit.count === 1, 'CONFLICT', 'Không đủ Coins');
      await tx.inventory.create({ data: { playerId, itemId } });
      await tx.coinTransaction.create({
        data: { playerId, delta: -item.price, reason: `PURCHASE:${itemId}`, idempotencyKey: key },
      });
      return { purchased: true, itemId };
    });
  }
}
