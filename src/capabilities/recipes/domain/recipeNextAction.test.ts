import { deriveRecipeNextActions } from './recipeNextAction';

describe('deriveRecipeNextActions', () => {
  it('defaults an uncooked Meal outside the plan to adding it to the Meal Plan', () => {
    const result = deriveRecipeNextActions({ activeCook: false, isInPlan: false, planState: null });

    expect(result.recommendedAction).toMatchObject({ id: 'add_to_plan', label: 'Add to Meal Plan' });
    expect(result.menuActions.map((action) => action.id)).toEqual(['start_cooking']);
  });

  it('opens an unfinished Meal Plan without exposing deferred Grocery compilation', () => {
    const result = deriveRecipeNextActions({ activeCook: false, isInPlan: true, planState: 'draft' });

    expect(result.recommendedAction).toMatchObject({ id: 'review_meal_plan', label: 'Open Meal Plan' });
    expect(result.menuActions.map((action) => action.id)).toEqual(['start_cooking', 'remove_from_plan']);
  });

  it('opens a finalized Meal Plan without exposing either deferred Grocery scope', () => {
    const result = deriveRecipeNextActions({ activeCook: false, isInPlan: true, planState: 'finalized' });

    expect(result.recommendedAction).toMatchObject({ id: 'review_meal_plan', label: 'Open Meal Plan' });
    expect(result.menuActions.map((action) => action.id)).toEqual(['start_cooking', 'remove_from_plan']);
  });

  it('keeps an active Cook Session dominant without exposing deferred Grocery compilation', () => {
    const result = deriveRecipeNextActions({ activeCook: true, isInPlan: true, planState: 'finalized' });

    expect(result.recommendedAction).toMatchObject({ id: 'continue_cooking', label: 'Continue cooking' });
    expect(result.menuActions.map((action) => action.id)).toEqual(['review_meal_plan', 'remove_from_plan']);
  });
});
