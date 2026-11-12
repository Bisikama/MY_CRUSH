import { describe, expect, it } from 'vitest';
import type { GameMode, GameLayout, QuizAction } from '@duoquest/shared-types';
import { LabMatch, labScenes, type LabScene } from './match';
import { sceneQuestions } from './packs';

function makeMatch(mode: GameMode, layout: GameLayout, single = false) {
  let session = 0;
  let hints = 1;
  const players = [
    { playerId: 'P1', nickname: 'Minh' },
    ...(mode === 'SOLO' ? [] : [{ playerId: 'P2', nickname: 'An' }]),
  ];
  const match = new LabMatch({
    mode,
    layout,
    players,
    questions: single ? sceneQuestions.slice(0, 1) : sceneQuestions,
    sessionId: () => String(++session),
    stock: () => ({ HINT: hints }),
    consume: () => {
      hints--;
    },
  });
  return match;
}

function act(
  match: LabMatch,
  playerId: string,
  payload: QuizAction,
  now: number,
  actionId: string,
) {
  const { code, game } = match.view(now);
  return match.action(
    { code, sessionId: game!.sessionId, roundId: game!.roundId, actionId, playerId, payload },
    now,
  );
}

describe('UI Lab match simulator', () => {
  it('joins, readies and rematches with two separate LAN perspectives', () => {
    const match = makeMatch('DUEL', 'MULTI_DEVICE', true);
    match.command('room:ready', 0);
    expect(match.view(0).status).toBe('WAITING');
    expect(() => match.command('match:start', 0)).toThrow();
    match.switchPlayer(1);
    match.command('room:ready', 0);
    expect(match.view(0).status).toBe('READY');
    expect(() => match.command('match:start', 0)).toThrow();
    match.switchPlayer(0);
    match.command('match:start', 0);

    const answer = { type: 'ANSWER', optionId: 'A' } as const;
    const receipt = act(match, 'P1', answer, 100, 'p1-answer');
    expect(act(match, 'P1', answer, 100, 'p1-answer')).toEqual(receipt);
    expect(match.view(100).game?.ownAnswers).toEqual({ P1: 'A' });
    match.switchPlayer(1);
    expect(match.view(100).game).toMatchObject({
      ownAnswers: {},
      reveal: null,
      answeredPlayerIds: ['P1'],
    });
    expect(() => act(match, 'P1', answer, 100, 'another')).toThrow();
    act(match, 'P2', { type: 'ANSWER', optionId: 'B' }, 100, 'p2-answer');
    expect(match.view(100).game?.reveal?.correctOptionId).toBe('A');
    match.tick(2600);
    expect(match.view(2600).status).toBe('FINISHED');

    match.command('room:rematch', 2700);
    expect(match.view(2700).rematchVotes).toEqual(['P2']);
    match.switchPlayer(0);
    match.command('room:rematch', 2800);
    expect(match.view(2800).game).toMatchObject({ sessionId: '2', phase: 'QUESTION' });
  });

  it('charges Co-op stock only once and allows only the captain to answer', () => {
    const match = makeMatch('COOP', 'MULTI_DEVICE');
    match.prepareScene('coop-life', 0, 450);
    match.switchPlayer(1);
    expect(() => act(match, 'P2', { type: 'ANSWER', optionId: 'A' }, 500, 'answer')).toThrow();
    const hint = { type: 'USE_SKILL', skill: 'HINT' } as const;
    const receipt = act(match, 'P2', hint, 500, 'hint');
    expect(act(match, 'P2', hint, 600, 'hint')).toEqual(receipt);
    expect(match.view(600).game?.skillSlots[0]?.stock.HINT).toBe(0);
    match.switchPlayer(0);
    expect(match.view(600).game?.support.hints).toHaveLength(1);
  });

  it.each(Object.keys(labScenes) as LabScene[])('opens and replays %s', (scene) => {
    const { mode, layout } = labScenes[scene];
    const match = makeMatch(mode, layout, scene === 'result');
    match.prepareScene(scene, 10_000, 450);
    match.playScene(scene, 10_450);
    const view = match.view(10_450);
    if (scene === 'lobby') expect(view.status).toBe('WAITING');
    if (scene === 'result') expect(view.status).toBe('FINISHED');
    if (scene === 'timeout') expect(view.game?.phase).toBe('REVEAL');
    if (scene === 'steal') expect(view.game?.buzzerPlayerId).toBe('P2');
    if (scene === 'hint') expect(view.game?.support.hints).toHaveLength(1);
    if (scene === 'fifty') expect(view.game?.support.hiddenOptions).toHaveLength(2);
    if (scene === 'coop-life') expect(view.game?.lives).toBe(2);
    if (scene === 'disconnect') expect(match.isConnected).toBe(false);
    if (scene === 'cover' || scene === 'blur') {
      expect(view.game?.interference?.skill).toBe(scene.toUpperCase());
      match.switchPlayer(0);
      expect(match.view(10_450).game?.interference).toBeNull();
    }
  });
});
