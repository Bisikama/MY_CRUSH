import { assertDomain } from '@duoquest/game-core';
import { allowedQuizSkills } from '@duoquest/shared-types';
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
  QuizSkill,
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
export const QUIZ_SKILL_RULES = {
  limit: 7,
  coopLimit: 3,
  supportCutoffMs: 3000,
  interferenceDelayMs: 5000,
  COVER: 2000,
  BLUR: 3000,
};
export const DIFFICULTY_BONUS = { easy: 0, medium: 15, hard: 30 };
type Support = QuizView['support'];

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
  skillUses: Record<string, QuizSkill[]>;
  roundSkillUses: Record<string, QuizSkill[]>;
  support: Record<string, Support>;
  interference: Record<string, NonNullable<QuizView['interference']>>;
  lives: number;
  teamScore: number;
  result: MatchResult | null;
}
const current = (state: QuizState): Question => state.config.questions[state.index]!;
export const roundIdOf = (state: QuizState) => `${state.config.sessionId}:${state.index + 1}`;
const supportKey = (state: QuizState, playerId: string) =>
  state.config.mode === 'COOP' ? 'team' : playerId;
const supportFor = (state: QuizState, playerId: string): Support =>
  state.support[supportKey(state, playerId)] ?? { hints: [], hiddenOptions: [] };
export const hasFreeSkill = (state: QuizState, playerId: string, skill: QuizSkill) =>
  state.config.mode !== 'COOP' && !state.skillUses[playerId]?.includes(skill);

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
      skillUses: {},
      roundSkillUses: {},
      support: {},
      interference: {},
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
    if (action.type === 'USE_SKILL') {
      this.useSkill(state, playerId, action.skill, now, sharedDuel);
    } else if (action.type === 'BUZZ') {
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
      assertDomain(
        !supportFor(state, playerId).hiddenOptions.includes(action.optionId),
        'FORBIDDEN',
        'Đáp án đã bị ẩn',
      );
      state.answers[playerId] = action.optionId;
      const correct = action.optionId === current(state).correctOptionId;
      const ratio = Math.max(
        0,
        Math.min(1, (state.deadline - now) / (state.deadline - state.openedAt)),
      );
      const bonus = DIFFICULTY_BONUS[current(state).difficulty];
      const points = Math.round(state.rules.correctBase + state.rules.speedBonus * ratio) + bonus;
      if (sharedDuel) {
        state.scores[playerId]! += correct
          ? state.attemptedPlayerIds.length > 0
            ? state.rules.stealPoints + bonus
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
      state.roundSkillUses = {};
      state.support = {};
      state.interference = {};
    }
    state.version += 1;
    return state;
  }

  getPlayerView(state: QuizState, controlledPlayerIds: readonly string[], now: number): QuizView {
    const question = current(state);
    const revealed = state.phase !== 'QUESTION';
    const viewer =
      state.config.layout === 'SHARED_SCREEN' && state.config.mode === 'DUEL'
        ? state.buzzerPlayerId
        : controlledPlayerIds[0];
    const support = viewer ? supportFor(state, viewer) : { hints: [], hiddenOptions: [] };
    const effect = viewer ? state.interference[viewer] : undefined;
    return structuredClone({
      support: revealed ? { hints: [], hiddenOptions: [] } : support,
      interference: !revealed && effect && effect.until > now ? effect : null,
      hintRemaining: !revealed && support.hints.length < question.hints.length,
      skillSlots: controlledPlayerIds.map((playerId) => ({
        playerId,
        remaining:
          (state.config.mode === 'COOP' ? QUIZ_SKILL_RULES.coopLimit : QUIZ_SKILL_RULES.limit) -
          (state.skillUses[playerId]?.length ?? 0),
        free: allowedQuizSkills(state.config.mode, state.config.layout).filter((skill) =>
          hasFreeSkill(state, playerId, skill),
        ),
        usedThisRound: state.roundSkillUses[playerId] ?? [],
        stock: {},
      })),
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
        ...(question.images?.length ? { images: question.images } : {}),
        options: question.options,
        topic: question.topic,
        difficulty: question.difficulty,
      },
      openedAt: state.openedAt,
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
  private useSkill(
    state: QuizState,
    playerId: string,
    skill: QuizSkill,
    now: number,
    sharedDuel: boolean,
  ) {
    const { mode, layout, playerIds } = state.config;
    const uses = state.skillUses[playerId] ?? [];
    const roundUses = state.roundSkillUses[playerId] ?? [];
    assertDomain(
      allowedQuizSkills(mode, layout).includes(skill),
      'FORBIDDEN',
      'Skill không dùng trong chế độ này',
    );
    assertDomain(
      uses.length < (mode === 'COOP' ? QUIZ_SKILL_RULES.coopLimit : QUIZ_SKILL_RULES.limit),
      'CONFLICT',
      'Đã hết lượt Skill trong trận',
    );
    assertDomain(mode === 'COOP' || !state.answers[playerId], 'CONFLICT', 'Bạn đã khóa đáp án');
    assertDomain(
      !sharedDuel || state.buzzerPlayerId === playerId,
      'FORBIDDEN',
      'Cần giành quyền trả lời',
    );
    if (skill === 'HINT' || skill === 'FIFTY_FIFTY') {
      assertDomain(
        state.deadline - now > QUIZ_SKILL_RULES.supportCutoffMs,
        'TOO_LATE',
        'Đã vào 3 giây cuối',
      );
      const support = supportFor(state, playerId);
      if (skill === 'HINT') {
        const hint = current(state).hints[support.hints.length];
        assertDomain(hint, 'CONFLICT', 'Câu này không còn gợi ý');
        support.hints.push(hint);
      } else {
        assertDomain(support.hiddenOptions.length === 0, 'CONFLICT', 'Đã dùng 50/50 cho câu này');
        const question = current(state);
        support.hiddenOptions = question.options
          .filter((option) => option.id !== question.correctOptionId)
          .slice(0, 2)
          .map((option) => option.id);
      }
      state.support[supportKey(state, playerId)] = support;
    } else {
      const duration = QUIZ_SKILL_RULES[skill];
      const opponent = playerIds.find((id) => id !== playerId)!;
      assertDomain(
        now - state.openedAt >= QUIZ_SKILL_RULES.interferenceDelayMs,
        'CONFLICT',
        'Chờ hết 5 giây đầu câu',
      );
      assertDomain(
        now + duration <= state.deadline,
        'TOO_LATE',
        'Không còn đủ thời gian cho hiệu ứng',
      );
      assertDomain(!state.answers[opponent], 'CONFLICT', 'Đối thủ đã khóa đáp án');
      assertDomain(!roundUses.includes(skill), 'CONFLICT', 'Đã dùng Skill này cho câu hiện tại');
      assertDomain(
        (state.interference[opponent]?.until ?? 0) <= now,
        'CONFLICT',
        'Đối thủ đang có hiệu ứng',
      );
      state.interference[opponent] = { skill, until: now + duration };
    }
    state.skillUses[playerId] = [...uses, skill];
    state.roundSkillUses[playerId] = [...roundUses, skill];
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
