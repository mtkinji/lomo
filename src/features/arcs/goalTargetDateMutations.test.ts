import {
  buildClearedGoalTargetDatePatch,
  buildGoalTargetDateOffsetPatch,
  buildGoalTargetDateSelectionPatch,
} from './goalTargetDateMutations';

const fixedNow = new Date(2026, 7, 17, 10, 24, 30, 456);

describe('goal target-date mutations', () => {
  it('builds a local end-of-day offset with a ready quality state when metrics exist', () => {
    const patch = buildGoalTargetDateOffsetPatch({
      offsetDays: 14,
      hasMetrics: true,
      now: fixedNow,
    });

    const targetDate = new Date(patch.targetDate!);
    expect(targetDate.getFullYear()).toBe(2026);
    expect(targetDate.getMonth()).toBe(7);
    expect(targetDate.getDate()).toBe(31);
    expect(targetDate.getHours()).toBe(23);
    expect(targetDate.getMinutes()).toBe(0);
    expect(targetDate.getSeconds()).toBe(0);
    expect(targetDate.getMilliseconds()).toBe(0);
    expect(patch.qualityState).toBe('ready');
    expect(patch.updatedAt).toBe(fixedNow.toISOString());
  });

  it('normalizes a selected date without mutating the picker value', () => {
    const selectedDate = new Date(2026, 8, 4, 8, 15, 12, 9);
    const originalSelectedDate = selectedDate.toISOString();

    const patch = buildGoalTargetDateSelectionPatch({
      date: selectedDate,
      hasMetrics: false,
      now: fixedNow,
    });

    const targetDate = new Date(patch.targetDate!);
    expect(targetDate.getFullYear()).toBe(2026);
    expect(targetDate.getMonth()).toBe(8);
    expect(targetDate.getDate()).toBe(4);
    expect(targetDate.getHours()).toBe(23);
    expect(targetDate.getMinutes()).toBe(0);
    expect(targetDate.getSeconds()).toBe(0);
    expect(targetDate.getMilliseconds()).toBe(0);
    expect(patch.qualityState).toBe('draft');
    expect(patch.updatedAt).toBe(fixedNow.toISOString());
    expect(selectedDate.toISOString()).toBe(originalSelectedDate);
  });

  it('clears the target date and returns the goal to draft quality', () => {
    expect(buildClearedGoalTargetDatePatch({ now: fixedNow })).toEqual({
      targetDate: undefined,
      qualityState: 'draft',
      updatedAt: fixedNow.toISOString(),
    });
  });
});
