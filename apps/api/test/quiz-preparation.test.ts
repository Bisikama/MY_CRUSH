import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { QuizSelection } from '@duoquest/shared-types';
import { MemoryStore } from './memory.store';
import {
  questionKey,
  QuizPreparationService,
  sampleQuestions,
} from '../src/modules/question-packs/quiz-preparation.service';
import { SessionsService } from '../src/modules/sessions/sessions.service';
import { GameRegistry } from '../src/modules/sessions/game-registry';
import { RewardsService } from '../src/modules/rewards/rewards.service';
import { PlayersService } from '../src/modules/players/players.service';
import { RoomsService } from '../src/modules/rooms/rooms.service';

const random: QuizSelection = { type: 'CASUAL_RANDOM' };
function fixture(count: number) {
  const store = new MemoryStore();
  store.pack.content.knowledgeType = 'discovery';
  const template = store.pack.content.questions[0]!;
  store.pack.content.questions = Array.from({ length: count }, (_, index) => ({
    ...template,
    id: String(index),
    prompt: 'Question ' + index,
    topic: index % 2 ? 'Topic B' : 'Topic A',
    difficulty: index % 2 ? ('hard' as const) : ('easy' as const),
  }));
  const preparation = new QuizPreparationService(store);
  const sessions = new SessionsService(store, new GameRegistry(), new RewardsService());
  const players = new PlayersService(store);
  const rooms = new RoomsService(players, sessions, preparation);
  return { store, preparation, sessions, players, rooms };
}

