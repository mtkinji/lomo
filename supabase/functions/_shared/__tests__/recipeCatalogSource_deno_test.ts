import { parseRecipeCatalogSource } from '../recipeCatalogSource.ts';

function source() {
  const ingredients = ['250–500ml milk', '500g carrots', '1 teaspoon salt', '2 cups rice', '1 onion'];
  return { rosterId: 'DI531', publicSlug: 'test-recipe', title: 'Test recipe', category: 'Dinner', cuisine: 'Home', contentHash: 'test-hash',
    ingredients, instructions: ['Prepare.', 'Combine.', 'Cook.', 'Serve.'], scalingState: 'verified',
    structuredIngredients: ingredients.map((originalText, position) => ({ position, originalText,
      quantityMin: 250, quantityMax: 500, unit: 'milliliter', ingredientConcept: 'milk', preparation: 'cold',
      optional: true, parseConfidence: 0.95, scaleRule: { kind: 'multiply' } })),
  };
}
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

Deno.test('canonical ingestion retains the reviewed parsed fields instead of degrading them to raw lines', () => {
  const input = source();
  const result = parseRecipeCatalogSource(input);
  assert(JSON.stringify(result.structuredIngredients) === JSON.stringify(input.structuredIngredients), 'reviewed fields were dropped');
});

Deno.test('canonical ingestion rejects malformed reviewed quantities, flags, and confidence', () => {
  for (const patch of [{ quantityMin: NaN }, { quantityMax: Infinity }, { quantityMin: -1 }, { quantityMax: 249 },
    { quantityMin: null, quantityMax: 500 }, { optional: 'false' }, { parseConfidence: 2 }, { unit: 1 }]) {
    const input = source();
    Object.assign(input.structuredIngredients[0], patch);
    let rejected = false;
    try { parseRecipeCatalogSource(input); } catch { rejected = true; }
    assert(rejected, `accepted malformed review ${JSON.stringify(patch)}`);
  }
});

Deno.test('canonical ingestion keeps legacy absent parsing conservative and requires aligned scale rules', () => {
  const legacy = source();
  const onlyRules = legacy.structuredIngredients.map(({ position, originalText, scaleRule }) => ({ position, originalText, scaleRule }));
  const parsed = parseRecipeCatalogSource({ ...legacy, structuredIngredients: onlyRules });
  assert(JSON.stringify(parsed.structuredIngredients) === JSON.stringify(onlyRules), 'legacy missing fields were changed into destructive null values');
  const input = source();
  input.structuredIngredients[0].originalText = 'different line';
  let rejected = false;
  try { parseRecipeCatalogSource(input); } catch { rejected = true; }
  assert(rejected, 'unaligned source accepted');
});
