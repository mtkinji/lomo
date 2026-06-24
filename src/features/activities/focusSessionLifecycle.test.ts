import { isRunningFocusSessionExpired } from './focusSessionLifecycle';

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
});
