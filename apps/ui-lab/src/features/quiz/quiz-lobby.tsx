import type { ReactNode } from 'react';
import { QUIZ_SKILLS, type QuizSkill, type RoomView } from '@duoquest/shared-types';
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
  const game = activeRoom.game;

  return (
    <>
      <div className="room-heading">
        <div>
          <p className="eyebrow">
            QUIZ BATTLE / {activeRoom.mode} /{' '}
            {activeRoom.layout === 'SHARED_SCREEN' ? 'CHUNG MÀN HÌNH' : 'LAN'}
          </p>
          <h2>
            Phòng <span className="room-code">{activeRoom.code}</span>
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
            Sao chép lời mời
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
  if (activeRoom.status === 'CANCELLED') {
    return (
      <Card className="empty-state">
        <h2>Phòng đã đóng</h2>
        <p>Trận bị hủy không nhận thưởng. Bạn có thể trở về để tạo phòng mới.</p>
        <Button onClick={onHome}>Về sân chơi</Button>
      </Card>
    );
  }

  const setupSummary = formatRoomSetupSummary(activeRoom.setup);
  const controlled = activeRoom.controlledPlayerIds;

  return (
    <Card className="lobby">
      <span className="tag">PHÒNG CHỜ · CHỦ ĐỀ: {theme.name.toLocaleUpperCase('vi')}</span>
      <h1>{activeRoom.status === 'READY' ? 'Sẵn sàng khám phá?' : 'Đợi nhau một chút.'}</h1>
      <p>
        {activeRoom.mode === 'SOLO' || activeRoom.layout === 'SHARED_SCREEN'
          ? 'Nhấn Ready rồi bắt đầu ván chơi.'
          : 'Gửi mã phòng cho bạn, sau đó cả hai cùng nhấn Ready.'}
      </p>
      {activeRoom.mode === 'DUEL' && activeRoom.layout === 'SHARED_SCREEN' && (
        <p className="hint">
          Người chơi 1 nhấn <kbd>A</kbd>, người chơi 2 nhấn <kbd>L</kbd> để giành quyền; sau đó chọn
          đáp án trên màn hình.
        </p>
      )}
      {activeRoom.setup && setupSummary && (
        <p>
          {activeRoom.setup.title} · {activeRoom.setup.category} · {setupSummary.topicsLabel} ·{' '}
          {setupSummary.difficultyLabel} · {activeRoom.setup.questionCount} câu
        </p>
      )}
      <p className="small">
        Skill: {activeSkills.map((skill) => QUIZ_SKILLS[skill].name).join(', ')}
        {activeRoom.mode === 'COOP'
          ? ' · Tối đa 3 lượt từ kho mỗi người'
          : ' · 1 lượt miễn phí mỗi loại'}
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
  );
}

