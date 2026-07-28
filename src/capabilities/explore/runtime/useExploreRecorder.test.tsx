import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useExploreStore } from './useExploreStore';
import { useExploreRecorder } from './useExploreRecorder';

jest.mock('./exploreBackgroundTask', () => ({
  EXPLORE_BACKGROUND_TASK: 'test-explore-background-task',
}));

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3, High: 4 },
  ActivityType: { Fitness: 3 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestBackgroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getBackgroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: 40.5, longitude: -105.1, altitude: 1500, accuracy: 8, altitudeAccuracy: 6 },
    timestamp: Date.parse('2026-07-28T12:00:00.000Z'),
  })),
  watchPositionAsync: jest.fn(async () => ({ remove: jest.fn() })),
  hasStartedLocationUpdatesAsync: jest.fn(async () => false),
  startLocationUpdatesAsync: jest.fn(async () => undefined),
  stopLocationUpdatesAsync: jest.fn(async () => undefined),
}));

describe('useExploreRecorder recording modes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useExploreStore.getState().clearHistory();
      useExploreStore.getState().updatePreferences({ recording: 'manual' });
    });
  });

  it('starts a manual outing with screen-lock permission and the bounded foreground profile', async () => {
    const { result } = renderHook(() => useExploreRecorder());
    await act(async () => result.current.start());

    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Location.requestBackgroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Location.watchPositionAsync).toHaveBeenCalledWith(
      expect.objectContaining({ accuracy: Location.Accuracy.High, distanceInterval: 12, timeInterval: 10_000 }),
      expect.any(Function),
    );
    expect(useExploreStore.getState().activeSession).not.toBeNull();
  });

  it('enables Always Exploring with its efficient persistent profile and can pause back to manual', async () => {
    const { result } = renderHook(() => useExploreRecorder());
    await act(async () => result.current.setRecordingMode('automatic'));

    expect(useExploreStore.getState().preferences.recording).toBe('automatic');
    expect(Location.startLocationUpdatesAsync).toHaveBeenCalledWith(
      'test-explore-background-task',
      expect.objectContaining({
        accuracy: Location.Accuracy.High,
        distanceInterval: 30,
        timeInterval: 30_000,
        deferredUpdatesDistance: 60,
        deferredUpdatesInterval: 60_000,
        pausesUpdatesAutomatically: true,
      }),
    );

    await act(async () => result.current.setRecordingMode('manual'));
    await waitFor(() => expect(useExploreStore.getState().preferences.recording).toBe('manual'));
    expect(useExploreStore.getState().activeSession).toBeNull();
  });
});
