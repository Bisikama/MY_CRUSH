import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { type QuizState, hasFreeSkill, roundIdOf } from '@duoquest/game-quiz';
import { assertDomain } from '@duoquest/game-core';
import { type GameActionCommand, type GameLayout, type GameMode } from '@duoquest/shared-types';
import { PlatformStore, type QuestionHistoryBatch } from '../persistence/store';
import type { PreparedQuiz } from '../question-packs/quiz-preparation.service';
import { RewardsService } from '../rewards/rewards.service';
import { GameRegistry } from './game-registry';

export interface LiveSession {
  state: QuizState;
  prepared: PreparedQuiz;
  receipts: Map<string, { fingerprint: string; version: number }>;
  saved: boolean;
  stock: Awaited<ReturnType<PlatformStore['skillStock']>>;
}
@Injectable()
export class SessionsService implements OnModuleInit {
  constructor(
    @Inject(PlatformStore) private readonly store: PlatformStore,
    @Inject(GameRegistry) private readonly registry: GameRegistry,
    @Inject(RewardsService) private readonly rewards: RewardsService,
  ) {}
  get engine() {
    return this.registry.get('quiz');
  }
  async onModuleInit() {
    await this.store.cancelInterruptedSessions();
  }
  async create(
    code: string,
    mode: GameMode,
    layout: GameLayout,
    playerIds: string[],
    prepared: PreparedQuiz,
    now: number,
  ): Promise<LiveSession> {
    const id = randomUUID();
    const questions = structuredClone(prepared.questions);
    const stock = await this.store.skillStock(playerIds);
    await this.store.createSession({
      id,
      roomCode: code,
      mode,
      layout,
      playerIds,
      packVersionId: prepared.packVersionId,
      selectionSnapshot: prepared.snapshot,
      questions,
    });
    return {
      state: this.engine.initialize({ sessionId: id, mode, layout, playerIds, questions }, now),
      prepared: structuredClone(prepared),
      receipts: new Map(),
      saved: false,
      stock,
    };
  }
  async apply(session: LiveSession, command: GameActionCommand, now: number, canSpend = false) {
    assertDomain(
      session.state.config.sessionId === command.sessionId,
      'CONFLICT',
      'Session đã thay đổi',
    );
    const fingerprint = JSON.stringify([command.playerId, command.roundId, command.payload]);
    const receipt = session.receipts.get(command.actionId);
    if (receipt) {
      assertDomain(
        receipt.fingerprint === fingerprint,
        'CONFLICT',
        'actionId đã dùng cho thao tác khác',
      );
      return { actionId: command.actionId, stateVersion: receipt.version };
    }
    assertDomain(command.roundId === roundIdOf(session.state), 'CONFLICT', 'Câu hỏi đã thay đổi');
    const next = this.engine.applyAction(session.state, command.playerId, command.payload, now);
    if (
      command.payload.type === 'USE_SKILL' &&
      !hasFreeSkill(session.state, command.playerId, command.payload.skill)
    ) {
      assertDomain(canSpend, 'FORBIDDEN', 'Cần đăng nhập tài khoản để dùng Skill trong kho');
      const { skill } = command.payload;
      const remaining = await this.store.consumeSkill(
        command.sessionId,
        command.actionId,
        command.roundId,
        command.playerId,
        skill,
      );
      (session.stock[command.playerId] ??= {})[skill] = remaining;
    }
    if (command.payload.type === 'ANSWER') {
      const question = session.state.config.questions[session.state.index]!;
      await this.store.saveAnswer(
        command.sessionId,
        command.roundId,
        command.playerId,
        command.payload.optionId,
        command.payload.optionId === question.correctOptionId,
      );
    }
    session.state = next;
    session.receipts.set(command.actionId, { fingerprint, version: next.version });
    return { actionId: command.actionId, stateVersion: next.version };
  }
  async tick(session: LiveSession, now: number): Promise<boolean> {
    const previous = session.state;
    const next = this.engine.onTimeout(previous, now);
    // Do not publish FINISHED until the result/reward transaction has committed.
    if (next.result && !session.saved) {
      await this.store.finishSession(
        next.result,
        this.rewards.calculate(next.result, session.prepared.snapshot.trusted),
        this.historyBatch(session),
      );
      session.saved = true;
    }
    session.state = next;
    return previous !== next;
  }
  async cancel(session: LiveSession) {
    await this.store.cancelSession(session.state.config.sessionId, this.historyBatch(session));
  }
  private historyBatch(session: LiveSession): QuestionHistoryBatch | undefined {
    const snapshot = session.prepared.snapshot;
    if (snapshot.selection.type === 'STUDY') return undefined;
    return {
      hostPlayerId: snapshot.hostPlayerId,
      resetKeys: snapshot.resetKeys,
      questionKeys: snapshot.sources
        .slice(0, session.state.index + 1)
        .map((source) => source.questionKey),
    };
  }
}
