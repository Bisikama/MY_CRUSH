'use client';

import type { ReactNode } from 'react';
import { Button } from '@duoquest/ui';
import { allowedQuizSkills, type QuizAction, type RoomView } from '@duoquest/shared-types';
import { PreloadQuestionCover } from './question-cover';
import { QuizArena } from './quiz-arena';
import { QuizLobby, QuizRoomOverview } from './quiz-lobby';
import { QuizResult } from './quiz-result';
import styles from './quiz-arena.module.css';
import { useActiveQuizTheme, useQuizPreferencesStore } from './themes/quiz-preferences.store';
import { useQuizAudio } from './themes/use-quiz-audio';

interface Props {
  activeRoom: RoomView;
  connected: boolean;
  busy: boolean;
  now: number;
  clockOffset: number;
  identityPlayerId: string;
  accountPlayerId?: string;
  notice: ReactNode;
  onCopy: () => Promise<void>;
  onLeave: () => Promise<void>;
  onHome: () => void;
  onCommand: (event: 'room:ready' | 'match:start' | 'room:rematch' | 'room:sync') => Promise<void>;
  onAction: (playerId: string, payload: QuizAction) => Promise<void>;
}

/** Coordinate Quiz Battle room stages (lobby, active arena, and match result) with theme & audio. */
export function QuizStage({
  activeRoom,
  connected,
  busy,
  now,
  clockOffset,
  identityPlayerId,
  accountPlayerId,
  notice,
  onCopy,
  onLeave,
  onHome,
  onCommand,
  onAction,
}: Props) {
  const game = activeRoom.game;
  const playing = activeRoom.status === 'IN_PROGRESS' && Boolean(game);
  const activeSkills = allowedQuizSkills(activeRoom.mode, activeRoom.layout);
  const hasCover = activeSkills.includes('COVER');

  const theme = useActiveQuizTheme();
  const { lobbyBgmEnabled, matchBgmEnabled, skillSfxEnabled, setSkillSfxEnabled } =
    useQuizPreferencesStore();

  useQuizAudio({
    activeRoom,
    theme,
    lobbyBgmEnabled,
    matchBgmEnabled,
    skillSfxEnabled,
  });

  const coverSoundButton = hasCover && (
    <Button
      variant="outline"
      className={playing ? styles.coverSound : undefined}
      aria-pressed={skillSfxEnabled}
      onClick={() => setSkillSfxEnabled(!skillSfxEnabled)}
    >
      Tiếng sét
    </Button>
  );

  return (
    <>
      {hasCover && !game && <PreloadQuestionCover />}
      {!playing && (
        <QuizRoomOverview
          activeRoom={activeRoom}
          connected={connected}
          busy={busy}
          notice={notice}
          coverSoundButton={coverSoundButton}
          onCopy={onCopy}
          onLeave={onLeave}
        />
      )}
      {activeRoom.status === 'CANCELLED' || !game ? (
        <QuizLobby
          activeRoom={activeRoom}
          connected={connected}
          busy={busy}
          identityPlayerId={identityPlayerId}
          activeSkills={activeSkills}
          theme={theme}
          onHome={onHome}
          onCommand={onCommand}
        />
      ) : game.phase === 'FINISHED' ? (
        <QuizResult
          activeRoom={activeRoom}
          game={game}
          connected={connected}
          busy={busy}
          identityPlayerId={identityPlayerId}
          onRematch={() => onCommand('room:rematch')}
        />
      ) : (
        <QuizArena
          activeRoom={activeRoom}
          game={game}
          connected={connected}
          busy={busy}
          serverTime={now + clockOffset}
          clockOffset={clockOffset}
          accountPlayerId={accountPlayerId}
          notice={notice}
          activeSkills={activeSkills}
          hasCover={hasCover}
          coverSound={skillSfxEnabled}
          coverSoundButton={coverSoundButton}
          theme={theme}
          onLeave={onLeave}
          onAction={onAction}
        />
      )}
    </>
  );
}
