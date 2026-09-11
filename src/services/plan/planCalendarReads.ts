import { getOrInitCalendarPreferences, listCalendarsWithErrors } from './calendarApi';

function sharePendingRead<T>(read: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () => {
    if (!pending) {
      pending = read().finally(() => { pending = null; });
    }
    return pending;
  };
}

/** Readers belong to one mounted Plan page, never a process-wide calendar cache. */
export function createPlanCalendarReads() {
  return {
    preferences: sharePendingRead(getOrInitCalendarPreferences),
    calendars: sharePendingRead(listCalendarsWithErrors),
  };
}
