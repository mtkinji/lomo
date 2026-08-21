import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalRecipeHash, compileTypeScriptExport, loadCanonicalCatalog } from './catalog.mjs';

const kwiltRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const gitCommonDir = path.resolve(
  kwiltRoot,
  execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd: kwiltRoot, encoding: 'utf8' }).trim(),
);
const primaryKwiltRoot = path.dirname(gitCommonDir);
const siteRoot = process.env.KWILT_SITE_REPO_PATH
  ? path.resolve(process.env.KWILT_SITE_REPO_PATH)
  : path.resolve(primaryKwiltRoot, '../kwilt-site');
const siteLib = path.join(siteRoot, 'lib');

const editorial = await compileTypeScriptExport({
  sourceFiles: [path.join(siteLib, 'publicRecipeEditorial.ts'), path.join(siteLib, 'recipeEquipmentExperience.ts')],
  rootDir: siteLib,
  exportFile: path.join(siteLib, 'publicRecipeEditorial.ts'),
  exportName: 'publicRecipeEditorialByRosterId',
});
const publicProjection = JSON.parse(await readFile(path.join(siteLib, 'publicRecipes.generated.json'), 'utf8'));
const publicByRosterId = new Map(publicProjection.recipes.map((recipe) => [recipe.rosterId, recipe]));
const catalog = await loadCanonicalCatalog(kwiltRoot);
const catalogByRosterId = new Map(catalog.map((recipe) => [recipe.rosterId, recipe]));

const seeds = Object.entries(editorial).sort(([left], [right]) => left.localeCompare(right)).map(([rosterId, value]) => {
  const recipe = catalogByRosterId.get(rosterId);
  const publication = publicByRosterId.get(rosterId);
  if (!recipe || !publication) throw new Error(`Site seed ${rosterId} has no canonical Recipe or publication media.`);
  return {
    schemaVersion: 1,
    rosterId,
    sourceRecipeHash: canonicalRecipeHash(recipe),
    review: { state: 'reviewed', reviewedAt: '2026-08-19', reviewedBy: 'Kwilt Kitchen' },
    equipmentNeeds: value.equipmentNeeds ?? [],
    equipmentAnnotations: value.equipmentAnnotations ?? [],
    origin: value.origin,
    history: { paragraphs: value.paragraphs, sources: value.sources },
    heroImage: {
      state: 'published',
      storageRef: publication.image.url,
      altText: publication.image.alt,
      width: publication.image.width,
      height: publication.image.height,
    },
  };
});

const outputPath = path.join(kwiltRoot, 'src/capabilities/recipes/data/recipeEditorialEnrichment.seed.json');
await writeFile(outputPath, `${JSON.stringify({ schemaVersion: 1, source: 'kwilt-site-public-recipes', recipes: seeds }, null, 2)}\n`, 'utf8');
console.log(`Imported ${seeds.length} reviewed public Recipe enrichment seeds.`);
