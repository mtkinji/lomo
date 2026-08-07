import {
  RecipeContractError,
  parseRecipe,
  parseRecipeVersion,
  type Recipe,
  type RecipeVersion,
} from './recipeContracts';
import {
  collaboratedRecipeFixture,
  familyRecipeFixture,
  independentCopyFixture,
} from './recipeContractFixtures';
describe('Recipe contracts', () => {
  test('keeps stable Recipe identity separate from immutable version content', () => {
    const recipe = parseRecipe(familyRecipeFixture.recipe);
    const version = parseRecipeVersion(familyRecipeFixture.version);

    expect(recipe).toEqual<Recipe>(familyRecipeFixture.recipe);
    expect(version).toEqual<RecipeVersion>(familyRecipeFixture.version);
    expect(recipe).not.toHaveProperty('title');
    expect(version.recipeId).toBe(recipe.id);
    expect(version.version).toBe(1);
    expect(version.ingredients[0].originalText).toBe('1 1/2 cups flour, sifted');
    expect(version.ingredients[0].quantityMin).toBe(1.5);
  });

  test('preserves ordered ingredient groups and instruction sections', () => {
    const version = parseRecipeVersion({
      ...familyRecipeFixture.version,
      instructions: familyRecipeFixture.version.instructions.map((step, index) => ({
        ...step,
        mediaAssetIds: index === 0 ? ['media-card-front'] : [],
        cues: index === 0 ? [
          { id: 'cue-1', position: 0, text: 'Bake until the center springs back.', mediaAssetIds: ['media-card-front'] },
        ] : [],
      })),
    });

    expect(version.ingredients.map((line) => [line.position, line.groupLabel])).toEqual([
      [0, 'Cake'],
      [1, 'Cake'],
      [2, 'Glaze'],
    ]);
    expect(version.instructions.map((step) => [step.position, step.sectionLabel])).toEqual([
      [0, 'Bake'],
      [1, 'Finish'],
    ]);
    expect(version.instructions.map((step) => step.mediaAssetIds)).toEqual([
      ['media-card-front'],
      [],
    ]);
    expect(version.instructions[0].cues).toEqual([
      { id: 'cue-1', position: 0, text: 'Bake until the center springs back.', mediaAssetIds: ['media-card-front'] },
    ]);
  });

  test('rejects instruction cue positions that are not contiguous', () => {
    const invalidCues = {
      ...familyRecipeFixture.version,
      instructions: [{
        ...familyRecipeFixture.version.instructions[0],
        cues: [{ id: 'cue-2', position: 1, text: 'Bake until done.' }],
      }],
    };

    expect(() => parseRecipeVersion(invalidCues)).toThrow(
      expect.objectContaining<Partial<RecipeContractError>>({ code: 'recipe.instructions.position_invalid' }),
    );
  });

  test('keeps provenance, credit, and lineage as distinct records', () => {
    const copy = parseRecipe(independentCopyFixture.recipe);

    expect(copy.provenance.method).toBe('copy');
    expect(copy.credits[0]).toMatchObject({ role: 'family_source', displayLabel: 'Grandma Ruth' });
    expect(copy.lineage[0]).toMatchObject({ relationship: 'adaptation', sourceRecipeVersionId: 'rv-source-4' });
    expect(copy.ownerPersonId).toBe('person-recipient');
  });

  test('models collaboration as explicit access rather than co-ownership', () => {
    const collaborated = parseRecipe(collaboratedRecipeFixture.recipe);

    expect(collaborated.ownerPersonId).toBe('person-owner');
    expect(collaborated.accessGrants).toEqual([
      expect.objectContaining({ granteePersonId: 'person-helper', role: 'contributor', status: 'active' }),
    ]);
  });

  test('rejects invalid lifecycle, positions, confidence, and private-media claims', () => {
    const invalidLifecycle = { ...familyRecipeFixture.recipe, lifecycle: 'published' };
    expect(() => parseRecipe(invalidLifecycle)).toThrow(
      expect.objectContaining<Partial<RecipeContractError>>({ code: 'recipe.lifecycle.invalid' }),
    );

    const invalidPositions = {
      ...familyRecipeFixture.version,
      ingredients: familyRecipeFixture.version.ingredients.map((line) => ({ ...line, position: 0 })),
    };
    expect(() => parseRecipeVersion(invalidPositions)).toThrow(
      expect.objectContaining<Partial<RecipeContractError>>({ code: 'recipe.ingredients.position_invalid' }),
    );

    const invalidConfidence = {
      ...familyRecipeFixture.version,
      ingredients: [{ ...familyRecipeFixture.version.ingredients[0], parseConfidence: 1.2 }],
    };
    expect(() => parseRecipeVersion(invalidConfidence)).toThrow(
      expect.objectContaining<Partial<RecipeContractError>>({ code: 'recipe.ingredient.confidence_invalid' }),
    );

    const invalidMedia = {
      ...familyRecipeFixture.recipe,
      mediaAssets: [{ ...familyRecipeFixture.recipe.mediaAssets[0], publicAllowed: true, rightsBasis: 'private_user_import' }],
    };
    expect(() => parseRecipe(invalidMedia)).toThrow(
      expect.objectContaining<Partial<RecipeContractError>>({ code: 'recipe.media.public_rights_invalid' }),
    );
  });

  test('rejects unknown canonical fields and over-limit content', () => {
    expect(() => parseRecipe({ ...familyRecipeFixture.recipe, visibility: 'public' })).toThrow(
      expect.objectContaining<Partial<RecipeContractError>>({ code: 'recipe.field.unknown' }),
    );
    expect(() => parseRecipeVersion({ ...familyRecipeFixture.version, title: 'x'.repeat(161) })).toThrow(
      expect.objectContaining<Partial<RecipeContractError>>({ code: 'recipe.title.invalid' }),
    );
  });
});
