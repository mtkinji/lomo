import { createMealPlanActions, type MealPlanActionBoundary } from './mealPlanActions';

describe('Meal Plan actions', () => {
  const receipt = { planId: 'plan-1', version: 2, state: 'draft', operationId: 'meal_planning.plan.update' as const, replayed: false };
  test('requires review and exact versions', async () => {
    const boundary: MealPlanActionBoundary = { apply: jest.fn(async () => receipt) };
    const actions = createMealPlanActions(boundary);
    await expect(actions.create({ requestId: 'create-1', confirmed: false, householdId: null, horizon: { kind: 'open' } }))
      .rejects.toThrow('meal_plan.confirmation_required');
    await expect(actions.update({ requestId: 'update-1', confirmed: true, planId: 'plan-1', expectedVersion: 0, horizon: { kind: 'open' } }))
      .rejects.toThrow('meal_plan.version_invalid');
    expect(boundary.apply).not.toHaveBeenCalled();
  });
  test('applies create, horizon update, candidate add, and candidate removal through one boundary', async () => {
    const boundary: MealPlanActionBoundary = { apply: jest.fn(async () => receipt) };
    const actions = createMealPlanActions(boundary);
    await actions.create({ requestId: 'create-1', confirmed: true, householdId: null, horizon: { kind: 'meal_count', count: 5 } });
    await actions.update({ requestId: 'update-1', confirmed: true, planId: 'plan-1', expectedVersion: 1, horizon: { kind: 'open' } });
    await actions.addCandidate({ requestId: 'add-1', confirmed: true, planId: 'plan-1', expectedVersion: 2,
      candidate: { id: 'candidate-1', kind: 'meal_note', title: 'Taco night', recipeSnapshot: null } });
    await actions.removeCandidate({ requestId: 'remove-1', confirmed: true, planId: 'plan-1', expectedVersion: 3, candidateId: 'candidate-1' });
    expect(boundary.apply).toHaveBeenNthCalledWith(1, expect.objectContaining({ operationId: 'meal_planning.plan.create', planId: null, expectedVersion: 0 }));
    expect(boundary.apply).toHaveBeenNthCalledWith(3, expect.objectContaining({ operationId: 'meal_planning.candidate.add', payload: { candidate: expect.objectContaining({ id: 'candidate-1' }) } }));
    expect(boundary.apply).toHaveBeenNthCalledWith(4, expect.objectContaining({ operationId: 'meal_planning.candidate.remove', payload: { candidateId: 'candidate-1' } }));
  });
  test('applies exact choice-round, own-response, and revision actions through the same receipt boundary', async () => {
    const boundary: MealPlanActionBoundary = { apply: jest.fn(async () => receipt) };
    const actions = createMealPlanActions(boundary);
    await actions.openRound({ requestId: 'round-open-1', confirmed: true, planId: 'plan-1', expectedVersion: 4,
      participantPersonIds: ['person-2', 'person-3'] });
    await actions.closeRound({ requestId: 'round-close-1', confirmed: true, roundId: 'round-1', expectedVersion: 1 });
    await actions.submitResponse({ requestId: 'response-1', confirmed: true, roundId: 'round-1', expectedVersion: 1,
      candidateIds: ['candidate-1'], availableCandidateIds: ['candidate-1', 'candidate-2'], pass: false, suggestion: 'Soup too' });
    await actions.withdrawResponse({ requestId: 'withdraw-1', confirmed: true, roundId: 'round-1', expectedVersion: 1 });
    await actions.revise({ requestId: 'revise-1', confirmed: true, planId: 'plan-1', expectedVersion: 6 });
    await actions.finalize({ requestId: 'finalize-1', confirmed: true, planId: 'plan-1', expectedVersion: 4,
      organizerNote: null, occasions: [{ id: 'occasion-1', title: null, placementDate: null,
        timing: { kind: 'flexible' }, notEatingPersonIds: [],
        dishes: [{ id: 'dish-1', candidateId: 'candidate-1', dinerPersonIds: ['person-1'], servings: 2 }] }] });
    expect(boundary.apply).toHaveBeenNthCalledWith(1, expect.objectContaining({ operationId: 'meal_planning.round.open',
      planId: 'plan-1', expectedVersion: 4, payload: { participantPersonIds: ['person-2', 'person-3'] } }));
    expect(boundary.apply).toHaveBeenNthCalledWith(2, expect.objectContaining({ operationId: 'meal_planning.round.close', planId: 'round-1' }));
    expect(boundary.apply).toHaveBeenNthCalledWith(3, expect.objectContaining({ operationId: 'meal_planning.response.submit',
      payload: { candidateIds: ['candidate-1'], pass: false, suggestion: 'Soup too' } }));
    expect(boundary.apply).toHaveBeenNthCalledWith(4, expect.objectContaining({ operationId: 'meal_planning.response.withdraw' }));
    expect(boundary.apply).toHaveBeenNthCalledWith(5, expect.objectContaining({ operationId: 'meal_planning.plan.revise', planId: 'plan-1' }));
    expect(boundary.apply).toHaveBeenNthCalledWith(6, expect.objectContaining({ operationId: 'meal_planning.plan.finalize',
      payload: expect.objectContaining({ occasions: [expect.objectContaining({ id: 'occasion-1' })] }) }));
  });

  test('rejects duplicate participants and invalid response candidates before the boundary', async () => {
    const boundary: MealPlanActionBoundary = { apply: jest.fn(async () => receipt) };
    const actions = createMealPlanActions(boundary);
    await expect(actions.openRound({ requestId: 'round-open-1', confirmed: true, planId: 'plan-1', expectedVersion: 4,
      participantPersonIds: ['person-2', 'person-2'] })).rejects.toThrow('meal_plan.participants_invalid');
    await expect(actions.submitResponse({ requestId: 'response-1', confirmed: true, roundId: 'round-1', expectedVersion: 1,
      candidateIds: ['missing'], availableCandidateIds: ['candidate-1'], pass: false, suggestion: null }))
      .rejects.toThrow('unavailable candidate');
    expect(boundary.apply).not.toHaveBeenCalled();
  });
});
