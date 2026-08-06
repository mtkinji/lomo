import { selectGoalRouteCheckinApprovalAction } from './goalRouteCheckinApprovalDecision';

describe('selectGoalRouteCheckinApprovalAction', () => {
  const eligibleInput = {
    openRequested: true,
    isFocused: true,
    hasPendingDraft: true,
    hasOpenedRequest: false,
  };

  it('resets the once-per-request guard when route intent is absent', () => {
    expect(
      selectGoalRouteCheckinApprovalAction({
        ...eligibleInput,
        openRequested: false,
      }),
    ).toBe('reset');
  });

  it.each([
    ['the screen is blurred', { isFocused: false }],
    ['the pending draft is missing', { hasPendingDraft: false }],
    ['the request was already opened', { hasOpenedRequest: true }],
  ])('waits when %s', (_label, overrides) => {
    expect(
      selectGoalRouteCheckinApprovalAction({
        ...eligibleInput,
        ...overrides,
      }),
    ).toBe('wait');
  });

  it('schedules the approval sheet when every prerequisite is met', () => {
    expect(selectGoalRouteCheckinApprovalAction(eligibleInput)).toBe('schedule-open');
  });
});
