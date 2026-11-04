import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DomainError } from '@duoquest/game-core';
import {
  questionPackSchema,
  type MatchResult,
  type PackSummary,
  type QuestionPack,
} from '@duoquest/shared-types';
import { PrismaService } from './prisma.service';
import { PlatformStore, type SessionRecord } from './store';
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
    return packs.map((pack) => ({
      id: pack.id,
      packId: pack.packId,
      title: pack.title,
      trusted: pack.trusted,
      questionCount: questionPackSchema.parse(pack.content).questions.length,
    }));
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
      return {
        id: created.id,
        packId: created.packId,
        title: created.title,
        trusted: created.trusted,
        questionCount: pack.questions.length,
      };
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
  async finishSession(result: MatchResult, rewardGrants: RewardGrant[]) {
    await serialTransaction(this.db, async (tx) => {
      const claimed = await tx.gameSession.updateMany({
        where: { id: result.sessionId, status: 'IN_PROGRESS' },
        data: { status: 'FINISHED', finishedAt: new Date() },
      });
      if (claimed.count === 0) return;
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
  async cancelSession(sessionId: string) {
    await this.db.gameSession.updateMany({
      where: { id: sessionId, status: 'IN_PROGRESS' },
      data: { status: 'CANCELLED', finishedAt: new Date() },
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
