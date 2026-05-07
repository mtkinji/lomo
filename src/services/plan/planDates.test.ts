import {
  clampToNextQuarterHour,
  dateKeyToLocalDate,
  formatDayLabel,
  formatTimeLabel,
  formatTimeRange,
  getWeekdayKey,
  parseTimeToMinutes,
  setTimeOnDate,
  toLocalDateKey,
} from './planDates';

describe('toLocalDateKey', () => {
  it('formats a Date as YYYY-MM-DD using local components', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toLocalDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('zero-pads month and day', () => {
    expect(toLocalDateKey(new Date(2026, 4, 9))).toBe('2026-05-09');
  });
});

describe('dateKeyToLocalDate', () => {
  it('round-trips through toLocalDateKey for valid date keys', () => {
    expect(toLocalDateKey(dateKeyToLocalDate('2026-04-15'))).toBe('2026-04-15');
  });

  it('returns a date at midnight local time for valid keys', () => {
    const date = dateKeyToLocalDate('2026-04-15');
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
    expect(date.getSeconds()).toBe(0);
    expect(date.getMilliseconds()).toBe(0);
  });

  it('falls back to a current Date for malformed keys', () => {
    const date = dateKeyToLocalDate('not-a-date');
    expect(Number.isFinite(date.getTime())).toBe(true);
  });
});

describe('getWeekdayKey', () => {
  it('returns weekday keys matching JS getDay() values', () => {
    expect(getWeekdayKey(new Date(2026, 3, 12))).toBe('sun'); // Sunday
    expect(getWeekdayKey(new Date(2026, 3, 13))).toBe('mon');
    expect(getWeekdayKey(new Date(2026, 3, 14))).toBe('tue');
    expect(getWeekdayKey(new Date(2026, 3, 15))).toBe('wed');
    expect(getWeekdayKey(new Date(2026, 3, 16))).toBe('thu');
    expect(getWeekdayKey(new Date(2026, 3, 17))).toBe('fri');
    expect(getWeekdayKey(new Date(2026, 3, 18))).toBe('sat');
  });
});

describe('parseTimeToMinutes', () => {
  it('parses HH:mm into minutes', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('09:30')).toBe(9 * 60 + 30);
    expect(parseTimeToMinutes('23:59')).toBe(23 * 60 + 59);
  });

  it('accepts whitespace around the value', () => {
    expect(parseTimeToMinutes(' 12:15 ')).toBe(12 * 60 + 15);
  });

  it('returns null for malformed values', () => {
    expect(parseTimeToMinutes('')).toBeNull();
    expect(parseTimeToMinutes('1234')).toBeNull();
    expect(parseTimeToMinutes('abc:def')).toBeNull();
  });

  it('rejects out-of-range hours and minutes', () => {
    expect(parseTimeToMinutes('24:00')).toBeNull();
    expect(parseTimeToMinutes('-1:30')).toBeNull();
    expect(parseTimeToMinutes('10:60')).toBeNull();
    expect(parseTimeToMinutes('10:-1')).toBeNull();
  });
});

describe('setTimeOnDate', () => {
  it('returns a new Date with the time applied (no mutation)', () => {
    const original = new Date(2026, 3, 15, 5, 0, 0);
    const result = setTimeOnDate(original, '14:30');
    expect(result).not.toBeNull();
    expect(result?.getHours()).toBe(14);
    expect(result?.getMinutes()).toBe(30);
    expect(original.getHours()).toBe(5);
  });

  it('returns null for invalid time strings', () => {
    expect(setTimeOnDate(new Date(2026, 3, 15), 'bad')).toBeNull();
  });
});

describe('clampToNextQuarterHour', () => {
  it('snaps a date forward to the next 15-minute boundary', () => {
    const result = clampToNextQuarterHour(new Date(2026, 3, 15, 10, 7));
    expect(result.getHours()).toBe(10);
    expect(result.getMinutes()).toBe(15);
  });

  it('does not move dates already on a quarter-hour mark (but zeroes seconds)', () => {
    const result = clampToNextQuarterHour(new Date(2026, 3, 15, 10, 30, 45));
    expect(result.getHours()).toBe(10);
    expect(result.getMinutes()).toBe(30);
    expect(result.getSeconds()).toBe(0);
  });

  it('rolls into the next hour when minute >= 45', () => {
    const result = clampToNextQuarterHour(new Date(2026, 3, 15, 10, 50));
    expect(result.getHours()).toBe(11);
    expect(result.getMinutes()).toBe(0);
  });
});

describe('format helpers (smoke tests)', () => {
  it('formatDayLabel returns a non-empty string', () => {
    expect(typeof formatDayLabel(new Date(2026, 3, 15))).toBe('string');
    expect(formatDayLabel(new Date(2026, 3, 15)).length).toBeGreaterThan(0);
  });

  it('formatTimeLabel returns a non-empty string', () => {
    expect(typeof formatTimeLabel(new Date(2026, 3, 15, 9, 5))).toBe('string');
    expect(formatTimeLabel(new Date(2026, 3, 15, 9, 5)).length).toBeGreaterThan(0);
  });

  it('formatTimeRange contains a hyphen separating start and end', () => {
    const start = new Date(2026, 3, 15, 9, 0);
    const end = new Date(2026, 3, 15, 10, 0);
    expect(formatTimeRange(start, end)).toMatch(/-/);
  });
});
