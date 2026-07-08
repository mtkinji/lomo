import type { Activity } from '../../domain/types';
import { getKwiltCalendarBlocksForDay } from './kwiltCalendarBlocks';

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'activity-1',
    goalId: null,
    title: 'Write outline',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-01T12:00:00.000Z',
    scheduledDate: null,
    scheduledAt: null,
    estimateMinutes: 30,
    ...overrides,
  } as Activity;
}

describe('kwiltCalendarBlocks', () => {
  it('returns calendar blocks for activities scheduled on the target local day', () => {
    const targetDate = new Date(2026, 6, 8, 12, 0);
    const firstStart = new Date(2026, 6, 8, 9, 0);
    const secondStart = new Date(2026, 6, 8, 14, 30);
    const previousDay = new Date(2026, 6, 7, 18, 0);
    const first = activity({ id: 'first', scheduledAt: firstStart.toISOString(), estimateMinutes: 45 });
    const second = activity({ id: 'second', scheduledAt: secondStart.toISOString(), estimateMinutes: 20 });

    const result = getKwiltCalendarBlocksForDay(
      [
        first,
        activity({ id: 'previous', scheduledAt: previousDay.toISOString(), estimateMinutes: 60 }),
        activity({ id: 'missing-start', scheduledAt: null }),
        activity({ id: 'invalid-start', scheduledAt: 'not-a-date' }),
        second,
      ],
      targetDate,
    );

    expect(result.map((block) => block.activity.id)).toEqual(['first', 'second']);
    expect(result[0]).toEqual({
      activity: first,
      start: firstStart,
      end: new Date(firstStart.getTime() + 45 * 60_000),
    });
    expect(result[1]).toEqual({
      activity: second,
      start: secondStart,
      end: new Date(secondStart.getTime() + 20 * 60_000),
    });
  });

  it('uses the default duration and minimum duration rule from scheduling screens', () => {
    const targetDate = new Date(2026, 6, 8, 12, 0);
    const defaultStart = new Date(2026, 6, 8, 9, 0);
    const minimumStart = new Date(2026, 6, 8, 10, 0);

    const result = getKwiltCalendarBlocksForDay(
      [
        activity({ id: 'default-duration', scheduledAt: defaultStart.toISOString(), estimateMinutes: null }),
        activity({ id: 'minimum-duration', scheduledAt: minimumStart.toISOString(), estimateMinutes: 5 }),
      ],
      targetDate,
    );

    expect(result.map((block) => ({
      id: block.activity.id,
      minutes: (block.end.getTime() - block.start.getTime()) / 60_000,
    }))).toEqual([
      { id: 'default-duration', minutes: 30 },
      { id: 'minimum-duration', minutes: 10 },
    ]);
  });
});
