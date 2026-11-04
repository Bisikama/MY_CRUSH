import { randomUUID } from 'node:crypto';
import { questionPackSchema, type MatchResult, type QuestionPack } from '@duoquest/shared-types';
import starter from '../../../examples/question-pack.json';
import {
  PlatformStore,
  type PackRecord,
  type PlayerRecord,
  type SessionRecord,
} from '../src/modules/persistence/store';
import type { RewardGrant } from '../src/modules/rewards/rewards.service';

/** Test adapter only. Runtime always uses PostgreSQL, never an implicit fallback. */
export class MemoryStore extends PlatformStore {
  readonly players = new Map<string, PlayerRecord>();
  readonly sessions = new Map<string, SessionRecord>();
  readonly results = new Map<string, MatchResult>();
  readonly answers = new Map<string, string>();
  readonly cancelled = new Set<string>();
  readonly grants: RewardGrant[] = [];
  readonly pack: PackRecord = {
    id: randomUUID(),
    content: questionPackSchema.parse({ ...starter, questions: starter.questions.slice(0, 1) }),
    trusted: true,
    ownerId: null,
  };
  failFinish = false;
  async createPlayer(nickname: string, tokenHash: string) {
    const player = { id: randomUUID(), nickname, tokenHash };
    this.players.set(tokenHash, player);
    return player;
  }
  async findPlayer(tokenHash: string) {
    return this.players.get(tokenHash) ?? null;
  }
  async listPacks(_playerId: string) {
    return [
      {
        id: this.pack.id,
        packId: this.pack.content.packId,
        title: this.pack.content.title,
        trusted: true,
        questionCount: 1,
      },
    ];
  }
  async getPack(id: string, _playerId: string) {
    return id === this.pack.id ? this.pack : null;
  }
  async savePack(pack: QuestionPack, _ownerId: string) {
    return {
      id: randomUUID(),
      packId: pack.packId,
      title: pack.title,
      questionCount: pack.questions.length,
      trusted: false,
    };
  }
  async createSession(session: SessionRecord) {
    this.sessions.set(session.id, structuredClone(session));
  }
  async saveAnswer(
    sessionId: string,
    roundId: string,
    playerId: string,
    optionId: string,
    _correct: boolean,
  ) {
    this.answers.set(`${sessionId}:${roundId}:${playerId}`, optionId);
  }
  async finishSession(result: MatchResult, grants: RewardGrant[]) {
    if (this.failFinish) throw new Error('simulated database outage');
    if (this.results.has(result.sessionId)) return;
    this.results.set(result.sessionId, structuredClone(result));
    this.grants.push(...grants);
  }
  async cancelSession(sessionId: string) {
    this.cancelled.add(sessionId);
  }
  async cancelInterruptedSessions() {}
  async history(_playerId: string) {
    return [...this.results.values()];
  }
  async profile(playerId: string) {
    return { id: playerId };
  }
}
