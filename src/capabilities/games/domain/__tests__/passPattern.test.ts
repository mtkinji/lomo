import { advancePassPattern, createPassPatternGame, patternProfiles, type PatternBeatId } from '../passPattern';

describe('Pass the Pattern rules', () => {
  it('defines coherent Gentle, Classic, and Challenge profiles', () => {
    expect(patternProfiles.gentle).toMatchObject({ beatIds: ['coral', 'pine', 'gold'], startingLength: 2, spacingMs: 650, celebrationLength: 6 });
    expect(patternProfiles.classic).toMatchObject({ beatIds: ['coral', 'pine', 'gold', 'sky'], startingLength: 2, spacingMs: 520 });
    expect(patternProfiles.challenge).toMatchObject({ beatIds: ['coral', 'pine', 'gold', 'sky', 'violet', 'rose'], startingLength: 3, spacingMs: 420 });
  });

  it('requires receiver readiness before watch and repeat', () => {
    const game = createPassPatternGame('classic', 3);
    expect(game.phase).toBe('handoff');
    expect(advancePassPattern(game, { type: 'finish_watch' })).toEqual({ ok: false, reason: 'wrong_phase' });

    const watching = advancePassPattern(game, { type: 'ready' });
    expect(watching).toMatchObject({ ok: true, state: { phase: 'watch', watchSequence: 1 } });
    if (!watching.ok) throw new Error('expected ready transition');
    expect(advancePassPattern(watching.state, { type: 'finish_watch' })).toMatchObject({ ok: true, state: { phase: 'repeat' } });
  });

  it('supports replay without revealing or changing the pattern', () => {
    const game = createPassPatternGame('gentle', 2);
    const watching = advancePassPattern(game, { type: 'ready' });
    if (!watching.ok) throw new Error('expected ready transition');
    const replay = advancePassPattern(watching.state, { type: 'replay_watch' });
    expect(replay).toMatchObject({ ok: true, state: { phase: 'watch', watchSequence: 2, pattern: game.pattern } });
  });

  it('requires an exact repeat before one added beat', () => {
    let state = createPassPatternGame('classic', 2);
    for (const action of [{ type: 'ready' }, { type: 'finish_watch' }] as const) {
      const result = advancePassPattern(state, action);
      if (!result.ok) throw new Error(result.reason);
      state = result.state;
    }
    for (const beatId of state.pattern) {
      const result = advancePassPattern(state, { type: 'submit_beat', beatId });
      if (!result.ok) throw new Error(result.reason);
      state = result.state;
    }
    expect(state.phase).toBe('add');
    const added = advancePassPattern(state, { type: 'submit_beat', beatId: 'sky' });
    expect(added).toMatchObject({ ok: true, state: { phase: 'result', success: true, pattern: [...state.pattern, 'sky'] } });
  });

  it('ends a run immediately on the first wrong beat without blame', () => {
    let state = createPassPatternGame('classic', 2);
    const ready = advancePassPattern(state, { type: 'ready' });
    if (!ready.ok) throw new Error(ready.reason);
    const repeat = advancePassPattern(ready.state, { type: 'finish_watch' });
    if (!repeat.ok) throw new Error(repeat.reason);
    state = repeat.state;

    expect(advancePassPattern(state, { type: 'submit_beat', beatId: 'sky' })).toMatchObject({ ok: true, state: { phase: 'result', success: false } });
  });

  it('passes a grown pattern to the next player and restarts a broken run', () => {
    let state = { ...createPassPatternGame('gentle', 2), phase: 'result' as const, success: true, pattern: ['coral', 'pine', 'gold'] as PatternBeatId[] };
    const next = advancePassPattern(state, { type: 'next_player' });
    expect(next).toMatchObject({ ok: true, state: { playerIndex: 1, phase: 'handoff', pattern: ['coral', 'pine', 'gold'], answer: [] } });

    state = { ...state, success: false };
    const restarted = advancePassPattern(state, { type: 'restart' });
    expect(restarted).toMatchObject({ ok: true, state: { playerIndex: 0, phase: 'handoff', pattern: ['coral', 'pine'], answer: [] } });
  });
});
