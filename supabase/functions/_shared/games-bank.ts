export type ServerBankPlayer = { id: number; name: string; score: number; banked: boolean };
export type ServerBankGame = {
  players: ServerBankPlayer[];
  bankingRule: 'turns' | 'anyone';
  pot: number;
  round: number;
  maxRounds: number;
  rollInRound: number;
  activePlayer: number;
  status: 'playing' | 'finished';
  lastRoll: [number, number];
  message: string;
};

type Command = { actionType: 'roll' | 'bank'; playerId: number };

function nextActivePlayer(players: ServerBankPlayer[], current: number) {
  for (let offset = 1; offset <= players.length; offset += 1) {
    const index = (current + offset) % players.length;
    if (!players[index].banked) return index;
  }
  return current;
}

function finishOrAdvanceRound(game: ServerBankGame, message: string): ServerBankGame {
  if (game.round >= game.maxRounds) {
    const highScore = Math.max(...game.players.map((player) => player.score));
    const winners = game.players.filter((player) => player.score === highScore).map((player) => player.name);
    return { ...game, pot: 0, rollInRound: 0, status: 'finished', message: `${winners.join(' & ')} ${winners.length === 1 ? 'wins' : 'win'} with ${highScore}` };
  }
  const players = game.players.map((player) => ({ ...player, banked: false }));
  return { ...game, players, pot: 0, round: game.round + 1, rollInRound: 0, activePlayer: nextActivePlayer(players, game.activePlayer), message };
}

function applyRoll(game: ServerBankGame, dice: [number, number]) {
  const sum = dice[0] + dice[1];
  const rollInRound = game.rollInRound + 1;
  const base = { ...game, lastRoll: dice, rollInRound };
  if (rollInRound > 3 && sum === 7) return finishOrAdvanceRound(base, 'Seven out — new round');
  const pot = rollInRound <= 3 ? game.pot + (sum === 7 ? 70 : sum) : dice[0] === dice[1] ? game.pot * 2 : game.pot + sum;
  return {
    ...base,
    pot,
    activePlayer: nextActivePlayer(game.players, game.activePlayer),
    message: rollInRound <= 3
      ? `${Math.max(0, 3 - rollInRound)} safe ${3 - rollInRound === 1 ? 'roll' : 'rolls'} left`
      : dice[0] === dice[1] ? 'Doubles — pot doubled' : `Added ${sum}`,
  };
}

function applyBank(game: ServerBankGame, playerId: number) {
  if (game.rollInRound === 0) throw new Error('nothing_to_bank');
  const playerIndex = game.players.findIndex((player) => player.id === playerId);
  if (playerIndex < 0 || game.players[playerIndex].banked) throw new Error('seat_cannot_bank');
  if (game.bankingRule === 'turns' && playerIndex !== game.activePlayer) throw new Error('not_your_turn');
  const players = game.players.map((player, index) => index === playerIndex ? { ...player, score: player.score + game.pot, banked: true } : player);
  const next = { ...game, players, message: `${players[playerIndex].name} banked ${game.pot}` };
  if (players.every((player) => player.banked)) return finishOrAdvanceRound(next, 'Everyone banked — new round');
  return playerIndex === game.activePlayer ? { ...next, activePlayer: nextActivePlayer(players, playerIndex) } : next;
}

export function applyRemoteBankCommand(game: ServerBankGame, command: Command, rollDice: () => [number, number]): ServerBankGame {
  if (game.status !== 'playing') throw new Error('game_finished');
  const playerIndex = game.players.findIndex((player) => player.id === command.playerId);
  if (playerIndex < 0) throw new Error('seat_not_found');
  if (command.actionType === 'roll') {
    if (playerIndex !== game.activePlayer || game.players[playerIndex].banked) throw new Error('not_your_turn');
    return applyRoll(game, rollDice());
  }
  return applyBank(game, command.playerId);
}
