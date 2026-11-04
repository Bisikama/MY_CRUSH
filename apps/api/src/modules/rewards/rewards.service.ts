import { Injectable } from '@nestjs/common';
import type { MatchResult } from '@duoquest/shared-types';

export interface RewardGrant {
  playerId: string;
  coins: number;
  xp: number;
}
/** PROPOSAL economy. Persistence claims the result and applies these grants atomically. */
@Injectable()
export class RewardsService {
  calculate(result: MatchResult, trusted: boolean): RewardGrant[] {
    if (!trusted || result.outcome === 'FAILED') return [];
    return Object.keys(result.scores).map((playerId) => ({
      playerId,
      xp: 20,
      coins:
        result.mode === 'SOLO'
          ? 10
          : result.mode === 'COOP'
            ? 12
            : 6 + (result.outcome !== 'DRAW' && result.winnerIds.includes(playerId) ? 10 : 0),
    }));
  }
}
