import { validateEditorialRecipe } from './editorialRecipeCatalog';
import type { EditorialRecipe } from './editorialRecipeCatalog';

const validRecipe: EditorialRecipe = {
  rosterId: 'BR001',
  title: 'Buttermilk pancakes',
  description: 'Tender pancakes with crisp edges and a gentle buttermilk tang.',
  category: 'Breakfast & brunch',
  cuisine: 'American',
  tier: 'household-anchor',
  yieldQuantity: 4,
  yieldUnit: 'servings',
  prepMinutes: 10,
  cookMinutes: 20,
  inactiveMinutes: 5,
  ingredients: [
    '2 cups all-purpose flour',
    '2 tablespoons granulated sugar',
    '1 teaspoon baking powder',
    '1 teaspoon baking soda',
    '1 teaspoon kosher salt',
    '2 cups well-shaken buttermilk',
    '2 large eggs',
    '4 tablespoons unsalted butter, melted and cooled',
  ],
  instructions: [
    'Heat a griddle over medium heat.',
    'Whisk the dry ingredients together.',
    'Whisk the wet ingredients separately, then fold just until streaky.',
    'Rest five minutes, then cook until bubbles set before flipping once.',
  ],
  notes: 'Do not press the pancakes after flipping.',
  artworkIndex: 0,
  kitchenTestState: 'desk-reviewed',
  research: {
    accessedAt: '2026-08-06',
    sources: [
      { publisher: 'King Arthur Baking', title: 'Buttermilk Pancakes', url: 'https://example.test/one', rating: 4.8, ratingCount: 152, signal: 'Buttermilk and restrained mixing produce tenderness.' },
      { publisher: 'Martha Stewart', title: 'Best Buttermilk Pancakes', url: 'https://example.test/two', rating: 4, ratingCount: 1114, signal: 'A simple batter succeeds when it is not overmixed.' },
      { publisher: 'Bon Appétit', title: 'BA’s Best Buttermilk Pancakes', url: 'https://example.test/three', rating: null, ratingCount: null, signal: 'Holding cooked pancakes in a low oven supports family batches.' },
    ],
    nonNegotiableTechniques: ['Use cultured dairy.', 'Stop mixing while small lumps remain.'],
    repeatedSuccessSignals: ['Tender interior', 'Even browning'],
    repeatedFailureRisks: ['Overmixing makes the crumb tough.', 'A cold pan prevents browning.'],
    adaptationDecision: 'Keep the classic American diner profile and use one-bowl-friendly technique.',
  },
};

describe('editorial Recipe catalog validation', () => {
  it('accepts a complete desk-reviewed recipe', () => {
    expect(validateEditorialRecipe(validRecipe)).toEqual([]);
  });

  it('requires independent source evidence and a usable method', () => {
    const errors = validateEditorialRecipe({
      ...validRecipe,
      ingredients: validRecipe.ingredients.slice(0, 4),
      instructions: validRecipe.instructions.slice(0, 3),
      research: { ...validRecipe.research, sources: validRecipe.research.sources.slice(0, 2) },
    });

    expect(errors).toEqual(expect.arrayContaining([
      'BR001 must have at least 5 ingredients',
      'BR001 must have at least 4 instructions',
      'BR001 must have at least 3 research sources',
    ]));
  });

  it('rejects unsupported kitchen-test claims and malformed rating evidence', () => {
    const errors = validateEditorialRecipe({
      ...validRecipe,
      kitchenTestState: 'repeat-validated',
      research: {
        ...validRecipe.research,
        sources: [
          { ...validRecipe.research.sources[0], rating: 5.2, ratingCount: -1 },
          ...validRecipe.research.sources.slice(1),
        ],
      },
    });

    expect(errors).toEqual(expect.arrayContaining([
      'BR001 cannot claim repeat-validated without kitchen test notes',
      'BR001 source 1 rating must be between 0 and 5',
      'BR001 source 1 ratingCount must be non-negative',
    ]));
  });
});
