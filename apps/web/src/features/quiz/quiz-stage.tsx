'use client';
import type { ReactNode } from 'react';
import { Button, Card } from '@duoquest/ui';
import type { QuizAction, RoomView } from '@duoquest/shared-types';
interface Props {
  activeRoom: RoomView;
  connected: boolean;
  busy: boolean;
  now: number;
  clockOffset: number;
  identityPlayerId: string;
  notice: ReactNode;
  onCopy: () => Promise<void>;
  onLeave: () => Promise<void>;
  onHome: () => void;
  onCommand: (event: 'room:ready' | 'match:start' | 'room:rematch' | 'room:sync') => Promise<void>;
  onAction: (playerId: string, payload: QuizAction) => Promise<void>;
}
export function QuizStage({
  activeRoom,
  connected,
  busy,
  now,
  clockOffset,
  identityPlayerId,
  notice,
  onCopy,
  onLeave,
  onHome,
  onCommand,
  onAction,
}: Props) {
  const code = activeRoom.code;
  const game = activeRoom.game;
  const playerName = (id: string | null) =>
    activeRoom.players.find((player) => player.playerId === id)?.nickname ?? '—';
  const seconds = game ? Math.max(0, Math.ceil((game.deadline - (now + clockOffset)) / 1000)) : 0;
  const controlled = activeRoom.controlledPlayerIds;
  const answerer = !game
    ? undefined
    : activeRoom.mode === 'COOP'
      ? controlled.find((id) => id === game.captainId)
      : activeRoom.mode === 'DUEL' && activeRoom.layout === 'SHARED_SCREEN'
        ? controlled.find((id) => id === game.buzzerPlayerId)
        : controlled[0];
  const canAnswer =
    connected &&
    !busy &&
    activeRoom.status === 'IN_PROGRESS' &&
    game?.phase === 'QUESTION' &&
    answerer &&
    !game.answeredPlayerIds.includes(answerer);
  return (
    <>
      <div className="room-heading">
        <div>
          <p className="eyebrow">
            QUIZ BATTLE / {activeRoom.mode} /{' '}
            {activeRoom.layout === 'SHARED_SCREEN' ? 'CHUNG MÀN HÌNH' : 'LAN'}
          </p>
          <h2>
            Phòng <span className="room-code">{code}</span>
          </h2>
        </div>
        <div className="actions">
          <Button
            variant="ghost"
            onClick={() => {
              void onCopy();
            }}
          >
            Copy lời mời
          </Button>
          <Button
            variant="outline"
            disabled={busy || !connected}
            onClick={() => {
              void onLeave();
            }}
          >
            Rời phòng
          </Button>
        </div>
      </div>
      {!connected && (
        <div className="notice" role="status">
          Mất kết nối. Đang kết nối lại và xin snapshot từ server…
        </div>
      )}
      {notice}
      <div className="scoreboard">
        {activeRoom.players.map((player, index) => (
          <Card key={player.playerId} className={`player-card player-${index}`}>
            <span className="avatar">{player.nickname.slice(0, 1).toLocaleUpperCase('vi')}</span>
            <div>
              <strong>{player.nickname}</strong>
              <p className="small muted">
                {player.connected ? (player.ready ? 'Sẵn sàng' : 'Đã vào phòng') : 'Mất kết nối'}
                {game?.captainId === player.playerId ? ' · Đội trưởng' : ''}
              </p>
            </div>
            <span className="score">{game?.scores[player.playerId] ?? 0}</span>
          </Card>
        ))}
      </div>
      {activeRoom.status === 'CANCELLED' ? (
        <Card className="empty-state">
          <h2>Phòng đã đóng</h2>
          <p>Trận bị hủy không nhận thưởng. Bạn có thể trở về để tạo phòng mới.</p>
          <Button
            onClick={() => {
              onHome();
            }}
          >
            Về sân chơi
          </Button>
        </Card>
      ) : !game ? (
        <Card className="lobby">
          <span className="tag">PHÒNG CHỜ</span>
          <h1>{activeRoom.status === 'READY' ? 'Sẵn sàng khám phá?' : 'Đợi nhau một chút.'}</h1>
          <p>
            {activeRoom.mode === 'SOLO' || activeRoom.layout === 'SHARED_SCREEN'
              ? 'Nhấn Ready rồi bắt đầu ván chơi.'
              : 'Gửi mã phòng cho bạn, sau đó cả hai cùng nhấn Ready.'}
          </p>
          {activeRoom.mode === 'DUEL' && activeRoom.layout === 'SHARED_SCREEN' && (
            <p className="hint">
              Người chơi 1 nhấn <kbd>A</kbd>, người chơi 2 nhấn <kbd>L</kbd> để giành quyền; sau đó
              chọn đáp án trên màn hình.
            </p>
          )}
          <div className="actions">
            <Button
              variant="outline"
              disabled={
                busy ||
                !connected ||
                activeRoom.players
                  .filter((p) => controlled.includes(p.playerId))
                  .every((p) => p.ready)
              }
              onClick={() => void onCommand('room:ready')}
            >
              Tôi đã sẵn sàng
            </Button>
            {activeRoom.hostPlayerId === identityPlayerId && (
              <Button
                disabled={busy || !connected || activeRoom.status !== 'READY'}
                onClick={() => void onCommand('match:start')}
              >
                Bắt đầu →
              </Button>
            )}
          </div>
        </Card>
      ) : game.phase === 'FINISHED' ? (
        <Card className="result">
          <span className="tag">HOÀN THÀNH VÁN CHƠI</span>
          <div className="result-star">✦</div>
          <h1>
            {game.result?.outcome === 'FAILED'
              ? 'Thử lại cùng nhau nhé!'
              : game.result?.outcome === 'DRAW'
                ? 'Một trận hòa cân sức!'
                : activeRoom.mode === 'SOLO'
                  ? 'Thêm một hành trình mới!'
                  : activeRoom.mode === 'COOP'
                    ? 'Cùng nhau vượt ải!'
                    : `${game.result?.winnerIds.map(playerName).join(', ')} chiến thắng!`}
          </h1>
          <p>Kết quả đã được lưu. Phần thưởng hợp lệ được server xử lý một lần.</p>
          <div className="actions">
            <Button
              disabled={busy || !connected || activeRoom.rematchVotes.includes(identityPlayerId)}
              onClick={() => void onCommand('room:rematch')}
            >
              {activeRoom.rematchVotes.includes(identityPlayerId)
                ? 'Đang chờ bạn đồng ý…'
                : 'Chơi thêm một ván →'}
            </Button>
            <Button variant="outline" asChild>
              <a href="/profile">Xem lịch sử</a>
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="question-card">
          <div className="question-meta">
            <span>
              CÂU {game.questionNumber} / {game.questionCount} · {game.question.topic}
            </span>
            <span className="timer" aria-label={`Còn ${seconds} giây`}>
              {seconds}s
            </span>
          </div>
          {activeRoom.mode === 'COOP' && (
            <div className="coop-info">
              Ải {game.stage}/{game.stageCount} · {game.lives} mạng · {game.teamScore} điểm đội ·{' '}
              {playerName(game.captainId)} khóa đáp án
            </div>
          )}
          <h1>{game.question.prompt}</h1>
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
                <p className="small">
                  {game.buzzerPlayerId
                    ? `${playerName(game.buzzerPlayerId)} đang trả lời`
                    : 'Ai nhanh tay hơn?'}
                </p>
              </div>
            )}
          <div className="answers">
            {game.question.options.map((option) => (
              <button
                key={option.id}
                className={`answer ${game.reveal?.correctOptionId === option.id ? 'correct' : ''} ${answerer && game.ownAnswers[answerer] === option.id ? 'chosen' : ''}`}
                disabled={!canAnswer}
                onClick={() => {
                  if (answerer) void onAction(answerer, { type: 'ANSWER', optionId: option.id });
                }}
              >
                <span>{option.id}</span>
                {option.text}
              </button>
            ))}
          </div>
          {game.reveal ? (
            <div className="explanation" role="status">
              <strong>Đáp án {game.reveal.correctOptionId}</strong>
              <p>{game.reveal.explanation}</p>
              <span className="small">Server sẽ tự chuyển vòng tiếp theo.</span>
            </div>
          ) : (
            <p className="small muted" role="status">
              {answerer && game.answeredPlayerIds.includes(answerer)
                ? 'Đã khóa đáp án. Chờ người còn lại hoặc hết giờ…'
                : activeRoom.mode === 'COOP' && !answerer
                  ? 'Cùng thảo luận — chờ đội trưởng khóa đáp án.'
                  : 'Đúng và nhanh để ghi thêm điểm. Đáp án được mở sau vòng.'}
            </p>
          )}
        </Card>
      )}
    </>
  );
}
