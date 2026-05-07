import {
  SHOWUP_STREAK_MILESTONES,
  getShowUpStreakMilestoneType,
  isShowUpStreakMilestone,
} from './milestones';

describe('SHOWUP_STREAK_MILESTONES', () => {
  it('is sorted in ascending order with no duplicates', () => {
    const sorted = [...SHOWUP_STREAK_MILESTONES].sort((a, b) => a - b);
    expect(SHOWUP_STREAK_MILESTONES).toEqual(sorted);
    expect(new Set(SHOWUP_STREAK_MILESTONES).size).toBe(SHOWUP_STREAK_MILESTONES.length);
  });

  it('starts at 3 days for the first milestone', () => {
    expect(SHOWUP_STREAK_MILESTONES[0]).toBe(3);
  });
});

describe('getShowUpStreakMilestoneType', () => {
  it('returns the matching streak_<n> string for known thresholds', () => {
    SHOWUP_STREAK_MILESTONES.forEach((value) => {
      expect(getShowUpStreakMilestoneType(value)).toBe(`streak_${value}`);
    });
  });

  it('returns null for non-milestone values below 365', () => {
    expect(getShowUpStreakMilestoneType(0)).toBeNull();
    expect(getShowUpStreakMilestoneType(1)).toBeNull();
    expect(getShowUpStreakMilestoneType(99)).toBeNull();
    expect(getShowUpStreakMilestoneType(364)).toBeNull();
  });

  it('returns "streak_yearly" for yearly multiples of 365 above 365', () => {
    expect(getShowUpStreakMilestoneType(730)).toBe('streak_yearly');
    expect(getShowUpStreakMilestoneType(1095)).toBe('streak_yearly');
  });

  it('returns "streak_century" for century multiples after 365 (when not a yearly multiple)', () => {
    expect(getShowUpStreakMilestoneType(500)).toBe('streak_century');
    expect(getShowUpStreakMilestoneType(600)).toBe('streak_century');
    expect(getShowUpStreakMilestoneType(800)).toBe('streak_century');
  });

  it('prioritizes the explicit milestone list when a value also satisfies the century rule', () => {
    expect(getShowUpStreakMilestoneType(1000)).toBe('streak_1000');
  });

  it('returns null for non-multiple values above 365', () => {
    expect(getShowUpStreakMilestoneType(366)).toBeNull();
    expect(getShowUpStreakMilestoneType(450)).toBeNull();
  });
});

describe('isShowUpStreakMilestone', () => {
  it('returns true for any value that has a milestone type', () => {
    expect(isShowUpStreakMilestone(7)).toBe(true);
    expect(isShowUpStreakMilestone(500)).toBe(true);
    expect(isShowUpStreakMilestone(730)).toBe(true);
  });

  it('returns false for values without a milestone type', () => {
    expect(isShowUpStreakMilestone(0)).toBe(false);
    expect(isShowUpStreakMilestone(366)).toBe(false);
  });
});
