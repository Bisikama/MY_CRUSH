import { describe, expect, it } from 'vitest';
import { matchesCasualQuestion, type QuizView, type RoomView } from '@duoquest/shared-types';
import {
  formatRoomSetupSummary,
  getAnswerStatusText,
  getPlayerNickname,
  getSkillButtonState,
  partitionQuizSkills,
  resolveAnswerer,
} from './quiz-stage.utils';

function makeRoom(overrides: Partial<RoomView> = {}): RoomView {
  return {
    code: 'ABC234',
    hostPlayerId: 'p1',
    mode: 'SOLO',
    layout: 'MULTI_DEVICE',
    status: 'IN_PROGRESS',
    players: [
      { playerId: 'p1', nickname: 'Minh', ready: true, connected: true },
      { playerId: 'p2', nickname: 'An', ready: true, connected: true },
    ],
    controlledPlayerIds: ['p1'],
    rematchVotes: [],
    game: null,
    ...overrides,
  };
}

function makeGame(overrides: Partial<QuizView> = {}): QuizView {
  return {
    sessionId: '11111111-1111-4111-8111-111111111111',
    roundId: 'round-1',
    version: 1,
    mode: 'DUEL',
    layout: 'MULTI_DEVICE',
    phase: 'QUESTION',
    questionNumber: 1,
    questionCount: 5,
    question: {
      id: 'q1',
      prompt: 'Câu hỏi mẫu?',
      topic: 'Địa lý',
      difficulty: 'easy',
      options: [
        { id: 'A', text: '1' },
        { id: 'B', text: '2' },
        { id: 'C', text: '3' },
        { id: 'D', text: '4' },
      ],
    },
    openedAt: 10_000,
    deadline: 30_000,
    serverNow: 16_000,
    scores: { p1: 0, p2: 0 },
    answeredPlayerIds: [],
    ownAnswers: {},
    buzzerPlayerId: null,
    captainId: 'p1',
    teamScore: 0,
    lives: 3,
    stage: 1,
    stageCount: 1,
    support: { hints: [], hiddenOptions: [] },
    interference: null,
    skillSlots: [
      {
        playerId: 'p1',
        remaining: 7,
        free: ['HINT', 'FIFTY_FIFTY', 'COVER', 'BLUR'],
        usedThisRound: [],
        stock: { HINT: 2, COVER: 1 },
      },
    ],
    hintRemaining: true,
    reveal: null,
    result: null,
    ...overrides,
  };
}

