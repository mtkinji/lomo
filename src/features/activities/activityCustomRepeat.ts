import type { Activity, ActivityRepeatCustom } from '../../domain/types';

export type ActivityCustomRepeatDraft = {
  cadence: ActivityRepeatCustom['cadence'];
  interval: number;
  weekdays: number[];
};

type BuildActivityCustomRepeatPayloadInput = {
  cadence: ActivityRepeatCustom['cadence'];
  interval: number;
  weekdays: number[];
  fallbackWeekday: number;
};

type ResolveActivityCustomRepeatDraftInput = {
  repeatRule: Activity['repeatRule'];
  repeatCustom: Activity['repeatCustom'];
  fallbackWeekday: number;
};

function normalizeRepeatInterval(interval: number | undefined): number {
  return Math.max(1, Math.round(interval ?? 1));
}

function normalizeFallbackWeekday(fallbackWeekday: number): number {
  const rounded = Math.round(fallbackWeekday);
  return Number.isFinite(fallbackWeekday) && rounded >= 0 && rounded <= 6 ? rounded : 0;
}

function normalizeRepeatWeekdays(weekdays: readonly number[] | undefined, fallbackWeekday: number): number[] {
  const normalized = Array.from(new Set(weekdays ?? []))
    .filter((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6)
    .sort((a, b) => a - b);

  return normalized.length > 0 ? normalized : [normalizeFallbackWeekday(fallbackWeekday)];
}

export function buildActivityCustomRepeatPayload({
  cadence,
  interval,
  weekdays,
  fallbackWeekday,
}: BuildActivityCustomRepeatPayloadInput): ActivityRepeatCustom {
  const normalizedInterval = normalizeRepeatInterval(interval);

  if (cadence === 'weeks') {
    return {
      cadence,
      interval: normalizedInterval,
      weekdays: normalizeRepeatWeekdays(weekdays, fallbackWeekday),
    };
  }

  return {
    cadence,
    interval: normalizedInterval,
  };
}

export function resolveActivityCustomRepeatDraft({
  repeatRule,
  repeatCustom,
  fallbackWeekday,
}: ResolveActivityCustomRepeatDraftInput): ActivityCustomRepeatDraft {
  if (repeatRule === 'custom' && repeatCustom) {
    return {
      cadence: repeatCustom.cadence,
      interval: normalizeRepeatInterval(repeatCustom.interval),
      weekdays:
        repeatCustom.cadence === 'weeks'
          ? normalizeRepeatWeekdays(repeatCustom.weekdays, fallbackWeekday)
          : [normalizeFallbackWeekday(fallbackWeekday)],
    };
  }

  return {
    cadence: 'weeks',
    interval: 1,
    weekdays: [normalizeFallbackWeekday(fallbackWeekday)],
  };
}
