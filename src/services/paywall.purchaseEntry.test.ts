jest.mock('../navigation/rootNavigationRef', () => ({
  rootNavigationRef: {
    isReady: () => true,
    navigate: jest.fn(),
  },
}));

import { rootNavigationRef } from '../navigation/rootNavigationRef';
import { openPaywallPurchaseEntry } from './paywall';

describe('openPaywallPurchaseEntry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the dedicated full-screen Pro plan chooser', () => {
    openPaywallPurchaseEntry();

    expect(rootNavigationRef.navigate).toHaveBeenCalledWith('ProPlanChooser');
  });
});
