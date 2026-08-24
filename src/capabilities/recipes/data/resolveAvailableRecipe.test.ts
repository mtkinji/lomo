import { recipeContractFixture, recipeVersionContractFixture } from '../domain/recipeContractFixtures';
import { replaceHostedCatalogMedia } from './catalogMediaOverlay';
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
  afterEach(() => replaceHostedCatalogMedia([], { allowEmpty: true }));

  it('keeps catalog meals available through readiness and Cook Mode', () => {
    expect(resolveAvailableRecipe([], 'starter-meal', [starter])).toBe(starter);
  });

  it('prefers the personal recipe when identities overlap', () => {
    expect(resolveAvailableRecipe([personal], personal.recipe.id, [personal])).toBe(personal);
  });

  it('returns undefined when neither inventory owns the meal', () => {
    expect(resolveAvailableRecipe([personal], 'missing', [starter])).toBeUndefined();
  });

  it('keeps the published catalog image when a library card opens recipe detail', () => {
    const catalogRecipe = {
      recipe: {
        ...recipeContractFixture(),
        id: 'kwilt-recipe-br077',
        mediaAssets: [{
          ...recipeContractFixture().mediaAssets[0],
          storageRef: 'bundle://household-recipe-atlas/12',
        }],
      },
      currentVersion: {
        ...recipeVersionContractFixture(),
        recipeId: 'kwilt-recipe-br077',
      },
    };
    replaceHostedCatalogMedia([{
      rosterId: 'BR077',
      media: {
        ...catalogRecipe.recipe.mediaAssets[0],
        id: 'hosted-br077',
        storageRef: 'https://cdn.example.com/br077-mangu.webp',
        mediaType: 'image/webp',
        rightsBasis: 'kwilt_authored',
        publicAllowed: true,
        lifecycle: 'active',
      },
    }]);

    const resolved = resolveAvailableRecipe([], catalogRecipe.recipe.id, [catalogRecipe]);

    expect(resolved?.recipe.mediaAssets[0].storageRef).toBe('https://cdn.example.com/br077-mangu.webp');
  });
});
