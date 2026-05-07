import { useCheckinNudgeStore } from './useCheckinNudgeStore';

describe('useCheckinNudgeStore share coachmark', () => {
  beforeEach(() => {
    useCheckinNudgeStore.getState().reset();
  });

  it('allows a share coachmark for an unshared goal with no recent dismissal', () => {
    expect(useCheckinNudgeStore.getState().shouldShowShareCoachmark('goal-1')).toBe(true);
  });

  it('does not show again after the goal has been shared', () => {
    useCheckinNudgeStore.getState().markGoalShared('goal-1');

    expect(useCheckinNudgeStore.getState().shouldShowShareCoachmark('goal-1')).toBe(false);
  });

  it('respects per-goal dismissal cooldown', () => {
    useCheckinNudgeStore.getState().dismissShareCoachmark('goal-1');

    expect(useCheckinNudgeStore.getState().shouldShowShareCoachmark('goal-1')).toBe(false);
    expect(useCheckinNudgeStore.getState().shouldShowShareCoachmark('goal-2')).toBe(true);
  });

  it('caps share coachmark exposure globally across goals', () => {
    useCheckinNudgeStore.getState().recordShareCoachmarkShown('goal-1');
    useCheckinNudgeStore.getState().recordShareCoachmarkShown('goal-2');

    expect(useCheckinNudgeStore.getState().shouldShowShareCoachmark('goal-3')).toBe(false);
  });
});
