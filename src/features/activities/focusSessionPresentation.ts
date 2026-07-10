import type { ActiveFocusSession } from './focusSessionLifecycle';

export const FOCUS_PRESET_MINUTES = [10, 25, 45, 60] as const;

export function clampFocusMinutes(raw: string | number, maxMinutes: number): number {
  const parsed = Math.floor(Number(raw) || 1);
  return Math.min(maxMinutes, Math.max(1, parsed));
}

export function buildFocusCustomMinuteOptions(maxMinutes: number): number[] {
  return Array.from(
    { length: Math.max(1, Math.floor(maxMinutes / 5)) },
    (_, index) => (index + 1) * 5,
  );
}

export function getRemainingFocusMs(session: ActiveFocusSession | null, nowMs: number): number {
  if (!session) return 0;
  return session.mode === 'paused'
    ? Math.max(0, session.remainingMs)
    : Math.max(0, session.endAtMs - nowMs);
}

export function formatFocusTimer(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
