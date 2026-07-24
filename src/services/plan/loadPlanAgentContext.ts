import type { BusyInterval } from '../scheduling/schedulingEngine';
import {
  getOrInitCalendarPreferences,
  listBusyIntervals,
  listCalendarEvents,
  type CalendarRef,
} from './calendarApi';
import { getBlockingPlanBusyIntervals } from './planConflictDetection';

type Dependencies = {
  getPreferences: typeof getOrInitCalendarPreferences;
  listBusy: typeof listBusyIntervals;
  listEvents: typeof listCalendarEvents;
};

const DEFAULT_DEPENDENCIES: Dependencies = {
  getPreferences: getOrInitCalendarPreferences,
  listBusy: listBusyIntervals,
  listEvents: listCalendarEvents,
};

export type PlanAgentCalendarContext = {
  writeCalendarRef: CalendarRef | null;
  busyIntervals: BusyInterval[];
  limitation: 'no_write_calendar' | 'calendar_unavailable' | 'partial_calendar_context' | null;
};

export async function loadPlanAgentContext({
  targetDate,
  kwiltBusyIntervals,
  dependencies = DEFAULT_DEPENDENCIES,
}: {
  targetDate: Date;
  kwiltBusyIntervals: BusyInterval[];
  dependencies?: Dependencies;
}): Promise<PlanAgentCalendarContext> {
  try {
    const preferences = await dependencies.getPreferences();
    const readCalendarRefs = preferences.readCalendarRefs ?? [];
    if (readCalendarRefs.length === 0) {
      return {
        writeCalendarRef: preferences.writeCalendarRef ?? null,
        busyIntervals: [...kwiltBusyIntervals],
        limitation: preferences.writeCalendarRef ? 'partial_calendar_context' : 'no_write_calendar',
      };
    }

    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const [{ intervals = [] }, { events = [], errors = [] }] = await Promise.all([
      dependencies.listBusy({
        start: start.toISOString(),
        end: end.toISOString(),
        readCalendarRefs,
      }),
      dependencies.listEvents({
        start: start.toISOString(),
        end: end.toISOString(),
        readCalendarRefs,
      }),
    ]);
    const fallbackBusyIntervals = intervals.map((interval) => ({
      start: new Date(interval.start),
      end: new Date(interval.end),
    }));
    const external = getBlockingPlanBusyIntervals({
      externalEvents: events,
      fallbackBusyIntervals,
      includeAllDay: true,
    });
    return {
      writeCalendarRef: preferences.writeCalendarRef ?? null,
      busyIntervals: [...external, ...kwiltBusyIntervals],
      limitation: errors.length > 0
        ? 'partial_calendar_context'
        : preferences.writeCalendarRef
          ? null
          : 'no_write_calendar',
    };
  } catch {
    return {
      writeCalendarRef: null,
      busyIntervals: [...kwiltBusyIntervals],
      limitation: 'calendar_unavailable',
    };
  }
}
