import {
  createStitchFiveGame,
  stitchFiveScore,
  stitchFiveScorecard,
  stitchFiveShareText,
  stitchFiveTotals,
  stitchFiveWinners,
  rollStitchFiveDice,
  commitStitchFivePatch,
  toggleStitchFivePin,
  type StitchFiveCategoryId,
  type StitchFiveGame,
} from './stitch-five';

describe('Stitch Five scoring', () => {
  it.each<[StitchFiveCategoryId, number[], number]>([
    ['ones', [1, 1, 2, 4, 6], 2],
    ['twos', [2, 2, 2, 4, 6], 6],
    ['threes', [3, 3, 1, 4, 6], 6],
    ['fours', [4, 4, 4, 1, 6], 12],
    ['fives', [5, 5, 2, 4, 6], 10],
    ['sixes', [6, 6, 6, 6, 1], 24],
    ['three-piece', [4, 4, 4, 2, 1], 15],
    ['three-piece', [4, 4, 2, 2, 1], 0],
    ['four-piece', [5, 5, 5, 5, 2], 22],
    ['four-piece', [5, 5, 5, 2, 2], 0],
    ['house-block', [2, 2, 3, 3, 3], 25],
    ['house-block', [2, 2, 2, 2, 3], 0],
    ['short-stitch', [1, 2, 3, 4, 4], 30],
    ['short-stitch', [1, 2, 3, 5, 6], 0],
    ['long-stitch', [2, 3, 4, 5, 6], 40],
    ['long-stitch', [1, 2, 3, 4, 6], 0],
    ['free-patch', [6, 5, 4, 3, 2], 20],
    ['full-quilt', [3, 3, 3, 3, 3], 50],
    ['full-quilt', [3, 3, 3, 3, 2], 0],
  ])('scores %s from %j as %i', (category, dice, expected) => {
    expect(stitchFiveScore(category, dice)).toBe(expected);
  });

  it('applies the seam bonus only when the face region reaches 63', () => {
    const below = { ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 17 };
    const earned = { ...below, sixes: 18 };

    expect(stitchFiveTotals(below)).toEqual({ faceSubtotal: 62, seamBonus: 0, total: 62 });
    expect(stitchFiveTotals(earned)).toEqual({ faceSubtotal: 63, seamBonus: 35, total: 98 });
  });
});

describe('Stitch Five turns', () => {
  it('starts a two-player game before the first roll', () => {
    const game = createStitchFiveGame(['Maya', 'Theo']);

    expect(game.status).toBe('playing');
    expect(game.activePlayer).toBe(0);
    expect(game.rollsUsed).toBe(0);
    expect(game.players.map((player) => player.name)).toEqual(['Maya', 'Theo']);
    expect(game.dice).toEqual([1, 1, 1, 1, 1]);
  });

  it('rejects player counts outside the local learning-release boundary', () => {
    expect(() => createStitchFiveGame(['Solo'])).toThrow('2 to 4 players');
    expect(() => createStitchFiveGame(['A', 'B', 'C', 'D', 'E'])).toThrow('2 to 4 players');
  });

  it('preserves pinned dice during rerolls and stops after three rolls', () => {
    let game = createStitchFiveGame(['Maya', 'Theo']);
    game = rollStitchFiveDice(game, [1, 2, 3, 4, 5]);
    game = toggleStitchFivePin(game, 1);
    game = toggleStitchFivePin(game, 3);
    game = rollStitchFiveDice(game, [6, 6, 6]);

    expect(game.dice).toEqual([6, 2, 6, 4, 6]);
    expect(game.pinned).toEqual([false, true, false, true, false]);
    game = rollStitchFiveDice(game, [1, 1, 1]);
    expect(() => rollStitchFiveDice(game, [2, 2, 2])).toThrow('three times');
  });

  it('requires a roll, commits one category, and hands off with a clean stitch', () => {
    let game = createStitchFiveGame(['Maya', 'Theo']);
    expect(() => commitStitchFivePatch(game, 'free-patch')).toThrow('Roll before');
    game = rollStitchFiveDice(game, [1, 2, 3, 4, 5]);
    game = commitStitchFivePatch(game, 'long-stitch');

    expect(game.players[0].scores['long-stitch']).toBe(40);
    expect(game.activePlayer).toBe(1);
    expect(game.rollsUsed).toBe(0);
    expect(game.pinned).toEqual([false, false, false, false, false]);
    expect(game.lastAction).toEqual({ playerName: 'Maya', category: 'long-stitch', score: 40 });
  });

  it('does not let a player stitch the same patch twice', () => {
    let game = createStitchFiveGame(['Maya', 'Theo']);
    game = rollStitchFiveDice(game, [1, 1, 1, 2, 3]);
    game = commitStitchFivePatch(game, 'ones');
    game = rollStitchFiveDice(game, [2, 2, 2, 3, 4]);
    game = commitStitchFivePatch(game, 'twos');
    game = rollStitchFiveDice(game, [1, 1, 2, 3, 4]);

    expect(() => commitStitchFivePatch(game, 'ones')).toThrow('already stitched');
  });

  it('finishes when every player fills every patch and supports ties', () => {
    let game = createStitchFiveGame(['Maya', 'Theo']);
    for (const category of stitchFiveScorecard.map((patch) => patch.id)) {
      for (let player = 0; player < 2; player += 1) {
        game = rollStitchFiveDice(game, [1, 1, 1, 1, 1]);
        game = commitStitchFivePatch(game, category);
      }
    }

    expect(game.status).toBe('finished');
    expect(stitchFiveWinners(game).map((player) => player.name)).toEqual(['Maya', 'Theo']);
    expect(() => rollStitchFiveDice(game, [1, 2, 3, 4, 5])).toThrow('finished');
  });

  it('shares the completed quilt as compact private text', () => {
    const finished = {
      ...createStitchFiveGame(['Maya', 'Theo']),
      status: 'finished',
      players: [
        { name: 'Maya', scores: Object.fromEntries(stitchFiveScorecard.map(({ id }, index) => [id, index + 1])) },
        { name: 'Theo', scores: Object.fromEntries(stitchFiveScorecard.map(({ id }) => [id, 0])) },
      ],
    } as StitchFiveGame;

    const text = stitchFiveShareText(finished, 0);
    expect(text).toContain("Maya's finished quilt");
    expect(text).toContain('Seam bonus');
    expect(text).toContain('Kwilt Games');
    expect(text).not.toContain('Theo');
  });
});
