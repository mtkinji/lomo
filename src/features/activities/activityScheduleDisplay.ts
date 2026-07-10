export type ScheduleSlotTimeRange = {
  startDate: string;
  endDate: string;
};

type ResolveScheduleDurationMinutesInput = {
  draft: string;
  fallbackEstimateMinutes: number | null | undefined;
};

type FormatScheduleSlotTimeRangeOptions = {
  locale?: string;
  separator?: string;
};

const SCHEDULE_DURATION_STEP_MINUTES = 15;
const MIN_SCHEDULE_DURATION_MINUTES = 15;
const MAX_SCHEDULE_DURATION_MINUTES = 240;

export function getScheduleDurationOptions(): number[] {
  return Array.from(
    { length: MAX_SCHEDULE_DURATION_MINUTES / SCHEDULE_DURATION_STEP_MINUTES },
    (_, idx) => (idx + 1) * SCHEDULE_DURATION_STEP_MINUTES,
  );
}

export function resolveScheduleDurationMinutes({
  draft,
  fallbackEstimateMinutes,
}: ResolveScheduleDurationMinutesInput): number {
  const fallback = Math.round(fallbackEstimateMinutes ?? 30);
  const raw = Math.round(Number(draft));
  let minutes = Number.isFinite(raw) && raw > 0 ? raw : fallback;
  minutes = Math.min(MAX_SCHEDULE_DURATION_MINUTES, Math.max(MIN_SCHEDULE_DURATION_MINUTES, minutes));
  const snapped = Math.round(minutes / SCHEDULE_DURATION_STEP_MINUTES) * SCHEDULE_DURATION_STEP_MINUTES;
  return Math.min(MAX_SCHEDULE_DURATION_MINUTES, Math.max(MIN_SCHEDULE_DURATION_MINUTES, snapped));
}

export function formatScheduleSlotTimeRange(
  slot: ScheduleSlotTimeRange,
  { locale, separator = '-' }: FormatScheduleSlotTimeRangeOptions = {},
): string | null {
  const start = new Date(slot.startDate);
  const end = new Date(slot.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const formatTime = (date: Date) =>
    date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  return `${formatTime(start)}${separator}${formatTime(end)}`;
}
