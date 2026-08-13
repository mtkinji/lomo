import {
  advancePassPatternRhythm,
  createPassPatternRhythmGame,
  nearestGrooveBeatOffsetMs,
  patternGrooves,
  type PassPatternRhythmState,
} from '../passPatternRhythm';

function advance(state: PassPatternRhythmState, action: Parameters<typeof advancePassPatternRhythm>[1]) {
  const result = advancePassPatternRhythm(state, action);
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

function beginRepeat(state: PassPatternRhythmState) {
  return advance(advance(state, { type: 'ready' }), { type: 'finish_watch' });
}

function completeTurn(state: PassPatternRhythmState, addedBeatId: 'coral' | 'pine' | 'gold' | 'sky' = 'gold') {
  let current = beginRepeat(state);
  for (const beatId of current.pattern) {
    current = advance(current, { type: 'submit_beat', beatId, timingOffsetMs: 0 });
  }
  return advance(current, { type: 'submit_beat', beatId: addedBeatId, timingOffsetMs: 0 });
}

describe('Pass the Pattern rhythm elimination rules', () => {
  it('defines four fixed-tempo grooves whose notes fit inside the fastest pulse', () => {
    expect(Object.keys(patternGrooves)).toEqual(['funk', 'jazz', 'rock', 'blues']);
    expect(patternGrooves.funk).toMatchObject({ label: 'Funk', bpm: 100, beatMs: 600 });
    expect(patternGrooves.jazz).toMatchObject({ label: 'Jazz', bpm: 96, beatMs: 625 });
    expect(patternGrooves.rock).toMatchObject({ label: 'Rock', bpm: 112, beatMs: 536 });
    expect(patternGrooves.blues).toMatchObject({ label: 'Blues', bpm: 88, beatMs: 682 });
    expect(Math.min(...Object.values(patternGrooves).map((groove) => groove.beatMs))).toBeGreaterThan(504);
  });

  it('starts every seated player in a Funk round without a difficulty choice', () => {
    expect(createPassPatternRhythmGame(3)).toMatchObject({
      playerCount: 3,
      activePlayerIndexes: [0, 1, 2],
      playerIndex: 0,
      phase: 'handoff',
      round: 1,
      grooveId: 'funk',
      pattern: ['coral', 'pine'],
      outcome: null,
      winnerIndex: null,
    });
  });

  it('keeps the grown pattern and passes to the next survivor after a successful turn', () => {
    const result = completeTurn(createPassPatternRhythmGame(3));
    expect(result).toMatchObject({ phase: 'result', outcome: 'success', pattern: ['coral', 'pine', 'gold'] });

    expect(advance(result, { type: 'continue' })).toMatchObject({
      playerIndex: 1,
      activePlayerIndexes: [0, 1, 2],
      phase: 'handoff',
      round: 1,
      grooveId: 'funk',
      pattern: ['coral', 'pine', 'gold'],
    });
  });

  it('eliminates only the active player, rotates the groove, and continues with the next survivor', () => {
    let state = beginRepeat(createPassPatternRhythmGame(4));
    state = advance(state, { type: 'submit_beat', beatId: 'sky', timingOffsetMs: 0 });
    expect(state).toMatchObject({ phase: 'result', outcome: 'wrong-note', playerIndex: 0 });

    expect(advance(state, { type: 'continue' })).toMatchObject({
      activePlayerIndexes: [1, 2, 3],
      playerIndex: 1,
      phase: 'handoff',
      round: 2,
      grooveId: 'jazz',
      pattern: ['gold', 'sky'],
      winnerIndex: null,
    });
  });

  it('treats an otherwise correct note outside the groove window as an elimination', () => {
    let state = beginRepeat(createPassPatternRhythmGame(3));
    const tooEarly = patternGrooves.funk.tapWindowMs + 1;
    state = advance(state, { type: 'submit_beat', beatId: 'coral', timingOffsetMs: tooEarly });
    expect(state).toMatchObject({ phase: 'result', outcome: 'off-beat', answer: [] });
  });

  it('finishes with the sole survivor instead of starting another round', () => {
    let state = beginRepeat(createPassPatternRhythmGame(2));
    state = advance(state, { type: 'submit_beat', beatId: 'sky', timingOffsetMs: 0 });
    state = advance(state, { type: 'continue' });

    expect(state).toMatchObject({
      activePlayerIndexes: [1],
      playerIndex: 1,
      phase: 'finished',
      winnerIndex: 1,
      round: 1,
    });
  });

  it('measures a press against the nearest pulse on either side', () => {
    expect(nearestGrooveBeatOffsetMs(1_190, 600)).toBe(-10);
    expect(nearestGrooveBeatOffsetMs(1_330, 600)).toBe(130);
    expect(nearestGrooveBeatOffsetMs(70, 600)).toBe(70);
  });
});
