export type FoodFirstCycleStep =
  | 'choose-recipe'
  | 'add-to-plan'
  | 'share-plan'
  | 'send-to-groceries'
  | 'review-groceries'
  | 'complete'
  | 'dismissed';

export type FoodFirstCycleEvent =
  | 'recipe-opened'
  | 'plan-meal-added'
  | 'sharing-opened'
  | 'sharing-skipped'
  | 'grocery-list-created'
  | 'grocery-list-viewed'
  | 'dismissed';

export const FOOD_FIRST_CYCLE_CHECKPOINTS: Record<FoodFirstCycleStep, string> = {
  'choose-recipe': 'food-guide:choose-recipe',
  'add-to-plan': 'food-guide:add-to-plan',
  'share-plan': 'food-guide:share-plan',
  'send-to-groceries': 'food-guide:send-to-groceries',
  'review-groceries': 'food-guide:review-groceries',
  complete: 'food-guide:complete',
  dismissed: 'food-guide:dismissed',
};

const stepByCheckpoint = new Map(
  Object.entries(FOOD_FIRST_CYCLE_CHECKPOINTS).map(([step, checkpoint]) => [
    checkpoint,
    step as FoodFirstCycleStep,
  ]),
);

export function foodFirstCycleStepFromCheckpoint(
  checkpoint: string | null | undefined,
): FoodFirstCycleStep | null {
  return checkpoint ? stepByCheckpoint.get(checkpoint) ?? null : null;
}

export function advanceFoodFirstCycle(
  step: FoodFirstCycleStep,
  event: FoodFirstCycleEvent,
): FoodFirstCycleStep {
  if (event === 'dismissed') return 'dismissed';
  if (step === 'choose-recipe' && event === 'recipe-opened') return 'add-to-plan';
  if (step === 'add-to-plan' && event === 'plan-meal-added') return 'share-plan';
  if (
    step === 'share-plan' &&
    (event === 'sharing-opened' || event === 'sharing-skipped')
  ) return 'send-to-groceries';
  if (step === 'send-to-groceries' && event === 'grocery-list-created') {
    return 'review-groceries';
  }
  if (step === 'review-groceries' && event === 'grocery-list-viewed') return 'complete';
  return step;
}

export function resolveFoodFirstCycleStep({
  checkpoint,
  hasPlanMeal,
  hasGroceryItems,
}: {
  checkpoint: string | null | undefined;
  hasPlanMeal: boolean;
  hasGroceryItems: boolean;
}): FoodFirstCycleStep | null {
  const step = foodFirstCycleStepFromCheckpoint(checkpoint);
  if (!step || step === 'dismissed' || step === 'complete') return step;
  if (hasGroceryItems) return 'review-groceries';
  if (step === 'review-groceries') return hasPlanMeal ? 'send-to-groceries' : 'choose-recipe';
  if (hasPlanMeal && (step === 'choose-recipe' || step === 'add-to-plan')) return 'share-plan';
  return step;
}
