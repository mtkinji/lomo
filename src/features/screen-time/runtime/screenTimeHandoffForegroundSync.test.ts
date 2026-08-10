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
import { useScreenTimeHandoffStore } from './screenTimeHandoffStore';
import {
  startScreenTimeHandoffForegroundSync,
  stopScreenTimeHandoffForegroundSyncForTests,
} from './screenTimeHandoffForegroundSync';

const mockConsume = consumePendingScreenTimeShieldHandoff as jest.Mock;

describe('screenTimeHandoffForegroundSync', () => {
  beforeEach(() => {
    stopScreenTimeHandoffForegroundSyncForTests();
    useScreenTimeHandoffStore.getState().resetForTests();
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1_786_291_200_000);
  });

  afterEach(() => jest.restoreAllMocks());

  it('captures a shield handoff without replacing the current navigation route', async () => {
    mockConsume.mockResolvedValue({
      requestedAtMs: 1_786_291_200_000,
      reason: 'meaningful_first_locked',
      restrictions: [],
    });

    startScreenTimeHandoffForegroundSync();
    await Promise.resolve();
    await Promise.resolve();

    expect(useScreenTimeHandoffStore.getState().visible).toBe(true);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});

