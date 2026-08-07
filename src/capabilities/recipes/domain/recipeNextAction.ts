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
  label: 'Review Meal Plan',
  accessibilityLabel: 'Review the unfinished Meal Plan',
};

function thisMealAction(asPrimary: boolean): RecipeNextAction {
  return {
    id: 'get_this_meal',
    icon: 'cart',
    label: asPrimary ? 'Get ingredients' : 'This Meal only',
    accessibilityLabel: 'Get ingredients for this Meal',
  };
}

function mealPlanAction(asPrimary: boolean): RecipeNextAction {
  return {
    id: 'get_meal_plan',
    icon: 'cart',
    label: asPrimary ? 'Get ingredients' : 'All planned Meals',
    accessibilityLabel: 'Get ingredients for all Meals in the Meal Plan',
  };
}

export function deriveRecipeNextActions(input: {
  activeCook: boolean;
  isInPlan: boolean;
  planState: MealPlanState;
}): { recommendedAction: RecipeNextAction; menuActions: RecipeNextAction[] } {
  const planMembershipAction = input.isInPlan ? removeFromPlan : addToPlan;
  const canCompilePlan = input.isInPlan && input.planState === 'finalized';

  if (input.activeCook) {
    return {
      recommendedAction: continueCooking,
      menuActions: [
        ...(canCompilePlan ? [mealPlanAction(false)] : []),
        thisMealAction(false),
        planMembershipAction,
      ],
    };
  }

  if (canCompilePlan) {
    return {
      recommendedAction: mealPlanAction(true),
      menuActions: [thisMealAction(false), startCooking, removeFromPlan],
    };
  }

  return {
    recommendedAction: thisMealAction(true),
    menuActions: [
      ...(input.isInPlan && input.planState && input.planState !== 'archived' ? [reviewMealPlan] : []),
      startCooking,
      planMembershipAction,
    ],
  };
}
