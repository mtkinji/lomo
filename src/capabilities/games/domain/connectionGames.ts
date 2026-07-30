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
  attempts: number;
  scores: number[];
  phase: 'playing' | 'handoff' | 'finished';
};

export const CLUE_TARGETS_PER_PLAYER = 3;

export function advanceClueRound(state: ClueRoundState, playerCount: number, correct: boolean): ClueRoundState {
  if (state.phase !== 'playing' || playerCount <= 0) return state;
  const scores = state.scores.map((score, index) => index === state.finderIndex && correct ? score + 1 : score);
  const attempts = state.attempts + 1;
  if (attempts < CLUE_TARGETS_PER_PLAYER) return { ...state, attempts, scores };
  if (state.finderIndex >= playerCount - 1) return { ...state, attempts, scores, phase: 'finished' };
  return { finderIndex: state.finderIndex + 1, attempts: 0, scores, phase: 'handoff' };
}
