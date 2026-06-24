export type FocusSessionLifecycleState =
  | { mode: 'running'; startedAtMs: number; endAtMs: number }
  | { mode: 'paused'; startedAtMs: number; remainingMs: number };

export function isRunningFocusSessionExpired(
  focusSession: FocusSessionLifecycleState | null | undefined,
  nowMs = Date.now(),
): boolean {
  return Boolean(
    focusSession?.mode === 'running' &&
      Number.isFinite(focusSession.endAtMs) &&
      nowMs >= focusSession.endAtMs,
  );
}
