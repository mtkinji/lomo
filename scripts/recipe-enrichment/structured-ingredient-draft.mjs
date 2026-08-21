import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileTypeScriptExport, loadCanonicalCatalog } from './catalog.mjs';

const kwiltRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function buildStructuredIngredientDraft(recipe, parseIngredientLine) {
  const reviewFindings = [];
  const lines = recipe.ingredients.map((originalText, position) => {
    const parsed = parseIngredientLine(originalText);
    const optional = /\boptional\b|\bfor serving\b|\bfor garnish\b/i.test(originalText);
    const reasons = [];
    if (parsed.quantityMin === null) reasons.push('missing_quantity');
    if (/\bor\b|\bto\b|\d\s*[–-]\s*\d/i.test(originalText)) reasons.push('alternative_or_range');
    if (/\([^)]*(?:ounce|pound|gram|each|package)[^)]*\)|\b(?:can|package|jar|bottle)s?\b/i.test(originalText)) reasons.push('package_expression');
    if (/\bplus more\b|\bas needed\b|\bdivided\b/i.test(originalText)) reasons.push('variable_or_divided');
    if (!parsed.concept?.trim()) reasons.push('missing_concept');
    if (reasons.length) reviewFindings.push({ position, originalText, reasons });
    const confidence = Math.max(0.5, Math.round(((parsed.quantityMin === null ? 0.82 : 0.98) - reasons.filter((reason) => reason !== 'missing_quantity').length * 0.1) * 100) / 100);
    return {
      position,
      originalText,
      quantityMin: parsed.quantityMin,
      quantityMax: parsed.quantityMax,
      unit: parsed.unit,
      ingredientConcept: parsed.concept?.trim() || null,
      preparation: parsed.preparation?.trim() || null,
      optional,
      parseConfidence: confidence,
    };
  });
  return { rosterId: recipe.rosterId, lines, reviewFindings };
}

async function runCli() {
  const batchPath = process.argv[2];
  if (!batchPath) throw new Error('Provide one batch manifest path.');
  const [batch, catalog, parseIngredientLine] = await Promise.all([
    readFile(path.resolve(batchPath), 'utf8').then(JSON.parse),
    loadCanonicalCatalog(kwiltRoot),
    compileTypeScriptExport({
      sourceFiles: [path.join(kwiltRoot, 'packages/food-core/src/index.ts')],
      rootDir: path.join(kwiltRoot, 'packages/food-core/src'),
      exportFile: path.join(kwiltRoot, 'packages/food-core/src/index.ts'),
      exportName: 'parseIngredientLine',
    }),
  ]);
  const wanted = new Set(batch.recipes.map((recipe) => recipe.rosterId));
  const recipes = catalog.filter((recipe) => wanted.has(recipe.rosterId)).map((recipe) => buildStructuredIngredientDraft(recipe, parseIngredientLine));
  process.stdout.write(`${JSON.stringify({ schemaVersion: 1, batchId: batch.batchId, manifestHash: batch.manifestHash, recipes }, null, 2)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await runCli();
