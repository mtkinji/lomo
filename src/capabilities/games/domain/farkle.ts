export type FarkleSelection = { valid: boolean; score: number; label: string };
export type FarklePlayer = { id: number; name: string; score: number };
export type FarkleGame = {
  players: FarklePlayer[];
  activePlayer: number;
  turnPoints: number;
  diceRemaining: number;
  finalRoundStarter: number | null;
  finalTurnsRemaining: number | null;
  status: 'playing' | 'finished';
  message: string;
};

function countsFor(dice: number[]) {
  const counts = Array(7).fill(0) as number[];
  dice.forEach((value) => { counts[value] += 1; });
  return counts;
}

function kindScore(face: number, count: number) {
  return (face === 1 ? 1000 : face * 100) * (count - 2);
}

export function scoreFarkleSelection(dice: number[]): FarkleSelection {
  if (!dice.length) return { valid: false, score: 0, label: 'Select scoring dice' };
  const counts = countsFor(dice);
  if (dice.length === 6) {
    if (counts.slice(1).every((count) => count === 1)) return { valid: true, score: 1500, label: 'Straight' };
    if (counts.filter((count) => count === 2).length === 3) return { valid: true, score: 1500, label: 'Three pairs' };
    if (counts.filter((count) => count === 3).length === 2) return { valid: true, score: 2500, label: 'Two triplets' };
  }

  let score = 0;
  const labels: string[] = [];
  for (let face = 1; face <= 6; face += 1) {
    const count = counts[face];
    if (count >= 3) {
      score += kindScore(face, count);
      labels.push(`${count} ${face}s`);
    } else if (face === 1 && count > 0) {
      score += count * 100;
      labels.push(count === 1 ? 'A one' : `${count === 2 ? 'Two' : count} ones`);
    } else if (face === 5 && count > 0) {
      score += count * 50;
      labels.push(count === 1 ? 'a five' : `${count} fives`);
    } else if (count > 0) {
      return { valid: false, score: 0, label: 'That includes a non-scoring die' };
    }
  }
  return { valid: true, score, label: labels.join(' + ') };
}

export function analyzeFarkleRoll(dice: number[]) {
  const counts = countsFor(dice);
  const wholeRoll = dice.length === 6 && (
    counts.slice(1).every((count) => count === 1)
    || counts.filter((count) => count === 2).length === 3
    || counts.filter((count) => count === 3).length === 2
  );
  const scoringIndexes = wholeRoll
    ? dice.map((_, index) => index)
    : dice.flatMap((value, index) => value === 1 || value === 5 || counts[value] >= 3 ? [index] : []);
  return { farkle: scoringIndexes.length === 0, scoringIndexes };
}

export function createFarkleGame(names: string[]): FarkleGame {
  return {
    players: names.map((name, index) => ({ id: index + 1, name, score: 0 })),
    activePlayer: 0,
    turnPoints: 0,
    diceRemaining: 6,
    finalRoundStarter: null,
    finalTurnsRemaining: null,
    status: 'playing',
    message: 'Roll all six dice',
  };
}

export function commitFarkleSelection(game: FarkleGame, dice: number[]): FarkleGame {
  if (game.status !== 'playing') return game;
  const selection = scoreFarkleSelection(dice);
  if (!selection.valid) return game;
  const remaining = game.diceRemaining - dice.length;
  const hotDice = remaining === 0;
  return {
    ...game,
    turnPoints: game.turnPoints + selection.score,
    diceRemaining: hotDice ? 6 : remaining,
    message: hotDice ? `Hot dice — ${game.turnPoints + selection.score} this turn` : `${selection.label} — ${selection.score}`,
  };
}

function winnerState(game: FarkleGame, players: FarklePlayer[]): FarkleGame {
  const highScore = Math.max(...players.map((player) => player.score));
  const winners = players.filter((player) => player.score === highScore).map((player) => player.name);
  return { ...game, players, turnPoints: 0, diceRemaining: 6, status: 'finished', message: `${winners.join(' & ')} ${winners.length === 1 ? 'wins' : 'win'} with ${highScore}` };
}

function endTurn(game: FarkleGame, players: FarklePlayer[], message: string): FarkleGame {
  const nextPlayer = (game.activePlayer + 1) % players.length;
  if (game.finalRoundStarter !== null) {
    const remaining = (game.finalTurnsRemaining ?? 1) - 1;
    if (remaining === 0) return winnerState(game, players);
    return { ...game, players, activePlayer: nextPlayer, turnPoints: 0, diceRemaining: 6, finalTurnsRemaining: remaining, message };
  }
  if (players[game.activePlayer].score >= 10000) {
    return { ...game, players, activePlayer: nextPlayer, turnPoints: 0, diceRemaining: 6, finalRoundStarter: game.activePlayer, finalTurnsRemaining: players.length - 1, message: `${players[game.activePlayer].name} reached 10,000 — final round` };
  }
  return { ...game, players, activePlayer: nextPlayer, turnPoints: 0, diceRemaining: 6, message };
}

export function bankFarkleTurn(game: FarkleGame): FarkleGame {
  if (game.status !== 'playing' || game.turnPoints <= 0) return game;
  const players = game.players.map((player, index) => index === game.activePlayer ? { ...player, score: player.score + game.turnPoints } : player);
  return endTurn(game, players, `${players[game.activePlayer].name} banked ${game.turnPoints}`);
}

export function farkleTurn(game: FarkleGame): FarkleGame {
  if (game.status !== 'playing') return game;
  return endTurn(game, game.players, `${game.players[game.activePlayer].name} Farkled`);
}
