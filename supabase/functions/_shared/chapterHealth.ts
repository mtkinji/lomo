/**
 * Phase 4-backend of docs/chapters-plan.md — tasteful HealthKit signal.
 *
 * This module is framework-free (no Deno imports) so the threshold gate
 * can be unit-tested from Jest alongside the other shared chapter
 * primitives. The edge function pre-queries `kwilt_health_daily` rows
 * for the Chapter period and hands them here; this module is
 * responsible for:
 *
 *   1. The inclusion floor (Open Question #7 in chapters-plan.md).
 *      A week qualifies if ANY of:
 *        * active_days_count >= 3
 *        * workouts_count    >= 1
 *        * avg_sleep_hours   >= 6
 *        * mindfulness_minutes >= 1
 *      Low-signal weeks produce `null` — the generator attaches nothing,
 *      the prompt never sees a health slot, and the Chapter reads
 *      identically to pre-Phase-4 Chapters. No shame framing.
 *
 *   2. The `metrics.health` shape the LLM cites from.
 *
 *   3. A tiny health-keyword detector used by the validator to reject
 *      health prose when `metrics.health` is absent (the one-way
 *      inverse of the gate — "if we didn't attach it, you can't talk
 *      about it").
 *
 * Active-day definition (mirrored in the `kwilt_health_daily`
 * migration comments): a day is active if `steps_count >= 1000` OR
 * `active_minutes >= 5`. This threshold is intentionally permissive —
 * the point of the signal is to recognize movement, not to hold the
 * user to an exercise physiologist's bar.
 */

export type HealthDailyRow = {
  local_date: string;
  timezone?: string | null;
  steps_count?: number | null;
  active_minutes?: number | null;
  workouts_count?: number | null;
  sleep_hours?: number | null;
  mindfulness_minutes?: number | null;
};

export type ChapterHealthBlock = {
  /** Days with >=HEALTH_ACTIVE_DAY_MIN_STEPS steps OR >=HEALTH_ACTIVE_DAY_MIN_MINUTES active minutes. */
  active_days_count: number;
  /** Sum of steps across days with data. */
  total_steps: number;
  /** Average steps per active day (null when active_days_count === 0). */
  avg_steps_per_active_day: number | null;
  /** Sum of workouts across days with data. */
  workouts_count: number;
  /** Sum of active minutes across days with data. */
  total_active_minutes: number;
  /** Average sleep hours across nights with sleep_hours populated (null when none). */
  avg_sleep_hours: number | null;
  /** Count of nights with sleep_hours populated — denominator for avg_sleep_hours. */
  sleep_nights_count: number;
  /** Sum of mindfulness minutes across days with data. */
  mindfulness_minutes: number;
  /** Distinct `local_date` count across rows (any metric). Denominator for tasteful prose. */
  days_with_data: number;
};

export const HEALTH_ACTIVE_DAY_MIN_STEPS = 1000;
export const HEALTH_ACTIVE_DAY_MIN_MINUTES = 5;

export const HEALTH_INCLUSION_THRESHOLDS = {
  min_active_days: 3,
  min_workouts: 1,
  min_avg_sleep_hours: 6,
  min_mindfulness_minutes: 1,
} as const;

/**
 * Apply the inclusion floor. Returns `null` when the week is
 * low-signal (silently omitted from the Chapter), otherwise returns
 * the populated block the prompt can cite from.
 */
export function computeChapterHealthBlock(
  rows: HealthDailyRow[] | null | undefined,
): ChapterHealthBlock | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  let totalSteps = 0;
  let totalActiveMinutes = 0;
  let workoutsCount = 0;
  let mindfulnessMinutes = 0;
  let activeDays = 0;
  let sleepSum = 0;
  let sleepNights = 0;
  const uniqueDates = new Set<string>();

  for (const row of rows) {
    if (!row || typeof row.local_date !== 'string') continue;
    uniqueDates.add(row.local_date);

    const steps = toNonNegativeInt(row.steps_count);
    const activeMinutes = toNonNegativeInt(row.active_minutes);
    const workouts = toNonNegativeInt(row.workouts_count);
    const mindful = toNonNegativeInt(row.mindfulness_minutes);

    totalSteps += steps;
    totalActiveMinutes += activeMinutes;
    workoutsCount += workouts;
    mindfulnessMinutes += mindful;

    const isActive =
      steps >= HEALTH_ACTIVE_DAY_MIN_STEPS ||
      activeMinutes >= HEALTH_ACTIVE_DAY_MIN_MINUTES;
    if (isActive) activeDays += 1;

    if (typeof row.sleep_hours === 'number' && Number.isFinite(row.sleep_hours) && row.sleep_hours > 0) {
      sleepSum += row.sleep_hours;
      sleepNights += 1;
    }
  }

  const avgSleep = sleepNights > 0 ? round1(sleepSum / sleepNights) : null;

  // Inclusion floor — ANY passes → include. Low-signal weeks silently
  // omit. We intentionally evaluate the gate BEFORE packaging the
  // block so a caller that just wants "should we attach health?" can
  // pull the same predicates without reaching into the block's
  // internals; today the block is either returned or not, which is
  // the simplest contract.
  const passes =
    activeDays >= HEALTH_INCLUSION_THRESHOLDS.min_active_days ||
    workoutsCount >= HEALTH_INCLUSION_THRESHOLDS.min_workouts ||
    (avgSleep !== null && avgSleep >= HEALTH_INCLUSION_THRESHOLDS.min_avg_sleep_hours) ||
    mindfulnessMinutes >= HEALTH_INCLUSION_THRESHOLDS.min_mindfulness_minutes;

  if (!passes) return null;

  return {
    active_days_count: activeDays,
    total_steps: totalSteps,
    avg_steps_per_active_day:
      activeDays > 0 ? Math.round(totalSteps / activeDays) : null,
    workouts_count: workoutsCount,
    total_active_minutes: totalActiveMinutes,
    avg_sleep_hours: avgSleep,
    sleep_nights_count: sleepNights,
    mindfulness_minutes: mindfulnessMinutes,
    days_with_data: uniqueDates.size,
  };
}

function toNonNegativeInt(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Keywords that signal the narrative is talking about HealthKit-style
 * data. Kept intentionally conservative — false positives trigger a
 * stricter retry, but the retry prompt is strictly more informative
 * than the first attempt, so the worst case is one extra LLM call on
 * an edge case. False negatives would let the LLM invent health prose
 * without evidence, which is the outcome we're trying to prevent.
 *
 * Matches are word-boundary to avoid hitting e.g. "asleep at the wheel"
 * as a figurative use — checked as a bare word elsewhere, but the
 * `\\b` boundaries keep us honest about substring false positives
 * inside unrelated words.
 */
const HEALTH_KEYWORDS: readonly string[] = [
  'sleep',
  'slept',
  'steps',
  'walked',
  'walking',
  'workout',
  'workouts',
  'mindful',
  'mindfulness',
  'meditation',
  'meditated',
  'active minutes',
];

export function containsHealthKeyword(text: string): boolean {
  if (typeof text !== 'string' || text.length === 0) return false;
  const lc = text.toLowerCase();
  for (const kw of HEALTH_KEYWORDS) {
    if (kw.includes(' ')) {
      if (lc.includes(kw)) return true;
    } else {
      const re = new RegExp(`\\b${kw}\\b`, 'i');
      if (re.test(lc)) return true;
    }
  }
  return false;
}
