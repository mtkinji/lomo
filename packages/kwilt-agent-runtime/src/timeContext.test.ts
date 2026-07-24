import { calendarDateInTimeZone, normalizeIanaTimeZone } from './timeContext';

describe('agent time context', () => {
  test('accepts an IANA timezone and rejects malformed or oversized values', () => {
    expect(normalizeIanaTimeZone(' America/Denver ')).toBe('America/Denver');
    expect(normalizeIanaTimeZone('not/a-zone')).toBeNull();
    expect(normalizeIanaTimeZone('x'.repeat(101))).toBeNull();
    expect(normalizeIanaTimeZone(null)).toBeNull();
  });

  test('projects an instant to a stable local calendar date', () => {
    const instant = new Date('2026-07-24T05:30:00.000Z');
    expect(calendarDateInTimeZone(instant, 'America/Denver')).toBe('2026-07-23');
    expect(calendarDateInTimeZone(instant, 'UTC')).toBe('2026-07-24');
  });
});