describe('quiz-stage.utils', () => {
  it('resolves player nicknames and fallback placeholder', () => {
    const players = makeRoom().players;
    expect(getPlayerNickname(players, 'p1')).toBe('Minh');
    expect(getPlayerNickname(players, 'unknown')).toBe('—');
    expect(getPlayerNickname(players, null)).toBe('—');
  });

  it('resolves the active answerer according to mode and layout', () => {
    const game = makeGame();
    expect(resolveAnswerer(makeRoom(), null)).toBeUndefined();
    expect(resolveAnswerer(makeRoom({ mode: 'SOLO', controlledPlayerIds: ['p1'] }), game)).toBe(
      'p1',
    );
    expect(
      resolveAnswerer(
        makeRoom({ mode: 'COOP', controlledPlayerIds: ['p1', 'p2'] }),
        makeGame({ captainId: 'p2' }),
      ),
    ).toBe('p2');
    expect(
      resolveAnswerer(
        makeRoom({ mode: 'DUEL', layout: 'SHARED_SCREEN', controlledPlayerIds: ['p1', 'p2'] }),
        makeGame({ buzzerPlayerId: null }),
      ),
    ).toBeUndefined();
    expect(
      resolveAnswerer(
        makeRoom({ mode: 'DUEL', layout: 'SHARED_SCREEN', controlledPlayerIds: ['p1', 'p2'] }),
        makeGame({ buzzerPlayerId: 'p2' }),
      ),
    ).toBe('p2');
  });

  it('returns localized answer status text for locked answers and co-op non-captains', () => {
    const game = makeGame({ answeredPlayerIds: ['p1'] });
    expect(getAnswerStatusText('SOLO', game, 'p1')).toBe(
      'Đã khóa đáp án. Chờ người còn lại hoặc hết giờ…',
    );
    expect(getAnswerStatusText('COOP', makeGame(), undefined)).toBe(
      'Cùng thảo luận — chờ đội trưởng khóa đáp án.',
    );
    expect(getAnswerStatusText('DUEL', makeGame(), 'p1')).toBeNull();
  });

  it('formats study and casual custom setup summaries', () => {
    expect(formatRoomSetupSummary(undefined)).toBeNull();
    expect(
      formatRoomSetupSummary({
        title: 'Đề mẫu',
        category: 'Toán',
        filter: { topic: 'Hình học', difficulty: 'medium' },
        questionCount: 10,
      }),
    ).toEqual({
      difficultyLabel: 'Trung bình',
      topicsLabel: 'Hình học',
    });
    expect(
      formatRoomSetupSummary({
        title: 'Đố vui tự chọn',
        category: 'Tổng hợp',
        filter: {},
        questionCount: 20,
        selection: {
          type: 'CASUAL_CUSTOM',
          categories: ['Khoa học'],
          topics: [{ category: 'Khoa học', topic: 'Vật lý' }],
          difficulty: 'hard',
        },
      }),
    ).toEqual({
      difficultyLabel: 'Khó',
      topicsLabel: 'Khoa học / Vật lý',
    });
  });

  it('partitions allowed skills into support and attack groups', () => {
    expect(partitionQuizSkills(['HINT', 'FIFTY_FIFTY', 'COVER', 'BLUR'])).toEqual({
      supportSkills: ['HINT', 'FIFTY_FIFTY'],
      attackSkills: ['COVER', 'BLUR'],
    });
    expect(partitionQuizSkills(['HINT', 'FIFTY_FIFTY'])).toEqual({
      supportSkills: ['HINT', 'FIFTY_FIFTY'],
      attackSkills: [],
    });
  });

  it('evaluates skill button availability, timings and labels accurately', () => {
    const game = makeGame();
    const slot = game.skillSlots[0]!;

    expect(
      getSkillButtonState({
        skill: 'HINT',
        isSupport: true,
        slot,
        game,
        mode: 'DUEL',
        answerer: 'p1',
        canUseSkills: true,
        serverTime: 16_000,
      }),
    ).toEqual({ disabled: false, usage: 'Miễn phí' });

    expect(
      getSkillButtonState({
        skill: 'HINT',
        isSupport: true,
        slot: { ...slot, free: [] },
        game: { ...game, hintRemaining: false },
        mode: 'DUEL',
        answerer: 'p1',
        canUseSkills: true,
        serverTime: 16_000,
      }),
    ).toEqual({ disabled: true, usage: 'Hết gợi ý' });

    // Interference skills are available immediately when the question opens
    expect(
      getSkillButtonState({
        skill: 'COVER',
        isSupport: false,
        slot,
        game,
        mode: 'DUEL',
        answerer: 'p1',
        canUseSkills: true,
        serverTime: 10_000,
      }),
    ).toEqual({ disabled: false, usage: 'Miễn phí' });

    // Support skills close in the final 3 seconds; BLUR requires at least 3 seconds left
    expect(
      getSkillButtonState({
        skill: 'HINT',
        isSupport: true,
        slot,
        game,
        mode: 'DUEL',
        answerer: 'p1',
        canUseSkills: true,
        serverTime: 27_500,
      }).disabled,
    ).toBe(true);
    expect(
      getSkillButtonState({
        skill: 'BLUR',
        isSupport: false,
        slot,
        game,
        mode: 'DUEL',
        answerer: 'p1',
        canUseSkills: true,
        serverTime: 27_500,
      }).disabled,
    ).toBe(true);
    // COVER can still be activated up until the deadline
    expect(
      getSkillButtonState({
        skill: 'COVER',
        isSupport: false,
        slot,
        game,
        mode: 'DUEL',
        answerer: 'p1',
        canUseSkills: true,
        serverTime: 27_500,
      }).disabled,
    ).toBe(false);

    // Reveal phase preserves skill buttons disabled with 'Chờ câu sau'
    expect(
      getSkillButtonState({
        skill: 'FIFTY_FIFTY',
        isSupport: true,
        slot: { ...slot, free: [], stock: { FIFTY_FIFTY: 2 } },
        game: { ...game, phase: 'REVEAL' },
        mode: 'DUEL',
        answerer: 'p1',
        canUseSkills: false,
        serverTime: 16_000,
      }),
    ).toEqual({ disabled: true, usage: 'Chờ câu sau' });
  });

  it('matches casual custom selections consistently across categories, topics and difficulty', () => {
    const question = { topic: 'Khoa học', difficulty: 'medium' as const };
    expect(
      matchesCasualQuestion('general', question, {
        type: 'CASUAL_CUSTOM',
        categories: ['General'],
        topics: [{ category: 'general', topic: 'khoa học' }],
        difficulty: 'medium',
      }),
    ).toBe(true);
    expect(
      matchesCasualQuestion('general', question, {
        type: 'CASUAL_CUSTOM',
        categories: ['Mua sắm'],
        topics: [],
        difficulty: 'mixed',
      }),
    ).toBe(false);
    expect(
      matchesCasualQuestion('general', question, {
        type: 'CASUAL_CUSTOM',
        categories: [],
        topics: [],
        difficulty: 'hard',
      }),
    ).toBe(false);
  });
});
