import Link from 'next/link';
import type { QuizView, RoomView } from '@duoquest/shared-types';
import { useI18n } from '../../i18n';
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
  const { t } = useI18n();
  const playerName = (id: string | null) => getPlayerNickname(activeRoom.players, id);

  const headline =
    game.result?.outcome === 'FAILED'
      ? t('quiz.result.headlineFailed')
      : game.result?.outcome === 'DRAW'
        ? t('quiz.result.headlineDraw')
        : activeRoom.mode === 'SOLO'
          ? t('quiz.result.headlineSolo')
          : activeRoom.mode === 'COOP'
            ? t('quiz.result.headlineCoop')
            : t('quiz.result.headlineWinner', {
                winners: (game.result?.winnerIds ?? []).map(playerName).join(', '),
              });

  return (
    <Card className="result">
      <span className="tag">{t('quiz.result.tag')}</span>
      <div className="result-star">✦</div>
      <h1>{headline}</h1>
      <p>{t('quiz.result.labNote')}</p>
      <div className="actions">
        <Button
          disabled={busy || !connected || activeRoom.rematchVotes.includes(identityPlayerId)}
          onClick={() => void onRematch()}
        >
          {activeRoom.rematchVotes.includes(identityPlayerId)
            ? t('quiz.result.waitingRematch')
            : t('quiz.result.playAgain')}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/profile">{t('quiz.result.viewHistory')}</Link>
        </Button>
      </div>
    </Card>
  );
}
