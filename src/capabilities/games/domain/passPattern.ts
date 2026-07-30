export type PatternBeatId = 'coral' | 'pine' | 'gold' | 'sky' | 'violet' | 'rose';
export type PatternDifficulty = 'gentle' | 'classic' | 'challenge';
export type PatternPhase = 'handoff' | 'watch' | 'repeat' | 'add' | 'result';

export const patternProfiles = {
  gentle: { label: 'Gentle', description: '3 beats · slower', beatIds: ['coral', 'pine', 'gold'], startingLength: 2, spacingMs: 650, celebrationLength: 6 },
  classic: { label: 'Classic', description: '4 beats · steady', beatIds: ['coral', 'pine', 'gold', 'sky'], startingLength: 2, spacingMs: 520 },
  challenge: { label: 'Challenge', description: '6 beats · quick', beatIds: ['coral', 'pine', 'gold', 'sky', 'violet', 'rose'], startingLength: 3, spacingMs: 420 },
} as const satisfies Record<PatternDifficulty, { label: string; description: string; beatIds: readonly PatternBeatId[]; startingLength: number; spacingMs: number; celebrationLength?: number }>;

export type PassPatternState = {
  difficulty: PatternDifficulty;
  playerCount: number;
  playerIndex: number;
  phase: PatternPhase;
  pattern: PatternBeatId[];
  answer: PatternBeatId[];
  success: boolean | null;
  watchSequence: number;
};

export type PassPatternAction =
  | { type: 'ready' }
  | { type: 'replay_watch' }
  | { type: 'finish_watch' }
  | { type: 'submit_beat'; beatId: PatternBeatId }
  | { type: 'next_player' }
  | { type: 'restart' };

export type PassPatternRejection = 'wrong_phase' | 'invalid_beat';
export type PassPatternResult = { ok: true; state: PassPatternState } | { ok: false; reason: PassPatternRejection };

const initialPattern = (difficulty: PatternDifficulty) => {
  const profile = patternProfiles[difficulty];
  return Array.from({ length: profile.startingLength }, (_, index) => profile.beatIds[index % profile.beatIds.length]);
};

export function createPassPatternGame(difficulty: PatternDifficulty, playerCount: number): PassPatternState {
  return { difficulty, playerCount: Math.max(1, playerCount), playerIndex: 0, phase: 'handoff', pattern: initialPattern(difficulty), answer: [], success: null, watchSequence: 0 };
}

export function advancePassPattern(state: PassPatternState, action: PassPatternAction): PassPatternResult {
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
    if (!(patternProfiles[state.difficulty].beatIds as readonly PatternBeatId[]).includes(action.beatId)) return { ok: false, reason: 'invalid_beat' };
    if (state.phase === 'add') return { ok: true, state: { ...state, pattern: [...state.pattern, action.beatId], phase: 'result', success: true } };
    if (state.phase !== 'repeat') return { ok: false, reason: 'wrong_phase' };
    const nextAnswer = [...state.answer, action.beatId];
    const expected = state.pattern[nextAnswer.length - 1];
    if (action.beatId !== expected) return { ok: true, state: { ...state, answer: nextAnswer, phase: 'result', success: false } };
    return { ok: true, state: { ...state, answer: nextAnswer, phase: nextAnswer.length === state.pattern.length ? 'add' : 'repeat' } };
  }
  if (action.type === 'next_player') {
    if (state.phase !== 'result' || !state.success) return { ok: false, reason: 'wrong_phase' };
    return { ok: true, state: { ...state, playerIndex: (state.playerIndex + 1) % state.playerCount, phase: 'handoff', answer: [], success: null } };
  }
  if (state.phase !== 'result' || state.success !== false) return { ok: false, reason: 'wrong_phase' };
  return { ok: true, state: createPassPatternGame(state.difficulty, state.playerCount) };
}
