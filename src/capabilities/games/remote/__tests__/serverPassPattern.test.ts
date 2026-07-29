import { applyRemotePassPatternCommand, type ServerPassPatternGame } from '../../../../../supabase/functions/_shared/games-pass-pattern';

const game = (): ServerPassPatternGame => ({ difficulty: 'classic', playerCount: 2, playerIndex: 0, phase: 'handoff', pattern: ['coral', 'pine'], answer: [], success: null, watchSequence: 0 });

describe('server Pass the Pattern reducer', () => {
  it('enforces the active seat and phase', () => {
    expect(() => applyRemotePassPatternCommand(game(), 1, { actionType: 'ready' })).toThrow('not_your_turn');
    expect(() => applyRemotePassPatternCommand(game(), 0, { actionType: 'submit_beat', beatId: 'coral' })).toThrow('wrong_phase');
  });

  it('runs ready, watch, exact repeat, and add on canonical state', () => {
    let state = applyRemotePassPatternCommand(game(), 0, { actionType: 'ready' });
    state = applyRemotePassPatternCommand(state, 0, { actionType: 'finish_watch' });
    state = applyRemotePassPatternCommand(state, 0, { actionType: 'submit_beat', beatId: 'coral' });
    state = applyRemotePassPatternCommand(state, 0, { actionType: 'submit_beat', beatId: 'pine' });
    expect(state.phase).toBe('add');
    state = applyRemotePassPatternCommand(state, 0, { actionType: 'submit_beat', beatId: 'sky' });
    expect(state).toMatchObject({ phase: 'result', success: true, pattern: ['coral', 'pine', 'sky'] });
  });
});
