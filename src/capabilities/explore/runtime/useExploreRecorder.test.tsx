import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { AppState } from 'react-native';
import { useExploreStore } from './useExploreStore';
import { useExploreRecorder } from './useExploreRecorder';

jest.mock('./exploreBackgroundTask', () => ({
  EXPLORE_BACKGROUND_TASK: 'test-explore-background-task',
}));

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3, High: 4, BestForNavigation: 6 },
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
    jest.spyOn(useExploreStore.persist, 'hasHydrated').mockReturnValue(true);
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
      expect.objectContaining({ accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 0, timeInterval: 500 }),
      expect.any(Function),
    );
    expect(useExploreStore.getState().activeSession).not.toBeNull();
  });

  it('starts the first recorded path with permission to resume ambient exploration afterward', async () => {
    const { result } = renderHook(() => useExploreRecorder());
    await act(async () => result.current.beginOnboarding());

    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Location.requestBackgroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: Location.Accuracy.High });
    expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1);
    expect(useExploreStore.getState().activeSession?.points).toHaveLength(1);
  });

  it('preserves GPS speed and course with a foreground observation', async () => {
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValueOnce({
      coords: {
        latitude: 40.5,
        longitude: -105.1,
        altitude: 1500,
        accuracy: 8,
        altitudeAccuracy: 6,
        speed: 11.176,
        heading: 92,
      },
      timestamp: Date.parse('2026-07-28T12:00:00.000Z'),
    });
    const { result } = renderHook(() => useExploreRecorder());

    await act(async () => result.current.beginOnboarding());

    expect(useExploreStore.getState().activeSession?.points[0]).toEqual(expect.objectContaining({
      speedMps: 11.176,
      courseDeg: 92,
    }));
  });

  it('locates once for map recentering without requesting background access or recording a point', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    const { result } = renderHook(() => useExploreRecorder());

    let coordinate: { latitude: number; longitude: number } | null = null;
    await act(async () => {
      coordinate = await result.current.locate();
    });

    expect(coordinate).toEqual({ latitude: 40.5, longitude: -105.1 });
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: Location.Accuracy.High });
    expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
    expect(useExploreStore.getState().activeSession).toBeNull();
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
        distanceInterval: 60,
        timeInterval: 120_000,
        deferredUpdatesDistance: 300,
        deferredUpdatesInterval: 180_000,
        pausesUpdatesAutomatically: false,
      }),
    );

    await act(async () => result.current.setRecordingMode('manual'));
    await waitFor(() => expect(useExploreStore.getState().preferences.recording).toBe('manual'));
    expect(useExploreStore.getState().activeSession).toBeNull();
  });

  it('temporarily replaces ambient exploration with a deliberate recorded path', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.getBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);
    act(() => {
      useExploreStore.getState().updatePreferences({ recording: 'automatic' });
      useExploreStore.getState().startSession('2026-07-28T11:55:00.000Z', 'ambient-1', 'ambient');
      useExploreStore.getState().appendSample({
        latitude: 40.49,
        longitude: -105.1,
        altitudeM: 1500,
        horizontalAccuracyM: 8,
        altitudeAccuracyM: 6,
        recordedAt: '2026-07-28T11:55:00.000Z',
      }, 'ambient-point-1');
    });
    const { result } = renderHook(() => useExploreRecorder());

    await act(async () => result.current.start());

    expect(useExploreStore.getState().sessions[0]).toEqual(expect.objectContaining({
      id: 'ambient-1',
      trackingPolicy: 'ambient',
      endedAt: expect.any(String),
    }));
    expect(useExploreStore.getState().activeSession?.trackingPolicy).toBe('adventure');
    expect(Location.watchPositionAsync).toHaveBeenCalledWith(
      expect.objectContaining({ distanceInterval: 0, timeInterval: 500 }),
      expect.any(Function),
    );
  });

  it('resumes ambient exploration after a deliberate recorded path stops', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.getBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);
    act(() => useExploreStore.getState().updatePreferences({ recording: 'automatic' }));
    const { result } = renderHook(() => useExploreRecorder());
    await act(async () => result.current.start());

    await act(async () => result.current.stop());

    expect(useExploreStore.getState().sessions[0]?.trackingPolicy).toBe('adventure');
    expect(useExploreStore.getState().activeSession?.trackingPolicy).toBe('ambient');
    expect(Location.startLocationUpdatesAsync).toHaveBeenLastCalledWith(
      'kwilt-explore-background-location-v1',
      expect.objectContaining({ distanceInterval: 60, timeInterval: 120_000 }),
    );
  });

  it('keeps the current outing alive while the Always Location system prompt makes the app inactive', async () => {
    let appStateListener: ((state: string) => void) | null = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      appStateListener = listener as (state: string) => void;
      return { remove: jest.fn() };
    });
    let resolveBackgroundPermission: ((value: { status: string }) => void) | null = null;
    (Location.requestBackgroundPermissionsAsync as jest.Mock)
      .mockResolvedValueOnce({ status: 'granted' })
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveBackgroundPermission = resolve;
      }));

    const { result } = renderHook(() => useExploreRecorder());
    await act(async () => result.current.beginOnboarding());
    let automaticPromise: Promise<boolean> | null = null;
    await act(async () => {
      automaticPromise = result.current.setRecordingMode('automatic');
      await Promise.resolve();
    });

    act(() => appStateListener?.('inactive'));

    expect(useExploreStore.getState().activeSession).not.toBeNull();

    await act(async () => {
      resolveBackgroundPermission?.({ status: 'granted' });
      await automaticPromise;
    });
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

 it('does not leave a foreground-only watcher running when lock races with resume', async () => {
   let listener: (state: string) => void = () => undefined;
   jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
     listener = callback as typeof listener;
     return { remove: jest.fn() };
   });
   const { result } = renderHook(() => useExploreRecorder());
   await act(async () => result.current.start());
   await act(async () => listener('background'));
   let release: (subscription: {remove: jest.Mock}) => void = () => undefined;
   (Location.watchPositionAsync as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
   await act(async () => listener('active'));
   await act(async () => listener('background'));
   const remove = jest.fn();
   await act(async () => release({remove}));
   await waitFor(() => expect(remove).toHaveBeenCalled());
   expect(Location.startLocationUpdatesAsync).toHaveBeenLastCalledWith(
     'kwilt-explore-background-location-v1', expect.objectContaining({accuracy: Location.Accuracy.BestForNavigation}));
 });

 it('keeps background acquisition when lock interrupts hydrated-session recovery', async () => {
   jest.clearAllMocks();
   const previousAppState = AppState.currentState;
   AppState.currentState = 'active';
   try {
   jest.spyOn(useExploreStore.persist, 'hasHydrated').mockReturnValue(true);
   let listener: (state: string) => void = () => undefined;
   jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
     listener = callback as typeof listener;
     return { remove: jest.fn() };
   });
   (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({status: 'granted'});
   (Location.getBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({status: 'granted'});
   (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);
   useExploreStore.getState().startSession('2026-07-28T12:00:00.000Z', 'recover-drive', 'adventure');
   let release: () => void = () => undefined;
   (Location.stopLocationUpdatesAsync as jest.Mock).mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));
   renderHook(() => useExploreRecorder());
   await waitFor(() => expect(Location.stopLocationUpdatesAsync).toHaveBeenCalled());
   await act(async () => listener('background'));
   await act(async () => release());
   await waitFor(() => expect(Location.startLocationUpdatesAsync).toHaveBeenCalled());
   expect(Location.watchPositionAsync).not.toHaveBeenCalled();
   } finally { AppState.currentState = previousAppState; }
 });
