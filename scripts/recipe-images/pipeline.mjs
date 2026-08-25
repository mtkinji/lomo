import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { buildWeeklyRecipeBatches, recipePopularityScore } from './popularity.mjs';
import seedData from '../../src/capabilities/recipes/data/recipeEditorialEnrichment.seed.json' with { type: 'json' };
import { canonicalRecipeEvidence, canonicalRecipeHash } from '../recipe-enrichment/catalog.mjs';

const reviewedEnrichmentByRosterId = new Map(seedData.recipes.map((record) => [record.rosterId, record]));

const PILOT_ROSTER_IDS = [
  // Familiar silhouettes: failures are obvious.
  'BR012', 'BR016', 'BR047', 'BR050', 'LU037', 'DI061', 'DI063', 'DI118', 'SO011', 'DE026',
  // Culturally specific forms: fidelity matters more than generic appetite appeal.
  'BR021', 'BR029', 'BR043', 'BR046', 'BR073', 'BR078', 'LU038', 'LU040', 'LU050', 'DI224',
  // Structurally difficult: layers, separated components, or fragile textures.
  'BR031', 'DI064', 'DI065', 'DI133', 'SO012',
];

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function candidateCountFromEnv(value) {
  if (value == null || value.trim() === '') return 3;
  const count = Number(value);
  if (!Number.isInteger(count) || count < 2 || count > 3) {
    throw new Error('KWILT_RECIPE_IMAGE_CANDIDATE_COUNT must be an integer between 2 and 3.');
  }
  return count;
}

export function rosterIdsFromEnv(value) {
  if (value == null || value.trim() === '') return null;
  const rosterIds = [...new Set(value.split(',').map((entry) => entry.trim()).filter(Boolean))];
  if (!rosterIds.length || rosterIds.some((rosterId) => !/^[A-Z]{2}\d{3}$/.test(rosterId))) {
    throw new Error('KWILT_RECIPE_IMAGE_ROSTER_IDS must contain valid canonical Recipe ids.');
  }
  return new Set(rosterIds);
}

export function nextQaSweepState({ consecutiveIdleCalls, considered, allFailed }) {
  if (allFailed) return { consecutiveIdleCalls: 0, shouldContinue: false };
  if (considered > 0) return { consecutiveIdleCalls: 0, shouldContinue: true };
  const nextIdleCalls = consecutiveIdleCalls + 1;
  return { consecutiveIdleCalls: nextIdleCalls, shouldContinue: nextIdleCalls < 2 };
}

function slugify(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 150);
}

