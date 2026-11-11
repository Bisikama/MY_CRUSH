import 'dotenv/config';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/modules/persistence/prisma.service';
import { PrismaStore } from '../src/modules/persistence/prisma.store';
import { ShopService } from '../src/modules/shop/shop.service';
import { InventoryService } from '../src/modules/inventory/inventory.service';
import { RewardsService } from '../src/modules/rewards/rewards.service';
import { QUIZ_SKILLS, questionPackSchema, type MatchResult } from '@duoquest/shared-types';
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
      await db.quizSkillUse.deleteMany({ where: { sessionId: { in: sessions } } });
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
    it('buys stackable Skills and atomically consumes a purchased use under retry', async () => {
      const item = QUIZ_SKILLS.HINT;
      await expect(shop.purchase(playerId, item.id, randomUUID())).rejects.toThrow('đăng nhập');
      const purchaseId = randomUUID();
      await Promise.all([
        shop.purchase(playerId, item.id, purchaseId, true),
        shop.purchase(playerId, item.id, purchaseId, true),
      ]);
      await shop.purchase(playerId, item.id, randomUUID(), true);
      expect((await store.skillStock([playerId]))[playerId]?.HINT).toBe(2);
      expect(await db.wallet.findUnique({ where: { playerId } })).toMatchObject({ balance: 480 });

      const content = questionPackSchema.parse({ ...starter, packId: 'fixture-' + randomUUID() });
      const pack = await store.savePack(content, playerId);
      const sessionId = randomUUID();
      sessions.push(sessionId);
      await store.createSession({
        id: sessionId,
        roomCode: 'SKILLS',
        mode: 'SOLO',
        layout: 'MULTI_DEVICE',
        packVersionId: pack.id,
        questions: content.questions,
        playerIds: [playerId],
      });
      const id = randomUUID();
      const round = sessionId + ':1';
      expect(
        await Promise.all([
          store.consumeSkill(sessionId, id, round, playerId, 'HINT'),
          store.consumeSkill(sessionId, id, round, playerId, 'HINT'),
        ]),
      ).toEqual([1, 1]);
      await expect(
        store.consumeSkill(sessionId, id, sessionId + ':2', playerId, 'HINT'),
      ).rejects.toThrow('đã được sử dụng');
      expect((await store.skillStock([playerId]))[playerId]?.HINT).toBe(1);
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
      const { knowledgeType, ...legacy } = starter;
      const original = questionPackSchema.parse({ ...legacy, packId: `test-${randomUUID()}` });
      const one = await store.savePack(original, playerId);
      const changed = questionPackSchema.parse({ ...structuredClone(original), knowledgeType });
      changed.questions[0]!.prompt = 'Một câu hỏi đã được sửa?';
      const two = await store.savePack(changed, playerId);
      expect(one.id).not.toBe(two.id);
      expect(one).not.toHaveProperty('knowledgeType');
      expect(two.knowledgeType).toBe(knowledgeType);
      const library = await store.listPacks(playerId);
      expect(library.find(({ id }) => id === one.id)).not.toHaveProperty('knowledgeType');
      expect(library.find(({ id }) => id === two.id)?.knowledgeType).toBe(knowledgeType);
      expect((await store.getPack(one.id, playerId))!.content.questions[0]!.prompt).toBe(
        original.questions[0]!.prompt,
      );
    });
    it('filters metadata by the newest trusted version before loading source JSON', async () => {
      const content = questionPackSchema.parse({ ...starter, packId: 'source-' + randomUUID() });
      const old = await store.savePack(content, playerId);
      await db.quizQuestionPack.update({ where: { id: old.id }, data: { trusted: true } });
      const latest = await store.savePack({ ...content, knowledgeType: 'academic' }, playerId);
      await db.quizQuestionPack.update({ where: { id: latest.id }, data: { trusted: true } });
      const sources = await store.latestTrustedPacks();
      expect(sources.some((pack) => pack.id === old.id || pack.id === latest.id)).toBe(false);
      const practical = await store.savePack({ ...content, knowledgeType: 'practical' }, playerId);
      await db.quizQuestionPack.update({ where: { id: practical.id }, data: { trusted: true } });
      expect(
        (await store.latestTrustedPacks()).filter((pack) => pack.packId === content.packId),
      ).toEqual([{ id: practical.id, packId: content.packId }]);
    });
    it('stores multi-source snapshots and atomically claims question history on cancellation', async () => {
      const id = randomUUID();
      sessions.push(id);
      const keyA = 'a'.repeat(64);
      const keyB = 'b'.repeat(64);
      await db.quizQuestionHistory.createMany({
        data: [keyA, keyB].map((questionKey) => ({
          hostPlayerId: playerId,
          questionKey,
        })),
      });
      const snapshot = {
        selection: { type: 'CASUAL_RANDOM' as const },
        hostPlayerId: playerId,
        trusted: true,
        sources: [],
        resetKeys: [keyA],
      };
      await store.createSession({
        id,
        roomCode: 'ABC234',
        mode: 'SOLO',
        layout: 'MULTI_DEVICE',
        packVersionId: null,
        questions: questionPackSchema.parse(starter).questions,
        playerIds: [playerId],
        selectionSnapshot: snapshot,
      });
      expect((await db.gameSession.findUniqueOrThrow({ where: { id } })).selectionSnapshot).toEqual(
        snapshot,
      );
      const history = { hostPlayerId: playerId, questionKeys: ['c'.repeat(64)], resetKeys: [keyA] };
      await Promise.all([store.cancelSession(id, history), store.cancelSession(id, history)]);
      expect(
        (await store.askedQuestionKeys(playerId, [keyA, keyB, 'c'.repeat(64)])).sort(),
      ).toEqual([keyB, 'c'.repeat(64)]);
      // A delayed retry must not delete a later history entry.
      await db.quizQuestionHistory.create({ data: { hostPlayerId: playerId, questionKey: keyA } });
      await store.cancelSession(id, history);
      expect(await store.askedQuestionKeys(playerId, [keyA])).toEqual([keyA]);
    });
    it('rolls back status, result and rewards when a history batch cannot be written', async () => {
      const id = randomUUID();
      sessions.push(id);
      await store.createSession({
        id,
        roomCode: 'ABC234',
        mode: 'SOLO',
        layout: 'MULTI_DEVICE',
        packVersionId: null,
        questions: questionPackSchema.parse(starter).questions,
        playerIds: [playerId],
      });
      const result: MatchResult = {
        sessionId: id,
        mode: 'SOLO',
        scores: { [playerId]: 100 },
        winnerIds: [playerId],
        outcome: 'COMPLETED',
        correctCounts: { [playerId]: 1 },
      };
      const grants = new RewardsService().calculate(result, true);
      await expect(
        store.finishSession(result, grants, {
          hostPlayerId: randomUUID(),
          questionKeys: ['a'.repeat(64)],
          resetKeys: [],
        }),
      ).rejects.toThrow();
      expect((await db.gameSession.findUniqueOrThrow({ where: { id } })).status).toBe(
        'IN_PROGRESS',
      );
      expect(await db.matchResult.count({ where: { sessionId: id } })).toBe(0);
      expect((await db.wallet.findUniqueOrThrow({ where: { playerId } })).balance).toBe(500);
      const history = { hostPlayerId: playerId, questionKeys: ['a'.repeat(64)], resetKeys: [] };
      await Promise.all([
        store.finishSession(result, grants, history),
        store.finishSession(result, grants, history),
      ]);
      expect(await db.quizQuestionHistory.count({ where: { hostPlayerId: playerId } })).toBe(1);
      expect((await db.wallet.findUniqueOrThrow({ where: { playerId } })).balance).toBe(510);
    });
  },
);
