import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCanonicalCatalog } from './catalog.mjs';

const kwiltRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function buildStructuredIngredientAudit(catalog, records) {
  const byRosterId = new Map(records.map((record) => [record.rosterId, record]));
  let reviewedIngredientLines = 0;
  let quantityCoverage = 0;
  let unitCoverage = 0;
  let conceptCoverage = 0;
  let preparationCoverage = 0;
  let optionalFlags = 0;
  let fullyReviewedRecipes = 0;

  const recipes = catalog.map((recipe) => {
    const record = byRosterId.get(recipe.rosterId);
    const lines = Array.isArray(record?.structuredIngredients) ? record.structuredIngredients : [];
    const reviewed = record?.review?.sections?.structuredIngredients === 'reviewed';
    const blockingFindings = [];
    if (reviewed && lines.length !== recipe.ingredients.length) blockingFindings.push('Reviewed line count does not match the canonical Recipe.');
    lines.forEach((line, index) => {
      if (line.position !== index) blockingFindings.push(`Ingredient ${index + 1} has a non-contiguous position.`);
      if (line.originalText !== recipe.ingredients[index]) blockingFindings.push(`Ingredient ${index + 1} does not match canonical text.`);
    });
    if (reviewed && !blockingFindings.length) {
      fullyReviewedRecipes += 1;
      reviewedIngredientLines += lines.length;
      quantityCoverage += lines.filter((line) => line.quantityMin != null).length;
      unitCoverage += lines.filter((line) => line.unit != null).length;
      conceptCoverage += lines.filter((line) => line.ingredientConcept != null).length;
      preparationCoverage += lines.filter((line) => line.preparation != null).length;
      optionalFlags += lines.filter((line) => line.optional === true).length;
    }
    return { rosterId: recipe.rosterId, state: reviewed ? 'reviewed' : 'pending', lineCount: lines.length, blockingFindings };
  });

  return {
    schemaVersion: 1,
    summary: {
      totalRecipes: catalog.length,
      totalIngredientLines: catalog.reduce((sum, recipe) => sum + recipe.ingredients.length, 0),
      fullyReviewedRecipes,
      reviewedIngredientLines,
      quantityCoverage,
      unitCoverage,
      conceptCoverage,
      preparationCoverage,
      optionalFlags,
      blockingRecipes: recipes.filter((recipe) => recipe.blockingFindings.length).length,
    },
    recipes,
  };
}

async function runCli() {
  const seedPath = path.join(kwiltRoot, 'src/capabilities/recipes/data/recipeEditorialEnrichment.seed.json');
  const [catalog, envelope] = await Promise.all([
    loadCanonicalCatalog(kwiltRoot),
    readFile(seedPath, 'utf8').then(JSON.parse),
  ]);
  process.stdout.write(`${JSON.stringify(buildStructuredIngredientAudit(catalog, envelope.recipes), null, 2)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await runCli();
