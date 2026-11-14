'use client';

import { useEffect, useRef } from 'react';
import type { QuizSkill, RoomView } from '@duoquest/shared-types';
import { quizAudioController } from './quiz-audio-controller';
import type { QuizThemeDefinition } from './quiz-theme-registry';

interface Params {
  activeRoom: RoomView;
  theme: QuizThemeDefinition;
  lobbyBgmEnabled: boolean;
  matchBgmEnabled: boolean;
  skillSfxEnabled: boolean;
}

/**
 * Orchestrate the 3 Quiz Battle audio channels:
 * 1. Lobby BGM (when waiting in room before match)
 * 2. Match BGM (when match is in progress during QUESTION / REVEAL)
 * 3. Skill SFX (when support or interference skills take effect)
 */
export function useQuizAudio({
  activeRoom,
  theme,
  lobbyBgmEnabled,
  matchBgmEnabled,
  skillSfxEnabled,
}: Params) {
  const game = activeRoom.game;
  const inLobby =
    (activeRoom.status === 'WAITING' || activeRoom.status === 'READY') && !activeRoom.game;
  const inMatch =
    activeRoom.status === 'IN_PROGRESS' &&
    Boolean(game) &&
    (game?.phase === 'QUESTION' || game?.phase === 'REVEAL');

  useEffect(() => {
    if (inLobby && lobbyBgmEnabled) {
      quizAudioController.startBgm('lobby', theme);
      return () => quizAudioController.stopBgm();
    }
    if (inMatch && matchBgmEnabled) {
      quizAudioController.startBgm('match', theme);
      return () => quizAudioController.stopBgm();
    }
    quizAudioController.stopBgm();
    return undefined;
  }, [inLobby, inMatch, lobbyBgmEnabled, matchBgmEnabled, theme]);

  const prevRoundRef = useRef<string | null>(null);
  const prevHintsRef = useRef(0);
  const prevHiddenRef = useRef(0);
  const prevInterferenceKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!game) {
      prevRoundRef.current = null;
      prevHintsRef.current = 0;
      prevHiddenRef.current = 0;
      prevInterferenceKeyRef.current = null;
      return;
    }

    const hintsCount = game.support?.hints.length ?? 0;
    const hiddenCount = game.support?.hiddenOptions.length ?? 0;
    const interferenceKey = game.interference
      ? `${game.interference.skill}:${game.interference.until}`
      : null;

    if (prevRoundRef.current !== game.roundId) {
      prevRoundRef.current = game.roundId;
      prevHintsRef.current = hintsCount;
      prevHiddenRef.current = hiddenCount;
      prevInterferenceKeyRef.current = interferenceKey;
      return;
    }

    if (skillSfxEnabled) {
      if (hintsCount > prevHintsRef.current) {
        quizAudioController.playSkillSfx('HINT', theme);
      }
      if (hiddenCount > prevHiddenRef.current) {
        quizAudioController.playSkillSfx('FIFTY_FIFTY', theme);
      }
      if (interferenceKey && interferenceKey !== prevInterferenceKeyRef.current) {
        const skill: QuizSkill = game.interference!.skill;
        quizAudioController.playSkillSfx(skill, theme);
      }
    }

    prevHintsRef.current = hintsCount;
    prevHiddenRef.current = hiddenCount;
    prevInterferenceKeyRef.current = interferenceKey;
  }, [game, skillSfxEnabled, theme]);
}

