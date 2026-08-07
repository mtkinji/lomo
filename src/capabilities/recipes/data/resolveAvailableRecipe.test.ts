import { recipeContractFixture, recipeVersionContractFixture } from '../domain/recipeContractFixtures';
import { resolveAvailableRecipe } from './resolveAvailableRecipe';

const personal = {
  recipe: recipeContractFixture(),
  currentVersion: recipeVersionContractFixture(),
};

const starter = {
  recipe: { ...recipeContractFixture(), id: 'starter-meal' },
  currentVersion: { ...recipeVersionContractFixture(), recipeId: 'starter-meal' },
};

describe('resolveAvailableRecipe', () => {
  it('keeps catalog meals available through readiness and Cook Mode', () => {
    expect(resolveAvailableRecipe([], 'starter-meal', [starter])).toBe(starter);
  });

  it('prefers the personal recipe when identities overlap', () => {
    expect(resolveAvailableRecipe([personal], personal.recipe.id, [personal])).toBe(personal);
  });

  it('returns undefined when neither inventory owns the meal', () => {
    expect(resolveAvailableRecipe([personal], 'missing', [starter])).toBeUndefined();
  });
});
