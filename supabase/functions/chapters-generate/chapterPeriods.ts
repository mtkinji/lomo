import { DateTime } from 'npm:luxon@3.5.0';

export type ChapterCadence = 'weekly' | 'monthly' | 'yearly' | 'manual';

export type ChapterPeriod = {
  start: DateTime;
  end: DateTime;
  key: string;
};

type WeeklyDeliveryTemplate = {
  cadence: ChapterCadence;
  timezone: string;
  filter_json: unknown;
};

export function weeklyChapterDeliveryWeekday(filterJson: unknown): number {
  const source =
    filterJson && typeof filterJson === 'object' && !Array.isArray(filterJson)
      ? (filterJson as Record<string, unknown>)
      : {};
  const weeklyChapter =
    source.weeklyChapter && typeof source.weeklyChapter === 'object'
      ? (source.weeklyChapter as Record<string, unknown>)
      : {};
  const raw = weeklyChapter.deliveryWeekday;
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  return Number.isInteger(value) && value >= 1 && value <= 7 ? value : 1;
}

export function validZoneOrUtc(zoneRaw: unknown): string {
  const zone = typeof zoneRaw === 'string' ? zoneRaw.trim() : '';
  if (!zone) return 'UTC';
  const dateTime = DateTime.now().setZone(zone);
  return dateTime.isValid ? zone : 'UTC';
}

export function isWeeklyChapterDeliveryDay(template: WeeklyDeliveryTemplate, now = DateTime.now()): boolean {
  if (template.cadence !== 'weekly') return true;
  const timezone = validZoneOrUtc(template.timezone);
  return now.setZone(timezone).weekday === weeklyChapterDeliveryWeekday(template.filter_json);
}

export function lastCompletePeriod(params: {
  cadence: ChapterCadence;
  timezone: string;
  now?: DateTime;
}): ChapterPeriod | null {
  const timezone = validZoneOrUtc(params.timezone);
  const now = (params.now ?? DateTime.now()).setZone(timezone);

  if (params.cadence === 'manual') {
    return null;
  }

  if (params.cadence === 'weekly') {
    const currentWeekStart = DateTime.fromObject(
      {
        weekYear: now.weekYear,
        weekNumber: now.weekNumber,
        weekday: 1,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      { zone: timezone },
    );
    const start = currentWeekStart.minus({ weeks: 1 });
    const end = currentWeekStart;
    const key = `${start.weekYear}-W${String(start.weekNumber).padStart(2, '0')}`;
    return { start, end, key };
  }

  if (params.cadence === 'monthly') {
    const currentMonthStart = now.startOf('month');
    const start = currentMonthStart.minus({ months: 1 });
    const end = currentMonthStart;
    const key = `${start.year}-${String(start.month).padStart(2, '0')}`;
    return { start, end, key };
  }

  if (params.cadence === 'yearly') {
    const currentYearStart = now.startOf('year');
    const start = currentYearStart.minus({ years: 1 });
    const end = currentYearStart;
    const key = `${start.year}`;
    return { start, end, key };
  }

  return null;
}

export function nthCompletePeriod(params: {
  cadence: ChapterCadence;
  timezone: string;
  offset: number;
  now?: DateTime;
}): ChapterPeriod | null {
  const offset = Math.max(0, Math.floor(params.offset ?? 0));
  const timezone = validZoneOrUtc(params.timezone);
  const now = (params.now ?? DateTime.now()).setZone(timezone);

  if (params.cadence === 'manual') {
    return null;
  }

  if (params.cadence === 'weekly') {
    const currentWeekStart = DateTime.fromObject(
      {
        weekYear: now.weekYear,
        weekNumber: now.weekNumber,
        weekday: 1,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      { zone: timezone },
    );
    const end = currentWeekStart.minus({ weeks: offset });
    const start = currentWeekStart.minus({ weeks: offset + 1 });
    const key = `${start.weekYear}-W${String(start.weekNumber).padStart(2, '0')}`;
    return { start, end, key };
  }

  if (params.cadence === 'monthly') {
    const currentMonthStart = now.startOf('month');
    const end = currentMonthStart.minus({ months: offset });
    const start = currentMonthStart.minus({ months: offset + 1 });
    const key = `${start.year}-${String(start.month).padStart(2, '0')}`;
    return { start, end, key };
  }

  if (params.cadence === 'yearly') {
    const currentYearStart = now.startOf('year');
    const end = currentYearStart.minus({ years: offset });
    const start = currentYearStart.minus({ years: offset + 1 });
    const key = `${start.year}`;
    return { start, end, key };
  }

  return null;
}

export function parseManualRange(params: {
  timezone: string;
  startDate: string;
  endDate: string;
  now?: DateTime;
}): ChapterPeriod | null {
  const timezone = validZoneOrUtc(params.timezone);
  const startRaw = DateTime.fromISO(params.startDate, { zone: timezone });
  const endRaw = DateTime.fromISO(params.endDate, { zone: timezone });
  if (!startRaw.isValid || !endRaw.isValid) return null;
  const start = startRaw.startOf('day');
  const end = endRaw.startOf('day');
  if (end <= start) return null;

  // Allow selecting "through today" by using end=tomorrow (exclusive).
  const now = (params.now ?? DateTime.now()).setZone(timezone);
  const latestAllowedEnd = now.startOf('day').plus({ days: 1 });
  if (end > latestAllowedEnd.plus({ minutes: 5 })) return null;

  const days = Math.ceil(end.diff(start, 'days').days);
  if (!Number.isFinite(days) || days <= 0 || days > 365) return null;

  const key = `${start.toFormat('yyyyLLdd')}_${end.toFormat('yyyyLLdd')}`;
  return { start, end, key };
}
