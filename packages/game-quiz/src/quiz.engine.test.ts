import { describe, expect, it } from 'vitest';
import {
  questionPackSchema,
  type GameLayout,
  type GameMode,
  type QuizSkill,
} from '@duoquest/shared-types';
import starter from '../../../examples/question-pack.json';
import { hasFreeSkill, QuizEngine, type QuizState } from './quiz.engine';

const engine = new QuizEngine();
const questions = questionPackSchema.parse(starter).questions;
function setup(mode: GameMode = 'SOLO', layout: GameLayout = 'MULTI_DEVICE') {
  return engine.initialize(
    {
      sessionId: 'session',
      mode,
      layout,
      playerIds: mode === 'SOLO' ? ['p1'] : ['p1', 'p2'],
      questions,
      rules: { revealMs: 100 },
    },
    1000,
  );
}
const answer = (state: QuizState, id: string, optionId: 'A' | 'B' = 'A', now = 2000) =>
  engine.applyAction(state, id, { type: 'ANSWER', optionId }, now);
describe('QuizEngine server-authoritative rules', () => {
  it.each(['SHARED_SCREEN', 'MULTI_DEVICE'] as const)('completes Solo in %s', (layout) => {
    let state = setup('SOLO', layout);
    for (const question of questions) {
      state = engine.applyAction(
        state,
        'p1',
        { type: 'ANSWER', optionId: question.correctOptionId },
        state.openedAt + 500,
      );
      state = engine.onTimeout(state, state.deadline);
    }
    expect(state.result?.outcome).toBe('COMPLETED');
    expect(state.result?.correctCounts.p1).toBe(4);
  });
  it('uses elapsed server time and integer rounding', () => {
    expect(answer(setup(), 'p1').scores.p1).toBe(148);
  });
  it('does not mutate input state or source questions', () => {
    const state = setup();
    const before = structuredClone(state);
    answer(state, 'p1');
    expect(state).toEqual(before);
    state.config.questions[0]!.prompt = 'changed';
    expect(questions[0]!.prompt).not.toBe('changed');
  });
  it('rejects unknown players', () => {
    expect(() => answer(setup(), 'intruder')).toThrow('Không thuộc trận');
  });
  it('rejects answers exactly at the deadline', () => {
    const state = setup();
    expect(() => answer(state, 'p1', 'A', state.deadline)).toThrow('Đã hết');
  });
  it('rejects a second answer within a live simultaneous round', () => {
    expect(() => answer(answer(setup('DUEL'), 'p1'), 'p1')).toThrow('đã trả lời');
  });
  it('keeps simultaneous rounds open until both answer', () => {
    const first = answer(setup('DUEL'), 'p1');
    expect(first.phase).toBe('QUESTION');
    expect(answer(first, 'p2', 'B').phase).toBe('REVEAL');
  });
  it('does not expose opponent choices, solutions, hints or future questions', () => {
    const state = answer(setup('DUEL'), 'p1');
    const view = engine.getPlayerView(state, ['p2'], 2000);
    expect(view.reveal).toBeNull();
    expect(view.ownAnswers).toEqual({});
    expect(view.question).not.toHaveProperty('correctOptionId');
    expect(view.question).not.toHaveProperty('explanation');
    expect(view.question).not.toHaveProperty('hints');
    expect(view).not.toHaveProperty('config');
    expect(JSON.stringify(view)).not.toContain(questions[1]!.prompt);
  });
  it('returns isolated public snapshots', () => {
    const state = setup();
    const view = engine.getPlayerView(state, ['p1'], 1000);
    view.question.options[0]!.text = 'tamper';
    expect(state.config.questions[0]!.options[0]!.text).not.toBe('tamper');
  });
  it('reveals explanation only when the round closes', () => {
    expect(engine.getPlayerView(answer(setup(), 'p1'), ['p1'], 2000).reveal?.explanation).toBe(
      questions[0]!.explanation,
    );
  });
  it('enforces buzzer ownership and first accepted buzz wins', () => {
    const state = engine.applyAction(setup('DUEL', 'SHARED_SCREEN'), 'p1', { type: 'BUZZ' }, 1500);
    expect(() => engine.applyAction(state, 'p2', { type: 'BUZZ' }, 1500)).toThrow('không khả dụng');
    expect(() => answer(state, 'p2')).toThrow('chưa giành quyền');
  });
  it('allows one steal after a wrong shared-screen answer', () => {
    let state = engine.applyAction(setup('DUEL', 'SHARED_SCREEN'), 'p1', { type: 'BUZZ' }, 1500);
    state = answer(state, 'p1', 'B');
    expect(state.scores.p1).toBe(-20);
    expect(state.phase).toBe('QUESTION');
    expect(() => engine.applyAction(state, 'p1', { type: 'BUZZ' }, 2100)).toThrow();
    state = engine.applyAction(state, 'p2', { type: 'BUZZ' }, 2100);
    state = answer(state, 'p2', 'A', 2500);
    expect(state.scores.p2).toBe(75);
    expect(state.phase).toBe('REVEAL');
  });
  it('forbids buzzer in multi-device Duel', () => {
    expect(() => engine.applyAction(setup('DUEL'), 'p1', { type: 'BUZZ' }, 2000)).toThrow(
      'không dùng buzzer',
    );
  });
  it.each(['SHARED_SCREEN', 'MULTI_DEVICE'] as const)(
    'rotates Co-op captain and shares progress in %s',
    (layout) => {
      let state = setup('COOP', layout);
      expect(() => answer(state, 'p2')).toThrow('đội trưởng');
      state = answer(state, 'p1');
      expect(state.scores.p1).toBe(state.scores.p2);
      state = engine.onTimeout(state, state.deadline);
      expect(engine.getPlayerView(state, ['p2'], state.openedAt).captainId).toBe('p2');
    },
  );
  it('charges a Co-op timeout once and fails when no lives remain', () => {
    let state = setup('COOP');
    for (let i = 0; i < 3; i++) {
      state = engine.onTimeout(state, state.deadline);
      expect(state.lives).toBe(2 - i);
      const revealed = engine.onTimeout(state, state.openedAt);
      expect(revealed).toBe(state);
      state = engine.onTimeout(state, state.deadline);
    }
    expect(state.phase).toBe('FINISHED');
    expect(state.result?.outcome).toBe('FAILED');
    expect(state.result?.winnerIds).toEqual([]);
  });
  it('finishes a Duel tie explicitly', () => {
    let state = engine.initialize(
      {
        sessionId: 'tie',
        mode: 'DUEL',
        layout: 'MULTI_DEVICE',
        playerIds: ['p1', 'p2'],
        questions: questions.slice(0, 1),
      },
      1000,
    );
    state = answer(answer(state, 'p1'), 'p2');
    state = engine.onTimeout(state, state.deadline);
    expect(state.result?.outcome).toBe('DRAW');
  });
});

