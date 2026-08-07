import {
  extractSchemaRecipe,
  parseRecipeImportRequest,
  validateExternalRecipeUrl,
} from '../recipeImport.ts';

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
