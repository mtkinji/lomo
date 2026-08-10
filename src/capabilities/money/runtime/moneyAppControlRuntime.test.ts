jest.mock('../../../services/appleEcosystem/screenTimeProtection', () => ({
  applyScreenTimeRestrictions: jest.fn(),
  clearScreenTimeRestrictionsForSelection: jest.fn(),
}));

import {
  applyScreenTimeRestrictions,
  clearScreenTimeRestrictionsForSelection,
} from '../../../services/appleEcosystem/screenTimeProtection';
import type { MoneySnapshot } from '../data/moneySnapshot';
import { normalizeMoneyAppControlSettings } from '../domain/moneyAppControl';
import { reconcileMoneyAppControls } from './moneyAppControlRuntime';

const mockApplyRestrictions = applyScreenTimeRestrictions as jest.Mock;
const mockClearRestrictions = clearScreenTimeRestrictionsForSelection as jest.Mock;

describe('reconcileMoneyAppControls', () => {
  beforeEach(() => jest.clearAllMocks());

  it('records the category name with a restricted Money target', async () => {
    const category = {
      sourceId: 'category-shopping',
      name: 'Shopping',
      percentUsed: 95,
    } as MoneySnapshot['categories'][number];
    const snapshot = {
      categories: [category],
      totals: { needsReviewCount: 0 },
    } as MoneySnapshot;
    const settings = normalizeMoneyAppControlSettings({
      authorizationStatus: 'approved',
      policies: {
        'category-shopping': {
          enabled: true,
          preset: 'always_review',
          unlockWindowMinutes: 20,
          selectedApps: [{ token: 'native:applications' }],
          selectedCategories: [],
        },
      },
    });

    await reconcileMoneyAppControls(snapshot, settings);

    expect(mockApplyRestrictions).toHaveBeenCalledWith(expect.objectContaining({
      selectionId: 'money_category-shopping',
      reason: 'money_review_required',
      restrictionLabel: 'Shopping',
    }));
    expect(mockClearRestrictions).not.toHaveBeenCalled();
  });
});
