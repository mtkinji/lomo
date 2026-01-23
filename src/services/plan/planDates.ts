export type PlanWeekdayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export function toLocalDateKey(date: Date): string {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dateKeyToLocalDate(dateKey: string): Date {
  const [yRaw, mRaw, dRaw] = dateKey.split('-');
  const y = Number.parseInt(yRaw ?? '', 10);
  const m = Number.parseInt(mRaw ?? '', 10);
  const d = Number.parseInt(dRaw ?? '', 10);
  const date = new Date();
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return date;
  }
  date.setFullYear(y, Math.max(0, m - 1), d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getWeekdayKey(date: Date): PlanWeekdayKey {
  const idx = date.getDay();
  switch (idx) {
    case 0:
      return 'sun';
    case 1:
      return 'mon';
    case 2:
      return 'tue';
    case 3:
      return 'wed';
    case 4:
      return 'thu';
    case 5:
      return 'fri';
    case 6:
      return 'sat';
    default:
      return 'mon';
  }
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatTimeRange(start: Date, end: Date): string {
  return `${formatTimeLabel(start)} - ${formatTimeLabel(end)}`;
}

export function parseTimeToMinutes(raw: string): number | null {
  if (typeof raw !== 'string') return null;
  const [hRaw, mRaw] = raw.trim().split(':');
  const h = Number.parseInt(hRaw ?? '', 10);
  const m = Number.parseInt(mRaw ?? '', 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function setTimeOnDate(date: Date, time: string): Date | null {
  const minutes = parseTimeToMinutes(time);
  if (minutes === null) return null;
  const d = new Date(date);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function clampToNextQuarterHour(date: Date): Date {
  const d = new Date(date);
  d.setSeconds(0, 0);
  const remainder = d.getMinutes() % 15;
  if (remainder !== 0) {
    d.setMinutes(d.getMinutes() + (15 - remainder));
  }
  return d;
}


