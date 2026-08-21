import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalRecipeHash, compileTypeScriptExport, loadCanonicalCatalog } from './catalog.mjs';

const kwiltRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const seedPath = path.join(kwiltRoot, 'src/capabilities/recipes/data/recipeEditorialEnrichment.seed.json');

function reviewedByRosterId(reviewedRecords) {
  return new Map(reviewedRecords.map((record) => [record.rosterId, record]));
}

export function buildEnrichmentManifest(catalog, reviewedRecords) {
  const reviewed = reviewedByRosterId(reviewedRecords);
  const recipes = [...catalog].sort((left, right) => left.rosterId.localeCompare(right.rosterId)).map((recipe) => {
    const record = reviewed.get(recipe.rosterId) ?? null;
    return {
      rosterId: recipe.rosterId,
      sourceRecipeHash: canonicalRecipeHash(recipe),
      title: recipe.title,
      cuisine: recipe.cuisine,
      equipmentState: record?.review?.sections?.equipment ?? (record?.equipmentNeeds?.length ? 'reviewed' : 'pending'),
      originHistoryState: record?.review?.sections?.originHistory ?? (record ? 'reviewed' : 'pending'),
      historySourceCount: record?.history?.sources?.length ?? 0,
      heroImageState: record?.heroImage?.state ?? 'missing',
      researchTask: record && (record.review?.sections?.originHistory ?? 'reviewed') === 'reviewed' ? null : {
        description: recipe.description,
        category: recipe.category,
        cuisine: recipe.cuisine,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        notes: recipe.notes,
        sources: recipe.research.sources.map(({ publisher, title, url, signal }) => ({ publisher, title, url, signal })),
        existingResearch: {
          nonNegotiableTechniques: recipe.research.nonNegotiableTechniques,
          repeatedSuccessSignals: recipe.research.repeatedSuccessSignals,
          repeatedFailureRisks: recipe.research.repeatedFailureRisks,
          adaptationDecision: recipe.research.adaptationDecision,
        },
        requestedOutput: {
          equipment: 'Meaningful preparation tools only, each grounded in an exact instruction phrase; do not create product links.',
          origin: 'Bounded place/region claims with valid coordinates and country identifiers.',
          history: 'Two concise paragraphs with one or more directly supporting HTTPS sources; target two independent sources.',
          imagery: 'A culturally plausible, ingredient-faithful hero brief and factual alt text; image approval remains a separate editorial gate.',
        },
      },
    };
  });
  return { schemaVersion: 2, recipes };
}

export function buildCoverage(manifest) {
  const recipes = manifest.recipes;
  const reviewedEquipment = recipes.filter(({ equipmentState }) => equipmentState === 'reviewed').length;
  const publishedHeroImages = recipes.filter(({ heroImageState }) => heroImageState === 'published').length;
  return {
    totalRecipes: recipes.length,
    representedRecipes: new Set(recipes.map(({ rosterId }) => rosterId)).size,
    reviewedOriginHistory: recipes.filter(({ originHistoryState }) => originHistoryState === 'reviewed').length,
    historyDepthGaps: recipes.filter(({ originHistoryState, historySourceCount }) => originHistoryState === 'reviewed' && historySourceCount < 2).length,
    reviewedEquipment,
    pendingEquipment: recipes.length - reviewedEquipment,
    publishedHeroImages,
    pendingOrMissingHeroImages: recipes.length - publishedHeroImages,
  };
}

export function mergeReviewedRecords(catalog, existingRecords, incomingRecords, options = {}) {
  const recipeByRosterId = new Map(catalog.map((recipe) => [recipe.rosterId, recipe]));
  const merged = reviewedByRosterId(existingRecords);
  for (const record of incomingRecords) {
    const recipe = recipeByRosterId.get(record.rosterId);
    if (!recipe) throw new Error(`Reviewed record ${record.rosterId} has no canonical Recipe.`);
    if (record.sourceRecipeHash !== canonicalRecipeHash(recipe)) throw new Error(`Reviewed record ${record.rosterId} source hash is stale.`);
    if (merged.has(record.rosterId) && !options.allowReplace) throw new Error(`Recipe ${record.rosterId} already has a reviewed record.`);
    merged.set(record.rosterId, record);
  }
  return [...merged.values()].sort((left, right) => left.rosterId.localeCompare(right.rosterId));
}

