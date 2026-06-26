import {
  buildPausedFocusSession,
  buildFocusSessionId,
  buildRunningFocusSession,
  completeExpiredFocusSession,
  getFocusCompletionNotificationSeconds,
  isFocusNotificationForActiveSession,
  isRunningFocusSessionExpired,
  resumePausedFocusSession,
} from './focusSessionLifecycle';

describe('focusSessionLifecycle', () => {
  it('treats a running session as expired once foreground time reaches its end', () => {
    expect(
      isRunningFocusSessionExpired(
        { mode: 'running', startedAtMs: 1_000, endAtMs: 2_000 },
        2_000,
      ),
    ).toBe(true);
  });

  it('does not complete paused sessions on foreground resume', () => {
    expect(
      isRunningFocusSessionExpired(
        { mode: 'paused', startedAtMs: 1_000, remainingMs: 500 },
        5_000,
      ),
    ).toBe(false);
  });

  it('keeps active running sessions alive before their end time', () => {
    expect(
      isRunningFocusSessionExpired(
        { mode: 'running', startedAtMs: 1_000, endAtMs: 3_000 },
        2_999,
      ),
    ).toBe(false);
  });

  it('builds a stable session id from the activity and start time', () => {
    expect(buildFocusSessionId('activity-1', 1_234)).toBe('activity-1-1234');
  });

  it('rejects focus notification schedule results from a stale session', () => {
    expect(isFocusNotificationForActiveSession('activity-1-2000', 'activity-1-1000')).toBe(false);
  });

  it('keeps focus notification schedule results for the active session', () => {
    expect(isFocusNotificationForActiveSession('activity-1-1000', 'activity-1-1000')).toBe(true);
  });

  it('calculates the remaining notification delay when a session resumes', () => {
    expect(
      getFocusCompletionNotificationSeconds(
        { mode: 'running', startedAtMs: 1_000, endAtMs: 11_250 },
        6_000,
      ),
    ).toBe(6);
  });

  it('does not schedule completion notifications for paused or expired sessions', () => {
    expect(
      getFocusCompletionNotificationSeconds(
        { mode: 'paused', startedAtMs: 1_000, remainingMs: 4_000 },
        2_000,
      ),
    ).toBeNull();
    expect(
      getFocusCompletionNotificationSeconds(
        { mode: 'running', startedAtMs: 1_000, endAtMs: 2_000 },
        2_000,
      ),
    ).toBeNull();
  });

  it('builds a durable running focus session with activity context', () => {
    expect(
      buildRunningFocusSession({
        activityId: 'activity-1',
        title: 'Write budget plan',
        minutes: 25,
        startedAtMs: 10_000,
      }),
    ).toEqual({
      sessionId: 'activity-1-10000',
      activityId: 'activity-1',
      goalId: null,
      title: 'Write budget plan',
      mode: 'running',
      startedAtMs: 10_000,
      endAtMs: 1_510_000,
      notificationId: null,
    });
  });

  it('pauses and resumes a durable focus session without changing its session id', () => {
    const running = buildRunningFocusSession({
      activityId: 'activity-1',
      title: 'Write budget plan',
      minutes: 25,
      startedAtMs: 10_000,
    });

    const paused = buildPausedFocusSession(running, 70_000);
    expect(paused).toEqual({
      sessionId: 'activity-1-10000',
      activityId: 'activity-1',
      goalId: null,
      title: 'Write budget plan',
      mode: 'paused',
      startedAtMs: 10_000,
      remainingMs: 1_440_000,
      notificationId: null,
    });

    expect(resumePausedFocusSession(paused, 100_000)).toEqual({
      sessionId: 'activity-1-10000',
      activityId: 'activity-1',
      goalId: null,
      title: 'Write budget plan',
      mode: 'running',
      startedAtMs: 10_000,
      endAtMs: 1_540_000,
      notificationId: null,
    });
  });

  it('returns the completed running session once it expires', () => {
    const running = buildRunningFocusSession({
      activityId: 'activity-1',
      title: 'Write budget plan',
      minutes: 1,
      startedAtMs: 10_000,
    });

    expect(completeExpiredFocusSession(running, 69_999)).toBeNull();
    expect(completeExpiredFocusSession(running, 70_000)).toEqual({
      ...running,
      completedAtMs: 70_000,
      durationMinutes: 1,
    });
  });
});
