import {
  analyzeFarkleRoll,
  bankFarkleTurn,
  commitFarkleSelection,
  createFarkleGame,
  farkleTurn,
  scoreFarkleSelection,
} from '../farkle';

describe('Farkle scoring', () => {
  test('scores singles, kinds, and rejects mixed invalid dice', () => {
    expect(scoreFarkleSelection([1, 1, 5]).score).toBe(250);
    expect(scoreFarkleSelection([1, 1, 1]).score).toBe(1000);
    expect(scoreFarkleSelection([4, 4, 4, 4]).score).toBe(800);
    expect(scoreFarkleSelection([1, 2]).valid).toBe(false);
  });

  test('scores whole-roll patterns', () => {
    expect(scoreFarkleSelection([1, 2, 3, 4, 5, 6]).score).toBe(1500);
    expect(scoreFarkleSelection([1, 1, 3, 3, 6, 6]).score).toBe(1500);
    expect(scoreFarkleSelection([2, 2, 2, 5, 5, 5]).score).toBe(2500);
  });

  test('distinguishes scoring rolls from Farkles', () => {
    expect(analyzeFarkleRoll([2, 3, 4, 6, 2, 3]).farkle).toBe(true);
    expect(analyzeFarkleRoll([1, 2, 2, 2, 4, 5]).scoringIndexes).toEqual([0, 1, 2, 3, 5]);
  });
});

describe('Farkle turns', () => {
  test('supports hot dice', () => {
    const game = commitFarkleSelection(createFarkleGame(['Ada', 'Ben']), [1, 2, 3, 4, 5, 6]);
    expect(game.turnPoints).toBe(1500);
    expect(game.diceRemaining).toBe(6);
    expect(game.message).toMatch(/Hot dice/);
  });

  test('banks and advances', () => {
    let game = createFarkleGame(['Ada', 'Ben']);
    game = commitFarkleSelection(game, [1, 5]);
    game = bankFarkleTurn(game);
    expect(game.players[0].score).toBe(150);
    expect(game.activePlayer).toBe(1);
  });

  test('loses turn points on a Farkle', () => {
    let game = commitFarkleSelection(createFarkleGame(['Ada', 'Ben']), [1]);
    game = farkleTurn(game);
    expect(game.turnPoints).toBe(0);
    expect(game.activePlayer).toBe(1);
  });

  test('gives every opponent one last turn after 10,000', () => {
    let game = createFarkleGame(['Ada', 'Ben', 'Cy']);
    game = { ...game, players: game.players.map((player, index) => ({ ...player, score: index === 0 ? 9900 : 0 })) };
    game = bankFarkleTurn(commitFarkleSelection(game, [1]));
    expect(game.finalTurnsRemaining).toBe(2);
    game = farkleTurn(game);
    game = farkleTurn(game);
    expect(game.status).toBe('finished');
    expect(game.message).toMatch(/Ada wins/);
  });
});
