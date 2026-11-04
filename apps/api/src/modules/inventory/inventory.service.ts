import { Inject, Injectable } from '@nestjs/common';
import { assertDomain } from '@duoquest/game-core';
import { serialTransaction } from '../../common/transaction';
import { PrismaService } from '../persistence/prisma.service';
@Injectable()
export class InventoryService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  async list(playerId: string) {
    const [items, loadout] = await Promise.all([
      this.db.inventory.findMany({ where: { playerId }, include: { item: true } }),
      this.db.loadout.findMany({ where: { playerId } }),
    ]);
    return { items, loadout };
  }
  async equip(playerId: string, itemId: string) {
    return serialTransaction(this.db, async (tx) => {
      const owned = await tx.inventory.findUnique({
        where: { playerId_itemId: { playerId, itemId } },
        include: { item: true },
      });
      assertDomain(
        owned && owned.quantity > 0 && owned.item.kind === 'COSMETIC' && owned.item.slot,
        'FORBIDDEN',
        'Không thể trang bị vật phẩm này',
      );
      return tx.loadout.upsert({
        where: { playerId_slot: { playerId, slot: owned.item.slot } },
        create: { playerId, itemId, slot: owned.item.slot },
        update: { itemId },
      });
    });
  }
}
