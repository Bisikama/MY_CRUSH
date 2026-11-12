import {
  QUIZ_SKILLS,
  type GameMode,
  type MatchResult,
  type QuizSkill,
} from '@duoquest/shared-types';
import type { GameIdentity } from '../lib/client';
import { initialPacks } from './packs';

export const playerOneId = '10000000-0000-4000-8000-000000000001';
export const playerTwoId = '10000000-0000-4000-8000-000000000002';
export const demoEmail = 'demo@example.test';
export const demoPassword = 'DuoQuest!123';
export const demoCode = '123456';
export const demoAccount: GameIdentity = {
  kind: 'account',
  playerId: playerOneId,
  nickname: 'Minh Demo',
  email: demoEmail,
  role: 'PLAYER',
};

export const shopItems = [
  { id: 'mint-frame', name: 'Khung bạc hà', price: 250, kind: 'COSMETIC', slot: 'AVATAR_FRAME' },
  ...Object.values(QUIZ_SKILLS).map((skill) => ({ ...skill, kind: 'SKILL', slot: null })),
];

type HistoryRow = {
  score: number;
  session: { id: string; mode: GameMode; finishedAt: string };
};
interface Progress {
  balance: number;
  xp: number;
  items: Record<string, number>;
  loadout: { itemId: string; slot: string }[];
  history: HistoryRow[];
  purchases: Set<string>;
}

export function initialProgress(sample: boolean): Progress {
  return {
    balance: sample ? 480 : 0,
    xp: sample ? 120 : 0,
    items: sample ? { 'quiz-hint': 3, 'quiz-fifty-fifty': 2, 'quiz-cover': 1, 'quiz-blur': 1 } : {},
    loadout: [],
    history: sample
      ? [
          {
            score: 320,
            session: { id: 'lab-history', mode: 'SOLO', finishedAt: '2026-11-11T09:00:00Z' },
          },
        ]
      : [],
    purchases: new Set(),
  };
}

export const labData = {
  identity: null as GameIdentity | null,
  account: demoAccount,
  password: demoPassword,
  packs: initialPacks(),
  progress: {
    [playerOneId]: initialProgress(true),
    [playerTwoId]: initialProgress(true),
  } as Record<string, Progress>,
};

export function skillStock(playerId: string) {
  const items = labData.progress[playerId]?.items;
  const stock: Partial<Record<QuizSkill, number>> = {};
  if (!items) return stock;
  for (const skill of Object.keys(QUIZ_SKILLS) as QuizSkill[]) {
    stock[skill] = items[QUIZ_SKILLS[skill].id] ?? 0;
  }
  return stock;
}

export function recordLabResult(
  result: MatchResult,
  playerIds: string[],
  trusted: boolean,
  now: number,
) {
  for (const playerId of playerIds) {
    const score = result.scores[playerId]!;
    const progress = labData.progress[playerId];
    if (!progress || progress.history.some(({ session }) => session.id === result.sessionId))
      continue;
    progress.history.unshift({
      score,
      session: { id: result.sessionId, mode: result.mode, finishedAt: new Date(now).toISOString() },
    });
    if (!trusted || (result.mode === 'COOP' && result.outcome === 'FAILED')) continue;
    progress.balance +=
      result.mode === 'SOLO'
        ? 10
        : result.mode === 'COOP'
          ? 12
          : 6 + (result.winnerIds.includes(playerId) ? 10 : 0);
    progress.xp += 20;
  }
}
