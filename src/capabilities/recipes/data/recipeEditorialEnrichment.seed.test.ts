import { createHash } from 'node:crypto';

import { RECIPE_EDITORIAL_ENRICHMENT_SEEDS } from './recipeEditorialEnrichment.seed';
import { STARTER_EDITORIAL_RECIPE_CATALOG } from './starterEditorialRecipeCatalog';

const EXPECTED_PUBLIC_ROSTER_IDS = [
  'BR016', 'BR031', 'BR073', 'BR078', 'DI061', 'DI133', 'LU037', 'LU038', 'LU050', 'SO011',
];

function sourceHash(recipe: typeof STARTER_EDITORIAL_RECIPE_CATALOG[number]): string {
  const evidence = {
    rosterId: recipe.rosterId,
    title: recipe.title,
    description: recipe.description,
    category: recipe.category,
    cuisine: recipe.cuisine,
    yieldQuantity: recipe.yieldQuantity,
    yieldUnit: recipe.yieldUnit,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    notes: recipe.notes,
  };
  return `sha256:${createHash('sha256').update(JSON.stringify(evidence)).digest('hex')}`;
}

describe('public Recipe enrichment seeds', () => {
  it('ports the ten reviewed website histories and published hero images against current canonical content', () => {
    const recordsByRosterId = new Map(RECIPE_EDITORIAL_ENRICHMENT_SEEDS.map((record) => [record.rosterId, record] as const));
    expect([...recordsByRosterId.keys()]).toEqual(expect.arrayContaining(EXPECTED_PUBLIC_ROSTER_IDS));
    expect(recordsByRosterId.size).toBe(RECIPE_EDITORIAL_ENRICHMENT_SEEDS.length);
    const recipeByRosterId = new Map(STARTER_EDITORIAL_RECIPE_CATALOG.map((recipe) => [recipe.rosterId, recipe] as const));
    for (const record of RECIPE_EDITORIAL_ENRICHMENT_SEEDS) {
      const recipe = recipeByRosterId.get(record.rosterId);
      expect(recipe).toBeDefined();
      expect(record.sourceRecipeHash).toBe(sourceHash(recipe!));
      expect(record.history.paragraphs).toHaveLength(2);
      expect(record.history.sources.length).toBeGreaterThanOrEqual(1);
      expect(record.origin.region).toBeTruthy();
    }
    for (const rosterId of EXPECTED_PUBLIC_ROSTER_IDS) {
      expect(recordsByRosterId.get(rosterId)?.heroImage).toEqual(expect.objectContaining({ state: 'published', width: 1536, height: 1024 }));
    }
  });

  it('preserves the three complete equipment pilots as non-commercial Recipe facts', () => {
    const byRosterId = new Map(RECIPE_EDITORIAL_ENRICHMENT_SEEDS.map((record) => [record.rosterId, record]));
    expect(byRosterId.get('BR031')?.equipmentNeeds).toHaveLength(7);
    expect(byRosterId.get('LU037')?.equipmentNeeds).toHaveLength(6);
    expect(byRosterId.get('DI061')?.equipmentNeeds).toHaveLength(4);
    expect(byRosterId.get('BR016')?.equipmentNeeds).toEqual([]);
  });
});
