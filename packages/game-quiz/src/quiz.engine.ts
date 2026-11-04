import { assertDomain } from '@duoquest/game-core';
import type { GameEngine } from '@duoquest/game-sdk';
import type {
  GameLayout,
  GameMode,
  MatchResult,
  OptionId,
  Phase,
  Question,
  QuizAction,
  QuizView,
} from '@duoquest/shared-types';

/** PROPOSAL values: tune through playtests, never trust values supplied by a browser. */
export const DEFAULT_QUIZ_RULES = {
  correctBase: 100,
  speedBonus: 50,
  wrongPenalty: 20,
  stealPoints: 75,
  revealMs: 2500,
  coopLives: 3,
  questionsPerStage: 4,
};
export type QuizRules = typeof DEFAULT_QUIZ_RULES;
export interface QuizConfig {
  sessionId: string;
  mode: GameMode;
  layout: GameLayout;
  playerIds: string[];
  questions: Question[];
  rules?: Partial<QuizRules>;
}
export interface QuizState {
  config: QuizConfig;
  rules: QuizRules;
  index: number;
  version: number;
  phase: Phase;
  openedAt: number;
  deadline: number;
  scores: Record<string, number>;
  correctCounts: Record<string, number>;
  answers: Record<string, OptionId>;
  buzzerPlayerId: string | null;
  attemptedPlayerIds: string[];
  lives: number;
  teamScore: number;
  result: MatchResult | null;
}
const current = (state: QuizState): Question => state.config.questions[state.index]!;
export const roundIdOf = (state: QuizState) => `${state.config.sessionId}:${state.index + 1}`;
const captain = (state: QuizState) =>
  state.config.mode === 'COOP'
    ? state.config.playerIds[state.index % state.config.playerIds.length]!
    : null;

export class QuizEngine implements GameEngine<QuizState, QuizConfig, QuizAction, QuizView> {
  readonly id = 'quiz';
  initialize(config: QuizConfig, now: number): QuizState {
    assertDomain(config.questions.length > 0, 'INVALID_INPUT', 'Bộ đề chưa có câu hỏi');
    assertDomain(
      config.playerIds.length === (config.mode === 'SOLO' ? 1 : 2) &&
        new Set(config.playerIds).size === config.playerIds.length,
      'INVALID_INPUT',
      'Số người chơi không hợp lệ',
    );
    const snapshot = structuredClone(config);
    return {
      config: snapshot,
      rules: { ...DEFAULT_QUIZ_RULES, ...config.rules },
      index: 0,
      version: 1,
      phase: 'QUESTION',
      openedAt: now,
      deadline: now + snapshot.questions[0]!.timeLimitSeconds * 1000,
      scores: Object.fromEntries(config.playerIds.map((id) => [id, 0])),
      correctCounts: Object.fromEntries(config.playerIds.map((id) => [id, 0])),
      answers: {},
      buzzerPlayerId: null,
      attemptedPlayerIds: [],
      lives: config.rules?.coopLives ?? DEFAULT_QUIZ_RULES.coopLives,
      teamScore: 0,
      result: null,
    };
  }

  applyAction(previous: QuizState, playerId: string, action: QuizAction, now: number): QuizState {
    assertDomain(previous.config.playerIds.includes(playerId), 'FORBIDDEN', 'Không thuộc trận');
    assertDomain(previous.phase === 'QUESTION', 'CONFLICT', 'Vòng không nhận thao tác');
    assertDomain(
      now >= previous.openedAt && now < previous.deadline,
      'TOO_LATE',
      'Đã hết thời gian',
    );
    const state = structuredClone(previous);
    const sharedDuel = state.config.mode === 'DUEL' && state.config.layout === 'SHARED_SCREEN';
    if (action.type === 'BUZZ') {
      assertDomain(sharedDuel, 'FORBIDDEN', 'Chế độ này không dùng buzzer');
      assertDomain(
        state.buzzerPlayerId === null && !state.attemptedPlayerIds.includes(playerId),
        'CONFLICT',
        'Quyền trả lời không khả dụng',
      );
      state.buzzerPlayerId = playerId;
    } else {
      assertDomain(!state.answers[playerId], 'CONFLICT', 'Bạn đã trả lời câu này');
      if (sharedDuel)
        assertDomain(
          state.buzzerPlayerId === playerId,
          'FORBIDDEN',
          'Bạn chưa giành quyền trả lời',
        );
      if (state.config.mode === 'COOP')
        assertDomain(captain(state) === playerId, 'FORBIDDEN', 'Chỉ đội trưởng được khóa đáp án');
      state.answers[playerId] = action.optionId;
      const correct = action.optionId === current(state).correctOptionId;
      const ratio = Math.max(
        0,
        Math.min(1, (state.deadline - now) / (state.deadline - state.openedAt)),
      );
      const points = Math.round(state.rules.correctBase + state.rules.speedBonus * ratio);
      if (sharedDuel) {
        state.scores[playerId]! += correct
          ? state.attemptedPlayerIds.length > 0
            ? state.rules.stealPoints
            : points
          : -state.rules.wrongPenalty;
        state.attemptedPlayerIds.push(playerId);
        if (correct) state.correctCounts[playerId]! += 1;
        if (correct || state.attemptedPlayerIds.length === state.config.playerIds.length)
          this.reveal(state, now);
        else state.buzzerPlayerId = null;
      } else if (state.config.mode === 'COOP') {
        if (correct) {
          state.teamScore += points;
          for (const id of state.config.playerIds) {
            state.scores[id] = state.teamScore;
            state.correctCounts[id]! += 1;
          }
        } else state.lives -= 1;
        this.reveal(state, now);
      } else {
        if (correct) {
          state.scores[playerId]! += points;
          state.correctCounts[playerId]! += 1;
        }
        if (Object.keys(state.answers).length === state.config.playerIds.length)
          this.reveal(state, now);
      }
    }
    state.version += 1;
    return state;
  }

