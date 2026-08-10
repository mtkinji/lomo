jest.mock('react-native', () => ({
  NativeModules: {
    KwiltScreenTimeProtection: {
      applyRestrictions: jest.fn(),
      consumePendingReviewRequest: jest.fn(),
    },
  },
  Platform: { OS: 'ios' },
}));

import { NativeModules } from 'react-native';
import {
  applyScreenTimeRestrictions,
  consumePendingScreenTimeReviewRequest,
  consumePendingScreenTimeShieldHandoff,
} from './screenTimeProtection';

const mockConsumePendingReviewRequest = NativeModules.KwiltScreenTimeProtection
  .consumePendingReviewRequest as jest.Mock;
const mockApplyRestrictions = NativeModules.KwiltScreenTimeProtection
  .applyRestrictions as jest.Mock;

describe('Screen Time shield handoff bridge', () => {
  beforeEach(() => jest.clearAllMocks());

  it('passes a capability-owned label to the native restriction ledger', async () => {
    mockApplyRestrictions.mockResolvedValue(true);

    await expect(applyScreenTimeRestrictions({
      settings: { selectedApps: [{ token: 'app-token' }], selectedCategories: [] },
      reasons: ['money_review_required'],
      selectionId: 'money.dining',
      reason: 'money_review_required',
      restrictionLabel: 'Dining out',
    })).resolves.toBe(true);

    expect(JSON.parse(mockApplyRestrictions.mock.calls[0][0])).toMatchObject({
      selectionId: 'money.dining',
      reason: 'money_review_required',
      restrictionLabel: 'Dining out',
    });
  });

  it('preserves the native shield reason with its timestamp', async () => {
    mockConsumePendingReviewRequest.mockResolvedValue({
      requestedAtMs: 1_786_291_200_000,
      reason: 'meaningful_first_locked',
    });

    await expect(consumePendingScreenTimeShieldHandoff()).resolves.toEqual({
      requestedAtMs: 1_786_291_200_000,
      reason: 'meaningful_first_locked',
    });
  });

  it('retains timestamp-only compatibility for an older native binary', async () => {
    mockConsumePendingReviewRequest.mockResolvedValue(1_786_291_200_000);

    await expect(consumePendingScreenTimeReviewRequest()).resolves.toBe(1_786_291_200_000);
  });
});
