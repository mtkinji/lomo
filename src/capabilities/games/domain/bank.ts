export type BankPlayer = { id: number; name: string; score: number; banked: boolean };
export type BankingRule = 'turns' | 'anyone';
export type BankGame = {
  players: BankPlayer[];
  bankingRule: BankingRule;
  pot: number;
  round: number;
  maxRounds: number;
  rollInRound: number;
  activePlayer: number;
  status: 'playing' | 'finished';
  lastRoll: [number, number];
  message: string;
};

function nextActivePlayer(players: BankPlayer[], current: number) {
  for (let offset = 1; offset <= players.length; offset += 1) {
    const index = (current + offset) % players.length;
    if (!players[index].banked) return index;
  }
  return current;
}

function finishOrAdvanceRound(game: BankGame, message: string): BankGame {
  if (game.round >= game.maxRounds) {
    const highScore = Math.max(...game.players.map((player) => player.score));
    const winners = game.players.filter((player) => player.score === highScore).map((player) => player.name);
    return {
      ...game,
      pot: 0,
      rollInRound: 0,
      status: 'finished',
      message: `${winners.join(' & ')} ${winners.length === 1 ? 'wins' : 'win'} with ${highScore}`,
    };
  }

  const players = game.players.map((player) => ({ ...player, banked: false }));
  return {
    ...game,
    players,
    pot: 0,
    round: game.round + 1,
    rollInRound: 0,
    activePlayer: nextActivePlayer(players, game.activePlayer),
    message,
  };
}

export function createBankGame(names: string[], maxRounds = 10, bankingRule: BankingRule = 'anyone'): BankGame {
  return {
    players: names.map((name, index) => ({ id: index + 1, name, score: 0, banked: false })),
    bankingRule,
    pot: 0,
    round: 1,
    maxRounds,
    rollInRound: 0,
    activePlayer: 0,
    status: 'playing',
    lastRoll: [3, 5],
    message: 'Three safe rolls',
  };
}

export function classifyBankRollCue(game: BankGame, dice: [number, number]): 'bust' | 'doubles' | null {
  if (game.status !== 'playing' || game.rollInRound < 3) return null;
  if (dice[0] + dice[1] === 7) return 'bust';
  if (dice[0] === dice[1]) return 'doubles';
  return null;
}

export function applyBankRoll(game: BankGame, dice: [number, number]): BankGame {
  if (game.status !== 'playing') return game;
  const sum = dice[0] + dice[1];
  const rollInRound = game.rollInRound + 1;
  const base = { ...game, lastRoll: dice, rollInRound };

  if (rollInRound > 3 && sum === 7) return finishOrAdvanceRound(base, 'Seven out — new round');

  const pot = rollInRound <= 3
    ? game.pot + (sum === 7 ? 70 : sum)
    : dice[0] === dice[1]
      ? game.pot * 2
      : game.pot + sum;

  return {
    ...base,
    pot,
    activePlayer: nextActivePlayer(game.players, game.activePlayer),
    message: rollInRound <= 3
      ? `${Math.max(0, 3 - rollInRound)} safe ${3 - rollInRound === 1 ? 'roll' : 'rolls'} left`
      : dice[0] === dice[1]
        ? 'Doubles — pot doubled'
        : `Added ${sum}`,
  };
}

export function bankPlayer(game: BankGame, playerId: number): BankGame {
  if (game.status !== 'playing' || game.rollInRound === 0) return game;
  const playerIndex = game.players.findIndex((player) => player.id === playerId);
  if (playerIndex < 0 || game.players[playerIndex].banked) return game;
  if (game.bankingRule === 'turns' && playerIndex !== game.activePlayer) return game;

  const players = game.players.map((player, index) => index === playerIndex
    ? { ...player, score: player.score + game.pot, banked: true }
    : player);
  const name = players[playerIndex].name;
  const next = { ...game, players, message: `${name} banked ${game.pot}` };
  if (players.every((player) => player.banked)) return finishOrAdvanceRound(next, 'Everyone banked — new round');
  if (playerIndex !== game.activePlayer) return next;
  return { ...next, activePlayer: nextActivePlayer(players, playerIndex) };
}

export function bankCurrentPlayer(game: BankGame): BankGame {
  return bankPlayer(game, game.players[game.activePlayer]?.id);
}
