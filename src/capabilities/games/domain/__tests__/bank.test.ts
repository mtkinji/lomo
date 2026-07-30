import { applyBankRoll, bankCurrentPlayer, bankPlayer, classifyBankRollCue, createBankGame } from '../bank';

describe('Bank rules', () => {
  test('defaults to anyone banking at any time', () => {
    expect(createBankGame(['Ada', 'Ben']).bankingRule).toBe('anyone');
  });

  test('keeps three opening rolls safe and makes opening seven worth 70', () => {
    let game = createBankGame(['Ada', 'Ben']);
    game = applyBankRoll(game, [3, 4]);
    game = applyBankRoll(game, [2, 2]);
    game = applyBankRoll(game, [1, 2]);
    expect(game.pot).toBe(77);
    expect(game.round).toBe(1);
  });

  test('doubles the pot and identifies a celebration after safe rolls', () => {
    let game = createBankGame(['Ada', 'Ben']);
    game = applyBankRoll(game, [2, 3]);
    game = applyBankRoll(game, [2, 3]);
    game = applyBankRoll(game, [2, 3]);
    expect(classifyBankRollCue(game, [4, 4])).toBe('doubles');
    game = applyBankRoll(game, [4, 4]);
    expect(game.pot).toBe(30);
  });

  test('wipes the pot, advances the round, and identifies a comic failure cue on seven', () => {
    let game = createBankGame(['Ada', 'Ben', 'Cy']);
    game = applyBankRoll(game, [2, 3]);
    game = applyBankRoll(game, [2, 3]);
    game = applyBankRoll(game, [2, 3]);
    expect(game.activePlayer).toBe(0);
    expect(classifyBankRollCue(game, [3, 4])).toBe('bust');
    game = applyBankRoll(game, [3, 4]);
    expect(game.pot).toBe(0);
    expect(game.round).toBe(2);
    expect(game.activePlayer).toBe(1);
  });

  test('banks individual scores and ends with a winner', () => {
    let game = createBankGame(['Ada', 'Ben'], 1);
    game = applyBankRoll(game, [3, 3]);
    game = bankCurrentPlayer(game);
    game = bankCurrentPlayer(game);
    expect(game.status).toBe('finished');
    expect(game.players[1].score).toBe(6);
    expect(game.message).toMatch(/wins|win/);
  });

  test('lets any unbanked player bank the same pot with the open house rule', () => {
    let game = createBankGame(['Ada', 'Ben', 'Cy'], 10, 'anyone');
    game = applyBankRoll(game, [3, 3]);

    game = bankPlayer(game, 1);
    game = bankPlayer(game, 3);

    expect(game.players.map((player) => player.score)).toEqual([6, 0, 6]);
    expect(game.players.map((player) => player.banked)).toEqual([true, false, true]);
    expect(game.activePlayer).toBe(1);
  });

  test('does not let a player bank the same pot twice', () => {
    let game = createBankGame(['Ada', 'Ben'], 10, 'anyone');
    game = applyBankRoll(game, [2, 3]);
    game = bankPlayer(game, 1);

    expect(bankPlayer(game, 1)).toBe(game);
  });

  test('moves the roller when that player banks in the open house rule', () => {
    let game = createBankGame(['Ada', 'Ben', 'Cy'], 10, 'anyone');
    game = applyBankRoll(game, [2, 3]);
    expect(game.activePlayer).toBe(1);

    game = bankPlayer(game, 2);

    expect(game.activePlayer).toBe(2);
    expect(game.players[1].score).toBe(5);
  });

  test('keeps player-specific banking restricted when turns are selected', () => {
    let game = createBankGame(['Ada', 'Ben'], 10, 'turns');
    game = applyBankRoll(game, [2, 3]);

    expect(bankPlayer(game, 1)).toBe(game);
  });
});
