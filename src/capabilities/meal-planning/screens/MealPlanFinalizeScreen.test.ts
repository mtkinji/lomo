import type { MealPlanProjection } from '../data/mealPlanningRepository';
import { buildDefaultMealOccasions, occasionNeedsAttention } from './MealPlanFinalizeScreen';
import { readFileSync } from 'fs';
import path from 'path';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'native-uuid' }));

const plan: MealPlanProjection = {
  id: 'plan', householdId: 'household', version: 1, state: 'draft', horizon: { kind: 'meal_count', count: 2 },
  candidates: [
    { id: 'candidate-a', kind: 'recipe', title: 'Pasta', recipeSnapshot: { selectedServings: 4 } },
    { id: 'candidate-b', kind: 'meal_note', title: 'Toast', recipeSnapshot: null },
  ],
  entries: [], occasions: [], activeRound: null, updatedAt: '2026-08-06T12:00:00.000Z',
};

describe('Meal Plan finalization occasions', () => {
  it('hands successful finalization to Next Meals and emits only a bounded failure class', () => {
    const source = readFileSync(path.join(__dirname, 'MealPlanFinalizeScreen.tsx'), 'utf8');

    expect(source).toContain("feedbackPromptId: 'meal_plan_finalized_satisfaction_v1'");
    expect(source).toContain('AnalyticsEvent.MealPlanFinalizeFailed');
    expect(source).toContain('failure_class: classifyMealPlanFinalizeFailure(error)');
    expect(source).not.toContain('MealPlanFinalizeFailed, { error');
  });

  it('uses the native UUID provider when building new occasions', () => {
    const [occasion] = buildDefaultMealOccasions({ ...plan, candidates: [plan.candidates[0]] }, ['adult'], 2);

    expect(occasion.id).toBe('native-uuid');
    expect(occasion.dishes[0].id).toBe('native-uuid');
  });

  it('defaults to one occasion and one diner-assigned dish per candidate', () => {
    let next = 0;
    const occasions = buildDefaultMealOccasions(plan, ['adult', 'child'], 4, () => `id-${++next}`);

    expect(occasions).toHaveLength(2);
    expect(occasions[0].dishes).toEqual([
      expect.objectContaining({ candidateId: 'candidate-a', dinerPersonIds: ['adult', 'child'], servings: 4 }),
    ]);
    expect(occasions[1].dishes).toEqual([
      expect.objectContaining({ candidateId: 'candidate-b', dinerPersonIds: ['adult', 'child'], servings: 4 }),
    ]);
  });

  it('uses planned portions without treating the recipe multiplier as diners', () => {
    const [occasion] = buildDefaultMealOccasions({
      ...plan,
      candidates: [{
        ...plan.candidates[0],
        recipeSnapshot: { recipeScaleMultiplier: 3, plannedPortions: 2, selectedServings: 9 },
      }],
    }, ['adult', 'child'], 7, () => 'id');

    expect(occasion.dishes[0]).toMatchObject({ servings: 2, dinerPersonIds: ['adult', 'child'] });
  });

  it('keeps the household count independent from the named diners', () => {
    const [occasion] = buildDefaultMealOccasions(
      { ...plan, candidates: [plan.candidates[1]] },
      ['adult', 'child'],
      7,
      () => 'id',
    );

    expect(occasion.dishes[0]).toMatchObject({ dinerPersonIds: ['adult', 'child'], servings: 7 });
  });

  it('gives a revised plan new occasion and dish identities while preserving its choices', () => {
    let next = 0;
    const [occasion] = buildDefaultMealOccasions({
      ...plan,
      version: 4,
      occasions: [{
        id: 'finalized-occasion',
        title: 'Friday',
        placementDate: null,
        timing: { kind: 'flexible' },
        notEatingPersonIds: [],
        dishes: [{
          id: 'finalized-dish',
          candidateId: 'candidate-a',
          title: 'Pasta',
          servings: 4,
          dinerPersonIds: ['adult'],
        }],
      }],
    }, ['adult'], 2, () => `revision-${++next}`);

    expect(occasion).toMatchObject({
      id: 'revision-1',
      title: 'Friday',
      dishes: [{ id: 'revision-2', candidateId: 'candidate-a', servings: 4 }],
    });
  });

  it('rebinds a preserved dish to the current candidate for the same exact Recipe version', () => {
    const [occasion] = buildDefaultMealOccasions({
      ...plan,
      candidates: [{
        ...plan.candidates[0],
        id: 'candidate-current',
        recipeSnapshot: { recipeVersionId: 'recipe-version-1', selectedServings: 4 },
      }],
      occasions: [{
        id: 'old-occasion', title: null, placementDate: null, timing: { kind: 'flexible' }, notEatingPersonIds: [],
        dishes: [{
          id: 'old-dish', candidateId: 'candidate-old', title: 'Pasta', servings: 4,
          dinerPersonIds: ['adult'], recipeSnapshot: { recipeVersionId: 'recipe-version-1' },
        }],
      }],
    }, ['adult'], 2, () => 'new-id');

    expect(occasion.dishes[0].candidateId).toBe('candidate-current');
  });

  it('preserves a recipe candidate split and requires excluded diners to be resolved', () => {
    const split = {
      ...plan,
      candidates: [{
        ...plan.candidates[0],
        recipeSnapshot: {
          selectedServings: 2,
          dinerPersonIds: ['adult'],
          excludedDinerPersonIds: ['child'],
          excludedDinerResolution: 'needs_alternative',
        },
      }],
    };
    let next = 0;
    const [occasion] = buildDefaultMealOccasions(split, ['adult', 'child'], 4, () => `split-${++next}`);

    expect(occasionNeedsAttention(occasion, ['adult', 'child'])).toBe(true);
    expect(occasionNeedsAttention({ ...occasion, notEatingPersonIds: ['child'] }, ['adult', 'child'])).toBe(false);
  });
});
