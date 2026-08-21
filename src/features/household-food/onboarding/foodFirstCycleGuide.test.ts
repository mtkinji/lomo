import {
  FOOD_FIRST_CYCLE_CHECKPOINTS,
  advanceFoodFirstCycle,
  foodFirstCycleStepFromCheckpoint,
  resolveFoodFirstCycleStep,
} from './foodFirstCycleGuide';

describe('Food first cycle guide', () => {
  it('advances only from real actions and keeps sharing optional', () => {
    expect(advanceFoodFirstCycle('choose-recipe', 'recipe-opened')).toBe('add-to-plan');
    expect(advanceFoodFirstCycle('add-to-plan', 'plan-meal-added')).toBe('share-plan');
    expect(advanceFoodFirstCycle('share-plan', 'sharing-skipped')).toBe('send-to-groceries');
    expect(advanceFoodFirstCycle('share-plan', 'sharing-opened')).toBe('send-to-groceries');
    expect(advanceFoodFirstCycle('send-to-groceries', 'grocery-list-created')).toBe('review-groceries');
    expect(advanceFoodFirstCycle('review-groceries', 'grocery-list-viewed')).toBe('complete');
  });

  it('does not advance when an unrelated surface event occurs', () => {
    expect(advanceFoodFirstCycle('add-to-plan', 'recipe-opened')).toBe('add-to-plan');
    expect(advanceFoodFirstCycle('send-to-groceries', 'sharing-opened')).toBe('send-to-groceries');
  });

  it('serializes only known checkpoints', () => {
    expect(foodFirstCycleStepFromCheckpoint(FOOD_FIRST_CYCLE_CHECKPOINTS['share-plan'])).toBe('share-plan');
    expect(foodFirstCycleStepFromCheckpoint('browsing-recipes')).toBeNull();
    expect(foodFirstCycleStepFromCheckpoint(null)).toBeNull();
  });

  it('lets domain evidence heal a stale checkpoint without inventing completion', () => {
    expect(resolveFoodFirstCycleStep({
      checkpoint: FOOD_FIRST_CYCLE_CHECKPOINTS['add-to-plan'],
      hasPlanMeal: true,
      hasGroceryItems: false,
    })).toBe('share-plan');
    expect(resolveFoodFirstCycleStep({
      checkpoint: FOOD_FIRST_CYCLE_CHECKPOINTS['send-to-groceries'],
      hasPlanMeal: true,
      hasGroceryItems: true,
    })).toBe('review-groceries');
    expect(resolveFoodFirstCycleStep({
      checkpoint: FOOD_FIRST_CYCLE_CHECKPOINTS['review-groceries'],
      hasPlanMeal: true,
      hasGroceryItems: false,
    })).toBe('send-to-groceries');
  });

  it('keeps a dismissed guide stopped without claiming the cycle completed', () => {
    expect(advanceFoodFirstCycle('choose-recipe', 'dismissed')).toBe('dismissed');
    expect(resolveFoodFirstCycleStep({
      checkpoint: FOOD_FIRST_CYCLE_CHECKPOINTS.dismissed,
      hasPlanMeal: true,
      hasGroceryItems: true,
    })).toBe('dismissed');
  });
});
