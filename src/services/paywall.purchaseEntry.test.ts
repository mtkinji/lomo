jest.mock('../navigation/rootNavigationRef', () => ({
  rootNavigationRef: {
    isReady: () => true,
    navigate: jest.fn(),
  },
}));

import { rootNavigationRef } from '../navigation/rootNavigationRef';
import { openPaywallPurchaseEntry, openPaywallInterstitial } from './paywall';
import { usePaywallStore } from '../store/usePaywallStore';

describe('openPaywallPurchaseEntry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the dedicated full-screen Pro plan chooser', () => {
    openPaywallPurchaseEntry();

    expect(rootNavigationRef.navigate).toHaveBeenCalledWith('ProPlanChooser');
  });
  it('takes Money onboarding directly to the offer and retains the connection intent', () => {
    openPaywallInterstitial({ reason: 'pro_money_budgets', source: 'money_onboarding_add_institution', resumeIntent: { kind: 'money_connect_account' } });
    expect(rootNavigationRef.navigate).toHaveBeenCalledWith('ProPlanChooser');
    expect(usePaywallStore.getState().visible).toBe(false);
    expect(usePaywallStore.getState().pendingResumeIntent?.kind).toBe('money_connect_account');
  });
});
