import type { MatchResult } from '@duoquest/shared-types';

/** Server-only interface. Public contracts are exported separately from shared-types. */
export interface GameEngine<State, Config, Action, View> {
  readonly id: string;
  initialize(config: Config, now: number): State;
  applyAction(state: State, playerId: string, action: Action, now: number): State;
  onTimeout(state: State, now: number): State;
  getPlayerView(state: State, controlledPlayerIds: readonly string[], now: number): View;
  calculateResult(state: State): MatchResult | null;
}
