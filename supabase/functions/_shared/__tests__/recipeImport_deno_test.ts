import {
  extractSchemaRecipe,
  parseRecipeImportRequest,
  validateExternalRecipeUrl,
} from '../recipeImport.ts';
import {
  buildRecipeImportExtractionSchema,
  validateRecipeEquipmentRequirements,
} from '../recipeEquipmentExtraction.ts';

Deno.test('accepts a bounded URL import request', () => {
  const result = parseRecipeImportRequest({ method: 'url', sourceUrl: 'https://example.com/soup', idempotencyKey: 'import-1' });
  if (!result.ok || result.value.sourceUrl !== 'https://example.com/soup') throw new Error('valid URL request rejected');
});

Deno.test('rejects local, private, credentialed, and non-https URL targets', () => {
  for (const url of ['http://example.com', 'https://localhost/a', 'https://127.0.0.1/a', 'https://10.0.0.2/a', 'https://[::1]/a', 'https://[fd00::1]/a', 'https://[::ffff:127.0.0.1]/a', 'https://user:pass@example.com/a']) {
    if (validateExternalRecipeUrl(url).ok) throw new Error(`unsafe URL accepted: ${url}`);
  }
});

Deno.test('rejects oversized source text and unknown request fields', () => {
  if (parseRecipeImportRequest({ method: 'text', sourceText: 'a'.repeat(50_001), idempotencyKey: 'x' }).ok) throw new Error('oversized text accepted');
  if (parseRecipeImportRequest({ method: 'text', sourceText: 'Soup', idempotencyKey: 'x', ownerPersonId: 'forged' }).ok) throw new Error('unknown identity field accepted');
});

Deno.test('extracts schema.org Recipe JSON-LD while preserving literal lines', () => {
  const html = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Recipe', name: 'Tomato soup', recipeYield: '4 servings',
    recipeIngredient: ['2 cans tomatoes', 'salt to taste'],
    recipeInstructions: [{ '@type': 'HowToStep', text: 'Simmer for 20 minutes.' }],
    author: { '@type': 'Person', name: 'Ada' },
  })}</script>`;
  const extracted = extractSchemaRecipe(html, 'https://example.com/soup');
  if (!extracted || extracted.title !== 'Tomato soup') throw new Error('recipe not extracted');
  if (extracted.ingredients[1]?.originalText !== 'salt to taste') throw new Error('literal ingredient changed');
  if (extracted.instructions[0]?.text !== 'Simmer for 20 minutes.') throw new Error('instruction changed');
  if (extracted.sourceAuthor !== 'Ada') throw new Error('author evidence lost');
});

Deno.test('requires bounded equipment evidence in the strict recipe import schema', () => {
  const schema = buildRecipeImportExtractionSchema() as Record<string, any>;
  if (!schema.required.includes('equipmentRequirements')) throw new Error('equipment requirements are not required');
  const equipment = schema.properties.equipmentRequirements;
  if (equipment.type !== 'array' || equipment.maxItems !== 24) throw new Error('equipment requirements are not bounded');
  if (!equipment.items.required.includes('evidenceText')) throw new Error('equipment evidence is not required');
});

Deno.test('keeps only equipment grounded in the reviewed recipe instructions', () => {
  const requirements = validateRecipeEquipmentRequirements([
    {
      id: 'spiralizer', label: 'Spiralizer', searchQuery: 'vegetable spiralizer', necessity: 'required',
      confidence: 0.94, evidenceText: 'Cut the zucchini with a spiralizer.', substitute: null,
    },
    {
      id: 'air-fryer', label: 'Air fryer', searchQuery: 'air fryer', necessity: 'required',
      confidence: 0.99, evidenceText: 'Cook in an air fryer.', substitute: null,
    },
  ], ['Cut the zucchini with a spiralizer.']);

  if (requirements.length !== 1 || requirements[0]?.id !== 'spiralizer') {
    throw new Error('ungrounded equipment evidence was accepted');
  }
});
