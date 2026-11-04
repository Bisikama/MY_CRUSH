import { describe, expect, it } from 'vitest';
import { questionPackSchema, type GameLayout, type GameMode } from '@duoquest/shared-types';
import starter from '../../../examples/question-pack.json';
import { QuizEngine, type QuizState } from './quiz.engine';

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
