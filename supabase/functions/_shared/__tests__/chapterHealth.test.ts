// Jest tests for Phase 4-backend of docs/chapters-plan.md — the
// HealthKit inclusion floor, the shaped `metrics.health` block, and
// the health-keyword validator helper.
//
// The module under test is framework-free (no Deno imports), so we
// import directly. See `_shared/chapterHealth.ts` for the threshold
// contract and active-day definition this file pins down.

import {
  computeChapterHealthBlock,
  containsHealthKeyword,
  HEALTH_ACTIVE_DAY_MIN_MINUTES,
  HEALTH_ACTIVE_DAY_MIN_STEPS,
  HEALTH_INCLUSION_THRESHOLDS,
} from '../chapterHealth';
import type { HealthDailyRow } from '../chapterHealth';

function row(
  date: string,
  overrides: Partial<HealthDailyRow> = {},
): HealthDailyRow {
  return {
    local_date: date,
    timezone: 'America/Los_Angeles',
    steps_count: 0,
    active_minutes: 0,
    workouts_count: 0,
    sleep_hours: null,
    mindfulness_minutes: 0,
    ...overrides,
  };
}

describe('computeChapterHealthBlock — inclusion floor', () => {
  it('returns null for empty / missing input', () => {
    expect(computeChapterHealthBlock(null)).toBeNull();
    expect(computeChapterHealthBlock(undefined)).toBeNull();
    expect(computeChapterHealthBlock([])).toBeNull();
  });

  it('returns null when the week is below every threshold', () => {
    const rows: HealthDailyRow[] = [
      // Two "active" days (steps = 1200) — below min_active_days=3
      row('2026-04-13', { steps_count: 1200 }),
      row('2026-04-14', { steps_count: 1200 }),
      // One short meditation, below the 1-minute floor only because
      // the column is 0, not null — we simulate the user having the
      // permission but no sessions.
      row('2026-04-15', { mindfulness_minutes: 0 }),
    ];
    const block = computeChapterHealthBlock(rows);
    expect(block).toBeNull();
  });

  it('triggers on active_days_count >= 3 alone', () => {
    const rows: HealthDailyRow[] = [
      row('2026-04-13', { steps_count: HEALTH_ACTIVE_DAY_MIN_STEPS }),
      row('2026-04-14', { steps_count: HEALTH_ACTIVE_DAY_MIN_STEPS + 500 }),
      row('2026-04-15', { active_minutes: HEALTH_ACTIVE_DAY_MIN_MINUTES }),
    ];
    const block = computeChapterHealthBlock(rows);
    expect(block).not.toBeNull();
    expect(block!.active_days_count).toBe(HEALTH_INCLUSION_THRESHOLDS.min_active_days);
  });

  it('triggers on workouts_count >= 1 alone, even with no active days', () => {
    const rows: HealthDailyRow[] = [
      row('2026-04-13', { workouts_count: 1, steps_count: 200 }),
    ];
    const block = computeChapterHealthBlock(rows);
    expect(block).not.toBeNull();
    expect(block!.workouts_count).toBe(1);
    expect(block!.active_days_count).toBe(0);
  });

  it('triggers on avg_sleep_hours >= 6 alone, even with no active days or workouts', () => {
    const rows: HealthDailyRow[] = [
      row('2026-04-13', { sleep_hours: 7.2 }),
      row('2026-04-14', { sleep_hours: 6.5 }),
    ];
    const block = computeChapterHealthBlock(rows);
    expect(block).not.toBeNull();
    expect(block!.avg_sleep_hours).toBeGreaterThanOrEqual(
      HEALTH_INCLUSION_THRESHOLDS.min_avg_sleep_hours,
    );
    expect(block!.sleep_nights_count).toBe(2);
  });

  it('does not trigger on avg_sleep_hours below the 6h floor', () => {
    const rows: HealthDailyRow[] = [
      row('2026-04-13', { sleep_hours: 5.2 }),
      row('2026-04-14', { sleep_hours: 5.5 }),
    ];
    expect(computeChapterHealthBlock(rows)).toBeNull();
  });

  it('triggers on mindfulness_minutes >= 1 alone', () => {
    const rows: HealthDailyRow[] = [
      row('2026-04-13', { mindfulness_minutes: 5 }),
    ];
    const block = computeChapterHealthBlock(rows);
    expect(block).not.toBeNull();
    expect(block!.mindfulness_minutes).toBe(5);
  });
});

