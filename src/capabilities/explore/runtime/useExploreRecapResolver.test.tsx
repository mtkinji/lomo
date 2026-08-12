import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useExploreStore } from './useExploreStore';
import { resolveExplorePlaceCandidates, useExploreRecapResolver } from './useExploreRecapResolver';
import { reconstructExploreRecordedPath } from './explorePathReconstruction';

jest.mock('expo-location', () => ({
  reverseGeocodeAsync: jest.fn(),
}));

jest.mock('./explorePathReconstruction', () => ({
  reconstructExploreRecordedPath: jest.fn(),
}));

describe('useExploreRecapResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (reconstructExploreRecordedPath as jest.Mock).mockResolvedValue([]);
    act(() => useExploreStore.getState().clearHistory());
  });

  it('enriches a completed route without reconstructing its presentation path', async () => {
    (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([{ name: 'Spring Canyon Park', city: 'Fort Collins' }]);
    act(() => {
      useExploreStore.getState().startSession('2026-07-27T18:00:00.000Z', 'session-1');
      useExploreStore.getState().appendSample({
        latitude: 40.58526,
        longitude: -105.08442,
        altitudeM: 1518,
        horizontalAccuracyM: 6,
        altitudeAccuracyM: 5,
        recordedAt: '2026-07-27T18:01:00.000Z',
      }, 'point-1');
      useExploreStore.getState().stopSession('2026-07-27T18:10:00.000Z');
    });

    renderHook(() => useExploreRecapResolver('local-user'));

    await waitFor(() => expect(useExploreStore.getState().sessions[0].recapStatus).toBe('ready'));
    expect(Location.reverseGeocodeAsync).toHaveBeenCalledTimes(1);
    expect(reconstructExploreRecordedPath).not.toHaveBeenCalled();
    expect(useExploreStore.getState().sessions[0].discoveredPlaceIds).toHaveLength(1);
    expect(Object.values(useExploreStore.getState().places)[0]?.name).toBe('Spring Canyon Park');
  });

  it('bounds concurrent Place lookups while preserving route order', async () => {
    let active = 0;
    let maxActive = 0;
    const reverseGeocode = jest.fn(async (point: { latitude: number }) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 0));
      active -= 1;
      return [{ name: `Park ${point.latitude}`, city: 'Fort Collins' }];
    });
    const points = Array.from({ length: 5 }, (_, index) => ({
      id: `point-${index}`,
      latitude: 40 + index,
      longitude: -105,
      altitudeM: null,
      horizontalAccuracyM: 6,
      altitudeAccuracyM: null,
      speedMps: null,
      courseDeg: null,
      recordedAt: new Date(Date.UTC(2026, 6, 27, 18, index)).toISOString(),
    }));

    const candidates = await resolveExplorePlaceCandidates(points, reverseGeocode as never);

    expect(reverseGeocode).toHaveBeenCalledTimes(5);
    expect(maxActive).toBe(3);
    expect(candidates.map((candidate) => candidate.name)).toEqual([
      'Park 40', 'Park 41', 'Park 42', 'Park 43', 'Park 44',
    ]);
  });
});
