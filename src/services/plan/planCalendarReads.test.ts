import { getOrInitCalendarPreferences, listCalendarsWithErrors } from './calendarApi';
import { createPlanCalendarReads } from './planCalendarReads';

jest.mock('./calendarApi', () => ({
  getOrInitCalendarPreferences: jest.fn(),
  listCalendarsWithErrors: jest.fn(),
}));

const preferences = { version: 1, readCalendarRefs: [], writeCalendarRef: null };
const calendars = { calendars: [], errors: [] };

beforeEach(() => {
  jest.mocked(getOrInitCalendarPreferences).mockReset().mockResolvedValue(preferences);
  jest.mocked(listCalendarsWithErrors).mockReset().mockResolvedValue(calendars);
});

it('shares overlapping mount/focus reads: two requests instead of four', async () => {
  const reads = createPlanCalendarReads();
  await Promise.all([reads.preferences(), reads.preferences(), reads.calendars(), reads.calendars()]);
  expect(getOrInitCalendarPreferences).toHaveBeenCalledTimes(1);
  expect(listCalendarsWithErrors).toHaveBeenCalledTimes(1);
});

it('fetches again after completion so returning from Settings sees fresh data', async () => {
  const reads = createPlanCalendarReads();
  await reads.preferences();
  await reads.preferences();
  await reads.calendars();
  await reads.calendars();
  expect(getOrInitCalendarPreferences).toHaveBeenCalledTimes(2);
  expect(listCalendarsWithErrors).toHaveBeenCalledTimes(2);
});

it('releases a failed read so retry can recover', async () => {
  jest.mocked(listCalendarsWithErrors).mockRejectedValueOnce(new Error('calendar_access_timeout'));
  const reads = createPlanCalendarReads();
  const outcomes = await Promise.allSettled([reads.calendars(), reads.calendars()]);
  expect(outcomes.map((outcome) => outcome.status)).toEqual(['rejected', 'rejected']);
  await expect(reads.calendars()).resolves.toEqual(calendars);
  expect(listCalendarsWithErrors).toHaveBeenCalledTimes(2);
});

it('does not share pending reads between separate Plan instances', async () => {
  await Promise.all([createPlanCalendarReads().calendars(), createPlanCalendarReads().calendars()]);
  expect(listCalendarsWithErrors).toHaveBeenCalledTimes(2);
});
