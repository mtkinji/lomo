import { adjustDuration, formatTimerDuration, MAX_DURATION_MS, MIN_DURATION_MS } from './gameTimerDuration';

describe('gameTimerDuration', () => {
  it('formats seconds and minutes as an unambiguous clock', () => {
    expect(formatTimerDuration(30_000)).toBe('0:30');
    expect(formatTimerDuration(60_000)).toBe('1:00');
    expect(formatTimerDuration(125_000)).toBe('2:05');
  });

  it('adjusts in 15-second steps within the supported range', () => {
    expect(adjustDuration(60_000, -1)).toBe(45_000);
    expect(adjustDuration(MIN_DURATION_MS, -1)).toBe(MIN_DURATION_MS);
    expect(adjustDuration(MAX_DURATION_MS, 1)).toBe(MAX_DURATION_MS);
  });
});