describe('Quiz preparation and history', () => {
  it.each([1, 4, 19, 20, 37])(
    'samples up to 20 unique questions from %i candidates',
    async (count) => {
      const { preparation } = fixture(count);
      const result = await preparation.prepare('host', 'SOLO', random);
      expect(result.questions).toHaveLength(Math.min(20, count));
      expect(new Set(result.questions.map((question) => question.prompt)).size).toBe(
        result.questions.length,
      );
      expect(new Set(result.questions.map((question) => question.id)).size).toBe(
        result.questions.length,
      );
      expect(result.packVersionId).toBeNull();
    },
  );

  it('implements reservoir replacement and shuffle with controlled randomness', () => {
    expect(sampleQuestions([1, 2, 3, 4], 2, () => 0)).toEqual([2, 4]);
    expect(sampleQuestions([1, 2, 3, 4], 2, (max) => max - 1)).toEqual([1, 2]);
  });

  it('completes 44 candidates as 20, 20, 4 before opening a new cycle', async () => {
    const { preparation, sessions, store } = fixture(44);
    const seen = new Set<string>();
    for (const count of [20, 20, 4]) {
      const prepared = await preparation.prepare('host', 'SOLO', random);
      expect(prepared.questions).toHaveLength(count);
      expect(prepared.snapshot.resetKeys).toEqual([]);
      for (const source of prepared.snapshot.sources) {
        expect(seen.has(source.questionKey)).toBe(false);
        seen.add(source.questionKey);
      }
      const session = await sessions.create(
        'ABCDEF',
        'SOLO',
        'MULTI_DEVICE',
        ['host'],
        prepared,
        0,
      );
      while (!session.saved) await sessions.tick(session, session.state.deadline);
    }
    expect(store.questionHistory.get('host')?.size).toBe(44);
    const next = await preparation.prepare('host', 'DUEL', random);
    expect(next.questions).toHaveLength(20);
    expect(next.snapshot.resetKeys).toHaveLength(44);
    expect(store.questionHistory.get('host')?.size).toBe(44);
  });

  it('shares history across filters and resets only an exhausted matching subset', async () => {
    const { preparation, store, sessions } = fixture(8);
    store.questionHistory.set(
      'host',
      new Set(store.pack.content.questions.map((question) => questionKey(question.prompt))),
    );
    const custom: QuizSelection = {
      type: 'CASUAL_CUSTOM',
      categories: [store.pack.content.category],
      topics: [{ category: store.pack.content.category, topic: 'Topic A' }],
      difficulty: 'easy',
    };
    const prepared = await preparation.prepare('host', 'SOLO', custom);
    expect(prepared.snapshot.resetKeys).toHaveLength(4);
    const live = await sessions.create('ABCDEF', 'SOLO', 'MULTI_DEVICE', ['host'], prepared, 0);
    await sessions.cancel(live);
    // Four B questions remain seen, plus the first A question reached in the new cycle.
    expect(store.questionHistory.get('host')?.size).toBe(5);
    const next = await preparation.prepare('host', 'SOLO', random);
    expect(next.questions).toHaveLength(3);
    expect(next.questions.every((question) => question.topic === 'Topic A')).toBe(true);
    expect((await preparation.prepare('other-host', 'SOLO', random)).questions).toHaveLength(8);
  });

  it('uses newest trusted versions, excludes academic/private/unclassified and deduplicates prompts', async () => {
    const { preparation, store } = fixture(1);
    store.extraPacks.push(
      { ...structuredClone(store.pack), id: randomUUID(), version: 2 },
      ...(['academic', undefined, 'discovery'] as const).map((type, index) => ({
        ...structuredClone(store.pack),
        id: randomUUID(),
        trusted: index !== 2,
        content: {
          ...structuredClone(store.pack.content),
          packId: 'excluded-' + index,
          knowledgeType: type,
          questions: [{ ...store.pack.content.questions[0]!, prompt: 'excluded ' + index }],
        },
      })),
      {
        ...structuredClone(store.pack),
        id: randomUUID(),
        content: {
          ...structuredClone(store.pack.content),
          packId: 'zzz-duplicate',
          questions: [{ ...store.pack.content.questions[0]!, prompt: '  QUESTION   0  ' }],
        },
      },
    );
    const result = await preparation.prepare('host', 'SOLO', random);
    expect(result.questions).toHaveLength(1);
    expect(result.snapshot.sources[0]?.packVersionId).toBe(store.extraPacks[0]!.id);
    expect(await preparation.catalog()).toHaveLength(1);
  });

  it('combines selected topics from multiple categories while keeping same-named topics separate', async () => {
    const { preparation, store } = fixture(2);
    store.extraPacks.push({
      ...structuredClone(store.pack),
      id: randomUUID(),
      content: {
        ...structuredClone(store.pack.content),
        packId: 'other-category',
        category: 'Other',
        knowledgeType: 'practical',
        questions: [{ ...store.pack.content.questions[0]!, prompt: 'Other question' }],
      },
    });
    const base = {
      type: 'CASUAL_CUSTOM',
      categories: [store.pack.content.category, 'Other'],
      difficulty: 'mixed',
    } as const;
    const result = await preparation.prepare('host', 'SOLO', {
      ...base,
      categories: [...base.categories],
      topics: [
        { category: 'Other', topic: 'Topic A' },
        { category: store.pack.content.category, topic: 'Topic B' },
      ],
    });
    expect(result.questions.map((question) => question.prompt).sort()).toEqual([
      'Other question',
      'Question 1',
    ]);
  });

  it('rejects empty sources and empty custom filters', async () => {
    const { preparation } = fixture(0);
    await expect(preparation.prepare('host', 'SOLO', random)).rejects.toThrow('Chưa có câu');
    const other = fixture(5);
    await expect(
      other.preparation.prepare('host', 'SOLO', {
        type: 'CASUAL_CUSTOM',
        categories: ['missing'],
        topics: [],
        difficulty: 'mixed',
      }),
    ).rejects.toThrow('Chưa có câu');
  });

  it.each(['SOLO', 'DUEL', 'COOP'] as const)(
    'caps study for %s and never writes casual history',
    async (mode) => {
      const { preparation, store, sessions } = fixture(30);
      const study: QuizSelection = { type: 'STUDY', packVersionId: store.pack.id };
      store.questionHistory.set(
        'host',
        new Set(store.pack.content.questions.map((question) => questionKey(question.prompt))),
      );
      const prepared = await preparation.prepare('host', mode, study);
      expect(prepared.questions).toHaveLength(mode === 'COOP' ? 20 : 10);
      const live = await sessions.create(
        'ABCDEF',
        mode,
        'MULTI_DEVICE',
        mode === 'SOLO' ? ['host'] : ['host', 'other'],
        prepared,
        0,
      );
      await sessions.cancel(live);
      expect(store.questionHistory.get('host')?.size).toBe(30);
      const again = await preparation.prepare('host', mode, study);
      expect(again.questions.length).toBe(prepared.questions.length);
      expect(again.snapshot.resetKeys).toEqual([]);
    },
  );

  it('batches only reached questions, including a partially played cancelled match, and retries once', async () => {
    const { preparation, sessions, store } = fixture(30);
    const prepared = await preparation.prepare('host', 'COOP', random);
    const live = await sessions.create(
      'ABCDEF',
      'COOP',
      'MULTI_DEVICE',
      ['host', 'other'],
      prepared,
      0,
    );
    live.state.index = 5;
    expect(store.questionHistory.size).toBe(0);
    store.failCancel = true;
    await expect(sessions.cancel(live)).rejects.toThrow('database outage');
    expect(store.questionHistory.size).toBe(0);
    store.failCancel = false;
    await sessions.cancel(live);
    expect(store.questionHistory.get('host')?.size).toBe(6);
    // Retry cannot delete a history update committed by a later batch.
    store.questionHistory.get('host')!.add('later');
    await sessions.cancel(live);
    expect(store.questionHistory.get('host')?.size).toBe(7);
  });

  it('prepares once for a room, syncs the same question, and retries pending cancellation on tick', async () => {
    const { store, rooms, players } = fixture(25);
    const host = await players.authenticate((await players.create('Host')).token);
    const waiting = await rooms.create(host, {
      mode: 'SOLO',
      layout: 'MULTI_DEVICE',
      selection: random,
    });
    expect(store.questionHistory.size).toBe(0);
    await rooms.leave(waiting.code, host.id);
    expect(store.questionHistory.size).toBe(0);
    const created = await rooms.create(host, {
      mode: 'SOLO',
      layout: 'MULTI_DEVICE',
      selection: random,
    });
    await rooms.ready(created.code, host.id);
    const started = await rooms.start(created.code, host.id);
    expect((await rooms.sync(created.code, host.id)).game?.question).toEqual(
      started.game?.question,
    );
    store.failCancel = true;
    await expect(rooms.leave(created.code, host.id)).rejects.toThrow('database outage');
    await expect(
      rooms.create(host, { mode: 'SOLO', layout: 'MULTI_DEVICE', selection: random }),
    ).rejects.toThrow('rời phòng');
    store.failCancel = false;
    await rooms.tick(Date.now());
    expect(await rooms.currentFor(host.id)).toBeNull();
    expect(store.questionHistory.get(host.id)?.size).toBe(1);
  });

  it('commits early Co-op failure history and result together before a rematch', async () => {
    const { rooms, players, store } = fixture(25);
    const host = await players.authenticate((await players.create('Host')).token);
    const waiting = await rooms.create(host, {
      mode: 'COOP',
      layout: 'SHARED_SCREEN',
      selection: random,
    });
    await rooms.ready(waiting.code, host.id);
    let view = await rooms.start(waiting.code, host.id);
    const firstSession = view.game!.sessionId;
    const lastRound = view.game!.roundId;
    expect(store.sessions.get(firstSession)?.questions).toHaveLength(20);
    // Timeout each question and reveal, stopping at three lost lives.
    for (let index = 0; index < 6; index++) await rooms.tick(Date.now() + (index + 1) * 200_000);
    view = await rooms.sync(waiting.code, host.id);
    expect(view.status).toBe('FINISHED');
    expect(view.game?.result?.outcome).toBe('FAILED');
    expect(store.questionHistory.get(host.id)?.size).toBe(3);
    expect(store.results.size).toBe(1);
    expect(store.grants).toHaveLength(0);
    const previousKeys = new Set(store.questionHistory.get(host.id));
    view = await rooms.rematch(waiting.code, host.id);
    expect(view.game!.sessionId).not.toBe(firstSession);
    expect(view.game!.roundId).not.toBe(lastRound);
    expect(
      store.sessions
        .get(view.game!.sessionId)
        ?.selectionSnapshot?.sources.every((source) => !previousKeys.has(source.questionKey)),
    ).toBe(true);
  });
});
