export function matchSummary(choices: string[]) {
  const counts = choices.reduce<Record<string, number>>((result, choice) => {
    result[choice] = (result[choice] ?? 0) + 1;
    return result;
  }, {});
  const largestGroup = Math.max(0, ...Object.values(counts));
  const label = choices.length > 1 && largestGroup === choices.length
    ? 'Everyone matched!'
    : largestGroup > 1
      ? 'Two minds met.'
      : 'Beautifully split.';
  return { largestGroup, label };
}

export function nextPlayerIndex(current: number, playerCount: number) {
  if (playerCount <= 0) return 0;
  return (current + 1) % playerCount;
}

export function matchesPattern(answer: string[], pattern: string[]) {
  return answer.length === pattern.length && answer.every((value, index) => value === pattern[index]);
}

export function nextPromptIndex(current: number, promptCount: number) {
  if (promptCount <= 0) return 0;
  return (current + 1) % promptCount;
}

export function choiceReveal(players: string[], choices: string[]) {
  return players.map((name, index) => ({ name, choice: choices[index] ?? '' }));
}

export function forecastReveal(players: string[], subjectIndex: number, predictions: Record<number, string>, answer: string) {
  const rows = players.flatMap((name, index) => index === subjectIndex ? [] : [{
    name,
    prediction: predictions[index] ?? '',
    correct: predictions[index] === answer,
  }]);
  return { rows, correctNames: rows.filter((row) => row.correct).map((row) => row.name) };
}

export type ClueRoundState = {
  finderIndex: number;
  turnScore: number;
  scores: number[];
  phase: 'handoff' | 'playing' | 'turn-complete' | 'finished';
};

export const CLUE_TURN_SECONDS = 60;

export function startClueTurn(state: ClueRoundState): ClueRoundState {
  return state.phase === 'handoff' ? { ...state, phase: 'playing' } : state;
}

export function recordClueResult(state: ClueRoundState, result: 'correct' | 'pass'): ClueRoundState {
  if (state.phase !== 'playing' || result === 'pass') return state;
  const scores = state.scores.map((score, index) => index === state.finderIndex ? score + 1 : score);
  return { ...state, turnScore: state.turnScore + 1, scores };
}

export function finishClueTurn(state: ClueRoundState): ClueRoundState {
  return state.phase === 'playing' ? { ...state, phase: 'turn-complete' } : state;
}

export function advanceClueFinder(state: ClueRoundState, playerCount: number): ClueRoundState {
  if (state.phase !== 'turn-complete' || playerCount <= 0) return state;
  if (state.finderIndex >= playerCount - 1) return { ...state, phase: 'finished' };
  return { ...state, finderIndex: state.finderIndex + 1, turnScore: 0, phase: 'handoff' };
}

export function formatClueTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

export type ClueMotionState = 'armed' | 'waiting-for-neutral';

export function resolveClueMotion(rate: number, state: ClueMotionState): { state: ClueMotionState; result: 'correct' | 'pass' | null } {
  if (state === 'waiting-for-neutral') {
    return Math.abs(rate) < 20
      ? { state: 'armed', result: null }
      : { state, result: null };
  }
  if (rate > 95) return { state: 'waiting-for-neutral', result: 'correct' };
  if (rate < -95) return { state: 'waiting-for-neutral', result: 'pass' };
  return { state, result: null };
}
