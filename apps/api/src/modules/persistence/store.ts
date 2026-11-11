import type {
  GameLayout,
  GameMode,
  MatchResult,
  PackSummary,
  QuestionPack,
  QuizSelection,
  QuizSkill,
} from '@duoquest/shared-types';
import type { RewardGrant } from '../rewards/rewards.service';

export interface PlayerRecord {
  id: string;
  nickname: string;
  tokenHash: string | null;
}
export interface PackRecord {
  id: string;
  content: QuestionPack;
  trusted: boolean;
  ownerId: string | null;
}
export interface SessionRecord {
  id: string;
  roomCode: string;
  mode: GameMode;
  layout: GameLayout;
  packVersionId: string | null;
  selectionSnapshot?: SelectionSnapshot;
  questions: QuestionPack['questions'];
  playerIds: string[];
}
export interface SelectionSnapshot {
  selection: QuizSelection;
  hostPlayerId: string;
  trusted: boolean;
  sources: { packVersionId: string; questionId: string; questionKey: string }[];
  resetKeys: string[];
}
export interface QuestionHistoryBatch {
  hostPlayerId: string;
  questionKeys: string[];
  resetKeys: string[];
}
export abstract class PlatformStore {
  abstract createPlayer(nickname: string, tokenHash: string): Promise<PlayerRecord>;
  abstract findPlayer(tokenHash: string): Promise<PlayerRecord | null>;
  abstract listPacks(playerId: string): Promise<PackSummary[]>;
  abstract getPack(id: string, playerId: string): Promise<PackRecord | null>;
  abstract latestTrustedPacks(): Promise<{ id: string; packId: string }[]>;
  abstract readPacks(ids: string[]): Promise<PackRecord[]>;
  abstract askedQuestionKeys(hostPlayerId: string, keys: string[]): Promise<string[]>;
  abstract savePack(pack: QuestionPack, ownerId: string): Promise<PackSummary>;
  abstract createSession(session: SessionRecord): Promise<void>;
  abstract saveAnswer(
    sessionId: string,
    roundId: string,
    playerId: string,
    optionId: string,
    correct: boolean,
  ): Promise<void>;
  abstract skillStock(
    playerIds: string[],
  ): Promise<Record<string, Partial<Record<QuizSkill, number>>>>;
  abstract consumeSkill(
    sessionId: string,
    actionId: string,
    roundId: string,
    playerId: string,
    skill: QuizSkill,
  ): Promise<number>;
  abstract finishSession(
    result: MatchResult,
    grants: RewardGrant[],
    history?: QuestionHistoryBatch,
  ): Promise<void>;
  abstract cancelSession(sessionId: string, history?: QuestionHistoryBatch): Promise<void>;
  abstract cancelInterruptedSessions(): Promise<void>;
  abstract history(playerId: string): Promise<unknown>;
  abstract profile(playerId: string): Promise<unknown>;
}
