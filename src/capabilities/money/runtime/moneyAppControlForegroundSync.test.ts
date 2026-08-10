jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Linking: { openURL: jest.fn(async () => undefined) },
}));

jest.mock('../../../services/appleEcosystem/screenTimeProtection', () => ({
  consumePendingScreenTimeShieldHandoff: jest.fn(),
}));

import { Linking } from 'react-native';
import { consumePendingScreenTimeShieldHandoff } from '../../../services/appleEcosystem/screenTimeProtection';
import {
  claimPendingMoneyReviewHandoff,
  startMoneyAppControlForegroundSync,
  stopMoneyAppControlForegroundSyncForTests,
} from './moneyAppControlForegroundSync';

const mockConsumePendingScreenTimeShieldHandoff = consumePendingScreenTimeShieldHandoff as jest.Mock;
const mockOpenURL = Linking.openURL as jest.Mock;

describe('moneyAppControlForegroundSync shield routing', () => {
  beforeEach(() => {
    stopMoneyAppControlForegroundSyncForTests();
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1_786_291_200_000);
  });

  afterEach(() => jest.restoreAllMocks());

  it('routes a Meaningful First handoff to Today without claiming a Money review', async () => {
    mockConsumePendingScreenTimeShieldHandoff.mockResolvedValue({
      requestedAtMs: 1_786_291_200_000,
      reason: 'meaningful_first_locked',
    });

    startMoneyAppControlForegroundSync();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockOpenURL).toHaveBeenCalledWith('kwilt://today?source=screen-time&highlightSuggested=1');
    expect(claimPendingMoneyReviewHandoff()).toBe(false);
  });
});
