import { recipeContractFixture, recipeVersionContractFixture } from '../../capabilities/recipes/domain/recipeContractFixtures';
import type { MealPlanProjection } from '../../capabilities/meal-planning/data/mealPlanningRepository';
import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';
import { createUnifiedChatToolProvider } from './unifiedChatToolProvider';

const recipe = {
  recipe: recipeContractFixture(),
  currentVersion: recipeVersionContractFixture(),
};
const plan: MealPlanProjection = {
  id: 'plan-1', organizerPersonId: 'person-1', householdId: null, version: 3, state: 'draft', horizon: { kind: 'open' },
  candidates: [{ id: 'candidate-old', kind: 'meal_note', title: 'Leftovers', recipeSnapshot: null }],
  entries: [], occasions: [], activeRound: null, updatedAt: '2026-08-27T12:00:00.000Z',
};
const snapshots = {
  goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
  recipes: { recipes: [recipe] },
};

function tool(id: string) {
  const definition = UNIFIED_CHAT_TOOL_CATALOG.find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`Missing Meal Plan tool ${id}`);
  return definition;
}

describe('Unified Chat Meal Plan tools', () => {
  test('stages personal creation and exact-version horizon updates', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots, mealPlans: { list: jest.fn(async () => [plan]) } });
    await expect(provider.execute({ id: 'create-plan', toolId: 'meal_planning.plan.create', arguments: {
      householdId: null, horizon: { kind: 'meal_count', count: 5 }, idempotencyKey: 'create-plan-1',
    } }, tool('meal_planning.plan.create'))).resolves.toMatchObject({ status: 'proposed' });
    await expect(provider.execute({ id: 'update-plan', toolId: 'meal_planning.plan.update', arguments: {
      mealPlanId: plan.id, expectedVersion: plan.version,
      horizon: { kind: 'date_range', startsOn: '2026-08-28', endsOn: '2026-09-03' },
    } }, tool('meal_planning.plan.update'))).resolves.toMatchObject({ status: 'proposed' });
    expect(provider.proposals()).toEqual([
      expect.objectContaining({ operation: {
        type: 'meal_planning.plan.create', targetId: null, expectedVersion: 0,
        payload: { householdId: null, horizon: { kind: 'meal_count', count: 5 } },
      } }),
      expect.objectContaining({ operation: {
        type: 'meal_planning.plan.update', targetId: plan.id, expectedVersion: plan.version,
        payload: { horizon: { kind: 'date_range', startsOn: '2026-08-28', endsOn: '2026-09-03' } },
      } }),
    ]);
  });

  test('stages immutable Recipe candidates, meal notes, and exact candidate removal', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots, mealPlans: { list: jest.fn(async () => [plan]) } });
    await expect(provider.execute({ id: 'add-recipe', toolId: 'meal_planning.candidate.add', arguments: {
      mealPlanId: plan.id, expectedVersion: plan.version,
      candidate: { candidateId: 'candidate-recipe', title: recipe.currentVersion.title,
        recipeVersionId: recipe.currentVersion.id, plannedPortions: 4 },
    } }, tool('meal_planning.candidate.add'))).resolves.toMatchObject({ status: 'proposed' });
    await expect(provider.execute({ id: 'add-note', toolId: 'meal_planning.candidate.add', arguments: {
      mealPlanId: plan.id, expectedVersion: plan.version,
      candidate: { candidateId: 'candidate-note', title: 'Taco night', recipeVersionId: null, plannedPortions: 5 },
    } }, tool('meal_planning.candidate.add'))).resolves.toMatchObject({ status: 'proposed' });
    await expect(provider.execute({ id: 'remove-note', toolId: 'meal_planning.candidate.remove', arguments: {
      mealPlanId: plan.id, expectedVersion: plan.version, candidateId: 'candidate-old',
    } }, tool('meal_planning.candidate.remove'))).resolves.toMatchObject({ status: 'proposed' });

    expect(provider.proposals()[0]).toMatchObject({ operation: {
      type: 'meal_planning.candidate.add', targetId: plan.id, expectedVersion: plan.version,
      payload: { candidate: { id: 'candidate-recipe', kind: 'recipe', title: recipe.currentVersion.title,
        recipeSnapshot: { recipeId: recipe.recipe.id, recipeVersionId: recipe.currentVersion.id,
          recipeVersion: recipe.currentVersion.version, plannedPortions: 4 } } },
    } });
    expect(provider.proposals()[1]).toMatchObject({ operation: {
      type: 'meal_planning.candidate.add', payload: { candidate: {
        id: 'candidate-note', kind: 'meal_note', title: 'Taco night', recipeSnapshot: null,
      } },
    } });
    expect(provider.proposals()[2]).toMatchObject({ operation: {
      type: 'meal_planning.candidate.remove', payload: { candidateId: 'candidate-old' },
    } });
  });

  test('rejects stale versions, duplicate Recipe versions, and missing removal targets', async () => {
    const withRecipe = { ...plan, candidates: [{
      id: 'existing-recipe', kind: 'recipe' as const, title: recipe.currentVersion.title,
      recipeSnapshot: { recipeVersionId: recipe.currentVersion.id },
    }] };
    const provider = createUnifiedChatToolProvider({ snapshots, mealPlans: { list: jest.fn(async () => [withRecipe]) } });
    await expect(provider.execute({ id: 'stale', toolId: 'meal_planning.plan.update', arguments: {
      mealPlanId: plan.id, expectedVersion: 2, horizon: { kind: 'open' },
    } }, tool('meal_planning.plan.update'))).resolves.toMatchObject({ status: 'failed', code: 'meal_plan_version_stale', retryable: true });
    await expect(provider.execute({ id: 'duplicate', toolId: 'meal_planning.candidate.add', arguments: {
      mealPlanId: plan.id, expectedVersion: plan.version,
      candidate: { candidateId: 'new-id', title: recipe.currentVersion.title,
        recipeVersionId: recipe.currentVersion.id, plannedPortions: 4 },
    } }, tool('meal_planning.candidate.add'))).resolves.toMatchObject({ status: 'failed', code: 'meal_candidate_recipe_exists' });
    await expect(provider.execute({ id: 'missing', toolId: 'meal_planning.candidate.remove', arguments: {
      mealPlanId: plan.id, expectedVersion: plan.version, candidateId: 'missing',
    } }, tool('meal_planning.candidate.remove'))).resolves.toMatchObject({ status: 'failed', code: 'meal_candidate_not_found' });
  });

  test('stages exact family rounds, own responses, closure, and finalized-plan revision', async () => {
    const shared = { ...plan, householdId: 'household-1', candidates: [
      { id: 'candidate-1', kind: 'meal_note' as const, title: 'Tacos', recipeSnapshot: null },
    ] };
    const open = { ...shared, state: 'collecting_choices' as const,
      activeRound: { id: 'round-1', version: 2, state: 'open' as const, closesAt: null } };
    const finalized = { ...shared, id: 'plan-final', version: 6, state: 'finalized' as const };
    const list = jest.fn(async () => [shared, open, finalized]);
    const projection = jest.fn(async () => ({ roundId: 'round-1', version: 2, state: 'open',
      candidates: [{ id: 'candidate-1', title: 'Tacos' }],
      myResponse: { state: 'submitted', selectedCandidateIds: ['candidate-1'] } }));
    const mealHousehold = { load: jest.fn(async () => ({ householdId: 'household-1', version: 1, updatedAt: 'now',
      usualDinerCount: 3, usualDinerPersonIds: ['person-1'], setupState: 'completed' as const, foodNeeds: [],
      members: [{ id: 'membership-2', personId: 'person-2', displayName: 'Sam', kind: 'adult' as const,
        role: 'caregiver' as const, updatedAt: 'now' }],
    })) };
    const provider = createUnifiedChatToolProvider({ snapshots, mealPlans: { list, projection }, mealHousehold });
    await expect(provider.execute({ id: 'open-round', toolId: 'meal_planning.round.open', arguments: {
      mealPlanId: shared.id, expectedVersion: shared.version, participantPersonIds: ['person-2'],
    } }, tool('meal_planning.round.open'))).resolves.toMatchObject({ status: 'proposed' });
    await expect(provider.execute({ id: 'submit', toolId: 'meal_planning.response.submit', arguments: {
      choiceRoundId: 'round-1', expectedVersion: 2, candidateIds: ['candidate-1'], pass: false, suggestion: null,
    } }, tool('meal_planning.response.submit'))).resolves.toMatchObject({ status: 'proposed' });
    await expect(provider.execute({ id: 'withdraw', toolId: 'meal_planning.response.withdraw', arguments: {
      choiceRoundId: 'round-1', expectedVersion: 2,
    } }, tool('meal_planning.response.withdraw'))).resolves.toMatchObject({ status: 'proposed' });
    await expect(provider.execute({ id: 'close', toolId: 'meal_planning.round.close', arguments: {
      choiceRoundId: 'round-1', expectedVersion: 2,
    } }, tool('meal_planning.round.close'))).resolves.toMatchObject({ status: 'proposed' });
    await expect(provider.execute({ id: 'revise', toolId: 'meal_planning.plan.revise', arguments: {
      mealPlanId: finalized.id, expectedVersion: finalized.version,
    } }, tool('meal_planning.plan.revise'))).resolves.toMatchObject({ status: 'proposed' });
    expect(provider.proposals().map((item) => item.operation.type)).toEqual([
      'meal_planning.round.open', 'meal_planning.response.submit', 'meal_planning.response.withdraw',
      'meal_planning.round.close', 'meal_planning.plan.revise',
    ]);
  });

  test('stages exact-version finalization with current candidates and eligible diners', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots, mealPlans: { list: jest.fn(async () => [plan]) } });
    await expect(provider.execute({ id: 'finalize-plan', toolId: 'meal_planning.plan.finalize', arguments: {
      mealPlanId: plan.id, expectedVersion: plan.version, idempotencyKey: 'finalize-plan-1', organizerNote: null,
      occasions: [{ id: 'occasion-1', title: null, placementDate: null, timing: { kind: 'flexible' },
        notEatingPersonIds: [], dishes: [{ id: 'dish-1', candidateId: 'candidate-old',
          dinerPersonIds: ['person-1'], servings: 2 }] }],
    } }, tool('meal_planning.plan.finalize'))).resolves.toMatchObject({ status: 'proposed' });
    expect(provider.proposals()[0]).toMatchObject({ operation: {
      type: 'meal_planning.plan.finalize', targetId: plan.id, expectedVersion: plan.version,
      payload: { occasions: [expect.objectContaining({ id: 'occasion-1' })], organizerNote: null },
    } });
  });

  test('prepares bounded candidates without claiming unavailable stock or budget evidence', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    const result = await provider.execute({ id: 'prepare-candidates', toolId: 'meal_planning.candidates.prepare', arguments: {
      horizon: { kind: 'meal_count', count: 4 }, constraints: { query: 'best_use', maxResults: 2 },
    } }, tool('meal_planning.candidates.prepare'));
    expect(result).toMatchObject({ status: 'completed', output: {
      candidates: [expect.objectContaining({ recipeId: recipe.recipe.id, recipeVersionId: recipe.currentVersion.id })],
      evidenceNotice: expect.stringContaining('does not claim'),
    } });
    expect(provider.proposals()).toHaveLength(0);
  });
});
