import {
  AppearancePreferenceConflictError,
  createAppearancePreferenceActions,
  type AppearancePreferenceBoundary,
} from './appearancePreferenceActions';

function boundary(): AppearancePreferenceBoundary & { applied: string[][] } {
  let state = { updatedAt: 'v1', thumbnailStyles: ['topographyDots'] as const };
  const applied: string[][] = [];
  return {
    applied,
    read: () => state,
    apply: ({ thumbnailStyles }) => {
      applied.push(thumbnailStyles);
      state = { updatedAt: 'v2', thumbnailStyles: thumbnailStyles as never };
    },
  };
}

test('reads only the bounded thumbnail appearance preference', () => {
  expect(createAppearancePreferenceActions(boundary()).read()).toEqual({
    updatedAt: 'v1', thumbnailStyles: ['topographyDots'],
  });
});

test('applies a reviewed non-empty set of known thumbnail styles', () => {
  const preferences = boundary();
  expect(createAppearancePreferenceActions(preferences).update({
    expectedUpdatedAt: 'v1', thumbnailStyles: ['geoMosaic', 'plainGradient'],
  })).toEqual({
    previousThumbnailStyles: ['topographyDots'],
    thumbnailStyles: ['geoMosaic', 'plainGradient'],
    changed: true,
  });
  expect(preferences.applied).toEqual([['geoMosaic', 'plainGradient']]);
});

test('rejects unknown, duplicate, empty, and stale appearance changes', () => {
  const actions = createAppearancePreferenceActions(boundary());
  expect(() => actions.update({ expectedUpdatedAt: 'v1', thumbnailStyles: [] })).toThrow('appearance');
  expect(() => actions.update({ expectedUpdatedAt: 'v1', thumbnailStyles: ['geoMosaic', 'geoMosaic'] })).toThrow('appearance');
  expect(() => actions.update({ expectedUpdatedAt: 'v1', thumbnailStyles: ['route://Settings'] })).toThrow('appearance');
  expect(() => actions.update({ expectedUpdatedAt: 'stale', thumbnailStyles: ['geoMosaic'] }))
    .toThrow(AppearancePreferenceConflictError);
});
