import { z } from 'zod';
import { optionIdSchema, type OptionId, type PublicQuestion } from './question-pack';
export * from './question-pack';

export const modeSchema = z.enum(['SOLO', 'DUEL', 'COOP']);
export const layoutSchema = z.enum(['SHARED_SCREEN', 'MULTI_DEVICE']);
export type GameMode = z.infer<typeof modeSchema>;
export type GameLayout = z.infer<typeof layoutSchema>;
export type RoomStatus = 'WAITING' | 'READY' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
export type Phase = 'QUESTION' | 'REVEAL' | 'FINISHED';

export const nicknameSchema = z.string().trim().min(2).max(30);
export const passwordRequirementsMessage =
  'Mật khẩu phải dài 9–128 ký tự và có ít nhất 1 ký tự đặc biệt (ví dụ: !, @, #).';
export const passwordSchema = z
  .string()
  .max(256, passwordRequirementsMessage)
  .refine((value) => {
    const length = Array.from(value).length;
    return length >= 9 && length <= 128 && /[\p{P}\p{S}]/u.test(value);
  }, passwordRequirementsMessage);
export const createRoomSchema = z
  .object({
    mode: modeSchema,
    layout: layoutSchema,
    packVersionId: z.string().min(1).max(100),
    secondNickname: nicknameSchema.optional(),
  })
  .strict();
export const roomCodeSchema = z.string().regex(/^[A-Z2-9]{6}$/);
export const joinRoomSchema = z.object({ code: roomCodeSchema }).strict();
export const roomCommandSchema = z.object({ code: roomCodeSchema }).strict();
export const quizActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('BUZZ') }).strict(),
  z.object({ type: z.literal('ANSWER'), optionId: optionIdSchema }).strict(),
]);
export type QuizAction = z.infer<typeof quizActionSchema>;
export const gameActionSchema = z
  .object({
    code: roomCodeSchema,
    sessionId: z.string().uuid(),
    roundId: z.string().min(1).max(100),
    actionId: z.string().uuid(),
    playerId: z.string().uuid(),
    payload: quizActionSchema,
  })
  .strict();
export type GameActionCommand = z.infer<typeof gameActionSchema>;

export type ErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_LATE'
  | 'RATE_LIMITED'
  | 'INTERNAL';
export interface AppError {
  code: ErrorCode;
  message: string;
}
export type Ack<T> = { ok: true; data: T } | { ok: false; error: AppError };
export interface GuestIdentity {
  playerId: string;
  nickname: string;
  token: string;
}
export interface PlayerSlot {
  playerId: string;
  nickname: string;
  ready: boolean;
  connected: boolean;
}
export interface MatchResult {
  sessionId: string;
  mode: GameMode;
  scores: Record<string, number>;
  winnerIds: string[];
  outcome: 'COMPLETED' | 'FAILED' | 'DRAW';
  correctCounts: Record<string, number>;
}
export interface QuizView {
  sessionId: string;
  roundId: string;
  version: number;
  mode: GameMode;
  layout: GameLayout;
  phase: Phase;
  questionNumber: number;
  questionCount: number;
  question: PublicQuestion;
  deadline: number;
  serverNow: number;
  scores: Record<string, number>;
  answeredPlayerIds: string[];
  ownAnswers: Record<string, OptionId>;
  buzzerPlayerId: string | null;
  captainId: string | null;
  teamScore: number;
  lives: number;
  stage: number;
  stageCount: number;
  reveal: {
    correctOptionId: OptionId;
    explanation: string;
    answers: Record<string, OptionId>;
  } | null;
  result: MatchResult | null;
}
export interface RoomView {
  code: string;
  hostPlayerId: string;
  mode: GameMode;
  layout: GameLayout;
  status: RoomStatus;
  players: PlayerSlot[];
  controlledPlayerIds: string[];
  rematchVotes: string[];
  game: QuizView | null;
}
export interface PackSummary {
  id: string;
  packId: string;
  title: string;
  questionCount: number;
  trusted: boolean;
}
export interface ActionReceipt {
  actionId: string;
  stateVersion: number;
}

export interface ClientToServerEvents {
  'room:create': (
    data: z.infer<typeof createRoomSchema>,
    ack: (result: Ack<RoomView>) => void,
  ) => void;
  'room:join': (data: z.infer<typeof joinRoomSchema>, ack: (result: Ack<RoomView>) => void) => void;
  'room:ready': (data: { code: string }, ack: (result: Ack<RoomView>) => void) => void;
  'match:start': (data: { code: string }, ack: (result: Ack<RoomView>) => void) => void;
  'room:sync': (data: { code: string }, ack: (result: Ack<RoomView>) => void) => void;
  'room:rematch': (data: { code: string }, ack: (result: Ack<RoomView>) => void) => void;
  'room:leave': (data: { code: string }, ack: (result: Ack<null>) => void) => void;
  'game:action': (data: GameActionCommand, ack: (result: Ack<ActionReceipt>) => void) => void;
}
export interface ServerToClientEvents {
  'room:state': (view: RoomView) => void;
  'game:state': (view: RoomView) => void;
  'match:result': (result: MatchResult) => void;
}
