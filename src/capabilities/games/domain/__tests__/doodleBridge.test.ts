import {
  DOODLE_PASSES,
  advanceDoodleTurn,
  getDoodleSeed,
  getDoodleTurn,
} from '../doodleBridge';

describe('Doodle Bridge round', () => {
  it('gives every player one free turn and one secret dare in roster order', () => {
    const turns = Array.from({ length: 6 }, (_, turnIndex) => getDoodleTurn(3, turnIndex, 0));

    expect(turns.map((turn) => turn.playerIndex)).toEqual([0, 1, 2, 0, 1, 2]);
    expect(turns.slice(0, 3).every((turn) => turn.dare === null)).toBe(true);
    expect(turns.slice(3).map((turn) => turn.dare)).toEqual(expect.arrayContaining([
      expect.any(String),
      expect.any(String),
      expect.any(String),
    ]));
    expect(new Set(turns.slice(3).map((turn) => turn.dare)).size).toBe(3);
    expect(turns[5]).toMatchObject({ pass: DOODLE_PASSES, turnNumber: 6, totalTurns: 6 });
  });

  it('finishes only after the last player completes the second pass', () => {
    expect(advanceDoodleTurn(2, 2)).toEqual({ kind: 'handoff', turnIndex: 3 });
    expect(advanceDoodleTurn(3, 2)).toEqual({ kind: 'finished', turnIndex: 3 });
  });

  it('changes the starter seed on replay without adding a setup choice', () => {
    expect(getDoodleSeed(0).id).not.toBe(getDoodleSeed(1).id);
    expect(getDoodleSeed(100)).toBeTruthy();
  });
});
