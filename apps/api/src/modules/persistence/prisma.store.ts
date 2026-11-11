import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { assertDomain, DomainError } from '@duoquest/game-core';
import {
  questionPackSchema,
  QUIZ_SKILLS,
  summarizePack,
  type QuizSkill,
  type MatchResult,
  type PackSummary,
  type QuestionPack,
} from '@duoquest/shared-types';
import { PrismaService } from './prisma.service';
import { PlatformStore, type SessionRecord, type QuestionHistoryBatch } from './store';
import type { RewardGrant } from '../rewards/rewards.service';
import { serialTransaction } from '../../common/transaction';

const json = (value: unknown) => value as Prisma.InputJsonValue;
@Injectable()
export class PrismaStore extends PlatformStore {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {
    super();
  }
  createPlayer(nickname: string, tokenHash: string) {
    return this.db.player.create({ data: { nickname, tokenHash, wallet: { create: {} } } });
  }
  findPlayer(tokenHash: string) {
    return this.db.player.findUnique({ where: { tokenHash } });
  }
  async listPacks(playerId: string): Promise<PackSummary[]> {
    const packs = await this.db.quizQuestionPack.findMany({
      where: { OR: [{ trusted: true }, { ownerId: playerId }] },
      orderBy: { createdAt: 'desc' },
    });
    return packs.map((pack) =>
      summarizePack(pack.id, questionPackSchema.parse(pack.content), pack.trusted),
    );
  }
  async getPack(id: string, playerId: string) {
    const pack = await this.db.quizQuestionPack.findFirst({
      where: { id, OR: [{ trusted: true }, { ownerId: playerId }] },
    });
    return pack
      ? {
          id: pack.id,
          content: questionPackSchema.parse(pack.content),
          trusted: pack.trusted,
          ownerId: pack.ownerId,
        }
      : null;
  }
  async latestTrustedPacks() {
    const latest = await this.db.quizQuestionPack.groupBy({
      by: ['packId'],
      where: { trusted: true },
      _max: { version: true },
      orderBy: { packId: 'asc' },
    });
    const records: { id: string; packId: string }[] = [];
    for (let offset = 0; offset < latest.length; offset += 25) {
      records.push(
        ...(await this.db.quizQuestionPack.findMany({
          where: {
            trusted: true,
            AND: [
              {
                OR: [
                  { content: { path: ['knowledgeType'], equals: 'discovery' } },
                  { content: { path: ['knowledgeType'], equals: 'practical' } },
                ],
              },
            ],
            OR: latest.slice(offset, offset + 25).map((pack) => ({
              packId: pack.packId,
              version: pack._max.version!,
            })),
          },
          select: { id: true, packId: true },
          orderBy: { packId: 'asc' },
        })),
      );
    }
    return records;
  }
  async readPacks(ids: string[]) {
    const records = await this.db.quizQuestionPack.findMany({
      where: { id: { in: ids }, trusted: true },
      orderBy: { packId: 'asc' },
    });
    return records.map((pack) => ({ ...pack, content: questionPackSchema.parse(pack.content) }));
  }
  async askedQuestionKeys(hostPlayerId: string, keys: string[]) {
    const rows = await this.db.quizQuestionHistory.findMany({
      where: { hostPlayerId, questionKey: { in: keys } },
      select: { questionKey: true },
    });
    return rows.map((row) => row.questionKey);
  }
  async savePack(pack: QuestionPack, ownerId: string): Promise<PackSummary> {
    return serialTransaction(this.db, async (tx) => {
      const existing = await tx.quizQuestionPack.findFirst({
        where: { packId: pack.packId },
        orderBy: { version: 'desc' },
      });
      if (existing && existing.ownerId !== ownerId)
        throw new DomainError('FORBIDDEN', 'packId thuộc thư viện hoặc người chơi khác');
      const created = await tx.quizQuestionPack.create({
        data: {
          packId: pack.packId,
          version: (existing?.version ?? 0) + 1,
          title: pack.title,
          ownerId,
          trusted: false,
          content: json(pack),
        },
      });
      return summarizePack(created.id, pack, created.trusted);
    });
  }
  async createSession(session: SessionRecord) {
    await this.db.gameSession.create({
      data: {
        id: session.id,
        roomCode: session.roomCode,
        mode: session.mode,
        layout: session.layout,
        packVersionId: session.packVersionId,
        questionSnapshot: json(session.questions),
        ...(session.selectionSnapshot
          ? { selectionSnapshot: json(session.selectionSnapshot) }
          : {}),
        players: { create: session.playerIds.map((playerId) => ({ playerId })) },
      },
    });
  }
  async saveAnswer(
    sessionId: string,
    roundId: string,
    playerId: string,
    optionId: string,
    correct: boolean,
  ) {
    await this.db.quizPlayerAnswer.upsert({
      where: { sessionId_roundId_playerId: { sessionId, roundId, playerId } },
      create: { sessionId, roundId, playerId, optionId, correct },
      update: {},
    });
  }
  async skillStock(playerIds: string[]) {
    const catalog = Object.entries(QUIZ_SKILLS) as [QuizSkill, { id: string }][];
    const rows = await this.db.inventory.findMany({
      where: { playerId: { in: playerIds }, itemId: { in: catalog.map(([, item]) => item.id) } },
    });
    const stock: Record<string, Partial<Record<QuizSkill, number>>> = {};
    for (const row of rows) {
      const skill = catalog.find(([, item]) => item.id === row.itemId)![0];
      (stock[row.playerId] ??= {})[skill] = row.quantity;
    }
    return stock;
  }
  async consumeSkill(
    sessionId: string,
    actionId: string,
    roundId: string,
    playerId: string,
    skill: QuizSkill,
  ) {
    const itemId = QUIZ_SKILLS[skill].id;
    return serialTransaction(this.db, async (tx) => {
      const where = { sessionId_actionId: { sessionId, actionId } };
      const existing = await tx.quizSkillUse.findUnique({ where });
      if (existing) {
        assertDomain(
          existing.playerId === playerId &&
            existing.skill === skill &&
            existing.roundId === roundId,
          'CONFLICT',
          'Mã dùng Skill đã được sử dụng',
        );
        return existing.remaining;
      }
      const spent = await tx.inventory.updateMany({
        where: { playerId, itemId, quantity: { gt: 0 } },
        data: { quantity: { decrement: 1 } },
      });
      assertDomain(spent.count === 1, 'CONFLICT', 'Bạn đã hết Skill trong kho');
      const { quantity } = await tx.inventory.findUniqueOrThrow({
        where: { playerId_itemId: { playerId, itemId } },
      });
      await tx.quizSkillUse.create({
        data: { sessionId, actionId, roundId, playerId, skill, remaining: quantity },
      });
      return quantity;
    });
  }
  private async writeQuestionHistory(tx: Prisma.TransactionClient, history?: QuestionHistoryBatch) {
    if (!history || history.questionKeys.length === 0) return;
    for (let offset = 0; offset < history.resetKeys.length; offset += 1000)
      await tx.quizQuestionHistory.deleteMany({
        where: {
          hostPlayerId: history.hostPlayerId,
          questionKey: { in: history.resetKeys.slice(offset, offset + 1000) },
        },
      });
    await tx.quizQuestionHistory.createMany({
      data: history.questionKeys.map((questionKey) => ({
        hostPlayerId: history.hostPlayerId,
        questionKey,
        askedAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }
  async finishSession(
    result: MatchResult,
    rewardGrants: RewardGrant[],
    history?: QuestionHistoryBatch,
  ) {
    await serialTransaction(this.db, async (tx) => {
      const claimed = await tx.gameSession.updateMany({
        where: { id: result.sessionId, status: 'IN_PROGRESS' },
        data: { status: 'FINISHED', finishedAt: new Date() },
      });
      if (claimed.count === 0) return;
      await this.writeQuestionHistory(tx, history);
      await tx.matchResult.create({ data: { sessionId: result.sessionId, payload: json(result) } });
      for (const [playerId, score] of Object.entries(result.scores)) {
        await tx.sessionPlayer.update({
          where: { sessionId_playerId: { sessionId: result.sessionId, playerId } },
          data: { score },
        });
        // Imported content earns no currency. Trusted packs: first 10 completed sessions/day.
        const dayStart = new Date();
        dayStart.setUTCHours(0, 0, 0, 0);
        const grants = await tx.coinTransaction.count({
          where: { playerId, reason: 'MATCH_REWARD', createdAt: { gte: dayStart } },
        });
        const grant = rewardGrants.find((g) => g.playerId === playerId);
        if (!grant || grants >= 10) continue;
        const delta = grant.coins;
        await tx.coinTransaction.create({
          data: {
            playerId,
            delta,
            reason: 'MATCH_REWARD',
            idempotencyKey: `match:${result.sessionId}:${playerId}`,
          },
        });
        await tx.wallet.update({ where: { playerId }, data: { balance: { increment: delta } } });
        await tx.player.update({ where: { id: playerId }, data: { xp: { increment: grant.xp } } });
      }
    });
  }
  async cancelSession(sessionId: string, history?: QuestionHistoryBatch) {
    await serialTransaction(this.db, async (tx) => {
      const claimed = await tx.gameSession.updateMany({
        where: { id: sessionId, status: 'IN_PROGRESS' },
        data: { status: 'CANCELLED', finishedAt: new Date() },
      });
      if (claimed.count) await this.writeQuestionHistory(tx, history);
    });
  }
  async cancelInterruptedSessions() {
    await this.db.gameSession.updateMany({
      where: { status: 'IN_PROGRESS' },
      data: { status: 'CANCELLED', finishedAt: new Date() },
    });
  }
  history(playerId: string) {
    return this.db.sessionPlayer.findMany({
      where: { playerId, session: { status: 'FINISHED' } },
      take: 20,
      orderBy: { session: { finishedAt: 'desc' } },
      select: {
        score: true,
        session: {
          select: { id: true, mode: true, finishedAt: true, result: { select: { payload: true } } },
        },
      },
    });
  }
  profile(playerId: string) {
    return this.db.player.findUnique({
      where: { id: playerId },
      select: { id: true, nickname: true, xp: true, wallet: { select: { balance: true } } },
    });
  }
}
