const MAX_TIME_ZONE_LENGTH = 100;

export function normalizeIanaTimeZone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate || candidate.length > MAX_TIME_ZONE_LENGTH) return null;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date(0));
    return candidate;
  } catch {
    return null;
  }
}

export function calendarDateInTimeZone(instant: Date, timeZone: string): string {
  const normalized = normalizeIanaTimeZone(timeZone) ?? 'UTC';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: normalized,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const part = (type: 'year' | 'month' | 'day') => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
