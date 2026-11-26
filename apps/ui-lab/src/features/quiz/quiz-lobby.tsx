import type { ReactNode } from 'react';
import type { QuizSkill, RoomView } from '@duoquest/shared-types';
import { useI18n } from '../../i18n';
import { Button, Card } from '../../ui';
import { formatRoomSetupSummary } from './quiz-stage.utils';
import type { QuizThemeDefinition } from './themes/quiz-theme-registry';

interface LobbyHeaderProps {
  activeRoom: RoomView;
  connected: boolean;
  busy: boolean;
  notice: ReactNode;
  coverSoundButton: ReactNode;
  onCopy: () => Promise<void>;
  onLeave: () => Promise<void>;
}

/** Room header, connection alert and scoreboard shown outside an active match. */
export function QuizRoomOverview({
  activeRoom,
  connected,
  busy,
  notice,
  coverSoundButton,
  onCopy,
  onLeave,
}: LobbyHeaderProps) {
  const { localeMeta, t } = useI18n();
  const game = activeRoom.game;

  return (
    <>
      <div className="room-heading">
        <div>
          <p className="eyebrow">
            QUIZ BATTLE / {activeRoom.mode} /{' '}
            {activeRoom.layout === 'SHARED_SCREEN'
              ? t('quiz.lobby.layoutShared')
              : t('quiz.lobby.layoutLan')}
          </p>
          <h2>
            {t('quiz.lobby.roomTitle')} <span className="room-code">{activeRoom.code}</span>
          </h2>
        </div>
        <div className="actions">
          {coverSoundButton}
          <Button
            variant="ghost"
            onClick={() => {
              void onCopy();
            }}
          >
            {t('quiz.lobby.copyInvite')}
          </Button>
          <Button
            variant="outline"
            disabled={busy || !connected}
            onClick={() => {
              void onLeave();
            }}
          >
            {t('quiz.lobby.leaveRoom')}
          </Button>
        </div>
      </div>
      {!connected && (
        <div className="notice" role="status">
          {t('quiz.lobby.reconnecting')}
        </div>
      )}
      {notice}
      <div className="scoreboard">
        {activeRoom.players.map((player, index) => (
          <Card key={player.playerId} className={`player-card player-${index}`}>
            <span className="avatar">
              {player.nickname.slice(0, 1).toLocaleUpperCase(localeMeta.code)}
            </span>
            <div>
              <strong>{player.nickname}</strong>
              <p className="small muted">
                {player.connected
                  ? player.ready
                    ? t('quiz.lobby.statusReady')
                    : t('quiz.lobby.statusJoined')
                  : t('quiz.lobby.statusDisconnected')}
                {game?.captainId === player.playerId ? t('quiz.lobby.captainTag') : ''}
              </p>
            </div>
            <span className="score">{game?.scores[player.playerId] ?? 0}</span>
          </Card>
        ))}
      </div>
    </>
  );
}

interface LobbyCardProps {
  activeRoom: RoomView;
  connected: boolean;
  busy: boolean;
  identityPlayerId: string;
  activeSkills: readonly QuizSkill[];
  theme: QuizThemeDefinition;
  onHome: () => void;
  onCommand: (event: 'room:ready' | 'match:start') => Promise<void>;
}

/** Waiting lobby and cancelled-room views before a session starts. */
export function QuizLobby({
  activeRoom,
  connected,
  busy,
  identityPlayerId,
  activeSkills,
  theme,
  onHome,
  onCommand,
}: LobbyCardProps) {
  const { locale, localeMeta, t } = useI18n();

  if (activeRoom.status === 'CANCELLED') {
    return (
      <Card className="empty-state">
        <h2>{t('quiz.lobby.cancelledTitle')}</h2>
        <p>{t('quiz.lobby.cancelledDesc')}</p>
        <Button onClick={onHome}>{t('quiz.lobby.backToPlay')}</Button>
      </Card>
    );
  }

  const setupSummary = formatRoomSetupSummary(activeRoom.setup, locale);
  const controlled = activeRoom.controlledPlayerIds;
  const localizedThemeName = t(`quiz.themes.${theme.id}.name`);

  return (
    <Card className="lobby">
      <span className="tag">
        {t('quiz.lobby.waitingTag', {
          theme: localizedThemeName.toLocaleUpperCase(localeMeta.code),
        })}
      </span>
      <h1>
        {activeRoom.status === 'READY' ? t('quiz.lobby.titleReady') : t('quiz.lobby.titleWaiting')}
      </h1>
      <p>
        {activeRoom.mode === 'SOLO' || activeRoom.layout === 'SHARED_SCREEN'
          ? t('quiz.lobby.hintSoloOrShared')
          : t('quiz.lobby.hintLan')}
      </p>
      {activeRoom.mode === 'DUEL' && activeRoom.layout === 'SHARED_SCREEN' && (
        <p className="hint">
          {t('quiz.lobby.sharedDuelHintPrefix')}
          <kbd>A</kbd>
          {t('quiz.lobby.sharedDuelHintMid')}
          <kbd>L</kbd>
          {t('quiz.lobby.sharedDuelHintSuffix')}
        </p>
      )}
      {activeRoom.setup && setupSummary && (
        <p>
          {activeRoom.setup.title} · {activeRoom.setup.category} · {setupSummary.topicsLabel} ·{' '}
          {setupSummary.difficultyLabel} ·{' '}
          {t('quiz.lobby.setupQuestionsCount', { count: activeRoom.setup.questionCount })}
        </p>
      )}
      <p className="small">
        {t('quiz.lobby.skillLinePrefix', {
          skills: activeSkills.map((skill) => t(`common.skills.${skill}`)).join(', '),
        })}
        {activeRoom.mode === 'COOP'
          ? t('quiz.lobby.skillCoopRule')
          : t('quiz.lobby.skillStandardRule')}
      </p>
      <div className="actions">
        <Button
          variant="outline"
          disabled={
            busy ||
            !connected ||
            activeRoom.players.filter((p) => controlled.includes(p.playerId)).every((p) => p.ready)
          }
          onClick={() => void onCommand('room:ready')}
        >
          {t('quiz.lobby.readyButton')}
        </Button>
        {activeRoom.hostPlayerId === identityPlayerId && (
          <Button
            disabled={busy || !connected || activeRoom.status !== 'READY'}
            onClick={() => void onCommand('match:start')}
          >
            {t('quiz.lobby.startButton')}
          </Button>
        )}
      </div>
    </Card>
  );
}
