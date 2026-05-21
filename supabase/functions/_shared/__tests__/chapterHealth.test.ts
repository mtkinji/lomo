// Jest tests for Phase 4-backend of docs/chapters-plan.md — the
// Apple Health summary block and the health-keyword validator helper.
//
// The module under test is framework-free (no Deno imports), so we
// import directly. See `_shared/chapterHealth.ts` for the deterministic
// inclusion contract and active-day definition this file pins down.

import {
  computeChapterHealthBlock,
  containsHealthKeyword,
  HEALTH_ACTIVE_DAY_MIN_MINUTES,
  HEALTH_ACTIVE_DAY_MIN_STEPS,
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

describe('computeChapterHealthBlock — deterministic inclusion', () => {
  it('returns null for empty / missing input', () => {
    expect(computeChapterHealthBlock(null)).toBeNull();
    expect(computeChapterHealthBlock(undefined)).toBeNull();
    expect(computeChapterHealthBlock([])).toBeNull();
  });

  it('returns a block even when the week is low signal', () => {
    const rows: HealthDailyRow[] = [
      row('2026-04-13', { steps_count: 1200 }),
      row('2026-04-15', { mindfulness_minutes: 0 }),
    ];
    const block = computeChapterHealthBlock(rows);
    expect(block).not.toBeNull();
    expect(block!.active_days_count).toBe(1);
    expect(block!.days_with_data).toBe(2);
  });

  it('returns a block for dated rows even when every metric is zero', () => {
    const block = computeChapterHealthBlock([row('2026-04-13')]);
    expect(block).not.toBeNull();
    expect(block!.days_with_data).toBe(1);
    expect(block!.total_steps).toBe(0);
    expect(block!.avg_sleep_hours).toBeNull();
  });

  it('counts active days without gating Chapter inclusion', () => {
    const rows: HealthDailyRow[] = [
      row('2026-04-13', { steps_count: HEALTH_ACTIVE_DAY_MIN_STEPS }),
      row('2026-04-14', { steps_count: HEALTH_ACTIVE_DAY_MIN_STEPS + 500 }),
      row('2026-04-15', { active_minutes: HEALTH_ACTIVE_DAY_MIN_MINUTES }),
    ];
    const block = computeChapterHealthBlock(rows);
    expect(block).not.toBeNull();
    expect(block!.active_days_count).toBe(3);
  });

  it('includes workout-only data', () => {
    const rows: HealthDailyRow[] = [
      row('2026-04-13', { workouts_count: 1, steps_count: 200 }),
    ];
    const block = computeChapterHealthBlock(rows);
    expect(block).not.toBeNull();
    expect(block!.workouts_count).toBe(1);
    expect(block!.active_days_count).toBe(0);
  });

  it('includes sleep-only data', () => {
    const rows: HealthDailyRow[] = [
      row('2026-04-13', { sleep_hours: 5.2 }),
      row('2026-04-14', { sleep_hours: 5.5 }),
    ];
    const block = computeChapterHealthBlock(rows);
    expect(block).not.toBeNull();
    expect(block!.avg_sleep_hours).toBe(5.4);
    expect(block!.sleep_nights_count).toBe(2);
  });

  it('includes mindfulness-only data', () => {
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
