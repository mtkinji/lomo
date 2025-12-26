/**
 * Time-of-day helpers for local notification scheduling.
 *
 * All returned times are local device times in 'HH:mm' 24h format.
 */

export function roundDownToIntervalTimeHHmm(params: {
  at: Date;
  intervalMinutes: number;
}): string {
  const { at, intervalMinutes } = params;
  const interval = Number.isFinite(intervalMinutes) ? Math.max(1, Math.floor(intervalMinutes)) : 30;

  const hours = at.getHours();
  const minutes = at.getMinutes();
  const total = hours * 60 + minutes;
  const rounded = Math.floor(total / interval) * interval;

  const hh = Math.floor(rounded / 60) % 24;
  const mm = rounded % 60;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}


