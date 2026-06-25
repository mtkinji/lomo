import { DateTime } from 'npm:luxon@3.5.0';
import {
  isWeeklyChapterDeliveryDay,
  lastCompletePeriod,
  nthCompletePeriod,
  parseManualRange,
  validZoneOrUtc,
  weeklyChapterDeliveryWeekday,
} from '../chapterPeriods.ts';

function assertEquals<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test('chapterPeriods resolves valid and invalid time zones', () => {
  assertEquals(validZoneOrUtc('America/Denver'), 'America/Denver');
  assertEquals(validZoneOrUtc('Not/A_Zone'), 'UTC');
  assertEquals(validZoneOrUtc(''), 'UTC');
});

Deno.test('chapterPeriods reads weekly delivery weekday from filter JSON', () => {
  assertEquals(weeklyChapterDeliveryWeekday({ weeklyChapter: { deliveryWeekday: 4 } }), 4);
  assertEquals(weeklyChapterDeliveryWeekday({ weeklyChapter: { deliveryWeekday: '7' } }), 7);
  assertEquals(weeklyChapterDeliveryWeekday({ weeklyChapter: { deliveryWeekday: 9 } }), 1);
  assertEquals(weeklyChapterDeliveryWeekday(null), 1);
});

Deno.test('chapterPeriods detects whether a weekly template is due today', () => {
  const thursday = DateTime.fromISO('2026-06-25T12:00:00.000Z');

  assertEquals(
    isWeeklyChapterDeliveryDay(
      { cadence: 'weekly', timezone: 'UTC', filter_json: { weeklyChapter: { deliveryWeekday: 4 } } },
      thursday,
    ),
    true,
  );
  assertEquals(
    isWeeklyChapterDeliveryDay(
      { cadence: 'weekly', timezone: 'UTC', filter_json: { weeklyChapter: { deliveryWeekday: 5 } } },
      thursday,
    ),
    false,
  );
  assertEquals(
    isWeeklyChapterDeliveryDay({ cadence: 'monthly', timezone: 'UTC', filter_json: {} }, thursday),
    true,
  );
});

Deno.test('chapterPeriods computes complete weekly, monthly, and yearly periods', () => {
  const now = DateTime.fromISO('2026-06-25T12:00:00.000Z');

  const weekly = lastCompletePeriod({ cadence: 'weekly', timezone: 'UTC', now });
  assertEquals(weekly?.key, '2026-W25');
  assertEquals(weekly?.start.toISODate(), '2026-06-15');
  assertEquals(weekly?.end.toISODate(), '2026-06-22');

  const monthly = lastCompletePeriod({ cadence: 'monthly', timezone: 'UTC', now });
  assertEquals(monthly?.key, '2026-05');
  assertEquals(monthly?.start.toISODate(), '2026-05-01');
  assertEquals(monthly?.end.toISODate(), '2026-06-01');

  const yearly = lastCompletePeriod({ cadence: 'yearly', timezone: 'UTC', now });
  assertEquals(yearly?.key, '2025');
  assertEquals(yearly?.start.toISODate(), '2025-01-01');
  assertEquals(yearly?.end.toISODate(), '2026-01-01');
});

Deno.test('chapterPeriods supports older complete period offsets', () => {
  const now = DateTime.fromISO('2026-06-25T12:00:00.000Z');
  const period = nthCompletePeriod({ cadence: 'weekly', timezone: 'UTC', offset: 2, now });

  assertEquals(period?.key, '2026-W23');
  assertEquals(period?.start.toISODate(), '2026-06-01');
  assertEquals(period?.end.toISODate(), '2026-06-08');
});

Deno.test('chapterPeriods parses manual date ranges with future and length guards', () => {
  const now = DateTime.fromISO('2026-06-25T12:00:00.000Z');
  const valid = parseManualRange({
    timezone: 'UTC',
    startDate: '2026-06-01',
    endDate: '2026-06-08',
    now,
  });

  assertEquals(valid?.key, '20260601_20260608');
  assertEquals(valid?.start.toISODate(), '2026-06-01');
  assertEquals(valid?.end.toISODate(), '2026-06-08');

  assert(parseManualRange({ timezone: 'UTC', startDate: '2026-06-08', endDate: '2026-06-01', now }) === null, 'rejects inverted ranges');
  assert(parseManualRange({ timezone: 'UTC', startDate: '2026-06-01', endDate: '2026-07-01', now }) === null, 'rejects future ranges');
  assert(parseManualRange({ timezone: 'UTC', startDate: '2025-01-01', endDate: '2026-06-01', now }) === null, 'rejects ranges longer than a year');
});
