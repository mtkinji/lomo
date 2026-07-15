import {
  DEFAULT_QUICK_ADD_AI_ACTIONS,
  normalizeQuickAddAiActionPreferences,
} from './uiPreferences';

describe('normalizeQuickAddAiActionPreferences', () => {
  it('falls back to the default actions for missing legacy preferences', () => {
    expect(normalizeQuickAddAiActionPreferences(undefined)).toEqual(DEFAULT_QUICK_ADD_AI_ACTIONS);
    expect(normalizeQuickAddAiActionPreferences('steps')).toEqual(DEFAULT_QUICK_ADD_AI_ACTIONS);
  });

  it('can preserve an intentional empty selection when requested', () => {
    expect(
      normalizeQuickAddAiActionPreferences(undefined, {
        fallbackToDefault: false,
      }),
    ).toEqual([]);
  });

  it('filters unknown values, removes duplicates, and returns canonical order', () => {
    expect(
      normalizeQuickAddAiActionPreferences([
        'cover_image',
        'unknown',
        'steps',
        'cover_image',
        42,
        'details',
      ]),
    ).toEqual(['steps', 'details', 'cover_image']);
  });
});
