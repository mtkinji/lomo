import { deriveRecipeNextActions } from './recipeNextAction';

describe('deriveRecipeNextActions', () => {
  it('defaults an uncooked Meal outside the plan to adding it to the Meal Plan', () => {
    const result = deriveRecipeNextActions({ activeCook: false, isInPlan: false, planState: null });

    expect(result.recommendedAction).toMatchObject({ id: 'add_to_plan', label: 'Add to Meal Plan' });
    expect(result.menuActions.map((action) => action.id)).toEqual(['get_this_meal', 'start_cooking']);
    expect(result.menuActions[0]).toMatchObject({ label: 'Get ingredients' });
  });

  it('opens an unfinished Meal Plan while keeping Grocery compilation secondary', () => {
    const result = deriveRecipeNextActions({ activeCook: false, isInPlan: true, planState: 'draft' });

    expect(result.recommendedAction).toMatchObject({ id: 'review_meal_plan', label: 'Open Meal Plan' });
    expect(result.menuActions.map((action) => action.id)).toEqual(['get_this_meal', 'start_cooking', 'remove_from_plan']);
    expect(result.menuActions.find((action) => action.id === 'get_meal_plan')).toBeUndefined();
  });

  it('opens a finalized Meal Plan while retaining both ingredient scopes in the menu', () => {
    const result = deriveRecipeNextActions({ activeCook: false, isInPlan: true, planState: 'finalized' });

    expect(result.recommendedAction).toMatchObject({ id: 'review_meal_plan', label: 'Open Meal Plan' });
    expect(result.menuActions.map((action) => action.id)).toEqual([
      'get_meal_plan',
      'get_this_meal',
      'start_cooking',
      'remove_from_plan',
    ]);
    expect(result.menuActions[0]).toMatchObject({ label: 'All planned Meals' });
    expect(result.menuActions[1]).toMatchObject({ label: 'This Meal only' });
  });

  it('keeps an active Cook Session dominant while retaining both ingredient scopes', () => {
    const result = deriveRecipeNextActions({ activeCook: true, isInPlan: true, planState: 'finalized' });

    expect(result.recommendedAction).toMatchObject({ id: 'continue_cooking', label: 'Continue cooking' });
    expect(result.menuActions.map((action) => action.id)).toEqual([
      'get_meal_plan',
      'get_this_meal',
      'review_meal_plan',
      'remove_from_plan',
    ]);
  });
});
