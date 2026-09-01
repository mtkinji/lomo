import type { ActionDockSplitAction } from '../../../ui/ActionDockSplitContent';

export type RecipeNextActionId =
  | 'get_this_meal'
  | 'get_meal_plan'
  | 'review_meal_plan'
  | 'start_cooking'
  | 'continue_cooking'
  | 'add_to_plan'
  | 'remove_from_plan';

export type RecipeNextAction = ActionDockSplitAction<RecipeNextActionId>;

type MealPlanState = 'draft' | 'collecting_choices' | 'ready_to_finalize' | 'finalized' | 'archived' | null;

const recipeGroceryCompilationAvailable = false;

const startCooking: RecipeNextAction = {
  id: 'start_cooking',
  icon: 'play',
  label: 'Start cooking',
  accessibilityLabel: 'Start cooking this Meal',
};

const continueCooking: RecipeNextAction = {
  id: 'continue_cooking',
  icon: 'play',
  label: 'Continue cooking',
  accessibilityLabel: 'Continue cooking this Meal',
};

const addToPlan: RecipeNextAction = {
  id: 'add_to_plan',
  icon: 'plus',
  label: 'Add to Meal Plan',
  accessibilityLabel: 'Add this Meal to the Meal Plan',
};

const removeFromPlan: RecipeNextAction = {
  id: 'remove_from_plan',
  icon: 'check',
  label: 'In Meal Plan · Remove',
  accessibilityLabel: 'Remove this Meal from the Meal Plan',
};

const reviewMealPlan: RecipeNextAction = {
  id: 'review_meal_plan',
  icon: 'listBulleted',
  label: 'Open Meal Plan',
  accessibilityLabel: 'Open the Meal Plan',
};

function thisMealAction(scoped: boolean): RecipeNextAction {
  return {
    id: 'get_this_meal',
    icon: 'cart',
    label: scoped ? 'This Meal only' : 'Get ingredients',
    accessibilityLabel: 'Get ingredients for this Meal',
  };
}

const mealPlanAction: RecipeNextAction = {
  id: 'get_meal_plan',
  icon: 'cart',
  label: 'All planned Meals',
  accessibilityLabel: 'Get ingredients for all Meals in the Meal Plan',
};

export function deriveRecipeNextActions(input: {
  activeCook: boolean;
  isInPlan: boolean;
  planState: MealPlanState;
  cookAvailable?: boolean;
}): { recommendedAction: RecipeNextAction; menuActions: RecipeNextAction[] } {
  const planMembershipAction = input.isInPlan ? removeFromPlan : addToPlan;
  const canCompilePlan = input.isInPlan && input.planState === 'finalized';

  if (input.cookAvailable === false) {
    return input.isInPlan
      ? { recommendedAction: reviewMealPlan, menuActions: [removeFromPlan] }
      : { recommendedAction: addToPlan, menuActions: [] };
  }

  if (input.activeCook) {
    return {
      recommendedAction: continueCooking,
      menuActions: [
        ...(recipeGroceryCompilationAvailable && canCompilePlan ? [mealPlanAction] : []),
        ...(recipeGroceryCompilationAvailable ? [thisMealAction(canCompilePlan)] : []),
        ...(input.isInPlan ? [reviewMealPlan] : []),
        planMembershipAction,
      ],
    };
  }

  if (input.isInPlan) {
    return {
      recommendedAction: reviewMealPlan,
      menuActions: [
        ...(recipeGroceryCompilationAvailable && canCompilePlan ? [mealPlanAction] : []),
        ...(recipeGroceryCompilationAvailable ? [thisMealAction(canCompilePlan)] : []),
        startCooking,
        removeFromPlan,
      ],
    };
  }

  return {
    recommendedAction: addToPlan,
    menuActions: [
      ...(recipeGroceryCompilationAvailable ? [thisMealAction(false)] : []),
      startCooking,
    ],
  };
}
