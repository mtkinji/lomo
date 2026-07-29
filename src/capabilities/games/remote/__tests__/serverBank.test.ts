import { createBankGame } from '@/src/capabilities/games/domain/bank';
import { applyRemoteBankCommand } from '../../../../../supabase/functions/_shared/games-bank';

describe('server-authoritative Bank commands', () => {
  test('generates rolls on the server through injected secure randomness', () => {
    const game = createBankGame(['Andrew', 'Grandma']);
    const next = applyRemoteBankCommand(game, { actionType: 'roll', playerId: 1 }, () => [3, 4]);
    expect(next.lastRoll).toEqual([3, 4]);
    expect(next.pot).toBe(70);
  });

  test('rejects a roll from a player whose turn it is not', () => {
    const game = createBankGame(['Andrew', 'Grandma']);
    expect(() => applyRemoteBankCommand(game, { actionType: 'roll', playerId: 2 }, () => [1, 1])).toThrow('not_your_turn');
  });

  test('banks only the actor seat', () => {
    const rolled = applyRemoteBankCommand(createBankGame(['Andrew', 'Grandma']), { actionType: 'roll', playerId: 1 }, () => [2, 3]);
    const banked = applyRemoteBankCommand(rolled, { actionType: 'bank', playerId: 2 }, () => [1, 1]);
    expect(banked.players.map((player) => player.score)).toEqual([0, 5]);
  });

  test('starts the new round with the player after the one who rolled seven', () => {
    let game = createBankGame(['Andrew', 'Grandma', 'Olive']);
    game = applyRemoteBankCommand(game, { actionType: 'roll', playerId: 1 }, () => [2, 3]);
    game = applyRemoteBankCommand(game, { actionType: 'roll', playerId: 2 }, () => [2, 3]);
    game = applyRemoteBankCommand(game, { actionType: 'roll', playerId: 3 }, () => [2, 3]);
    game = applyRemoteBankCommand(game, { actionType: 'roll', playerId: 1 }, () => [3, 4]);

    expect(game.round).toBe(2);
    expect(game.activePlayer).toBe(1);
  });
});
