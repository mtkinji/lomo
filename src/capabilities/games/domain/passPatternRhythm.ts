import type { PatternBeatId } from './passPattern';

export type PatternGrooveId = 'funk' | 'jazz' | 'rock' | 'blues';
export type PassPatternRhythmPhase = 'handoff' | 'watch' | 'repeat' | 'add' | 'result' | 'finished';
export type PassPatternRhythmOutcome = 'success' | 'wrong-note' | 'off-beat' | null;

export const PATTERN_NOTE_DURATION_MS = 504;

export const patternGrooves = {
  funk: { label: 'Funk', bpm: 100, beatMs: 600, tapWindowMs: 190, seed: ['coral', 'pine'] },
  jazz: { label: 'Jazz', bpm: 96, beatMs: 625, tapWindowMs: 200, seed: ['gold', 'sky'] },
  rock: { label: 'Rock', bpm: 112, beatMs: 536, tapWindowMs: 175, seed: ['pine', 'gold'] },
  blues: { label: 'Blues', bpm: 88, beatMs: 682, tapWindowMs: 215, seed: ['sky', 'coral'] },
} as const satisfies Record<PatternGrooveId, {
  label: string;
  bpm: number;
  beatMs: number;
  tapWindowMs: number;
  seed: readonly PatternBeatId[];
}>;

export const patternGrooveOrder = Object.keys(patternGrooves) as PatternGrooveId[];
export const playablePatternBeatIds = ['coral', 'pine', 'gold', 'sky'] as const satisfies readonly PatternBeatId[];

export type PassPatternRhythmState = {
  playerCount: number;
  activePlayerIndexes: number[];
  playerIndex: number;
  phase: PassPatternRhythmPhase;
  pattern: PatternBeatId[];
  answer: PatternBeatId[];
  outcome: PassPatternRhythmOutcome;
  watchSequence: number;
  round: number;
  grooveId: PatternGrooveId;
  winnerIndex: number | null;
};

export type PassPatternRhythmAction =
  | { type: 'ready' }
  | { type: 'replay_watch' }
  | { type: 'finish_watch' }
  | { type: 'submit_beat'; beatId: PatternBeatId; timingOffsetMs: number }
  | { type: 'continue' }
  | { type: 'rematch' };

export type PassPatternRhythmRejection = 'wrong_phase' | 'invalid_beat' | 'invalid_timing';
export type PassPatternRhythmResult =
  | { ok: true; state: PassPatternRhythmState }
  | { ok: false; reason: PassPatternRhythmRejection };

function grooveForRound(round: number) {
  return patternGrooveOrder[(round - 1) % patternGrooveOrder.length];
}

function seedForGroove(grooveId: PatternGrooveId) {
  return [...patternGrooves[grooveId].seed];
}

export function createPassPatternRhythmGame(playerCount: number): PassPatternRhythmState {
  const safePlayerCount = Math.max(2, playerCount);
  return {
    playerCount: safePlayerCount,
    activePlayerIndexes: Array.from({ length: safePlayerCount }, (_, index) => index),
    playerIndex: 0,
    phase: 'handoff',
    pattern: seedForGroove('funk'),
    answer: [],
    outcome: null,
    watchSequence: 0,
    round: 1,
    grooveId: 'funk',
    winnerIndex: null,
  };
}

function successfulHandoff(state: PassPatternRhythmState): PassPatternRhythmState {
  const activePosition = state.activePlayerIndexes.indexOf(state.playerIndex);
  const nextPosition = (activePosition + 1) % state.activePlayerIndexes.length;
  return {
    ...state,
    playerIndex: state.activePlayerIndexes[nextPosition],
    phase: 'handoff',
    answer: [],
    outcome: null,
  };
}

