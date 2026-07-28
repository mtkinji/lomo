import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useExploreStore } from './useExploreStore';
import { useExploreRecapResolver } from './useExploreRecapResolver';

jest.mock('expo-location', () => ({
  reverseGeocodeAsync: jest.fn(),
}));

describe('useExploreRecapResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => useExploreStore.getState().clearHistory());
  });

  it('sequentially resolves a completed route into one pending recap', async () => {
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
    expect(useExploreStore.getState().sessions[0].discoveredPlaceIds).toHaveLength(1);
    expect(Object.values(useExploreStore.getState().places)[0]?.name).toBe('Spring Canyon Park');
  });
});
