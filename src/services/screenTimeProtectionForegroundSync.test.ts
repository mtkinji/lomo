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
  reconcileScreenTimeRestrictions: jest.fn().mockResolvedValue([]),
}));

jest.mock('../features/activities/focusSessionStore', () => ({
  useFocusSessionStore: {
    getState: jest.fn(() => ({ activeSession: null })),
    persist: {
      hasHydrated: jest.fn(() => true),
      onFinishHydration: jest.fn(() => jest.fn()),
    },
  },
}));

jest.mock('../store/useAppStore', () => ({
  useAppStore: {
    getState: jest.fn(() => ({})),
    persist: {
      hasHydrated: jest.fn(() => true),
      onFinishHydration: jest.fn(() => jest.fn()),
    },
  },
}));

import { AppState } from 'react-native';
import { useFocusSessionStore } from '../features/activities/focusSessionStore';
import { useAppStore } from '../store/useAppStore';
import { reconcileScreenTimeRestrictions } from './screenTimeProtectionRuntime';
import {
  startScreenTimeProtectionForegroundSync,
  stopScreenTimeProtectionForegroundSyncForTests,
} from './screenTimeProtectionForegroundSync';

describe('screenTimeProtectionForegroundSync', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    stopScreenTimeProtectionForegroundSyncForTests();
    jest.clearAllMocks();
    (AppState as any).currentState = 'background';
    (useFocusSessionStore.getState as jest.Mock).mockReturnValue({ activeSession: null });
    (useFocusSessionStore.persist.hasHydrated as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    stopScreenTimeProtectionForegroundSyncForTests();
  });

  it('fully reconciles once on start and on foreground return so a persisted unlock clears a stale native shield', () => {
    startScreenTimeProtectionForegroundSync();

    expect(reconcileScreenTimeRestrictions).toHaveBeenCalledWith({ focusSessionActive: false });

    (AppState as any).__emit('active');
    expect(reconcileScreenTimeRestrictions).toHaveBeenCalledTimes(2);

    (AppState as any).__emit('active');
    expect(reconcileScreenTimeRestrictions).toHaveBeenCalledTimes(2);
  });

  it('preserves an active Focus restriction during foreground reconciliation', () => {
    (useFocusSessionStore.getState as jest.Mock).mockReturnValue({
      activeSession: { sessionId: 'focus-1', mode: 'running' },
    });

    startScreenTimeProtectionForegroundSync();

    expect(reconcileScreenTimeRestrictions).toHaveBeenCalledWith({ focusSessionActive: true });
  });

  it('waits for persisted Screen Time state before reconciling on cold launch', () => {
    let finishAppHydration: Parameters<typeof useAppStore.persist.onFinishHydration>[0] | undefined;
    jest.spyOn(useAppStore.persist, 'hasHydrated').mockReturnValue(false);
    jest.spyOn(useAppStore.persist, 'onFinishHydration').mockImplementation((
      listener: Parameters<typeof useAppStore.persist.onFinishHydration>[0],
    ) => {
      finishAppHydration = listener;
      return jest.fn();
    });

    startScreenTimeProtectionForegroundSync();

    expect(reconcileScreenTimeRestrictions).not.toHaveBeenCalled();
    jest.spyOn(useAppStore.persist, 'hasHydrated').mockReturnValue(true);
    finishAppHydration?.(useAppStore.getState());
    expect(reconcileScreenTimeRestrictions).toHaveBeenCalledWith({ focusSessionActive: false });
  });

  it('does not register duplicate app state listeners', () => {
    startScreenTimeProtectionForegroundSync();
    startScreenTimeProtectionForegroundSync();

    expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
  });
});