export function parseMergeArguments(args) {
  const [draftPath, second, third, ...rest] = args;
  if (!draftPath) throw new Error('merge requires a draft enrichment JSON path.');
  const options = [second, third, ...rest].filter(Boolean);
  const unsupported = options.find((value) => value.startsWith('--') && value !== '--replace');
  if (unsupported) throw new Error(`unsupported merge option: ${unsupported}`);
  const positional = options.filter((value) => !value.startsWith('--'));
  if (positional.length > 1) throw new Error('merge accepts at most one output path.');
  return { draftPath, outputPath: positional[0], allowReplace: options.includes('--replace') };
}

export function assertNoCommandArguments(command, args) {
  if (args.length > 0) throw new Error(`${command} does not accept arguments.`);
}

export async function validateReviewedRecords(catalog, records) {
  const dataRoot = path.join(kwiltRoot, 'src/capabilities/recipes/data');
  const parserFile = path.join(dataRoot, 'recipeEditorialEnrichment.ts');
  const parse = await compileTypeScriptExport({
    sourceFiles: [parserFile],
    rootDir: dataRoot,
    exportFile: parserFile,
    exportName: 'parseRecipeEditorialEnrichment',
  });
  const recipeByRosterId = new Map(catalog.map((recipe) => [recipe.rosterId, recipe]));
  const seen = new Set();
  return records.map((record) => {
    if (seen.has(record.rosterId)) throw new Error(`Reviewed record ${record.rosterId} is duplicated.`);
    seen.add(record.rosterId);
    const recipe = recipeByRosterId.get(record.rosterId);
    if (!recipe) throw new Error(`Reviewed record ${record.rosterId} has no canonical Recipe.`);
    const parsed = parse(record, recipe.instructions, recipe.ingredients);
    if (parsed.sourceRecipeHash !== canonicalRecipeHash(recipe)) throw new Error(`Reviewed record ${record.rosterId} source hash is stale.`);
    return parsed;
  });
}

async function readRecords(filePath) {
  const data = JSON.parse(await readFile(filePath, 'utf8'));
  if (!data || ![1, 2].includes(data.schemaVersion) || !Array.isArray(data.recipes)) throw new Error(`${filePath} is not a Recipe enrichment envelope.`);
  return data.recipes;
}

async function outputJson(value, outputPath) {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  if (outputPath) await writeFile(path.resolve(outputPath), serialized, 'utf8');
  else process.stdout.write(serialized);
}

async function runCli() {
  const command = process.argv[2];
  const catalog = await loadCanonicalCatalog(kwiltRoot);
  const existing = await readRecords(seedPath);
  if (command === 'manifest') {
    await outputJson(buildEnrichmentManifest(catalog, existing), process.argv[3]);
    return;
  }
  if (command === 'coverage') {
    await outputJson(buildCoverage(buildEnrichmentManifest(catalog, existing)), process.argv[3]);
    return;
  }
  if (command === 'validate') {
    assertNoCommandArguments(command, process.argv.slice(3));
    const validated = await validateReviewedRecords(catalog, existing);
    await outputJson({ valid: true, reviewedRecords: validated.length });
    return;
  }
  if (command === 'merge') {
    const { draftPath, outputPath, allowReplace } = parseMergeArguments(process.argv.slice(3));
    const incoming = await readRecords(path.resolve(draftPath));
    await validateReviewedRecords(catalog, incoming);
    const merged = mergeReviewedRecords(catalog, existing, incoming, { allowReplace });
    await outputJson({ schemaVersion: 2, source: 'kwilt-reviewed-recipe-enrichment', recipes: merged }, outputPath);
    return;
  }
  if (command === 'export-public') {
    const validated = await validateReviewedRecords(catalog, existing);
    await outputJson({ schemaVersion: 2, recipes: validated }, process.argv[3]);
    return;
  }
  throw new Error('Use manifest, coverage, validate, merge <draft> [output] [--replace], or export-public [output].');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await runCli();
