import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { buildWeeklyRecipeBatches, recipePopularityScore } from './popularity.mjs';

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

function buildSources(recipes) {
  return recipes.map((recipe) => {
    const rosterId = recipe.rosterId;
    const evidence = JSON.stringify({
      rosterId, title: recipe.title, description: recipe.description, category: recipe.category,
      cuisine: recipe.cuisine, yieldQuantity: recipe.yieldQuantity, yieldUnit: recipe.yieldUnit,
      prepMinutes: recipe.prepMinutes, cookMinutes: recipe.cookMinutes, ingredients: recipe.ingredients,
      instructions: recipe.instructions, notes: recipe.notes,
    });
    return {
      ...JSON.parse(evidence),
      tier: recipe.tier,
      publicSlug: `${slugify(recipe.title)}-${rosterId.toLowerCase()}`,
      contentHash: `sha256:${createHash('sha256').update(evidence).digest('hex')}`,
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
  if (process.argv[2] === 'manifest') {
    console.log(JSON.stringify({ action: 'import', ownerPersonId: process.env.KWILT_RECIPE_CATALOG_OWNER_PERSON_ID ?? null, candidateCount: 3, sources }));
    return;
  }
  const result = await invoke({ action: 'import', ownerPersonId: requiredEnv('KWILT_RECIPE_CATALOG_OWNER_PERSON_ID'), candidateCount: 3, sources });
  console.log(JSON.stringify(result, null, 2));
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
    candidateCount: 3,
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
  let claimed = 0;
  let calls = 0;
  const results = [];
  console.log('Approved pilot ceiling: 75 candidates; estimated image-output cost about $3.08 before QA input.');
  while (calls < 75) {
    const result = await invoke({ action: 'generate', limit: 1 });
    calls += 1;
    claimed += result.claimed;
    results.push(...result.results);
    if (result.claimed === 0) break;
  }
  let qaCalls = 0;
  let considered = 0;
  while (qaCalls < 25) {
    const result = await invoke({ action: 'qa', limit: 5 });
    qaCalls += 1;
    considered += result.considered;
    if (result.considered === 0 || result.results.every((item) => item.error === 'qa_failed')) break;
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

const command = process.argv[2];
if (command === 'import' || command === 'manifest') await importPilot();
else if (command === 'weekly-manifest') await weeklyManifest();
else if (command === 'generate') await generatePilot();
else if (command === 'review') await reviewCandidate();
else throw new Error('Use import, manifest, weekly-manifest, generate, or review.');
