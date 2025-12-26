import { roundDownToIntervalTimeHHmm } from './timeRounding';

describe('roundDownToIntervalTimeHHmm', () => {
  it('rounds down to the nearest 30-minute interval', () => {
    const d = new Date(2025, 11, 26, 14, 37, 5, 0); // local: 14:37
    expect(roundDownToIntervalTimeHHmm({ at: d, intervalMinutes: 30 })).toBe('14:30');
  });

  it('rounds down to the nearest 15-minute interval', () => {
    const d = new Date(2025, 11, 26, 9, 14, 0, 0); // 09:14
    expect(roundDownToIntervalTimeHHmm({ at: d, intervalMinutes: 15 })).toBe('09:00');
  });
});


