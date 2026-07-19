import { resolveInitialGoalTargetDateForPicker } from './goalTargetDatePickerDefaults';

const fixedNow = new Date(2026, 6, 19, 10, 24, 30);

describe('resolveInitialGoalTargetDateForPicker', () => {
  it('uses an existing valid target date', () => {
    const targetDate = new Date(2026, 7, 4, 23, 0, 0).toISOString();

    expect(
      resolveInitialGoalTargetDateForPicker({
        targetDate,
        now: fixedNow,
      }).toISOString(),
    ).toBe(targetDate);
  });

  it.each([null, undefined, 'not-a-date'])('uses a 14-day local end-of-day fallback for %s', (targetDate) => {
    const result = resolveInitialGoalTargetDateForPicker({
      targetDate,
      now: fixedNow,
    });

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(7);
    expect(result.getDate()).toBe(2);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });
});
