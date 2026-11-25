import {
  QUIZ_SKILL_TIMING,
  type GameMode,
  type QuizSkill,
  type QuizView,
  type RoomView,
} from '@duoquest/shared-types';

const DIFFICULTY_LABELS = {
  easy: 'Dễ',
  medium: 'Trung bình',
  hard: 'Khó',
  mixed: 'Hỗn hợp',
} as const;

/** Resolve a player's display nickname from the room's player list. */
export function getPlayerNickname(players: RoomView['players'], id: string | null): string {
  return players.find((player) => player.playerId === id)?.nickname ?? '—';
}

/** Determine which controlled player slot is currently allowed to submit an answer. */
export function resolveAnswerer(activeRoom: RoomView, game: QuizView | null): string | undefined {
  if (!game) return undefined;
  const controlled = activeRoom.controlledPlayerIds;
  if (activeRoom.mode === 'COOP') {
    return controlled.find((id) => id === game.captainId);
  }
  if (activeRoom.mode === 'DUEL' && activeRoom.layout === 'SHARED_SCREEN') {
    return controlled.find((id) => id === game.buzzerPlayerId);
  }
  return controlled[0];
}

/** Build the status message shown below the answer grid before reveal. */
export function getAnswerStatusText(
  mode: GameMode,
  game: QuizView | null,
  answerer: string | undefined,
): string | null {
  if (answerer && game?.answeredPlayerIds.includes(answerer)) {
    return 'Đã khóa đáp án. Chờ người còn lại hoặc hết giờ…';
  }
  if (mode === 'COOP' && !answerer) {
    return 'Cùng thảo luận — chờ đội trưởng khóa đáp án.';
  }
  return null;
}

/** Format lobby setup details (topics and difficulty) into readable labels. */
export function formatRoomSetupSummary(
  setup: RoomView['setup'],
): { difficultyLabel: string; topicsLabel: string } | null {
  if (!setup) return null;
  const custom = setup.selection?.type === 'CASUAL_CUSTOM' ? setup.selection : null;
  const difficulty = custom?.difficulty ?? setup.filter.difficulty ?? 'mixed';
  const topicsLabel = custom
    ? custom.topics.map(({ category, topic }) => `${category} / ${topic}`).join(', ') ||
      'Mọi chủ đề'
    : (setup.filter.topic ?? 'Mọi đề tài');

  return {
    difficultyLabel: DIFFICULTY_LABELS[difficulty],
    topicsLabel,
  };
}

/** Partition active skills into left-hand support skills and right-hand interference skills. */
export function partitionQuizSkills(activeSkills: readonly QuizSkill[]): {
  supportSkills: QuizSkill[];
  attackSkills: QuizSkill[];
} {
  const supportSkills: QuizSkill[] = [];
  const attackSkills: QuizSkill[] = [];
  for (const skill of activeSkills) {
    if (skill === 'HINT' || skill === 'FIFTY_FIFTY') supportSkills.push(skill);
    else attackSkills.push(skill);
  }
  return { supportSkills, attackSkills };
}

/** Compute whether a skill button is disabled and its descriptive usage sub-label. */
export function getSkillButtonState(params: {
  skill: QuizSkill;
  isSupport: boolean;
  slot: QuizView['skillSlots'][number];
  game: QuizView;
  mode: GameMode;
  answerer: string | undefined;
  canUseSkills: boolean;
  serverTime: number;
}): { disabled: boolean; usage: string } {
  const { skill, isSupport, slot, game, mode, answerer, canUseSkills, serverTime } = params;
  const free = slot.free.includes(skill);
  const stock = slot.stock[skill] ?? 0;

  const unavailable =
    skill === 'HINT'
      ? !game.hintRemaining
      : skill === 'FIFTY_FIFTY'
        ? !!game.support.hiddenOptions.length
        : slot.usedThisRound.includes(skill);

  const remaining = game.deadline - serverTime;
  const tooLate =
    skill === 'BLUR'
      ? remaining < QUIZ_SKILL_TIMING.BLUR
      : remaining <= (isSupport ? QUIZ_SKILL_TIMING.supportCutoffMs : 0);
  const tooEarly = !isSupport && serverTime < game.openedAt + QUIZ_SKILL_TIMING.interferenceDelayMs;

  const disabled =
    !canUseSkills ||
    !slot.remaining ||
    (!free && !stock) ||
    unavailable ||
    (mode !== 'COOP' &&
      (slot.playerId !== answerer || game.answeredPlayerIds.includes(slot.playerId))) ||
    tooLate ||
    tooEarly;

  const usage =
    game.phase === 'REVEAL'
      ? 'Chờ câu sau'
      : skill === 'HINT' && unavailable
        ? 'Hết gợi ý'
        : free
          ? 'Miễn phí'
          : `${stock} trong kho`;

  return { disabled, usage };
}
