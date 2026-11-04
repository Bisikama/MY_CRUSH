import type {
  GameLayout,
  GameMode,
  MatchResult,
  PackSummary,
  QuestionPack,
} from '@duoquest/shared-types';
import type { RewardGrant } from '../rewards/rewards.service';

export interface PlayerRecord {
  id: string;
  nickname: string;
  tokenHash: string;
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
  packVersionId: string;
  questions: QuestionPack['questions'];
  playerIds: string[];
}
export abstract class PlatformStore {
  abstract createPlayer(nickname: string, tokenHash: string): Promise<PlayerRecord>;
  abstract findPlayer(tokenHash: string): Promise<PlayerRecord | null>;
  abstract listPacks(playerId: string): Promise<PackSummary[]>;
  abstract getPack(id: string, playerId: string): Promise<PackRecord | null>;
  abstract savePack(pack: QuestionPack, ownerId: string): Promise<PackSummary>;
  abstract createSession(session: SessionRecord): Promise<void>;
  abstract saveAnswer(
    sessionId: string,
    roundId: string,
    playerId: string,
    optionId: string,
    correct: boolean,
  ): Promise<void>;
  abstract finishSession(result: MatchResult, grants: RewardGrant[]): Promise<void>;
  abstract cancelSession(sessionId: string): Promise<void>;
  abstract cancelInterruptedSessions(): Promise<void>;
  abstract history(playerId: string): Promise<unknown>;
  abstract profile(playerId: string): Promise<unknown>;
}
