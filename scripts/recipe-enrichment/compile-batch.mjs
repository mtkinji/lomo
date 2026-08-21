import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { compileReviewedBatch } from './batch-compiler.mjs';
import { compileTypeScriptExport, loadCanonicalCatalog } from './catalog.mjs';
import { buildStructuredIngredientDraft } from './structured-ingredient-draft.mjs';

const [batchArgument, authoringArgument, outputArgument] = process.argv.slice(2);
if (!batchArgument || !authoringArgument || !outputArgument) {
  throw new Error('Use compile-batch <batch manifest> <authoring module> <output JSON>.');
}

const root = process.cwd();
const batchPath = path.resolve(batchArgument);
const authoringPath = path.resolve(authoringArgument);
const outputPath = path.resolve(outputArgument);
const dataRoot = path.join(root, 'src/capabilities/recipes/data');
const foodCoreRoot = path.join(root, 'packages/food-core/src');

const [batch, catalog, authoringModule, seed, parseIngredientLine] = await Promise.all([
  readFile(batchPath, 'utf8').then(JSON.parse),
  loadCanonicalCatalog(root),
  import(pathToFileURL(authoringPath).href),
  readFile(path.join(dataRoot, 'recipeEditorialEnrichment.seed.json'), 'utf8').then(JSON.parse),
  compileTypeScriptExport({
    sourceFiles: [path.join(foodCoreRoot, 'index.ts')],
    rootDir: foodCoreRoot,
    exportFile: path.join(foodCoreRoot, 'index.ts'),
    exportName: 'parseIngredientLine',
  }),
]);

const wanted = new Set(batch.recipes.map(({ rosterId }) => rosterId));
const structuredDrafts = catalog
  .filter(({ rosterId }) => wanted.has(rosterId))
  .map((recipe) => buildStructuredIngredientDraft(recipe, parseIngredientLine));
const result = compileReviewedBatch({
  batch,
  catalog,
  structuredDrafts,
  authoring: authoringModule.default,
  existingRecords: seed.recipes,
});

await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
process.stdout.write(`${result.batchId}: compiled ${result.recipes.length} reviewed Recipes to ${outputPath}\n`);