function eliminationHandoff(state: PassPatternRhythmState): PassPatternRhythmState {
  const activePosition = state.activePlayerIndexes.indexOf(state.playerIndex);
  const survivors = state.activePlayerIndexes.filter((playerIndex) => playerIndex !== state.playerIndex);
  if (survivors.length === 1) {
    return {
      ...state,
      activePlayerIndexes: survivors,
      playerIndex: survivors[0],
      phase: 'finished',
      answer: [],
      winnerIndex: survivors[0],
    };
  }

  const nextRound = state.round + 1;
  const nextGrooveId = grooveForRound(nextRound);
  return {
    ...state,
    activePlayerIndexes: survivors,
    playerIndex: survivors[activePosition % survivors.length],
    phase: 'handoff',
    pattern: seedForGroove(nextGrooveId),
    answer: [],
    outcome: null,
    watchSequence: 0,
    round: nextRound,
    grooveId: nextGrooveId,
    winnerIndex: null,
  };
}

export function advancePassPatternRhythm(
  state: PassPatternRhythmState,
  action: PassPatternRhythmAction,
): PassPatternRhythmResult {
  if (action.type === 'rematch') {
    if (state.phase !== 'finished') return { ok: false, reason: 'wrong_phase' };
    return { ok: true, state: createPassPatternRhythmGame(state.playerCount) };
  }
  if (action.type === 'ready') {
    if (state.phase !== 'handoff') return { ok: false, reason: 'wrong_phase' };
    return { ok: true, state: { ...state, phase: 'watch', watchSequence: state.watchSequence + 1 } };
  }
  if (action.type === 'replay_watch') {
    if (state.phase !== 'watch') return { ok: false, reason: 'wrong_phase' };
    return { ok: true, state: { ...state, watchSequence: state.watchSequence + 1 } };
  }
  if (action.type === 'finish_watch') {
    if (state.phase !== 'watch') return { ok: false, reason: 'wrong_phase' };
    return { ok: true, state: { ...state, phase: 'repeat', answer: [] } };
  }
  if (action.type === 'submit_beat') {
    if (!(playablePatternBeatIds as readonly PatternBeatId[]).includes(action.beatId)) {
      return { ok: false, reason: 'invalid_beat' };
    }
    if (!Number.isFinite(action.timingOffsetMs)) return { ok: false, reason: 'invalid_timing' };
    if (state.phase !== 'repeat' && state.phase !== 'add') return { ok: false, reason: 'wrong_phase' };
    if (Math.abs(action.timingOffsetMs) > patternGrooves[state.grooveId].tapWindowMs) {
      return { ok: true, state: { ...state, phase: 'result', outcome: 'off-beat' } };
    }
    if (state.phase === 'add') {
      return {
        ok: true,
        state: { ...state, pattern: [...state.pattern, action.beatId], phase: 'result', outcome: 'success' },
      };
    }

    const expected = state.pattern[state.answer.length];
    if (action.beatId !== expected) {
      return { ok: true, state: { ...state, phase: 'result', outcome: 'wrong-note' } };
    }
    const answer = [...state.answer, action.beatId];
    return {
      ok: true,
      state: { ...state, answer, phase: answer.length === state.pattern.length ? 'add' : 'repeat' },
    };
  }
  if (action.type === 'continue') {
    if (state.phase !== 'result' || !state.outcome) return { ok: false, reason: 'wrong_phase' };
    return { ok: true, state: state.outcome === 'success' ? successfulHandoff(state) : eliminationHandoff(state) };
  }
  return { ok: false, reason: 'wrong_phase' };
}

export function nearestGrooveBeatOffsetMs(elapsedMs: number, beatMs: number) {
  if (!Number.isFinite(elapsedMs) || !Number.isFinite(beatMs) || beatMs <= 0) return Number.POSITIVE_INFINITY;
  const offsetAfterBeat = ((elapsedMs % beatMs) + beatMs) % beatMs;
  return Math.round(offsetAfterBeat <= beatMs / 2 ? offsetAfterBeat : offsetAfterBeat - beatMs);
}
