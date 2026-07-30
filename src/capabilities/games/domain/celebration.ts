export type GameStatus = 'playing' | 'finished';
export type ScoredPlayer = { name: string; score: number };
export type WinnerCelebration = { names: string[]; score: number };

export function winnerCelebration(
  previousStatus: GameStatus,
  game: { status: GameStatus; players: ScoredPlayer[] },
): WinnerCelebration | null {
  if (previousStatus === 'finished' || game.status !== 'finished' || !game.players.length) return null;
  const score = Math.max(...game.players.map((player) => player.score));
  return { names: game.players.filter((player) => player.score === score).map((player) => player.name), score };
}
