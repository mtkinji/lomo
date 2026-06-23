jest.mock('react-native', () => {
  let listener: ((state: string) => void) | null = null;
  return {
    AppState: {
      currentState: 'background',
      addEventListener: jest.fn((_event: string, cb: (state: string) => void) => {
        listener = cb;
        return { remove: jest.fn() };
      }),
      __emit: (state: string) => listener?.(state),
    },
  };
});

jest.mock('./screenTimeProtectionRuntime', () => ({
  applyMeaningfulFirstRestrictionsIfLocked: jest.fn().mockResolvedValue(false),
}));

import { AppState } from 'react-native';
import { applyMeaningfulFirstRestrictionsIfLocked } from './screenTimeProtectionRuntime';
import {
  startScreenTimeProtectionForegroundSync,
  stopScreenTimeProtectionForegroundSyncForTests,
} from './screenTimeProtectionForegroundSync';

describe('screenTimeProtectionForegroundSync', () => {
  beforeEach(() => {
    stopScreenTimeProtectionForegroundSyncForTests();
    jest.clearAllMocks();
    (AppState as any).currentState = 'background';
  });

  afterEach(() => {
    stopScreenTimeProtectionForegroundSyncForTests();
  });

  it('reconciles once on start and on foreground return', () => {
    startScreenTimeProtectionForegroundSync();

    expect(applyMeaningfulFirstRestrictionsIfLocked).toHaveBeenCalledTimes(1);

    (AppState as any).__emit('active');
    expect(applyMeaningfulFirstRestrictionsIfLocked).toHaveBeenCalledTimes(2);

    (AppState as any).__emit('active');
    expect(applyMeaningfulFirstRestrictionsIfLocked).toHaveBeenCalledTimes(2);
  });

  it('does not register duplicate app state listeners', () => {
    startScreenTimeProtectionForegroundSync();
    startScreenTimeProtectionForegroundSync();

    expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
  });
});
