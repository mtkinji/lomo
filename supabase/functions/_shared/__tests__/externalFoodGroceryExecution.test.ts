import { enrichExternalFoodGroceryProposals } from '../externalFoodGroceryExecution';
import { executeServerGroceryTool } from '../serverGroceryTools';

const snapshot = { recipeVersionId: 'kwilt-recipe-di001-v1', sourceType: 'catalog', contentHash: 'kwilt:DI001:v1', recipeScaleMultiplier: 2,
  ingredients: [{ id: 'kwilt-recipe-di001-v1-ingredient-1', originalText: '1 cup rice', optional: false, scaleRule: { kind: 'multiply' } }] };
const proposal = { capabilityId: 'groceries', title: 'Compile', body: '', operation: {
  type: 'groceries.compile', targetType: 'grocery_list', targetId: 'plan-1', summary: '', payload: { expectedVersion: 3 } } };
function fixture(overrides: Record<string, unknown> = {}) {
  const tables: Record<string, unknown> = {
    kwilt_person_auth_bindings: { person_id: 'person-1' },
    kwilt_meal_plans: { id: 'plan-1', household_id: null, organizer_person_id: 'person-1', version: 3, state: 'draft', horizon: { kind: 'open' } },
    kwilt_meal_plan_candidates: [
      { id: 'new', lifecycle_state: 'idea', recipe_snapshot: snapshot },
      { id: 'old', lifecycle_state: 'sent', recipe_snapshot: snapshot },
      { id: 'kept', lifecycle_state: 'removed', removed_grocery_behavior: 'kept', recipe_snapshot: snapshot },
      { id: 'made', lifecycle_state: 'made', recipe_snapshot: snapshot },
    ], ...overrides,
  };
  const from = jest.fn((table: string) => {
    const q: any = { select: () => q, eq: () => q, in: () => q, order: () => q, maybeSingle: () => q, single: () => q,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: tables[table], error: null }).then(resolve) };
    return q;
  });
  return { from };
}

test('uses canonical compiler, adds ideas, preserves sent and removed-kept contributions without reviving made meals', async () => {
  const result = await enrichExternalFoodGroceryProposals({ client: fixture(), userId: 'user-1' }, [proposal]);
  const payload = result[0].operation.payload;
  expect(payload).toMatchObject({ expectedVersion: 3, candidateIds: ['new'], planAction: 'send', acknowledgeHardPasses: false });
  expect(payload.payloadHash).toMatch(/^[a-f0-9]{64}$/);
  const items = payload.compiledItems as any[];
  expect(items).toHaveLength(1);
  expect(items[0].quantityMin).toBe(6);
  expect(items[0].sources.map((s: any) => s.planCandidateId)).toEqual(['new', 'old', 'kept']);
});

test('rejects a foreign personal plan before loading its candidates', async () => {
  const client = fixture({ kwilt_meal_plans: { id: 'plan-1', household_id: null, organizer_person_id: 'other', version: 3, state: 'draft' } });
  await expect(enrichExternalFoodGroceryProposals({ client, userId: 'user-1' }, [proposal])).rejects.toThrow('grocery_plan_not_owned');
  expect(client.from).not.toHaveBeenCalledWith('kwilt_meal_plan_candidates');
});

test('rejects stale plan and failed canonical ingredient lookup rather than compiling an empty list', async () => {
  await expect(enrichExternalFoodGroceryProposals({ client: fixture(), userId: 'user-1' }, [{ ...proposal, operation: { ...proposal.operation, payload: { expectedVersion: 2 } } }])).rejects.toThrow('stale');
  await expect(enrichExternalFoodGroceryProposals({ client: fixture({ kwilt_meal_plan_candidates: [{ id: 'new', lifecycle_state: 'idea', recipe_snapshot: { recipeVersionId: 'missing' } }] }), userId: 'user-1' }, [proposal])).rejects.toThrow('missing_recipe_version');
});

