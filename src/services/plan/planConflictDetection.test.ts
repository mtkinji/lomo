import { getBlockingPlanBusyIntervals, getPlanConflictActivityIds } from './planConflictDetection';
import type { Activity } from '../../domain/types';
import type { CalendarEvent } from './calendarApi';
import type { KwiltBlock } from './planCalendarReconcile';

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    provider: 'google',
    accountId: 'acct',
    calendarId: 'cal',
    eventId: 'evt',
    title: 'Busy',
    start: '2026-07-09T00:00:00.000Z',
    end: '2026-07-10T00:00:00.000Z',
    ...overrides,
  };
}

function activity(overrides: { id?: string; title?: string } = {}): Activity {
  return {
    id: overrides.id ?? 'activity-1',
    goalId: null,
    title: overrides.title ?? 'Test',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: '2026-07-09T00:00:00.000Z',
    updatedAt: '2026-07-09T00:00:00.000Z',
  };
}

function block(overrides: { id?: string; title?: string; start?: string; end?: string } = {}): KwiltBlock {
  return {
    activity: activity({ id: overrides.id, title: overrides.title }),
    start: new Date(overrides.start ?? '2026-07-09T15:00:00.000Z'),
    end: new Date(overrides.end ?? '2026-07-09T15:30:00.000Z'),
  };
}

describe('getPlanConflictActivityIds', () => {
  it('does not mark Kwilt blocks as conflicts when the only overlapping calendar events are all-day', () => {
    expect(
      getPlanConflictActivityIds({
        kwiltBlocks: [block()],
        externalEvents: [
          event({
            eventId: 'birthday',
            title: 'Happy birthday!',
            isAllDay: true,
          }),
        ],
        fallbackBusyIntervals: [],
      }),
    ).toEqual([]);
  });

  it('marks Kwilt blocks as conflicts when a timed external event overlaps', () => {
    expect(
      getPlanConflictActivityIds({
        kwiltBlocks: [block()],
        externalEvents: [
          event({
            eventId: 'meeting',
            title: 'Meeting',
            start: '2026-07-09T15:15:00.000Z',
            end: '2026-07-09T15:45:00.000Z',
            isAllDay: false,
          }),
        ],
        fallbackBusyIntervals: [],
      }),
    ).toEqual(['activity-1']);
  });

  it('does not mark Kwilt blocks as conflicts when an overlapping timed event is free', () => {
    expect(
      getPlanConflictActivityIds({
        kwiltBlocks: [block()],
        externalEvents: [
          event({
            eventId: 'free-hold',
            title: 'Optional hold',
            start: '2026-07-09T15:15:00.000Z',
            end: '2026-07-09T15:45:00.000Z',
            availability: 'free',
          }),
        ],
        fallbackBusyIntervals: [],
      }),
    ).toEqual([]);
  });

  it('keeps blocking all-day events out of hard conflicts but available for scheduling context', () => {
    const intervals = getBlockingPlanBusyIntervals({
      externalEvents: [
        event({
          eventId: 'ooo',
          title: 'Out of office',
          isAllDay: true,
          availability: 'out_of_office',
        }),
      ],
      fallbackBusyIntervals: [],
      includeAllDay: true,
    });

    expect(intervals).toHaveLength(1);
    expect(intervals[0]?.start.toISOString()).toBe('2026-07-09T00:00:00.000Z');
    expect(
      getPlanConflictActivityIds({
        kwiltBlocks: [block()],
        externalEvents: [
          event({
            eventId: 'ooo',
            title: 'Out of office',
            isAllDay: true,
            availability: 'out_of_office',
          }),
        ],
        fallbackBusyIntervals: [],
      }),
    ).toEqual([]);
  });
});
