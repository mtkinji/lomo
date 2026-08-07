import { deriveRecipeNextActions } from './recipeNextAction';

describe('deriveRecipeNextActions', () => {
  it('defaults an uncooked Meal outside the plan to its own ingredient review', () => {
    const result = deriveRecipeNextActions({ activeCook: false, isInPlan: false, planState: null });

    expect(result.recommendedAction).toMatchObject({ id: 'get_this_meal', label: 'Get ingredients' });
    expect(result.menuActions.map((action) => action.id)).toEqual(['start_cooking', 'add_to_plan']);
  });

  it('keeps an unfinished plan out of Grocery compilation', () => {
    const result = deriveRecipeNextActions({ activeCook: false, isInPlan: true, planState: 'draft' });

    expect(result.recommendedAction.id).toBe('get_this_meal');
    expect(result.menuActions.map((action) => action.id)).toEqual(['review_meal_plan', 'start_cooking', 'remove_from_plan']);
    expect(result.menuActions.find((action) => action.id === 'get_meal_plan')).toBeUndefined();
  });

  it('defaults a Meal in a finalized plan to all-plan ingredient review', () => {
    const result = deriveRecipeNextActions({ activeCook: false, isInPlan: true, planState: 'finalized' });

    expect(result.recommendedAction).toMatchObject({ id: 'get_meal_plan', label: 'Get ingredients' });
    expect(result.menuActions.map((action) => action.id)).toEqual(['get_this_meal', 'start_cooking', 'remove_from_plan']);
    expect(result.menuActions[0]).toMatchObject({ label: 'This Meal only' });
  });

  it('keeps an active Cook Session dominant while retaining both ingredient scopes', () => {
    const result = deriveRecipeNextActions({ activeCook: true, isInPlan: true, planState: 'finalized' });

    expect(result.recommendedAction).toMatchObject({ id: 'continue_cooking', label: 'Continue cooking' });
    expect(result.menuActions.map((action) => action.id)).toEqual(['get_meal_plan', 'get_this_meal', 'remove_from_plan']);
  });
});
