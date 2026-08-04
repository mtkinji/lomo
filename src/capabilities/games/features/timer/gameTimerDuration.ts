export const DURATION_STEP_MS = 15_000;
export const MIN_DURATION_MS = 15_000;
export const MAX_DURATION_MS = 10 * 60_000;

export function adjustDuration(durationMs: number, direction: -1 | 1) {
  return Math.max(MIN_DURATION_MS, Math.min(MAX_DURATION_MS, durationMs + direction * DURATION_STEP_MS));
}

export function formatTimerDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
