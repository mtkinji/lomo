import type { ActiveFocusSession } from './focusSessionLifecycle';
import {
  buildFocusCustomMinuteOptions,
  clampFocusMinutes,
  getRemainingFocusMs,
} from './focusSessionPresentation';

describe('focus session presentation', () => {
  it('clamps duration and creates five-minute custom options', () => {
    expect(clampFocusMinutes('0', 10)).toBe(1);
    expect(clampFocusMinutes('25', 10)).toBe(10);
    expect(buildFocusCustomMinuteOptions(12)).toEqual([5, 10]);
  });

  it('reports remaining time for running and paused sessions', () => {
    expect(getRemainingFocusMs({ mode: 'running', endAtMs: 5_000 } as ActiveFocusSession, 2_000)).toBe(3_000);
    expect(getRemainingFocusMs({ mode: 'paused', remainingMs: 4_000 } as ActiveFocusSession, 2_000)).toBe(4_000);
  });
});
