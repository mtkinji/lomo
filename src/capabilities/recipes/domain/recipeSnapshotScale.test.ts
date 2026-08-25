import { resolveRecipeSnapshotMultiplier } from './recipeSnapshotScale';

describe('recipe snapshot scale compatibility', () => {
  it('uses an explicit current multiplier', () => {
    expect(resolveRecipeSnapshotMultiplier({ recipeScaleMultiplier: 2 }))
      .toEqual({ multiplier: 2, reviewRequired: false });
  });

  it('derives a safe multiplier from legacy serving yields', () => {
    expect(resolveRecipeSnapshotMultiplier({
      yieldQuantity: 4,
      yieldUnit: 'servings',
      selectedServings: 8,
    })).toEqual({ multiplier: 2, reviewRequired: false });
  });

  it('fails closed for legacy physical yields', () => {
    expect(resolveRecipeSnapshotMultiplier({
      yieldQuantity: 1,
      yieldUnit: 'loaf',
      selectedServings: 6,
    })).toEqual({ multiplier: 1, reviewRequired: true });
  });

  it('treats an original snapshot without legacy planning data as 1x', () => {
    expect(resolveRecipeSnapshotMultiplier({ yieldQuantity: 1, yieldUnit: 'loaf' }))
      .toEqual({ multiplier: 1, reviewRequired: false });
  });
});
