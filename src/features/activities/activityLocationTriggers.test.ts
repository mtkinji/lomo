import type { Activity } from '../../domain/types';
import {
  DEFAULT_LOCATION_RADIUS_FT,
  buildActivityLocationDraft,
  clampLocationRadiusMeters,
  formatLocationRadiusLabel,
  isActivityLocationDraftDirty,
  resolveActivityLocationDraft,
} from './activityLocationTriggers';

describe('activityLocationTriggers', () => {
  const savedLocation: NonNullable<Activity['location']> = {
    label: 'Library',
    latitude: 40.123,
    longitude: -111.456,
    trigger: 'arrive',
    radiusM: 100 * 0.3048,
  };

  it('clamps radius values and formats the feet label without meter-rounding drift', () => {
    expect(clampLocationRadiusMeters(0)).toBe(DEFAULT_LOCATION_RADIUS_FT * 0.3048);
    expect(clampLocationRadiusMeters(25 * 0.3048)).toBe(50 * 0.3048);
    expect(clampLocationRadiusMeters(5000 * 0.3048)).toBe(2000 * 0.3048);
    expect(formatLocationRadiusLabel(150 * 0.3048)).toBe('150 feet');
  });

  it('initializes the draft from a valid saved Activity location', () => {
    expect(resolveActivityLocationDraft(savedLocation)).toEqual({
      previewLocation: {
        label: 'Library',
        latitude: 40.123,
        longitude: -111.456,
      },
      trigger: 'arrive',
      radiusM: 100 * 0.3048,
    });
  });

  it('falls back to default trigger and radius for missing or partial saved locations', () => {
    expect(resolveActivityLocationDraft(null)).toEqual({
      previewLocation: null,
      trigger: 'leave',
      radiusM: DEFAULT_LOCATION_RADIUS_FT * 0.3048,
    });

    const invalidLocation: NonNullable<Activity['location']> = {
      label: 'Bad',
      latitude: Number.NaN,
      longitude: -111,
    };

    expect(resolveActivityLocationDraft(invalidLocation)).toEqual({
      previewLocation: null,
      trigger: 'leave',
      radiusM: DEFAULT_LOCATION_RADIUS_FT * 0.3048,
    });
  });

  it('detects dirty draft state by saved presence, coordinates, trigger, label, and radius', () => {
    const cleanDraft = resolveActivityLocationDraft(savedLocation);

    expect(
      isActivityLocationDraftDirty({
        savedLocation,
        draftLocation: cleanDraft.previewLocation,
        draftTrigger: cleanDraft.trigger,
        draftRadiusM: cleanDraft.radiusM,
      }),
    ).toBe(false);

    expect(
      isActivityLocationDraftDirty({
        savedLocation,
        draftLocation: { ...cleanDraft.previewLocation!, label: 'Different' },
        draftTrigger: cleanDraft.trigger,
        draftRadiusM: cleanDraft.radiusM,
      }),
    ).toBe(true);

    expect(
      isActivityLocationDraftDirty({
        savedLocation,
        draftLocation: cleanDraft.previewLocation,
        draftTrigger: 'leave',
        draftRadiusM: cleanDraft.radiusM,
      }),
    ).toBe(true);
  });

  it('builds the Activity location patch from the draft', () => {
    expect(
      buildActivityLocationDraft({
        previewLocation: { label: 'Gym', latitude: 40.5, longitude: -111.5 },
        trigger: 'leave',
        radiusM: 5000 * 0.3048,
      }),
    ).toEqual({
      label: 'Gym',
      latitude: 40.5,
      longitude: -111.5,
      trigger: 'leave',
      radiusM: 2000 * 0.3048,
    });

    expect(buildActivityLocationDraft({ previewLocation: null, trigger: 'arrive', radiusM: 100 })).toBeNull();
  });
});
