import type { MealPlanProjection } from '../data/mealPlanningRepository';
import { deriveMealPlanCollaborationAction, deriveMealPlanNextMove, finalizedOccasionSummaries } from './NextMealsScreen';

it('keeps alternate dishes together under one finalized meal', () => {
  const plan: MealPlanProjection = {
    id: 'plan', householdId: 'household', version: 2, state: 'finalized', horizon: { kind: 'meal_count', count: 1 },
    candidates: [], entries: [], activeRound: null, updatedAt: '2026-08-06T12:00:00.000Z',
    occasions: [{
      id: 'dinner', title: 'Sunday dinner', placementDate: '2026-08-09', timing: { kind: 'occasion', date: '2026-08-09', mealPeriod: 'dinner' }, notEatingPersonIds: [],
      dishes: [
        { id: 'adult-dish', candidateId: 'a', title: 'Curry', servings: 2, dinerPersonIds: ['a', 'b'], recipeSnapshot: { recipeId: 'recipe-curry' } },
        { id: 'kid-dish', candidateId: 'b', title: 'Toast', servings: 3, dinerPersonIds: ['c', 'd', 'e'] },
      ],
    }],
  };

  expect(finalizedOccasionSummaries(plan)).toEqual([expect.objectContaining({
    title: 'Sun, Aug 9 · Dinner',
    section: 'dated',
    dishes: [
      expect.objectContaining({ label: 'Curry · 2 people · 2 servings', recipeId: 'recipe-curry' }),
      expect.objectContaining({ label: 'Toast · 3 people · 3 servings', recipeId: null }),
    ],
  })]);
});

it('projects saved pre-migration occasions into explicit timing', () => {
  const legacyPlan = {
    id: 'legacy', householdId: 'household', version: 2, state: 'finalized', horizon: { kind: 'open' },
    candidates: [], entries: [], activeRound: null, updatedAt: '2026-08-06T12:00:00.000Z',
    occasions: [{
      id: 'legacy-meal', title: null, placementDate: null, notEatingPersonIds: [],
      dishes: [{ id: 'dish', candidateId: 'candidate', title: 'Soup', servings: 2, dinerPersonIds: ['a'] }],
    }],
  } as unknown as MealPlanProjection;

  expect(finalizedOccasionSummaries(legacyPlan)[0]).toMatchObject({ section: 'flexible', title: 'Flexible' });
});

describe('Meal Plan next move', () => {
  const withState = (
    state: MealPlanProjection['state'],
    candidateCount = 2,
  ): MealPlanProjection => ({
    id: 'plan',
    householdId: 'household',
    version: 2,
    state,
    horizon: { kind: 'open' },
    candidates: Array.from({ length: candidateCount }, (_, index) => ({
      id: `candidate-${index}`,
      kind: 'meal_note',
      title: `Meal ${index + 1}`,
      recipeSnapshot: null,
    })),
    entries: [],
    occasions: [],
    activeRound: null,
    updatedAt: '2026-08-06T12:00:00.000Z',
  });

  it('gives each state one honest primary continuation', () => {
    expect(deriveMealPlanNextMove(withState('draft'))).toEqual({
      kind: 'decide',
      label: 'Decide meals',
    });
    expect(deriveMealPlanNextMove(withState('collecting_choices'))).toEqual({
      kind: 'review_choices',
      label: 'Review family choices',
    });
    expect(deriveMealPlanNextMove(withState('ready_to_finalize'))).toEqual({
      kind: 'decide',
      label: 'Decide meals',
    });
    expect(deriveMealPlanNextMove(withState('finalized'))).toEqual({
      kind: 'make_groceries',
      label: 'Make grocery list',
    });
  });

  it('returns the user to choosing when a draft has no meals', () => {
    expect(deriveMealPlanNextMove(withState('draft', 0))).toEqual({
      kind: 'choose',
      label: 'Choose meals',
    });
  });

  it('asks an attached Household directly and offers explicit sharing for a personal Plan', () => {
    expect(deriveMealPlanCollaborationAction(withState('draft'))).toEqual({
      kind: 'ask-family',
      label: 'Ask the family',
    });
    expect(deriveMealPlanCollaborationAction({
      ...withState('draft'),
      householdId: null,
    })).toEqual({
      kind: 'share-plan',
      label: 'Share this plan',
    });
    expect(deriveMealPlanCollaborationAction(withState('finalized'))).toBeNull();
  });
});
