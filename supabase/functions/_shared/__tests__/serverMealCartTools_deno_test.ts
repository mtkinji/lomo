import { executeServerFoodTool } from '../serverFoodTools.ts';
const recipeId = '11111111-1111-4111-8111-111111111111';
const versionId = '22222222-2222-4222-8222-222222222222';
const candidateId = '33333333-3333-4333-8333-333333333333';
const projection = { recipe: { id: recipeId, ownerPersonId: 'catalog-owner', lifecycle: 'active', provenance: { method: 'catalog', rightsBasis: 'kwilt_authored' }, credits: [], lineage: [] },
  currentVersion: { id: versionId, version: 1, title: 'Complete chicken dinner', yieldQuantity: 6, yieldUnit: 'servings', scalingState: 'verified', ingredients: [{ id: 'ingredient', originalText: '600 g chicken', quantityMin: 600, quantityMax: 700, unit: 'g', scaleRule: { kind: 'multiply' } }], instructions: [{ id: 'step', stepText: 'Cook chicken.' }] }, catalog: { rosterId: 'DI001' } };
const snapshot = { actorPersonId: 'person', observedAt: 'now', recipeFavorites: [], hiddenRecipes: [], recipeImportDrafts: [], cookSessions: [], recipes: [], mealPlans: [{ id: 'plan', version: 3, state: 'draft', horizon: { kind: 'open' }, candidates: [] }], mealChoiceRounds: [], foodStock: [], foodCycle: null, groceryLists: [], retailerHandoffs: [], mealPreferences: null };
const client = { rpc: async (name: string, _args: Record<string, unknown>) => ({ error: null, data: name === 'list_kwilt_recipe_catalog_v2' ? [{ projection }] : name === 'get_kwilt_meal_cart_history' ? { mealPlanId: 'plan', version: 3, history: [] } : snapshot }) };
async function run(toolId: string, args: Record<string, unknown>, selectedClient = client) {
  const proposals: any[] = [];
  const result = await executeServerFoodTool({ client: selectedClient, userId: 'user', call: { id: 'request', toolId, arguments: args }, stageProposal: async (proposal) => { proposals.push(proposal); return { id: 'proposal', version: 1, status: 'pending', replayed: false }; } });
  return { result, proposals };
}
Deno.test('canonical catalog recipe bodies are available through the authorized catalog reader', async () => {
  const { result } = await run('recipes.read', { recipeId, recipeVersionId: versionId });
  if (result?.status !== 'completed' || (result.output.version as any)?.ingredients?.[0]?.quantityMin !== 600) throw new Error('canonical body missing');
});
Deno.test('cart ensure requests an ongoing open horizon without replacing existing plans', async () => {
  const { result, proposals } = await run('meal_planning.cart.ensure', { householdId: null, idempotencyKey: 'stable' });
  if (result?.status !== 'proposed' || proposals[0]?.operation.type !== 'meal_planning.cart.ensure' || proposals[0]?.operation.payload.householdId !== null) throw new Error('ensure missing');
});
Deno.test('cart add retains exact catalog quantities and records timing', async () => {
  const { result, proposals } = await run('meal_planning.cart.add', { mealPlanId: 'plan', expectedVersion: 3, candidateId, recipeVersionId: versionId, plannedPortions: 6, timing: { kind: 'flexible' }, idempotencyKey: 'stable' });
  const payload = proposals[0]?.operation.payload;
  if (result?.status !== 'proposed' || payload?.candidate.recipeSnapshot.ingredients[0].quantityMin !== 600 || payload.timing.kind !== 'flexible') throw new Error('exact catalog candidate missing');
});
Deno.test('cart add refuses stale version rather than overwriting family edits', async () => {
  const { result, proposals } = await run('meal_planning.cart.add', { mealPlanId: 'plan', expectedVersion: 2, candidateId, recipeVersionId: versionId, plannedPortions: 6, timing: { kind: 'flexible' }, idempotencyKey: 'stable' });
  if (result?.status !== 'failed' || result.code !== 'meal_plan_version_stale' || proposals.length) throw new Error('stale family edits accepted');
});
Deno.test('cart history is read without proposals', async () => {
  const { result, proposals } = await run('meal_planning.history.read', { mealPlanId: 'plan' });
  if (result?.status !== 'completed' || !Array.isArray(result.output.history) || proposals.length) throw new Error('history unavailable');
});
Deno.test('catalog pagination reaches recipes beyond the first 500 without truncation', async () => {
  const cursors: unknown[] = [];
  const manyClient = { rpc: async (name: string, args: Record<string, unknown>) => {
    if (name !== 'list_kwilt_recipe_catalog_v2') return { data: snapshot, error: null };
    cursors.push(args.p_after_roster_id);
    const data = args.p_after_roster_id === null ? Array.from({ length: 500 }, (_, index) => ({ projection: { ...projection, recipe: { ...projection.recipe, id: `recipe-${index}` }, currentVersion: { ...projection.currentVersion, id: `version-${index}` }, catalog: { rosterId: `DI${String(index).padStart(3, '0')}` } } })) : [{ projection: { ...projection, catalog: { rosterId: 'DI500' } } }];
    return { data, error: null };
  } };
  const { result } = await run('recipes.read', { recipeId, recipeVersionId: versionId }, manyClient);
  if (result?.status !== 'completed' || cursors.join(',') !== ',DI499') throw new Error('catalog was truncated or cursor lost');
});
Deno.test('catalog failure refuses partial or offline fallback', async () => {
  const broken = { rpc: async (name: string) => ({ data: name === 'list_kwilt_recipe_catalog_v2' ? null : snapshot, error: name === 'list_kwilt_recipe_catalog_v2' ? { message: 'denied' } : null }) };
  const { result, proposals } = await run('meal_planning.cart.add', { mealPlanId: 'plan', expectedVersion: 3, candidateId, recipeVersionId: versionId, plannedPortions: 6, timing: { kind: 'flexible' }, idempotencyKey: 'stable' }, broken as typeof client);
  if (result?.status !== 'unavailable' || proposals.length) throw new Error('catalog denial was bypassed');
});
Deno.test('cart add rejects malformed date rather than silently scheduling another day', async () => {
  const { result, proposals } = await run('meal_planning.cart.add', { mealPlanId: 'plan', expectedVersion: 3, candidateId, recipeVersionId: versionId, plannedPortions: 6, timing: { kind: 'occasion', date: '2026-02-30', mealPeriod: 'dinner' }, idempotencyKey: 'stable' });
  if (result?.status !== 'failed' || result.code !== 'meal_candidate_invalid' || proposals.length) throw new Error('invalid date accepted');
});
Deno.test('cart add never permits caller-supplied ingredient replacement', async () => {
  const { result, proposals } = await run('meal_planning.cart.add', { mealPlanId: 'plan', expectedVersion: 3, candidateId, recipeVersionId: versionId, plannedPortions: 6, timing: { kind: 'flexible' }, idempotencyKey: 'stable', candidate: { recipeSnapshot: { ingredients: [] } } });
  if (result?.status !== 'proposed' || proposals[0]?.operation.payload.candidate.recipeSnapshot.ingredients[0].quantityMin !== 600) throw new Error('caller replaced canonical ingredients');
});
Deno.test('cart add carries only explicitly selected supported recipe scaling', async () => {
  const { result, proposals } = await run('meal_planning.cart.add', { mealPlanId: 'plan', expectedVersion: 3, candidateId, recipeVersionId: versionId, plannedPortions: 6, recipeScaleMultiplier: 2, timing: { kind: 'flexible' }, idempotencyKey: 'stable' });
  if (result?.status !== 'proposed' || proposals[0]?.operation.payload.candidate.recipeSnapshot.recipeScaleMultiplier !== 2) throw new Error('explicit scale dropped');
  const invalid = await run('meal_planning.cart.add', { mealPlanId: 'plan', expectedVersion: 3, candidateId, recipeVersionId: versionId, plannedPortions: 6, recipeScaleMultiplier: 1.5, timing: { kind: 'flexible' }, idempotencyKey: 'stable' });
  if (invalid.result?.status !== 'failed' || invalid.proposals.length) throw new Error('unsupported scale accepted');
});
Deno.test('cart add refuses unverified recipe scaling rather than claiming approval', async () => {
  const unverified = { rpc: async (name: string) => ({ data: name === 'list_kwilt_recipe_catalog_v2' ? [{ projection: { ...projection, currentVersion: { ...projection.currentVersion, scalingState: 'review_required' } } }] : snapshot, error: null }) };
  const { result, proposals } = await run('meal_planning.cart.add', { mealPlanId: 'plan', expectedVersion: 3, candidateId, recipeVersionId: versionId, plannedPortions: 6, recipeScaleMultiplier: 2, timing: { kind: 'flexible' }, idempotencyKey: 'stable' }, unverified as typeof client);
  if (result?.status !== 'failed' || result.code !== 'recipe_scaling_unverified' || proposals.length) throw new Error('unverified scaling accepted');
});
Deno.test('candidate preparation includes the canonical catalog instead of recent private recipes only', async () => {
  const { result } = await run('meal_planning.candidates.prepare', { horizon: { kind: 'open' } });
  if (result?.status !== 'completed' || !(result.output.candidates as any[])?.some(candidate => candidate.recipeId === recipeId)) throw new Error('catalog absent from preparation');
});
Deno.test('cart add refuses more portions than the explicitly selected recipe batch', async () => {
  const { result, proposals } = await run('meal_planning.cart.add', { mealPlanId: 'plan', expectedVersion: 3, candidateId, recipeVersionId: versionId, plannedPortions: 7, recipeScaleMultiplier: 1, timing: { kind: 'flexible' }, idempotencyKey: 'stable' });
  if (result?.status !== 'failed' || result.code !== 'recipe_portions_exceed_batch' || proposals.length) throw new Error('unscaled undersized batch accepted');
});
Deno.test('recipe scale preview respects fixed to-taste rules and refuses unreviewed scaling', async () => {
  const fixed = { rpc: async (name: string) => ({ data: name === 'list_kwilt_recipe_catalog_v2' ? [{ projection: { ...projection, currentVersion: { ...projection.currentVersion, ingredients: [{ ...projection.currentVersion.ingredients[0], scaleRule: { kind: 'fixed', reason: 'to_taste' } }] } } }] : snapshot, error: null }) };
  const preview = await run('recipes.scale.preview', { recipeVersionId: versionId, targetYield: 12 }, fixed as typeof client);
  if (preview.result?.status !== 'completed' || (preview.result.output.ingredients as any[])[0].quantity !== 600) throw new Error('fixed ingredient multiplied');
  const unsupported = await run('recipes.scale.preview', { recipeVersionId: versionId, targetYield: 9 });
  if (unsupported.result?.status !== 'failed') throw new Error('unsupported factor accepted');
  const unverified = { rpc: async (name: string) => ({ data: name === 'list_kwilt_recipe_catalog_v2' ? [{ projection: { ...projection, currentVersion: { ...projection.currentVersion, scalingState: 'review_required' } } }] : snapshot, error: null }) };
  const rejected = await run('recipes.scale.preview', { recipeVersionId: versionId, targetYield: 12 }, unverified as typeof client);
  if (rejected.result?.status !== 'failed') throw new Error('unverified scale accepted');
});