test('does not reinterpret manual grocery edits as a compile', async () => {
  const client = fixture(); const manual = { ...proposal, operation: { ...proposal.operation, type: 'groceries.item.add' } };
  expect(await enrichExternalFoodGroceryProposals({ client, userId: 'user-1' }, [manual])).toEqual([manual]);
  expect(client.from).not.toHaveBeenCalled();
});

test('ongoing open cart compile is staged, not rejected for lacking a weekly finalized plan', async () => {
  const stageProposal = jest.fn(async () => ({ id: 'p', status: 'pending' as const, version: 1, replayed: false }));
  const result = await executeServerGroceryTool({ snapshot: { mealPlans: [{ id: 'plan-1', version: 3, state: 'draft', horizon: { kind: 'open' }, candidates: [{ id: 'new', lifecycle: 'idea', recipeSnapshot: snapshot }] }] },
    call: { id: 'call', toolId: 'groceries.compile', arguments: { mealPlanId: 'plan-1', mealPlanVersion: 3, idempotencyKey: 'key' } }, stageProposal });
  expect(result?.status).toBe('proposed');
});

test.each([{ quantityMin: -1 }, { quantityMin: Infinity }, { quantityMin: '2' }, { quantityMin: 4, quantityMax: 2 }, { concept: '' }, { unit: {} }])('refuses malformed manual correction %j without staging', async (patch) => {
  const stageProposal = jest.fn();
  const result = await executeServerGroceryTool({ snapshot: { groceryLists: [{ id: 'list', revision: 1, items: [{ id: 'item', quantityMin: 1, quantityMax: 2 }] }] },
    call: { id: 'call', toolId: 'groceries.item.update', arguments: { groceryItemId: 'item', expectedVersion: 1, idempotencyKey: 'key', reason: null, patch } }, stageProposal });
  expect(result?.status).toBe('failed'); expect(stageProposal).not.toHaveBeenCalled();
});

test('finalized plan compiles only its exact canonical entry version', async () => {
  const client = fixture({
    kwilt_meal_plans: { id: 'plan-1', household_id: null, organizer_person_id: 'person-1', version: 3, state: 'finalized' },
    kwilt_meal_plan_entries: [{ id: 'entry', plan_version: 3, servings: 4, recipe_snapshot: snapshot }],
  });
  const [result] = await enrichExternalFoodGroceryProposals({ client, userId: 'user-1' }, [proposal]);
  expect(result.operation.payload.planAction).toBeUndefined();
  expect((result.operation.payload.compiledItems as any[])[0].quantityMin).toBe(2);
  expect(client.from).not.toHaveBeenCalledWith('kwilt_meal_plan_candidates');
});

test('a household viewer cannot compile and a caregiver uses canonical shared authority', async () => {
  const plan = { id: 'plan-1', household_id: 'home', organizer_person_id: 'other', version: 3, state: 'draft', horizon: { kind: 'open' } };
  const denied = fixture({ kwilt_meal_plans: plan, kwilt_household_memberships: { role: 'child' } });
  await expect(enrichExternalFoodGroceryProposals({ client: denied, userId: 'user-1' }, [proposal])).rejects.toThrow('household_plan_grocery_manage_forbidden');
  expect(denied.from).not.toHaveBeenCalledWith('kwilt_meal_plan_candidates');
  const allowed = fixture({ kwilt_meal_plans: plan, kwilt_household_memberships: { role: 'caregiver' } });
  expect((await enrichExternalFoodGroceryProposals({ client: allowed, userId: 'user-1' }, [proposal]))[0].operation.payload.planAction).toBe('send');
});

test('does not generate a replacement list from only completed historical meals', async () => {
  const client = fixture({ kwilt_meal_plan_candidates: [{ id: 'made', lifecycle_state: 'made', recipe_snapshot: snapshot }] });
  await expect(enrichExternalFoodGroceryProposals({ client, userId: 'user-1' }, [proposal])).rejects.toThrow('grocery_cart_candidates_required');
});
