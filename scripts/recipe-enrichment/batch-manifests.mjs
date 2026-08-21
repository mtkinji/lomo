import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCanonicalCatalog } from './catalog.mjs';
import { buildEnrichmentManifest } from './pipeline.mjs';

const kwiltRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function buildBatchManifests(manifest, batchSize = 25) {
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new Error('batch size must be a positive integer.');
  const sorted = [...manifest.recipes].sort((left, right) => left.rosterId.localeCompare(right.rosterId));
  if (new Set(sorted.map((recipe) => recipe.rosterId)).size !== sorted.length) throw new Error('manifest contains a duplicate roster id.');
  const batches = [];
  for (let offset = 0; offset < sorted.length; offset += batchSize) {
    const recipes = sorted.slice(offset, offset + batchSize);
    const number = batches.length + 1;
    const batchId = `recipe-enrichment-${String(number).padStart(2, '0')}`;
    const manifestHash = `sha256:${createHash('sha256').update(JSON.stringify(recipes.map(({ rosterId, sourceRecipeHash }) => ({ rosterId, sourceRecipeHash })))).digest('hex')}`;
    batches.push({
      schemaVersion: 1,
      batchId,
      manifestHash,
      state: 'pending',
      requiredGates: ['cooking_truth', 'structured_ingredients', 'origin_history', 'equipment', 'commerce', 'hero_image', 'site_publication'],
      recipes,
    });
  }
  return batches;
}

async function runCli() {
  const outputDir = path.resolve(process.argv[2] ?? path.join(kwiltRoot, 'docs/design-explorations/recipe-catalog-scale-audit/batches'));
  const seedPath = path.join(kwiltRoot, 'src/capabilities/recipes/data/recipeEditorialEnrichment.seed.json');
  const [catalog, envelope] = await Promise.all([
    loadCanonicalCatalog(kwiltRoot),
    readFile(seedPath, 'utf8').then(JSON.parse),
  ]);
  const batches = buildBatchManifests(buildEnrichmentManifest(catalog, envelope.recipes));
  await mkdir(outputDir, { recursive: true });
  await Promise.all(batches.map((batch) => writeFile(path.join(outputDir, `${batch.batchId}.json`), `${JSON.stringify(batch, null, 2)}\n`, 'utf8')));
  await writeFile(path.join(outputDir, 'index.json'), `${JSON.stringify({ schemaVersion: 1, batchSize: 25, totalRecipes: catalog.length, batches: batches.map(({ batchId, manifestHash, recipes }) => ({ batchId, manifestHash, recipeCount: recipes.length, firstRosterId: recipes[0]?.rosterId, lastRosterId: recipes.at(-1)?.rosterId })) }, null, 2)}\n`, 'utf8');
  process.stdout.write(`Wrote ${batches.length} Recipe enrichment manifests covering ${catalog.length} Recipes.\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await runCli();
