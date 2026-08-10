import { routeForScreenTimeShieldReason } from './screenTimeShieldHandoff';

describe('routeForScreenTimeShieldReason', () => {
  it('takes Meaningful First directly to the Today action canvas', () => {
    expect(routeForScreenTimeShieldReason('meaningful_first_locked')).toBe(
      'kwilt://today?source=screen-time&highlightSuggested=1',
    );
  });

  it('keeps Money and active Focus handoffs capability-owned', () => {
    expect(routeForScreenTimeShieldReason('money_review_required')).toBe(
      'kwilt://money?source=screen-time',
    );
    expect(routeForScreenTimeShieldReason('focus_session_active')).toBe(
      'kwilt://focus?source=screen-time',
    );
  });
});
