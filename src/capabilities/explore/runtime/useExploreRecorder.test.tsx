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
  hasStartedGeofencingAsync: jest.fn(async () => false),
  startLocationUpdatesAsync: jest.fn(async () => undefined),
  stopLocationUpdatesAsync: jest.fn(async () => undefined),
  stopGeofencingAsync: jest.fn(async () => undefined),
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

  it('does not clear foreground fog from airplane-like movement', async () => {
    const { result } = renderHook(() => useExploreRecorder());
    await act(async () => result.current.start());
    const callback = (Location.watchPositionAsync as jest.Mock).mock.calls[0][1] as (
      location: { coords: Record<string, number | null>; timestamp: number }
    ) => void;
    act(() => callback({
      coords: {
        latitude: 41.5,
        longitude: -105.1,
        altitude: 10_000,
        accuracy: 8,
        altitudeAccuracy: 6,
        speed: 80,
      },
      timestamp: Date.parse('2026-07-28T12:01:00.000Z'),
    }));
    expect(useExploreStore.getState().activeSession?.points).toHaveLength(1);
    expect(useExploreStore.getState().tracking.movement).toBe('airplane');
  });

  it('enables Always Exploring with its efficient persistent profile and can pause back to manual', async () => {
    const { result } = renderHook(() => useExploreRecorder());
    await act(async () => result.current.setRecordingMode('automatic'));

    expect(useExploreStore.getState().preferences.recording).toBe('automatic');
    expect(Location.startLocationUpdatesAsync).toHaveBeenCalledWith(
      'kwilt-explore-background-location-v1',
      expect.objectContaining({
        accuracy: Location.Accuracy.High,
        distanceInterval: 30,
        timeInterval: 60_000,
        deferredUpdatesDistance: 100,
        deferredUpdatesInterval: 120_000,
        pausesUpdatesAutomatically: false,
      }),
    );

    await act(async () => result.current.setRecordingMode('manual'));
    await waitFor(() => expect(useExploreStore.getState().preferences.recording).toBe('manual'));
    expect(useExploreStore.getState().activeSession).toBeNull();
  });

  it('wakes a deep-sleep Ambient session when Explore is opened', async () => {
    act(() => {
      useExploreStore.getState().updatePreferences({ recording: 'automatic' });
      useExploreStore.getState().startSession('2026-07-28T12:00:00.000Z', 'ambient-1', 'ambient');
      useExploreStore.setState({
        tracking: {
          ...useExploreStore.getState().tracking,
          phase: 'deep-sleep',
          movement: 'stationary',
          stationarySince: '2026-07-28T12:00:00.000Z',
          wakeAnchor: { latitude: 40.5, longitude: -105.1, horizontalAccuracyM: 8 },
        },
      });
    });
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.getBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.hasStartedGeofencingAsync as jest.Mock).mockResolvedValue(true);

    renderHook(() => useExploreRecorder());
    await waitFor(() => expect(Location.startLocationUpdatesAsync).toHaveBeenCalled());
    expect(useExploreStore.getState().tracking.phase).toBe('active');
  });
});
