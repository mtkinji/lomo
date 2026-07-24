import { loadPlanAgentContext } from './loadPlanAgentContext';

const targetDate = new Date(2026, 6, 24, 12);
const writeCalendarRef = { provider: 'google' as const, accountId: 'account-1', calendarId: 'primary' };

describe('loadPlanAgentContext', () => {
  test('loads provider preferences and target-day busy intervals', async () => {
    const getPreferences = jest.fn(async () => ({
      readCalendarRefs: [writeCalendarRef], writeCalendarRef,
    }));
    const listBusy = jest.fn(async () => ({
      intervals: [{ start: '2026-07-24T15:00:00.000Z', end: '2026-07-24T16:00:00.000Z' }],
    }));
    const listEvents = jest.fn(async () => ({ events: [], errors: [] }));

    const result = await loadPlanAgentContext({
      targetDate,
      kwiltBusyIntervals: [{ start: new Date('2026-07-24T17:00:00.000Z'), end: new Date('2026-07-24T17:30:00.000Z') }],
      dependencies: { getPreferences, listBusy, listEvents },
    });

    expect(result.writeCalendarRef).toEqual(writeCalendarRef);
    expect(result.busyIntervals).toEqual([
      { start: new Date('2026-07-24T15:00:00.000Z'), end: new Date('2026-07-24T16:00:00.000Z') },
      { start: new Date('2026-07-24T17:00:00.000Z'), end: new Date('2026-07-24T17:30:00.000Z') },
    ]);
    expect(result.limitation).toBeNull();
    expect(listBusy).toHaveBeenCalledWith(expect.objectContaining({
      readCalendarRefs: [writeCalendarRef],
    }));
  });

  test('returns an honest limitation when no write calendar is configured', async () => {
    await expect(loadPlanAgentContext({
      targetDate,
      kwiltBusyIntervals: [],
      dependencies: {
        getPreferences: async () => ({ readCalendarRefs: [], writeCalendarRef: null }),
        listBusy: jest.fn(),
        listEvents: jest.fn(),
      },
    })).resolves.toMatchObject({
      writeCalendarRef: null,
      limitation: 'no_write_calendar',
    });
  });

  test('contains provider failures instead of failing the Chat run', async () => {
    await expect(loadPlanAgentContext({
      targetDate,
      kwiltBusyIntervals: [],
      dependencies: {
        getPreferences: async () => { throw new Error('private provider detail'); },
        listBusy: jest.fn(),
        listEvents: jest.fn(),
      },
    })).resolves.toEqual({
      writeCalendarRef: null,
      busyIntervals: [],
      limitation: 'calendar_unavailable',
    });
  });
});
