import { act, render, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { ExploreAlwaysOnRuntimeHost } from './ExploreAlwaysOnRuntimeHost';
import {
  isExploreLocationServiceStarted,
  startExploreBackgroundUpdates,
  stopExploreBackgroundUpdates,
} from './exploreLocationUpdates';
import { useExploreStore } from './useExploreStore';

jest.mock('./exploreBackgroundTask', () => ({ EXPLORE_BACKGROUND_TASK: 'test-explore-task' }));
jest.mock('./exploreLocationUpdates', () => ({
  isExploreLocationServiceStarted: jest.fn(async () => false),
  startExploreBackgroundUpdates: jest.fn(async () => undefined),
  stopExploreBackgroundUpdates: jest.fn(async () => undefined),
}));
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getBackgroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  hasStartedLocationUpdatesAsync: jest.fn(async () => false),
}));

describe('ExploreAlwaysOnRuntimeHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(useExploreStore.persist, 'hasHydrated').mockReturnValue(true);
    act(() => {
      useExploreStore.getState().clearHistory();
      useExploreStore.getState().updatePreferences({ recording: 'automatic' });
    });
  });

  it('restores ambient recording without requiring the Explore screen to mount', async () => {
    const screen = render(<ExploreAlwaysOnRuntimeHost />);

    await waitFor(() => expect(startExploreBackgroundUpdates).toHaveBeenCalledWith('automatic'));
    expect(Location.getBackgroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(useExploreStore.getState().activeSession).not.toBeNull();
    screen.unmount();
    expect(stopExploreBackgroundUpdates).toHaveBeenCalledTimes(1);
  });

  it('replaces a stale wake service when no active ambient session exists', async () => {
    (isExploreLocationServiceStarted as jest.Mock).mockResolvedValue(true);
    render(<ExploreAlwaysOnRuntimeHost />);
    await waitFor(() => expect(startExploreBackgroundUpdates).toHaveBeenCalledWith('automatic'));
    expect(useExploreStore.getState().activeSession).not.toBeNull();
  });
});
