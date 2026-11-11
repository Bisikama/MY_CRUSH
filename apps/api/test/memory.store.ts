import { randomUUID } from 'node:crypto';
import {
  questionPackSchema,
  summarizePack,
  type QuizSkill,
  type MatchResult,
  type QuestionPack,
} from '@duoquest/shared-types';
import starter from '../../../examples/question-pack.json';
import {
  PlatformStore,
  type PackRecord,
  type PlayerRecord,
  type SessionRecord,
  type QuestionHistoryBatch,
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
  readonly questionHistory = new Map<string, Set<string>>();
  readonly extraPacks: (PackRecord & { version?: number })[] = [];
  readonly pack: PackRecord & { version?: number } = {
    id: randomUUID(),
    content: questionPackSchema.parse({ ...starter, questions: starter.questions.slice(0, 1) }),
    trusted: true,
    ownerId: null,
  };
  failFinish = false;
  failCancel = false;
  async createPlayer(nickname: string, tokenHash: string) {
    const player = { id: randomUUID(), nickname, tokenHash };
    this.players.set(tokenHash, player);
    return player;
  }
  async findPlayer(tokenHash: string) {
    return this.players.get(tokenHash) ?? null;
  }
  async listPacks(_playerId: string) {
    return [summarizePack(this.pack.id, this.pack.content, true)];
  }
  async getPack(id: string, _playerId: string) {
    if (id === this.pack.id) return this.pack;
    return (
      [this.pack, ...this.extraPacks].find(
        (pack) => pack.id === id && (pack.trusted || pack.ownerId === _playerId),
      ) ?? null
    );
  }
  async latestTrustedPacks() {
    const latest = new Map<string, PackRecord & { version?: number }>();
    for (const pack of [this.pack, ...this.extraPacks]) {
      if (!pack.trusted) continue;
      const previous = latest.get(pack.content.packId);
      if (!previous || (pack.version ?? 1) > (previous.version ?? 1))
        latest.set(pack.content.packId, pack);
    }
    return [...latest.values()]
      .sort((a, b) => a.content.packId.localeCompare(b.content.packId))
      .map((pack) => ({ id: pack.id, packId: pack.content.packId }));
  }
  async readPacks(ids: string[]) {
    return [this.pack, ...this.extraPacks]
      .filter((pack) => ids.includes(pack.id) && pack.trusted)
      .sort((a, b) => a.content.packId.localeCompare(b.content.packId));
  }
  async askedQuestionKeys(hostPlayerId: string, keys: string[]) {
    return keys.filter((key) => this.questionHistory.get(hostPlayerId)?.has(key));
  }
  async savePack(pack: QuestionPack, _ownerId: string) {
    return summarizePack(randomUUID(), pack, false);
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
  readonly stock: Record<string, Partial<Record<QuizSkill, number>>> = {};
  async skillStock(_playerIds: string[]) {
    return structuredClone(this.stock);
  }
  async consumeSkill(
    _sessionId: string,
    _actionId: string,
    _roundId: string,
    playerId: string,
    skill: QuizSkill,
  ) {
    const stock = this.stock[playerId];
    if (!stock?.[skill]) throw new Error('No skill stock');
    return --stock[skill];
  }
  private writeHistory(history?: QuestionHistoryBatch) {
    if (!history) return;
    const keys = this.questionHistory.get(history.hostPlayerId) ?? new Set<string>();
    for (const key of history.resetKeys) keys.delete(key);
    for (const key of history.questionKeys) keys.add(key);
    this.questionHistory.set(history.hostPlayerId, keys);
  }
  async finishSession(result: MatchResult, grants: RewardGrant[], history?: QuestionHistoryBatch) {
    if (this.failFinish) throw new Error('simulated database outage');
    if (this.results.has(result.sessionId) || this.cancelled.has(result.sessionId)) return;
    this.writeHistory(history);
    this.results.set(result.sessionId, structuredClone(result));
    this.grants.push(...grants);
  }
  async cancelSession(sessionId: string, history?: QuestionHistoryBatch) {
    if (this.failCancel) throw new Error('simulated database outage');
    if (this.results.has(sessionId) || this.cancelled.has(sessionId)) return;
    this.writeHistory(history);
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
