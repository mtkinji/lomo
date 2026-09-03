import * as Location from 'expo-location';
import {
  enterExploreDeepSleep,
  isExploreLocationServiceStarted,
  startExploreBackgroundUpdates,
  stopExploreBackgroundUpdates,
} from './exploreLocationUpdates';
import {
  EXPLORE_BACKGROUND_TASK,
  EXPLORE_WAKE_REGION_ID,
  EXPLORE_WAKE_TASK,
} from './exploreLocationTaskNames';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3, High: 4 },
  ActivityType: { Other: 1, AutomotiveNavigation: 2, Fitness: 3, OtherNavigation: 4, Airborne: 5 },
  hasStartedLocationUpdatesAsync: jest.fn(async () => false),
  hasStartedGeofencingAsync: jest.fn(async () => false),
  startLocationUpdatesAsync: jest.fn(async () => undefined),
  stopLocationUpdatesAsync: jest.fn(async () => undefined),
  startGeofencingAsync: jest.fn(async () => undefined),
  stopGeofencingAsync: jest.fn(async () => undefined),
}));

describe('Explore location service orchestration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('enters deep sleep with one exit wake region before stopping precise updates', async () => {
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);
    await enterExploreDeepSleep({ latitude: 40.5, longitude: -105.1, horizontalAccuracyM: 8 });

    expect(Location.startGeofencingAsync).toHaveBeenCalledWith(EXPLORE_WAKE_TASK, [{
      identifier: EXPLORE_WAKE_REGION_ID,
      latitude: 40.5,
      longitude: -105.1,
      radius: 200,
      notifyOnEnter: false,
      notifyOnExit: true,
    }]);
    expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledWith(EXPLORE_BACKGROUND_TASK);
    expect((Location.startGeofencingAsync as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (Location.stopLocationUpdatesAsync as jest.Mock).mock.invocationCallOrder[0],
    );
  });

  it('uses the adaptive soft-sleep profile and clears a stale wake region', async () => {
    (Location.hasStartedGeofencingAsync as jest.Mock).mockResolvedValue(true);
    await startExploreBackgroundUpdates('automatic', 'soft-sleep', 'stationary');
    expect(Location.stopGeofencingAsync).toHaveBeenCalledWith(EXPLORE_WAKE_TASK);
    expect(Location.startLocationUpdatesAsync).toHaveBeenCalledWith(
      EXPLORE_BACKGROUND_TASK,
      expect.objectContaining({
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 75,
        timeInterval: 120_000,
        pausesUpdatesAutomatically: false,
      }),
    );
  });

  it('treats either precise updates or a wake region as an active service', async () => {
    (Location.hasStartedGeofencingAsync as jest.Mock).mockResolvedValue(true);
    expect(await isExploreLocationServiceStarted()).toBe(true);
  });

  it('changes the Core Location activity hint for fast movement', async () => {
    await startExploreBackgroundUpdates('automatic', 'active', 'vehicle');
    expect(Location.startLocationUpdatesAsync).toHaveBeenLastCalledWith(
      EXPLORE_BACKGROUND_TASK,
      expect.objectContaining({
        distanceInterval: 60,
        timeInterval: 120_000,
        deferredUpdatesDistance: 300,
        deferredUpdatesInterval: 180_000,
        activityType: Location.ActivityType.OtherNavigation,
      }),
    );
    await startExploreBackgroundUpdates('automatic', 'active', 'airplane');
    expect(Location.startLocationUpdatesAsync).toHaveBeenLastCalledWith(
      EXPLORE_BACKGROUND_TASK,
      expect.objectContaining({ activityType: Location.ActivityType.Airborne }),
    );
  });

  it('stops both precise updates and the wake region', async () => {
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);
    (Location.hasStartedGeofencingAsync as jest.Mock).mockResolvedValue(true);
    await stopExploreBackgroundUpdates();
    expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledWith(EXPLORE_BACKGROUND_TASK);
    expect(Location.stopGeofencingAsync).toHaveBeenCalledWith(EXPLORE_WAKE_TASK);
  });
});
