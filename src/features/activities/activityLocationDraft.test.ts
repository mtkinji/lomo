import {
  isActivityLocationDraftDirty,
  serializeActivityLocationDraft,
  type ActivityLocationAlert,
} from './activityLocationDraft';

const place = {
  label: 'Costco',
  latitude: 40.7128,
  longitude: -74.006,
};

describe('serializeActivityLocationDraft', () => {
  it('stores a place without trigger or radius when alert is off', () => {
    expect(
      serializeActivityLocationDraft({ place, alert: 'off', radiusM: 45.72 }),
    ).toEqual(place);
  });

  it.each<ActivityLocationAlert>(['arrive', 'leave'])(
    'stores the existing %s alert rule when enabled',
    (alert) => {
      expect(
        serializeActivityLocationDraft({ place, alert, radiusM: 45.72 }),
      ).toEqual({ ...place, trigger: alert, radiusM: 45.72 });
    },
  );

  it('clears the whole location when no place is selected', () => {
    expect(
      serializeActivityLocationDraft({ place: null, alert: 'off', radiusM: 45.72 }),
    ).toBeNull();
  });
});

describe('isActivityLocationDraftDirty', () => {
  it('round-trips a context-only place without becoming a leave alert', () => {
    expect(
      isActivityLocationDraftDirty({
        saved: place,
        draft: { place, alert: 'off', radiusM: 45.72 },
      }),
    ).toBe(false);
  });

  it('treats turning an alert off as a change without removing the place', () => {
    expect(
      isActivityLocationDraftDirty({
        saved: { ...place, trigger: 'leave', radiusM: 45.72 },
        draft: { place, alert: 'off', radiusM: 45.72 },
      }),
    ).toBe(true);
  });

  it('ignores radius changes while alert is off', () => {
    expect(
      isActivityLocationDraftDirty({
        saved: place,
        draft: { place, alert: 'off', radiusM: 152.4 },
      }),
    ).toBe(false);
  });
});
