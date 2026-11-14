import Link from 'next/link';
import type { QuizView, RoomView } from '@duoquest/shared-types';
import { Button, Card } from '../../ui';
import { getPlayerNickname } from './quiz-stage.utils';

interface Props {
  activeRoom: RoomView;
  game: QuizView;
  connected: boolean;
  busy: boolean;
  identityPlayerId: string;
  onRematch: () => Promise<void>;
}

/** Post-match summary card with outcome headline, rematch vote and history link. */
export function QuizResult({
  activeRoom,
  game,
  connected,
  busy,
  identityPlayerId,
  onRematch,
}: Props) {
  const playerName = (id: string | null) => getPlayerNickname(activeRoom.players, id);

  const headline =
    game.result?.outcome === 'FAILED'
      ? 'Thử lại cùng nhau nhé!'
      : game.result?.outcome === 'DRAW'
        ? 'Một trận hòa cân sức!'
        : activeRoom.mode === 'SOLO'
          ? 'Thêm một hành trình mới!'
          : activeRoom.mode === 'COOP'
            ? 'Hai bạn ăn ý thật đấy!'
            : `${game.result?.winnerIds.map(playerName).join(', ')} chiến thắng!`;

  return (
    <Card className="result">
      <span className="tag">HOÀN THÀNH VÁN CHƠI</span>
      <div className="result-star">✦</div>
      <h1>{headline}</h1>
      <p>Lịch sử và phần thưởng trong trận chơi thử chỉ có hiệu lực trong UI Lab.</p>
      <div className="actions">
        <Button
          disabled={busy || !connected || activeRoom.rematchVotes.includes(identityPlayerId)}
          onClick={() => void onRematch()}
        >
          {activeRoom.rematchVotes.includes(identityPlayerId)
            ? 'Đang chờ bạn đồng ý…'
            : 'Chơi thêm một ván →'}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/profile">Xem lịch sử</Link>
        </Button>
      </div>
    </Card>
  );
}