async function loadCatalog() {
  const sourceDir = path.resolve('src/capabilities/recipes/data');
  const outputDir = await mkdtemp(path.join(tmpdir(), 'kwilt-recipe-pilot-'));
  try {
    const program = ts.createProgram([path.join(sourceDir, 'starterEditorialRecipeCatalog.ts')], {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir: sourceDir,
      outDir: outputDir,
      skipLibCheck: true,
      esModuleInterop: true,
      noEmitOnError: true,
    });
    const result = program.emit();
    if (result.emitSkipped) throw new Error('Recipe catalog could not be compiled for the pilot manifest.');
    const require = createRequire(import.meta.url);
    return require(path.join(outputDir, 'starterEditorialRecipeCatalog.js')).STARTER_EDITORIAL_RECIPE_CATALOG;
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
}

function authHeaders() {
  const operationToken = process.env.KWILT_RECIPE_IMAGE_OPERATION_TOKEN?.trim();
  const accessToken = process.env.KWILT_RECIPE_IMAGE_ADMIN_TOKEN?.trim();
  if (!operationToken && !accessToken) throw new Error('Set a short-lived operation token or an authenticated admin token.');
  return operationToken ? { 'x-kwilt-operation-token': operationToken } : { Authorization: `Bearer ${accessToken}` };
}

async function invoke(body) {
  const response = await fetch(`${requiredEnv('SUPABASE_URL').replace(/\/$/, '')}/functions/v1/recipe-image-admin`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || `Recipe image operation failed (${response.status}).`);
  return payload;
}

export function buildSources(recipes, enrichmentByRosterId = reviewedEnrichmentByRosterId, imageDirectionByRosterId = new Map()) {
  return recipes.map((recipe) => {
    const rosterId = recipe.rosterId;
    const evidence = canonicalRecipeEvidence(recipe);
    const enrichment = enrichmentByRosterId.get(rosterId) ?? null;
    return {
      ...evidence,
      tier: recipe.tier,
      publicSlug: `${slugify(recipe.title)}-${rosterId.toLowerCase()}`,
      contentHash: canonicalRecipeHash(recipe),
      scalingState: enrichment?.scalingState ?? 'review_required',
      structuredIngredients: enrichment?.structuredIngredients ?? recipe.ingredients.map((originalText, position) => ({
        position,
        originalText,
        scaleRule: { kind: 'review_required' },
      })),
      origin: enrichment ? { label: enrichment.origin.label, region: enrichment.origin.region } : null,
      imageDirection: imageDirectionByRosterId.get(rosterId) ?? enrichment?.heroImage?.altText ?? null,
    };
  });
}

async function importPilot() {
  const catalog = await loadCatalog();
  const byId = new Map(catalog.map((recipe) => [recipe.rosterId, recipe]));
  const recipes = PILOT_ROSTER_IDS.map((rosterId) => {
    const recipe = byId.get(rosterId);
    if (!recipe) throw new Error(`Pilot Recipe ${rosterId} is missing.`);
    return recipe;
  });
  const sources = buildSources(recipes);
  const candidateCount = candidateCountFromEnv(process.env.KWILT_RECIPE_IMAGE_CANDIDATE_COUNT);
  if (process.argv[2] === 'manifest') {
    console.log(JSON.stringify({ action: 'import', ownerPersonId: process.env.KWILT_RECIPE_CATALOG_OWNER_PERSON_ID ?? null, candidateCount, sources }));
    return;
  }
  const result = await invoke({ action: 'import', ownerPersonId: requiredEnv('KWILT_RECIPE_CATALOG_OWNER_PERSON_ID'), candidateCount, sources });
  console.log(JSON.stringify(result, null, 2));
}

async function importManifestBatch() {
  const manifestPath = process.argv[3];
  if (!manifestPath) throw new Error('import-batch requires a Recipe enrichment manifest path.');
  const manifest = JSON.parse(await (await import('node:fs/promises')).readFile(path.resolve(manifestPath), 'utf8'));
  if (!Array.isArray(manifest.recipes) || manifest.recipes.length < 1 || manifest.recipes.length > 25) {
    throw new Error('The Recipe enrichment manifest must contain between 1 and 25 Recipes.');
  }
  const catalog = await loadCatalog();
  const authoringPath = path.resolve(
    'scripts/recipe-enrichment/reviewed-batches/authoring',
    `${path.basename(manifestPath, path.extname(manifestPath))}.mjs`,
  );
  const authored = (await import(pathToFileURL(authoringPath).href)).default;
  const authoredByRosterId = new Map(Object.entries(authored));
  const imageDirectionByRosterId = new Map(Object.entries(authored).map(([rosterId, value]) => [rosterId, value.imageBrief]));
  const byId = new Map(catalog.map((recipe) => [recipe.rosterId, recipe]));
  const selectedRosterIds = rosterIdsFromEnv(process.env.KWILT_RECIPE_IMAGE_ROSTER_IDS);
  if (selectedRosterIds) {
    const manifestRosterIds = new Set(manifest.recipes.map(({ rosterId }) => rosterId));
    const missing = [...selectedRosterIds].filter((rosterId) => !manifestRosterIds.has(rosterId));
    if (missing.length) throw new Error(`Adaptive image Recipes are not in the manifest: ${missing.join(', ')}.`);
  }
  const recipes = manifest.recipes
    .filter(({ rosterId, heroImageState }) => heroImageState !== 'published' && (!selectedRosterIds || selectedRosterIds.has(rosterId)))
    .map(({ rosterId }) => {
    const recipe = byId.get(rosterId);
    if (!recipe) throw new Error(`Manifest Recipe ${rosterId} is missing from the canonical catalog.`);
    return recipe;
    });
  const sources = buildSources(recipes, authoredByRosterId, imageDirectionByRosterId);
  const body = {
    action: 'import',
    ownerPersonId: process.env.KWILT_RECIPE_CATALOG_OWNER_PERSON_ID ?? null,
    candidateCount: candidateCountFromEnv(process.env.KWILT_RECIPE_IMAGE_CANDIDATE_COUNT),
    sources,
  };
  if (process.argv[2] === 'batch-manifest') {
    console.log(JSON.stringify(body));
    return;
  }
  body.ownerPersonId = requiredEnv('KWILT_RECIPE_CATALOG_OWNER_PERSON_ID');
  console.log(JSON.stringify(await invoke(body), null, 2));
}

async function weeklyManifest() {
  const batchNumber = Number(process.argv[3]);
  const chunkNumber = Number(process.argv[4]);
  if (!Number.isInteger(batchNumber) || batchNumber < 1 || batchNumber > 5) throw new Error('weekly-manifest requires a batch number from 1 to 5');
  if (!Number.isInteger(chunkNumber) || chunkNumber < 1 || chunkNumber > 4) throw new Error('weekly-manifest requires a chunk number from 1 to 4');
  const catalog = await loadCatalog();
  const batches = buildWeeklyRecipeBatches(catalog, PILOT_ROSTER_IDS, 100);
  const batch = batches[batchNumber - 1] ?? [];
  const recipes = batch.slice((chunkNumber - 1) * 25, chunkNumber * 25);
  if (!recipes.length) throw new Error(`Weekly batch ${batchNumber}, chunk ${chunkNumber} is empty.`);
  const firstAvailableAt = process.env.KWILT_RECIPE_IMAGE_FIRST_BATCH_AT?.trim()
    ? new Date(process.env.KWILT_RECIPE_IMAGE_FIRST_BATCH_AT)
    : new Date();
  if (Number.isNaN(firstAvailableAt.getTime())) throw new Error('KWILT_RECIPE_IMAGE_FIRST_BATCH_AT must be an ISO timestamp');
  const availableAt = new Date(firstAvailableAt.getTime() + (batchNumber - 1) * 7 * 24 * 60 * 60 * 1000).toISOString();
  console.log(JSON.stringify({
    action: 'import',
    ownerPersonId: process.env.KWILT_RECIPE_CATALOG_OWNER_PERSON_ID ?? null,
    candidateCount: candidateCountFromEnv(process.env.KWILT_RECIPE_IMAGE_CANDIDATE_COUNT),
    maxAttempts: 1,
    availableAt,
    popularity: {
      method: 'editorial tier, source-review evidence, then active-time practicality',
      batchNumber,
      chunkNumber,
      firstRank: (batchNumber - 1) * 100 + (chunkNumber - 1) * 25 + 1,
      lastRank: (batchNumber - 1) * 100 + (chunkNumber - 1) * 25 + recipes.length,
      topScore: recipePopularityScore(recipes[0]),
    },
    sources: buildSources(recipes),
  }));
}

async function generatePilot() {
  const generationCeiling = Number(process.env.KWILT_RECIPE_IMAGE_GENERATION_CEILING ?? 75);
  const qaCeiling = Number(process.env.KWILT_RECIPE_IMAGE_QA_CEILING ?? 25);
  if (!Number.isInteger(generationCeiling) || generationCeiling < 1 || generationCeiling > 100) throw new Error('KWILT_RECIPE_IMAGE_GENERATION_CEILING must be an integer from 1 to 100.');
  if (!Number.isInteger(qaCeiling) || qaCeiling < 1 || qaCeiling > 100) throw new Error('KWILT_RECIPE_IMAGE_QA_CEILING must be an integer from 1 to 100.');
  let claimed = 0;
  let calls = 0;
  const results = [];
  console.log(`Approved generation ceiling: ${generationCeiling} candidates; image-output cost is capped at about $${(generationCeiling * 0.041).toFixed(2)} before QA input.`);
  while (calls < generationCeiling) {
    const result = await invoke({ action: 'generate', limit: 1 });
    calls += 1;
    claimed += result.claimed;
    results.push(...result.results);
    if (result.claimed === 0) break;
  }
  let qaCalls = 0;
  let considered = 0;
  let consecutiveIdleCalls = 0;
  while (qaCalls < qaCeiling) {
    const result = await invoke({ action: 'qa', limit: 5 });
    qaCalls += 1;
    considered += result.considered;
    const state = nextQaSweepState({
      consecutiveIdleCalls,
      considered: result.considered,
      allFailed: result.results.length > 0 && result.results.every((item) => item.error === 'qa_failed'),
    });
    consecutiveIdleCalls = state.consecutiveIdleCalls;
    if (!state.shouldContinue) break;
  }
  const counts = results.reduce((summary, result) => ({ ...summary, [result.status]: (summary[result.status] ?? 0) + 1 }), {});
  console.log(JSON.stringify({ generationCalls: calls, claimed, generationCounts: counts, qaCalls, qaConsidered: considered }, null, 2));
}

async function reviewCandidate() {
  const args = new Map(process.argv.slice(3).map((value) => {
    const [key, ...rest] = value.split('=');
    return [key.replace(/^--/, ''), rest.join('=') || 'true'];
  }));
  const jobId = args.get('job');
  if (!jobId) throw new Error('--job=<uuid> is required');
  const rejectReason = args.get('reject');
  const review = rejectReason ? { decision: 'reject', reasons: [rejectReason] } : {
    decision: 'approve',
    checks: { recognizable: true, ingredientFaithful: true, culturallyPlausible: true, cropSafe: true, artifactFree: true },
    altText: args.get('alt'),
    publish: args.get('publish') === 'true',
  };
  console.log(JSON.stringify(await invoke({ action: 'review', jobId, review }), null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const command = process.argv[2];
  if (command === 'import' || command === 'manifest') await importPilot();
  else if (command === 'import-batch' || command === 'batch-manifest') await importManifestBatch();
  else if (command === 'weekly-manifest') await weeklyManifest();
  else if (command === 'generate') await generatePilot();
  else if (command === 'review') await reviewCandidate();
  else throw new Error('Use import, manifest, import-batch, batch-manifest, weekly-manifest, generate, or review.');
}
