import { isLocationOfferGeofenceEligible } from './LocationOfferService';

describe('isLocationOfferGeofenceEligible', () => {
  const place = {
    label: 'Costco',
    latitude: 40.7128,
    longitude: -74.006,
  };

  it('excludes a context-only place with no alert trigger', () => {
    expect(isLocationOfferGeofenceEligible({ location: place })).toBe(false);
  });

  it.each(['arrive', 'leave'] as const)('includes a valid %s alert', (trigger) => {
    expect(
      isLocationOfferGeofenceEligible({
        location: { ...place, trigger, radiusM: 150 },
      }),
    ).toBe(true);
  });

  it('rejects invalid coordinates and radius', () => {
    expect(
      isLocationOfferGeofenceEligible({
        location: { ...place, latitude: Number.NaN, trigger: 'arrive' },
      }),
    ).toBe(false);
    expect(
      isLocationOfferGeofenceEligible({
        location: { ...place, trigger: 'arrive', radiusM: Number.NaN },
      }),
    ).toBe(false);
  });
});