describe('Quiz Skills', () => {
  const use = (state: QuizState, player: string, skill: QuizSkill, now = 2000) =>
    engine.applyAction(state, player, { type: 'USE_SKILL', skill }, now);
  it('releases hints in order to their recipient only and 50/50 hides two wrong options', () => {
    let state = setup('DUEL');
    state.config.questions[0]!.hints = ['first', 'second', 'third'];
    state = use(use(state, 'p1', 'HINT'), 'p1', 'HINT');
    state = use(state, 'p1', 'FIFTY_FIFTY');
    const view = engine.getPlayerView(state, ['p1'], 2000);
    expect(view.support.hints).toEqual(['first', 'second']);
    expect(view.support.hiddenOptions).toHaveLength(2);
    expect(view.support.hiddenOptions).not.toContain(state.config.questions[0]!.correctOptionId);
    expect(engine.getPlayerView(state, ['p2'], 2000).support).toEqual({
      hints: [],
      hiddenOptions: [],
    });
    expect(hasFreeSkill(state, 'p1', 'HINT')).toBe(false);
    expect(() => use(state, 'p1', 'FIFTY_FIFTY')).toThrow('50/50');
  });

  it('applies interference only to the target, blocks overlap and still allows an answer', () => {
    const state = setup('DUEL');
    expect(() => use(state, 'p1', 'BLUR', 5999)).toThrow('5 giây');
    const blurred = use(state, 'p1', 'BLUR', 6000);
    expect(engine.getPlayerView(blurred, ['p1'], 6000).interference).toBeNull();
    expect(engine.getPlayerView(blurred, ['p2'], 6000).interference).toEqual({
      skill: 'BLUR',
      until: 9000,
    });
    expect(() => use(blurred, 'p1', 'COVER', 6500)).toThrow('đang có hiệu ứng');
    expect(engine.getPlayerView(blurred, ['p2'], 9000).interference).toBeNull();
    expect(answer(blurred, 'p2', 'B', 7000).answers.p2).toBe('B');
    expect(() => use(setup('DUEL', 'SHARED_SCREEN'), 'p1', 'BLUR', 6000)).toThrow('chế độ');
  });

  it('uses a team support view with independent three-use caps and no free Co-op Skills', () => {
    let state = setup('COOP');
    state.config.questions[0]!.hints = ['one', 'two', 'three', 'four', 'five'];
    expect(hasFreeSkill(state, 'p2', 'HINT')).toBe(false);
    state = use(use(use(state, 'p2', 'HINT'), 'p2', 'HINT'), 'p2', 'HINT');
    expect(() => use(state, 'p2', 'FIFTY_FIFTY')).toThrow('hết lượt');
    state = use(state, 'p1', 'FIFTY_FIFTY');
    const p1 = engine.getPlayerView(state, ['p1'], 2000);
    const p2 = engine.getPlayerView(state, ['p2'], 2000);
    expect(p1.support).toEqual(p2.support);
    expect(p1.support.hints).toEqual(['one', 'two', 'three']);
    expect(p1.skillSlots[0]!.remaining).toBe(2);
    expect(p2.skillSlots[0]!.remaining).toBe(0);
    expect(() => answer(state, 'p2')).toThrow('đội trưởng');
  });

  it('caps Solo at seven Skills across rounds and rejects support at the cutoff', () => {
    let state = setup();
    for (const q of state.config.questions) q.hints = ['one', 'two', 'three', 'four', 'five'];
    expect(() => use(state, 'p1', 'HINT', state.deadline - 3000)).toThrow('3 giây cuối');
    for (let i = 0; i < 5; i++) state = use(state, 'p1', 'HINT');
    state = use(state, 'p1', 'FIFTY_FIFTY');
    state = answer(state, 'p1');
    state = engine.onTimeout(state, state.deadline);
    state = use(state, 'p1', 'HINT', state.openedAt + 1);
    expect(() => use(state, 'p1', 'HINT', state.openedAt + 2)).toThrow('hết lượt');
  });

  it.each([
    ['easy', 148],
    ['medium', 163],
    ['hard', 178],
  ] as const)('adds the %s bonus to a correct answer', (difficulty, expected) => {
    const state = setup();
    state.config.questions[0]!.difficulty = difficulty;
    expect(answer(state, 'p1').scores.p1).toBe(expected);
    expect(answer(state, 'p1', 'B').scores.p1).toBe(0);
  });
  it('adds the hard bonus to a Duel steal and applies a Co-op bonus once to team score', () => {
    let duel = setup('DUEL', 'SHARED_SCREEN');
    duel.config.questions[0]!.difficulty = 'hard';
    duel = engine.applyAction(duel, 'p1', { type: 'BUZZ' }, 1500);
    duel = answer(duel, 'p1', 'B');
    duel = engine.applyAction(duel, 'p2', { type: 'BUZZ' }, 2100);
    expect(answer(duel, 'p2', 'A', 2200).scores).toEqual({ p1: -20, p2: 105 });
    const coop = setup('COOP');
    coop.config.questions[0]!.difficulty = 'hard';
    expect(answer(coop, 'p1').teamScore).toBe(178);
  });
});
