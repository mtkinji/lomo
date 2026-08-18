import { formatChoreEventTimestamp } from './choreDetailPresentation';

describe('formatChoreEventTimestamp', () => {
  it('formats an occurrence event as a compact local date and time', () => {
    expect(formatChoreEventTimestamp('2026-08-17T13:10:00.000Z')).toMatch(/^Aug 17 at /);
  });

  it('omits missing or invalid timestamps instead of inventing receipt history', () => {
    expect(formatChoreEventTimestamp(null)).toBeNull();
    expect(formatChoreEventTimestamp('not-a-date')).toBeNull();
  });
});
