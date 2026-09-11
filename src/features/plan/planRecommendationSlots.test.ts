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
