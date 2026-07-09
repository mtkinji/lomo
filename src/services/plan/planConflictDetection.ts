import type { BusyInterval } from '../scheduling/schedulingEngine';
import type { CalendarEvent, CalendarEventAvailability } from './calendarApi';
import type { KwiltBlock } from './planCalendarReconcile';

function eventBlocksTime(e: CalendarEvent): boolean {
  const availability: CalendarEventAvailability = e.availability ?? 'busy';
  return availability !== 'free';
}

function parseBlockingIntervalFromEvent(e: CalendarEvent, options?: { includeAllDay?: boolean }): BusyInterval | null {
  if (!eventBlocksTime(e)) return null;
  if (e.isAllDay && !options?.includeAllDay) return null;
  const start = new Date(e.start);
  const end = new Date(e.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

function overlaps(a: BusyInterval, b: BusyInterval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function getBlockingPlanBusyIntervals(params: {
  externalEvents: CalendarEvent[];
  fallbackBusyIntervals: BusyInterval[];
  includeAllDay?: boolean;
}): BusyInterval[] {
  const events = Array.isArray(params.externalEvents) ? params.externalEvents : [];
  if (events.length > 0) {
    return events
      .map((event) => parseBlockingIntervalFromEvent(event, { includeAllDay: params.includeAllDay }))
      .filter((interval): interval is BusyInterval => Boolean(interval));
  }

  return Array.isArray(params.fallbackBusyIntervals) ? params.fallbackBusyIntervals : [];
}

export function getPlanConflictActivityIds(params: {
  kwiltBlocks: KwiltBlock[];
  externalEvents: CalendarEvent[];
  fallbackBusyIntervals: BusyInterval[];
}): string[] {
  const blocks = Array.isArray(params.kwiltBlocks) ? params.kwiltBlocks : [];
  if (blocks.length === 0) return [];

  const conflictIntervals = getBlockingPlanBusyIntervals({
    externalEvents: params.externalEvents,
    fallbackBusyIntervals: params.fallbackBusyIntervals,
    includeAllDay: false,
  });
  if (conflictIntervals.length === 0) return [];

  return blocks
    .filter((block) => conflictIntervals.some((busy) => overlaps(busy, block)))
    .map((block) => block.activity.id);
}
