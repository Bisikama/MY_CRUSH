import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import {
  QUIZ_SKILL_TIMING,
  type QuizAction,
  type QuizSkill,
  type QuizView,
  type RoomView,
} from '@duoquest/shared-types';
import { useI18n } from '../../i18n';
import { Button, Card } from '../../ui';
import { QuestionCover } from './question-cover';
import { QuestionImages } from './question-images';
import { QuizSkillButton } from './quiz-skill-button';
import styles from './quiz-arena.module.css';
import {
  getAnswerStatusText,
  getPlayerNickname,
  getSkillButtonState,
  partitionQuizSkills,
  resolveAnswerer,
} from './quiz-stage.utils';
import type { QuizThemeDefinition } from './themes/quiz-theme-registry';

interface Props {
  activeRoom: RoomView;
  game: QuizView;
  connected: boolean;
  busy: boolean;
  serverTime: number;
  clockOffset: number;
  accountPlayerId?: string;
  notice: ReactNode;
  activeSkills: readonly QuizSkill[];
  hasCover: boolean;
  coverSound: boolean;
  coverSoundButton: ReactNode;
  theme: QuizThemeDefinition;
  onLeave: () => Promise<void>;
  onAction: (playerId: string, payload: QuizAction) => Promise<void>;
}

/** Fullscreen Arena match view with player HUD, question panel and dual skill columns. */
export function QuizArena({
  activeRoom,
  game,
  connected,
  busy,
  serverTime,
  clockOffset,
  accountPlayerId,
  notice,
  activeSkills,
  hasCover,
  coverSound,
  coverSoundButton,
  theme,
  onLeave,
  onAction,
}: Props) {
  const { locale, localeMeta, t } = useI18n();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    syncFullscreen();
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
        void document.exitFullscreen().catch(() => undefined);
      }
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Browser may block fullscreen if not triggered by user gesture or unsupported
    }
  };

  const playerName = (id: string | null) => getPlayerNickname(activeRoom.players, id);
  const seconds = Math.max(0, Math.ceil((game.deadline - serverTime) / 1000));
  const controlled = activeRoom.controlledPlayerIds;
  const answerer = resolveAnswerer(activeRoom, game);

  const interference =
    game.phase === 'QUESTION' && game.interference && game.interference.until > serverTime
      ? game.interference
      : null;
  const coverStartsAt =
    interference?.skill === 'COVER' && serverTime < game.deadline
      ? interference.until - QUIZ_SKILL_TIMING.COVER
      : null;
  const blurred = interference?.skill === 'BLUR';

  const { supportSkills, attackSkills } = partitionQuizSkills(activeSkills);
  const skillColumns = [
    {
      key: 'support',
      skills: supportSkills,
      className: styles.supportSkills,
      label: t('quiz.arena.supportSkillsLabel'),
      support: true,
    },
    {
      key: 'attack',
      skills: attackSkills,
      className: styles.attackSkills,
      label: t('quiz.arena.attackSkillsLabel'),
      support: false,
    },
  ];

  const visibleSkillPlayer = answerer ?? controlled[0];
  const skillSlots =
    game.skillSlots?.filter(
      (slot) => activeRoom.mode === 'COOP' || slot.playerId === visibleSkillPlayer,
    ) ?? [];
  const canUseSkills =
    activeRoom.status === 'IN_PROGRESS' && game.phase === 'QUESTION' && connected && !busy;
  const canAnswer =
    connected &&
    !busy &&
    activeRoom.status === 'IN_PROGRESS' &&
    game.phase === 'QUESTION' &&
    Boolean(answerer) &&
    !game.answeredPlayerIds.includes(answerer!);
  const answerStatus = getAnswerStatusText(activeRoom.mode, game, answerer, locale);

  const arenaStyle = {
    '--quiz-arena-bg-color': theme.visuals.arenaBgColor,
    '--quiz-arena-bg-image': theme.visuals.arenaBgImage,
  } as CSSProperties;

  return (
    <Card
      className={`question-card ${styles.arena}`}
      aria-label={t('quiz.arena.ariaLabel')}
      data-quiz-theme={theme.id}
      style={arenaStyle}
    >
      <div className={styles.playerHud}>
        {activeRoom.players.map((player, index) => (
          <div
            key={player.playerId}
            className={styles.playerBadge}
            role="group"
            aria-label={t('quiz.arena.playerAria', { index: index + 1 })}
          >
            <span className={styles.playerAvatar} aria-hidden="true">
              {player.playerId === accountPlayerId ? (
                <img src="/images/profile/default-avatar.jpg" alt="" width={80} height={80} />
              ) : (
                player.nickname.slice(0, 1).toLocaleUpperCase(localeMeta.code)
              )}
            </span>
            <div className={styles.playerDetails}>
              <strong>{player.nickname}</strong>
              <span
                className={styles.playerScore}
                aria-label={t('quiz.arena.scoreAria', {
                  score: game.scores[player.playerId] ?? 0,
                })}
              >
                {game.scores[player.playerId] ?? 0}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className={`${styles.matchBody} ${skillSlots.length ? styles.withSkills : ''}`}>
        <div className={hasCover ? `${styles.panel} ${styles.compactPanel}` : styles.panel}>
          {!connected && (
            <div className="notice" role="status">
              {t('quiz.lobby.reconnecting')}
            </div>
          )}
          {notice}
          <div className="question-meta">
            <span>
              {t('quiz.arena.questionCounter', {
                current: game.questionNumber,
                total: game.questionCount,
              })}
            </span>
            {coverSoundButton}
            <span className="timer" aria-label={t('quiz.arena.timerAria', { seconds })}>
              {seconds}s
            </span>
          </div>
          {activeRoom.mode === 'COOP' && (
            <div className="coop-info">
              {t('quiz.arena.coopInfo', {
                lives: game.lives ?? 0,
                captain: playerName(game.captainId),
              })}
            </div>
          )}
          {hasCover ? (
            <QuestionCover
              startsAt={coverStartsAt}
              clockOffset={clockOffset}
              soundEnabled={coverSound}
            >
              <h1>{game.question.prompt}</h1>
              <QuestionImages
                key={game.roundId}
                images={game.question.images}
                inMatch
                concealed={coverStartsAt !== null}
              />
            </QuestionCover>
          ) : (
            <>
              <h1>{game.question.prompt}</h1>
              <QuestionImages key={game.roundId} images={game.question.images} inMatch />
            </>
          )}
          {blurred && (
            <p role="status">
              {t('quiz.arena.blurActiveStatus', { skillName: t('common.skills.BLUR') })}
            </p>
          )}
          {!!game.support?.hints.length && (
            <ol className="explanation">
              {game.support.hints.map((hint, index) => (
                <li key={index}>{hint}</li>
              ))}
            </ol>
          )}
          {activeRoom.mode === 'DUEL' &&
            activeRoom.layout === 'SHARED_SCREEN' &&
            game.phase === 'QUESTION' && (
              <div className="buzzer-row">
                {controlled.map((id, index) => (
                  <Button
                    key={id}
                    variant="outline"
                    disabled={
                      !connected || !!game.buzzerPlayerId || game.answeredPlayerIds.includes(id)
                    }
                    onClick={() => void onAction(id, { type: 'BUZZ' })}
                  >
                    <kbd>{index === 0 ? 'A' : 'L'}</kbd>{' '}
                    {t('quiz.arena.buzzAction', { nickname: playerName(id) })}
                  </Button>
                ))}
                {game.buzzerPlayerId && (
                  <p className="small" role="status">
                    {t('quiz.arena.buzzingStatus', { nickname: playerName(game.buzzerPlayerId) })}
                  </p>
                )}
              </div>
            )}
          <div className="answers">
            {game.question.options.map((option) => (
              <button
                key={option.id}
                style={
                  game.support?.hiddenOptions.includes(option.id)
                    ? { visibility: 'hidden' }
                    : undefined
                }
                className={`answer ${game.reveal?.correctOptionId === option.id ? 'correct' : ''} ${answerer && game.ownAnswers[answerer] === option.id ? 'chosen' : ''}`}
                disabled={!canAnswer || game.support?.hiddenOptions.includes(option.id)}
                onClick={() => {
                  if (answerer) void onAction(answerer, { type: 'ANSWER', optionId: option.id });
                }}
              >
                <span className="answer-letter">{option.id}</span>
                <span
                  className="answer-text"
                  style={blurred ? { filter: 'blur(7px)', userSelect: 'none' } : undefined}
                  aria-hidden={blurred}
                >
                  {option.text}
                </span>
              </button>
            ))}
          </div>
          {game.reveal ? (
            <div className="explanation" role="status">
              <strong>
                {t('quiz.arena.revealAnswer', { optionId: game.reveal.correctOptionId })}
              </strong>
              <p>{game.reveal.explanation}</p>
            </div>
          ) : answerStatus ? (
            <p className="small muted" role="status">
              {answerStatus}
            </p>
          ) : null}
        </div>

        {!!skillSlots.length &&
          skillColumns
            .filter((column) => column.skills.length)
            .map((column) => (
              <div key={column.key} className={`${styles.skillColumn} ${column.className}`}>
                {skillSlots.map((slot) => (
                  <div
                    key={slot.playerId}
                    className={styles.skillGroup}
                    role="group"
                    aria-label={t('quiz.arena.skillGroupAria', {
                      columnLabel: column.label,
                      nickname: playerName(slot.playerId),
                    })}
                  >
                    {column.support && (
                      <p className={styles.skillSummary}>
                        {t('quiz.arena.skillRemaining', {
                          nickname: playerName(slot.playerId),
                          count: slot.remaining,
                        })}
                      </p>
                    )}
                    {column.skills.map((skill) => {
                      const { disabled, usage } = getSkillButtonState({
                        skill,
                        isSupport: column.support,
                        slot,
                        game,
                        mode: activeRoom.mode,
                        answerer,
                        canUseSkills,
                        serverTime,
                        locale,
                      });
                      return (
                        <QuizSkillButton
                          key={skill}
                          skill={skill}
                          disabled={disabled}
                          usage={usage}
                          onActivate={() =>
                            void onAction(slot.playerId, { type: 'USE_SKILL', skill })
                          }
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
      </div>

      <div className={styles.arenaActions}>
        <Button
          type="button"
          className={styles.fullscreenBtn}
          aria-pressed={isFullscreen}
          onClick={() => void toggleFullscreen()}
        >
          {isFullscreen ? t('quiz.arena.exitFullscreen') : t('quiz.arena.enterFullscreen')}
        </Button>
        <Button
          className={styles.leaveMatch}
          disabled={busy || !connected}
          onClick={() => void onLeave()}
        >
          {t('quiz.arena.leaveRoom')}
        </Button>
      </div>
    </Card>
  );
}
