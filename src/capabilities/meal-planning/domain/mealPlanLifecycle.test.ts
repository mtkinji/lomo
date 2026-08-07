import { addRecipeCandidateToDraft, transitionMealPlan, validateMealPlanHorizon } from './mealPlanLifecycle';

describe('Meal Plan lifecycle', () => {
  test.each([
    [{ kind: 'next_shop', shopBy: null }],
    [{ kind: 'next_shop', shopBy: '2026-08-08' }],
    [{ kind: 'meal_count', count: 5 }],
    [{ kind: 'date_range', startsOn: '2026-08-08', endsOn: '2026-08-21' }],
    [{ kind: 'open' }],
  ] as const)('accepts horizon %j', (horizon) => expect(validateMealPlanHorizon(horizon)).toEqual(horizon));

  it('rejects invalid range and meal-count horizons', () => {
    expect(() => validateMealPlanHorizon({ kind: 'date_range', startsOn: '2026-08-10', endsOn: '2026-08-09' })).toThrow('ends before');
    expect(() => validateMealPlanHorizon({ kind: 'meal_count', count: 0 })).toThrow('between 1 and 60');
  });

  test.each([
    ['draft', 'open_choices', 'collecting_choices'],
    ['collecting_choices', 'close_choices', 'ready_to_finalize'],
    ['collecting_choices', 'cancel_choices', 'draft'],
    ['ready_to_finalize', 'finalize', 'finalized'],
    ['draft', 'finalize', 'finalized'],
    ['finalized', 'revise', 'draft'],
    ['finalized', 'archive', 'archived'],
  ] as const)('%s + %s -> %s', (state, event, expected) => {
    expect(transitionMealPlan(state, event)).toBe(expected);
  });

  it('rejects invalid transitions', () => {
    expect(() => transitionMealPlan('archived', 'finalize')).toThrow('transition');
  });

  it('adds one exact Recipe version to a draft and replays duplicate taps', () => {
    const plan = { id: 'plan-1', version: 4, state: 'draft' as const, candidates: [] };
    const candidate = { id: 'candidate-1', kind: 'recipe' as const, title: 'Soup', recipeSnapshot: { recipeId: 'recipe-1', recipeVersionId: 'version-3' } };
    const first = addRecipeCandidateToDraft(plan, candidate);
    const replay = addRecipeCandidateToDraft({ ...plan, candidates: first.candidates }, { ...candidate, id: 'candidate-2' });
    expect(first).toMatchObject({ outcome: 'added', expectedVersion: 4 });
    expect(replay).toMatchObject({ outcome: 'replayed' });
    expect(replay.effectiveCandidateId).toBe('candidate-1');
    expect(replay.candidates).toHaveLength(1);
  });

  it('preserves intent when the active plan is no longer a draft', () => {
    expect(addRecipeCandidateToDraft(
      { id: 'plan-1', version: 5, state: 'finalized', candidates: [] },
      { id: 'candidate-1', kind: 'recipe', title: 'Soup', recipeSnapshot: { recipeId: 'recipe-1', recipeVersionId: 'version-3' } },
    )).toEqual(expect.objectContaining({
      outcome: 'needs_recovery',
      recoveryChoices: ['start_new_plan', 'add_to_draft_copy'],
    }));
  });
});
