import 'dotenv/config';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/modules/persistence/prisma.service';
import { PrismaStore } from '../src/modules/persistence/prisma.store';
import { ShopService } from '../src/modules/shop/shop.service';
import { InventoryService } from '../src/modules/inventory/inventory.service';
import { RewardsService } from '../src/modules/rewards/rewards.service';
import { questionPackSchema, type MatchResult } from '@duoquest/shared-types';
import starter from '../../../examples/question-pack.json';

describe.skipIf(process.env.RUN_DB_TESTS !== '1')(
  'PostgreSQL transactions and migration invariants',
  () => {
    const db = new PrismaService();
    const store = new PrismaStore(db);
    const shop = new ShopService(db);
    const inventory = new InventoryService(db);
    let playerId: string;
    let itemA: string;
    let itemB: string;
    const sessions: string[] = [];
    beforeAll(async () => {
      const url = new URL(process.env.DATABASE_URL ?? '');
      if (!url.pathname.endsWith('_test'))
        throw new Error('DB tests require a dedicated database whose name ends with _test');
      await db.$connect();
    });
    beforeEach(async () => {
      const player = await store.createPlayer('DB test', randomUUID());
      playerId = player.id;
      await db.wallet.update({ where: { playerId }, data: { balance: 500 } });
      itemA = `fixture-${randomUUID()}`;
      itemB = `fixture-${randomUUID()}`;
      for (const id of [itemA, itemB])
        await db.itemDefinition.create({
          data: { id, name: id, kind: 'COSMETIC', slot: 'frame', price: 300, metadata: {} },
        });
    });
    afterEach(async () => {
      if (!playerId) return;
      await db.quizPlayerAnswer.deleteMany({ where: { sessionId: { in: sessions } } });
      await db.matchResult.deleteMany({ where: { sessionId: { in: sessions } } });
      await db.sessionPlayer.deleteMany({ where: { sessionId: { in: sessions } } });
      await db.gameSession.deleteMany({ where: { id: { in: sessions } } });
      await db.quizQuestionPack.deleteMany({ where: { ownerId: playerId } });
      await db.loadout.deleteMany({ where: { playerId } });
      await db.inventory.deleteMany({ where: { playerId } });
      await db.coinTransaction.deleteMany({ where: { playerId } });
      await db.wallet.deleteMany({ where: { playerId } });
      await db.player.deleteMany({ where: { id: playerId } });
      await db.itemDefinition.deleteMany({ where: { id: { in: [itemA, itemB] } } });
      sessions.length = 0;
    });
    afterAll(async () => {
      await db.$disconnect();
    });
    it('allows only one of two purchases when their combined price exceeds the wallet', async () => {
      const outcomes = await Promise.allSettled([
        shop.purchase(playerId, itemA, randomUUID()),
        shop.purchase(playerId, itemB, randomUUID()),
      ]);
      expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect((await db.wallet.findUniqueOrThrow({ where: { playerId } })).balance).toBe(200);
      expect(await db.inventory.count({ where: { playerId } })).toBe(1);
      expect(await db.coinTransaction.count({ where: { playerId } })).toBe(1);
    });
    it('makes concurrent retries of the same purchase idempotent', async () => {
      const key = randomUUID();
      await Promise.all([shop.purchase(playerId, itemA, key), shop.purchase(playerId, itemA, key)]);
      expect((await db.wallet.findUniqueOrThrow({ where: { playerId } })).balance).toBe(200);
      expect(await db.coinTransaction.count({ where: { playerId } })).toBe(1);
      await expect(shop.purchase(playerId, itemB, key)).rejects.toThrow('Mã giao dịch');
    });
    it('enforces ownership and one equipped item per slot', async () => {
      await expect(inventory.equip(playerId, itemA)).rejects.toThrow('Không thể trang bị');
      await db.wallet.update({ where: { playerId }, data: { balance: 1000 } });
      await shop.purchase(playerId, itemA, randomUUID());
      await shop.purchase(playerId, itemB, randomUUID());
      await inventory.equip(playerId, itemA);
      await inventory.equip(playerId, itemB);
      expect(await db.loadout.count({ where: { playerId } })).toBe(1);
      expect((await db.loadout.findFirstOrThrow({ where: { playerId } })).itemId).toBe(itemB);
    });
    it('rejects negative balances at the database layer', async () => {
      await expect(
        db.wallet.update({ where: { playerId }, data: { balance: -1 } }),
      ).rejects.toThrow();
    });
    it('claims result and reward exactly once under concurrent finalization', async () => {
      const pack = await store.savePack(
        questionPackSchema.parse({ ...starter, packId: `test-${randomUUID()}` }),
        playerId,
      );
      const id = randomUUID();
      sessions.push(id);
      await store.createSession({
        id,
        roomCode: 'ABC234',
        mode: 'SOLO',
        layout: 'MULTI_DEVICE',
        packVersionId: pack.id,
        questions: questionPackSchema.parse(starter).questions,
        playerIds: [playerId],
      });
      const result: MatchResult = {
        sessionId: id,
        mode: 'SOLO',
        scores: { [playerId]: 150 },
        winnerIds: [playerId],
        outcome: 'COMPLETED',
        correctCounts: { [playerId]: 1 },
      };
      const grants = new RewardsService().calculate(result, true);
      await Promise.all([store.finishSession(result, grants), store.finishSession(result, grants)]);
      expect(await db.matchResult.count({ where: { sessionId: id } })).toBe(1);
      expect(await db.coinTransaction.count({ where: { playerId } })).toBe(1);
      expect((await db.wallet.findUniqueOrThrow({ where: { playerId } })).balance).toBe(510);
      expect((await db.player.findUniqueOrThrow({ where: { id: playerId } })).xp).toBe(20);
    });
    it('keeps old pack versions stable when new content is imported', async () => {
      const original = questionPackSchema.parse({ ...starter, packId: `test-${randomUUID()}` });
      const one = await store.savePack(original, playerId);
      const changed = structuredClone(original);
      changed.questions[0]!.prompt = 'Một câu hỏi đã được sửa?';
      const two = await store.savePack(changed, playerId);
      expect(one.id).not.toBe(two.id);
      expect((await store.getPack(one.id, playerId))!.content.questions[0]!.prompt).toBe(
        original.questions[0]!.prompt,
      );
    });
  },
);
