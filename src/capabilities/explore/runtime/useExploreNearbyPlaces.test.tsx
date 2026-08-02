import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useExploreNearbyPlaces } from './useExploreNearbyPlaces';
import { searchNearbyPlaces } from './exploreNearbyPlaces';
import type { ExploreNearbyCandidate } from '../domain/exploreNearby';

jest.mock('./exploreNearbyPlaces', () => ({
  searchNearbyPlaces: jest.fn(),
}));

const center = { latitude: 35.6762, longitude: 139.6503 };

describe('useExploreNearbyPlaces', () => {
  beforeEach(() => jest.clearAllMocks());

  it('stays idle until an explicit search and resolves ranked results', async () => {
    (searchNearbyPlaces as jest.Mock).mockResolvedValue([{
      id: 'nezu', name: 'Nezu Shrine', category: 'MKPOICategoryLandmark',
      latitude: 35.6772, longitude: 139.6503,
    }]);
    const { result } = renderHook(() => useExploreNearbyPlaces([]));

    expect(result.current.status).toBe('idle');
    expect(searchNearbyPlaces).not.toHaveBeenCalled();
    await act(async () => { await result.current.search(center); });

    expect(searchNearbyPlaces).toHaveBeenCalledWith(center, 804.672);
    expect(result.current.status).toBe('ready');
    expect(result.current.results[0]?.name).toBe('Nezu Shrine');
    expect(result.current.searchedCenter).toEqual(center);
  });

  it('supports explicit radius changes and reports unavailable or failed providers calmly', async () => {
    (searchNearbyPlaces as jest.Mock).mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useExploreNearbyPlaces([]));

    act(() => result.current.setRadius('quarter-mile'));
    await act(async () => { await result.current.search(center); });
    expect(searchNearbyPlaces).toHaveBeenLastCalledWith(center, 402.336);
    expect(result.current.status).toBe('unavailable');

    await act(async () => { await result.current.search(center); });
    expect(result.current.status).toBe('error');
  });

  it('ignores an older response after a newer area search begins', async () => {
    let resolveFirst: ((value: ExploreNearbyCandidate[]) => void) | null = null;
    let resolveSecond: ((value: ExploreNearbyCandidate[]) => void) | null = null;
    (searchNearbyPlaces as jest.Mock)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));
    const { result } = renderHook(() => useExploreNearbyPlaces([]));
    const secondCenter = { latitude: 35.68, longitude: 139.7 };

    act(() => { void result.current.search(center); });
    act(() => { void result.current.search(secondCenter); });
    act(() => resolveFirst?.([{
      id: 'old', name: 'Old', category: 'MKPOICategoryMuseum',
      latitude: center.latitude, longitude: center.longitude,
    }]));
    expect(result.current.status).toBe('loading');

    act(() => resolveSecond?.([{
      id: 'new', name: 'New', category: 'MKPOICategoryPark',
      latitude: secondCenter.latitude + 0.001, longitude: secondCenter.longitude,
    }]));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.results.map((place) => place.id)).toEqual(['new']);
    expect(result.current.searchedCenter).toEqual(secondCenter);
  });
});
