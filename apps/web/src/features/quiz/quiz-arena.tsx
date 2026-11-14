import type { ReactNode } from 'react';
import { Button, Card } from '@duoquest/ui';
import {
  QUIZ_SKILLS,
  QUIZ_SKILL_TIMING,
  type QuizAction,
  type QuizSkill,
  type QuizView,
  type RoomView,
} from '@duoquest/shared-types';
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
  onLeave: () => Promise<void>;
  onAction: (playerId: string, payload: QuizAction) => Promise<void>;
}

/** Fullscreen Forest Arena match view with player HUD, question panel and dual skill columns. */
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
  onLeave,
  onAction,
}: Props) {
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
      skills: supportSkills,
      className: styles.supportSkills,
      label: 'Skill hỗ trợ',
      support: true,
    },
    {
      skills: attackSkills,
      className: styles.attackSkills,
      label: 'Skill đối kháng',
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
  const answerStatus = getAnswerStatusText(activeRoom.mode, game, answerer);

  return (
    <Card className={`question-card ${styles.arena}`} aria-label="Sân đấu Quiz Battle">
      <div className={styles.playerHud}>
        {activeRoom.players.map((player, index) => (
          <div
            key={player.playerId}
            className={styles.playerBadge}
            role="group"
            aria-label={`Người chơi ${index + 1}`}
          >
            <span className={styles.playerAvatar} aria-hidden="true">
              {player.playerId === accountPlayerId ? (
                <img src="/images/profile/default-avatar.jpg" alt="" width={80} height={80} />
              ) : (
                player.nickname.slice(0, 1).toLocaleUpperCase('vi')
              )}
            </span>
            <div className={styles.playerDetails}>
              <strong>{player.nickname}</strong>
              <span
                className={styles.playerScore}
                aria-label={`Điểm: ${game.scores[player.playerId] ?? 0}`}
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
              Mất kết nối. Đang kết nối lại và xin snapshot từ server…
            </div>
          )}
          {notice}
          <div className="question-meta">
            <span>
              CÂU {game.questionNumber} / {game.questionCount}
            </span>
            {coverSoundButton}
            <span className="timer" aria-label={`Còn ${seconds} giây`}>
              {seconds}s
            </span>
          </div>
          {activeRoom.mode === 'COOP' && (
            <div className="coop-info">
              {game.lives} mạng · {playerName(game.captainId)} khóa đáp án
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
            <p role="status">{QUIZ_SKILLS.BLUR.name} đang có hiệu lực. Bạn vẫn có thể trả lời.</p>
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
                    <kbd>{index === 0 ? 'A' : 'L'}</kbd> {playerName(id)} giành quyền
                  </Button>
                ))}
                {game.buzzerPlayerId && (
                  <p className="small" role="status">
                    {playerName(game.buzzerPlayerId)} đang trả lời
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
              <strong>Đáp án {game.reveal.correctOptionId}</strong>
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
              <div key={column.label} className={`${styles.skillColumn} ${column.className}`}>
                {skillSlots.map((slot) => (
                  <div
                    key={slot.playerId}
                    className={styles.skillGroup}
                    role="group"
                    aria-label={`${column.label} của ${playerName(slot.playerId)}`}
                  >
                    {column.support && (
                      <p className={styles.skillSummary}>
                        {playerName(slot.playerId)} · Còn {slot.remaining} lượt
                      </p>
                    )}
                    {column.skills.map((skill) => {
                      const state = getSkillButtonState({
                        skill,
                        isSupport: column.support,
                        slot,
                        game,
                        mode: activeRoom.mode,
                        answerer,
                        canUseSkills,
                        serverTime,
                      });
                      return (
                        <QuizSkillButton
                          key={skill}
                          skill={skill}
                          disabled={state.disabled}
                          usage={state.usage}
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

      <Button
        className={styles.leaveMatch}
        disabled={busy || !connected}
        onClick={() => void onLeave()}
      >
        Rời phòng
      </Button>
    </Card>
  );
}