describe('computeChapterHealthBlock — block shape', () => {
  it('counts active days using OR of step and minute thresholds', () => {
    const rows: HealthDailyRow[] = [
      row('2026-04-13', { steps_count: HEALTH_ACTIVE_DAY_MIN_STEPS - 1, active_minutes: HEALTH_ACTIVE_DAY_MIN_MINUTES }),
      row('2026-04-14', { steps_count: HEALTH_ACTIVE_DAY_MIN_STEPS, active_minutes: 0 }),
      row('2026-04-15', { steps_count: 0, active_minutes: 0 }),
      row('2026-04-16', { steps_count: HEALTH_ACTIVE_DAY_MIN_STEPS + 1, active_minutes: HEALTH_ACTIVE_DAY_MIN_MINUTES + 1 }),
    ];
    const block = computeChapterHealthBlock(rows);
    expect(block).not.toBeNull();
    expect(block!.active_days_count).toBe(3);
    expect(block!.days_with_data).toBe(4);
  });

  it('averages sleep only across nights with data', () => {
    const rows: HealthDailyRow[] = [
      row('2026-04-13', { sleep_hours: 7, workouts_count: 1 }),
      row('2026-04-14'),
      row('2026-04-15', { sleep_hours: 8, workouts_count: 0 }),
    ];
    const block = computeChapterHealthBlock(rows);
    expect(block).not.toBeNull();
    expect(block!.avg_sleep_hours).toBe(7.5);
    expect(block!.sleep_nights_count).toBe(2);
  });

  it('computes avg_steps_per_active_day only over active days', () => {
    const rows: HealthDailyRow[] = [
      row('2026-04-13', { steps_count: 10_000 }),
      row('2026-04-14', { steps_count: 15_000 }),
      row('2026-04-15', { steps_count: 50 }), // too few to count active
      row('2026-04-16', { steps_count: 5_000 }),
    ];
    const block = computeChapterHealthBlock(rows);
    expect(block).not.toBeNull();
    expect(block!.active_days_count).toBe(3);
    expect(block!.total_steps).toBe(30_050);
    expect(block!.avg_steps_per_active_day).toBe(Math.round(30_050 / 3));
  });

  it('treats null / negative / NaN inputs as 0', () => {
    const rows: HealthDailyRow[] = [
      row('2026-04-13', {
        steps_count: null,
        active_minutes: -5,
        workouts_count: Number.NaN,
        sleep_hours: Number.NaN,
        mindfulness_minutes: 3, // trips the floor
      }),
    ];
    const block = computeChapterHealthBlock(rows);
    expect(block).not.toBeNull();
    expect(block!.total_steps).toBe(0);
    expect(block!.total_active_minutes).toBe(0);
    expect(block!.workouts_count).toBe(0);
    expect(block!.avg_sleep_hours).toBeNull();
    expect(block!.sleep_nights_count).toBe(0);
    expect(block!.mindfulness_minutes).toBe(3);
  });
});

describe('containsHealthKeyword', () => {
  it('matches single-word keywords on word boundaries', () => {
    expect(containsHealthKeyword('You walked through a thoughtful week.')).toBe(true);
    expect(containsHealthKeyword('You logged three workouts.')).toBe(true);
    expect(containsHealthKeyword('The steps you took landed.')).toBe(true);
  });

  it('matches multi-word keywords', () => {
    expect(containsHealthKeyword('35 active minutes across the week.')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(containsHealthKeyword('Sleep came back.')).toBe(true);
  });

  it('does not match unrelated substrings', () => {
    // "overstep" doesn't pass the \bsteps\b test.
    expect(containsHealthKeyword('You may overstep the bounds of Phase 4.')).toBe(false);
    // "workouts" inside a single compound word still matches by word
    // boundary on plain text, but e.g. a url shouldn't trigger.
    expect(containsHealthKeyword('A week of small wins.')).toBe(false);
    expect(containsHealthKeyword('Work it out, piece by piece.')).toBe(false);
  });

  it('handles empty or non-string input', () => {
    expect(containsHealthKeyword('')).toBe(false);
    // @ts-expect-error testing defensive runtime guard
    expect(containsHealthKeyword(null)).toBe(false);
    // @ts-expect-error testing defensive runtime guard
    expect(containsHealthKeyword(undefined)).toBe(false);
  });
});
