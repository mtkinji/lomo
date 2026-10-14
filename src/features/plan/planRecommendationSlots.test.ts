import { getPlanRecommendationSlots } from './planRecommendationSlots';

const day = new Date(2026, 8, 11);
const time = (hour: number, minute = 0) => new Date(2026, 8, 11, hour, minute);
const options = {
  targetDate: day,
  windows: [{ start: '09:00', end: '17:00' }],
  durationMinutes: 60,
  busyIntervals: [],
  otherProposalIntervals: [],
  now: time(8),
};

describe('recommendation time choices', () => {
  it('includes the whole available day in chronological order, beyond the nearest eight choices', () => {
    const slots = getPlanRecommendationSlots(options);
    expect(slots).toHaveLength(29);
    expect(slots[0]).toBe(time(9).toISOString());
    expect(slots.at(-1)).toBe(time(16).toISOString());
    expect(slots).toEqual([...slots].sort());
  });

  it('excludes elapsed times and conflicts, and deduplicates overlapping windows', () => {
    const slots = getPlanRecommendationSlots({ ...options,
      windows: [...options.windows, ...options.windows],
      now: time(11, 5),
      busyIntervals: [{ start: time(12), end: time(13) }],
      otherProposalIntervals: [{ start: time(14), end: time(15) }],
    });
    expect(slots).toEqual([time(13), time(15), time(15, 15), time(15, 30), time(15, 45), time(16)].map(d => d.toISOString()));
  });
});

it('indexes busy intervals once instead of scanning them for each available start time', () => {
  const reads = jest.fn();
  const busy = Array.from({ length: 500 }, (_, index) => ({
    get start() { reads(); return new Date(day.getTime() - (index + 1) * 86_400_000); },
    end: new Date(day.getTime() - (index + 1) * 86_400_000 + 3_600_000),
  }));
  const expected = getPlanRecommendationSlots(options);
  expect(getPlanRecommendationSlots({ ...options, busyIntervals: busy })).toEqual(expected);
  expect(reads.mock.calls.length).toBeLessThanOrEqual(busy.length);
});

it('matches a direct overlap check for unsorted, nested, touching, and invalid calendar intervals', () => {
  const intervals = Array.from({ length: 100 }, (_, index) => {
    const minute = (index * 37) % 600;
    return { start: time(8, minute), end: time(8, minute + (index % 5) * 7) };
  });
  intervals.push({ start: new Date(NaN), end: time(12) });
  const expected = getPlanRecommendationSlots(options).filter(value => {
    const start = new Date(value);
    const end = new Date(start.getTime() + 60 * 60_000);
    return !intervals.some(busy => busy.start < end && start < busy.end);
  });
  expect(getPlanRecommendationSlots({ ...options, busyIntervals: intervals.slice(0, 50), otherProposalIntervals: intervals.slice(50) })).toEqual(expected);
});
