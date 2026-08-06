import type { RecipeProjection } from './data/recipeCache';

export function exportRecipeJsonLd({ recipe, currentVersion: version }: RecipeProjection): Record<string, unknown> {
  const credit = recipe.credits.find((item) => item.publicVisible || item.role === 'family_source' || item.role === 'author');
  const authorName = credit?.displayLabel ?? recipe.provenance.sourceAuthor;
  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: version.title,
    description: version.description ?? undefined,
    recipeYield: version.yieldQuantity ? `${version.yieldQuantity} ${version.yieldUnit ?? 'servings'}` : undefined,
    prepTime: version.prepMinutes === null ? undefined : `PT${version.prepMinutes}M`,
    cookTime: version.cookMinutes === null ? undefined : `PT${version.cookMinutes}M`,
    recipeIngredient: version.ingredients.map((line) => line.originalText),
    recipeInstructions: version.instructions.map((step) => ({ '@type': 'HowToStep', text: step.text })),
    author: authorName ? { '@type': 'Person', name: authorName } : undefined,
  };
}

export function exportRecipeMarkdown({ recipe, currentVersion: version }: RecipeProjection): string {
  const lines = [`# ${version.title}`];
  if (version.description) lines.push('', version.description);
  if (version.yieldQuantity) lines.push('', `Serves ${version.yieldQuantity}${version.yieldUnit ? ` ${version.yieldUnit}` : ''}`);
  lines.push('', '## Ingredients', ...version.ingredients.map((line) => `- ${line.originalText}`));
  lines.push('', '## Directions', ...version.instructions.map((step, index) => `${index + 1}. ${step.text}`));
  if (version.notes) lines.push('', '## Notes', version.notes);
  const source = recipe.credits.find((item) => item.displayLabel)?.displayLabel ?? recipe.provenance.sourceAuthor ?? recipe.provenance.sourceTitle;
  if (source) lines.push('', `Source: ${source}`);
  return lines.join('\n');
}