  onTimeout(previous: QuizState, now: number): QuizState {
    if (previous.phase === 'FINISHED' || now < previous.deadline) return previous;
    const state = structuredClone(previous);
    if (state.phase === 'QUESTION') {
      if (state.config.mode === 'COOP') state.lives -= 1;
      this.reveal(state, now);
    } else if (
      state.index + 1 >= state.config.questions.length ||
      (state.config.mode === 'COOP' && state.lives <= 0)
    ) {
      state.phase = 'FINISHED';
      state.result = this.finish(state);
    } else {
      state.index += 1;
      state.phase = 'QUESTION';
      state.openedAt = now;
      state.deadline = now + current(state).timeLimitSeconds * 1000;
      state.answers = {};
      state.buzzerPlayerId = null;
      state.attemptedPlayerIds = [];
    }
    state.version += 1;
    return state;
  }

  getPlayerView(state: QuizState, controlledPlayerIds: readonly string[], now: number): QuizView {
    const question = current(state);
    const revealed = state.phase !== 'QUESTION';
    return structuredClone({
      sessionId: state.config.sessionId,
      roundId: roundIdOf(state),
      version: state.version,
      mode: state.config.mode,
      layout: state.config.layout,
      phase: state.phase,
      questionNumber: state.index + 1,
      questionCount: state.config.questions.length,
      question: {
        id: question.id,
        prompt: question.prompt,
        options: question.options,
        topic: question.topic,
        difficulty: question.difficulty,
      },
      deadline: state.deadline,
      serverNow: now,
      scores: state.scores,
      answeredPlayerIds: Object.keys(state.answers),
      ownAnswers: Object.fromEntries(
        Object.entries(state.answers).filter(([id]) => controlledPlayerIds.includes(id)),
      ),
      buzzerPlayerId: state.buzzerPlayerId,
      captainId: captain(state),
      teamScore: state.teamScore,
      lives: state.lives,
      stage: Math.floor(state.index / state.rules.questionsPerStage) + 1,
      stageCount: Math.ceil(state.config.questions.length / state.rules.questionsPerStage),
      reveal: revealed
        ? {
            correctOptionId: question.correctOptionId,
            explanation: question.explanation,
            answers: state.answers,
          }
        : null,
      result: state.result,
    });
  }
  calculateResult(state: QuizState): MatchResult | null {
    return state.result ? structuredClone(state.result) : null;
  }
  private reveal(state: QuizState, now: number) {
    state.phase = 'REVEAL';
    state.deadline = now + state.rules.revealMs;
  }
  private finish(state: QuizState): MatchResult {
    const { sessionId, mode, playerIds } = state.config;
    const max = Math.max(...Object.values(state.scores));
    const leaders = playerIds.filter((id) => state.scores[id] === max);
    const failed = mode === 'COOP' && state.lives <= 0;
    return {
      sessionId,
      mode,
      scores: { ...state.scores },
      correctCounts: { ...state.correctCounts },
      winnerIds: failed ? [] : leaders,
      outcome: failed ? 'FAILED' : mode === 'DUEL' && leaders.length > 1 ? 'DRAW' : 'COMPLETED',
    };
  }
}
