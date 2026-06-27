export type FocusSessionLifecycleState =
  | { mode: 'running'; startedAtMs: number; endAtMs: number }
  | { mode: 'paused'; startedAtMs: number; remainingMs: number };

export type ActiveFocusSession =
  | {
      sessionId: string;
      activityId: string;
      goalId?: string | null;
      title: string;
      mode: 'running';
      startedAtMs: number;
      endAtMs: number;
      notificationId: string | null;
    }
  | {
      sessionId: string;
      activityId: string;
      goalId?: string | null;
      title: string;
      mode: 'paused';
      startedAtMs: number;
      remainingMs: number;
      notificationId: string | null;
    };

export type CompletedFocusSession = Extract<ActiveFocusSession, { mode: 'running' }> & {
  completedAtMs: number;
  durationMinutes: number;
};

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

export function buildFocusSessionId(activityId: string, startedAtMs: number): string {
  return `${activityId}-${startedAtMs}`;
}

export function buildRunningFocusSession(params: {
  activityId: string;
  goalId?: string | null;
  title: string;
  minutes: number;
  startedAtMs: number;
}): ActiveFocusSession {
  const minutes = Math.max(1, Math.floor(params.minutes));
  const startedAtMs = params.startedAtMs;
  return {
    sessionId: buildFocusSessionId(params.activityId, startedAtMs),
    activityId: params.activityId,
    goalId: params.goalId ?? null,
    title: params.title,
    mode: 'running',
    startedAtMs,
    endAtMs: startedAtMs + minutes * 60_000,
    notificationId: null,
  };
}

export function buildPausedFocusSession(
  focusSession: ActiveFocusSession,
  nowMs = Date.now(),
): ActiveFocusSession {
  if (focusSession.mode === 'paused') return focusSession;
  return {
    sessionId: focusSession.sessionId,
    activityId: focusSession.activityId,
    goalId: focusSession.goalId ?? null,
    title: focusSession.title,
    mode: 'paused',
    startedAtMs: focusSession.startedAtMs,
    remainingMs: Math.max(0, focusSession.endAtMs - nowMs),
    notificationId: null,
  };
}

export function resumePausedFocusSession(
  focusSession: ActiveFocusSession,
  nowMs = Date.now(),
): ActiveFocusSession {
  if (focusSession.mode === 'running') return focusSession;
  return {
    sessionId: focusSession.sessionId,
    activityId: focusSession.activityId,
    goalId: focusSession.goalId ?? null,
    title: focusSession.title,
    mode: 'running',
    startedAtMs: focusSession.startedAtMs,
    endAtMs: nowMs + focusSession.remainingMs,
    notificationId: null,
  };
}

export function completeExpiredFocusSession(
  focusSession: ActiveFocusSession | null | undefined,
  nowMs = Date.now(),
): CompletedFocusSession | null {
  if (!isRunningFocusSessionExpired(focusSession, nowMs)) return null;
  const running = focusSession as Extract<ActiveFocusSession, { mode: 'running' }>;
  return {
    ...running,
    completedAtMs: nowMs,
    durationMinutes: Math.max(1, Math.round((running.endAtMs - running.startedAtMs) / 60_000)),
  };
}

export function isFocusNotificationForActiveSession(
  activeSessionId: string | null | undefined,
  scheduledSessionId: string,
): boolean {
  return Boolean(activeSessionId && activeSessionId === scheduledSessionId);
}

export function getFocusCompletionNotificationSeconds(
  focusSession: FocusSessionLifecycleState | null | undefined,
  nowMs = Date.now(),
): number | null {
  if (focusSession?.mode !== 'running') return null;
  const remainingMs = focusSession.endAtMs - nowMs;
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return null;
  return Math.max(1, Math.ceil(remainingMs / 1000));
}
