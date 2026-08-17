import { recipeContractFixture, recipeVersionContractFixture } from '../../capabilities/recipes/domain/recipeContractFixtures';
import {
  buildReviewedRecipeCreate,
  buildReviewedRecipeUpdate,
} from './recipeProposal';

describe('Recipe Chat proposals', () => {
  test('builds strict private reviewed data from a conversational recipe draft', () => {
    const reviewed = buildReviewedRecipeCreate({
      title: 'Hokkaido Cheese Potato Mochi',
      description: 'Crisp potato cakes with a molten cheese center.',
      yieldQuantity: 6,
      yieldUnit: 'pieces',
      prepMinutes: 20,
      cookMinutes: 15,
      notes: 'Serve while hot.',
      ingredients: ['2 russet potatoes', '6 cubes mozzarella', '2 tbsp potato starch'],
      instructions: ['Boil and mash the potatoes.', 'Wrap each portion around cheese.', 'Pan-fry until golden.'],
    });

    expect(reviewed).toMatchObject({
      title: 'Hokkaido Cheese Potato Mochi',
      yieldQuantity: 6,
      yieldUnit: 'pieces',
      provenance: { method: 'manual', rightsBasis: 'user_authored' },
      credits: [],
      lineage: [],
    });
    expect(reviewed?.ingredients.map((line) => line.originalText)).toEqual([
      '2 russet potatoes', '6 cubes mozzarella', '2 tbsp potato starch',
    ]);
    expect(reviewed?.instructions.map((step) => step.text)).toEqual([
      'Boil and mash the potatoes.', 'Wrap each portion around cheese.', 'Pan-fry until golden.',
    ]);
  });

  test('merges a bounded patch into the complete authoritative version', () => {
    const recipe = recipeContractFixture();
    const currentVersion = recipeVersionContractFixture();
    const reviewed = buildReviewedRecipeUpdate({ recipe, currentVersion }, {
      title: 'Grandma Ruth’s Celebration Cake',
      notes: 'Use the lemon glaze next time.',
      ingredients: ['1 1/2 cups flour, sifted', '3 eggs'],
    });

    expect(reviewed).toMatchObject({
      title: 'Grandma Ruth’s Celebration Cake',
      description: currentVersion.description,
      yieldQuantity: currentVersion.yieldQuantity,
      prepMinutes: currentVersion.prepMinutes,
      cookMinutes: currentVersion.cookMinutes,
      notes: 'Use the lemon glaze next time.',
      provenance: {
        method: recipe.provenance.method,
        sourceTitle: recipe.provenance.sourceTitle,
        rightsBasis: recipe.provenance.rightsBasis,
      },
    });
    expect(reviewed?.ingredients.map((line) => line.originalText)).toEqual([
      '1 1/2 cups flour, sifted', '3 eggs',
    ]);
    expect(reviewed?.instructions.map((step) => step.text)).toEqual(
      currentVersion.instructions.map((step) => step.text),
    );
  });

  test('preserves persisted equipment evidence when chat leaves instructions unchanged', () => {
    const recipe = recipeContractFixture();
    const currentVersion = {
      ...recipeVersionContractFixture(),
      instructions: [{
        ...recipeVersionContractFixture().instructions[0],
        text: 'Cut the zucchini with a spiralizer.',
      }],
      equipmentRequirements: [{
        id: 'spiralizer', label: 'Spiralizer', searchQuery: 'vegetable spiralizer', necessity: 'required' as const,
        confidence: 0.94, evidenceText: 'Cut the zucchini with a spiralizer.', substitute: null,
      }],
    };

    expect(buildReviewedRecipeUpdate({ recipe, currentVersion }, { title: 'Zucchini noodles' })?.equipmentRequirements)
      .toEqual(currentVersion.equipmentRequirements);
  });

  test('rejects empty recipe content instead of staging a guessed write', () => {
    expect(buildReviewedRecipeCreate({ title: 'Only a title' })).toBeNull();
    expect(buildReviewedRecipeCreate({
      title: 'No method', ingredients: ['1 potato'], instructions: [],
    })).toBeNull();
  });
});
