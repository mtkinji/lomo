const mockNativeModule = {
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  geocodeAsync: jest.fn(),
};

jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: () => mockNativeModule,
}));

import {
  geocodeStoreSearchBestEffort,
  getCurrentStoreSearchContextBestEffort,
  hydrateStoreCoordinatesBestEffort,
} from './currentLocation';

describe('current store search context', () => {
  beforeEach(() => {
    mockNativeModule.getCurrentPositionAsync.mockReset();
    mockNativeModule.reverseGeocodeAsync.mockReset();
    mockNativeModule.geocodeAsync.mockReset();
  });

  it('turns an already-available current location into a retailer ZIP search', async () => {
    mockNativeModule.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 40.34, longitude: -111.91 },
    });
    mockNativeModule.reverseGeocodeAsync.mockResolvedValue([{ postalCode: '84045' }]);

    await expect(getCurrentStoreSearchContextBestEffort()).resolves.toEqual({
      latitude: 40.34,
      longitude: -111.91,
      postalCode: '84045',
    });
  });

  it('geocodes a manual ZIP only to position the map', async () => {
    mockNativeModule.geocodeAsync.mockResolvedValue([{ latitude: 40.34, longitude: -111.91 }]);
    await expect(geocodeStoreSearchBestEffort('84045')).resolves.toEqual({
      latitude: 40.34,
      longitude: -111.91,
    });
  });

  it('fills missing store coordinates from addresses without replacing provider coordinates', async () => {
    mockNativeModule.geocodeAsync
      .mockResolvedValueOnce([{ latitude: 40.353, longitude: -111.904 }])
      .mockRejectedValueOnce(new Error('geocoder unavailable'));

    await expect(hydrateStoreCoordinatesBestEffort([
      { id: 'provider', address: '1550 E 3500 N, Lehi UT', latitude: 40.42, longitude: -111.84 },
      { id: 'fallback', address: '689 N Redwood Rd, Saratoga Springs UT 84045', latitude: null, longitude: null },
      { id: 'unresolved', address: 'Unknown', latitude: null, longitude: null },
    ])).resolves.toEqual([
      { id: 'provider', address: '1550 E 3500 N, Lehi UT', latitude: 40.42, longitude: -111.84 },
      { id: 'fallback', address: '689 N Redwood Rd, Saratoga Springs UT 84045', latitude: 40.353, longitude: -111.904 },
      { id: 'unresolved', address: 'Unknown', latitude: null, longitude: null },
    ]);

    expect(mockNativeModule.geocodeAsync).toHaveBeenCalledTimes(2);
    expect(mockNativeModule.geocodeAsync).not.toHaveBeenCalledWith('1550 E 3500 N, Lehi UT');
  });
});
