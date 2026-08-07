import type { MealPlanProjection } from '../data/mealPlanningRepository';

export function getActiveMealPlan(plans: MealPlanProjection[]): MealPlanProjection | null {
  return plans.find((plan) => plan.state !== 'archived') ?? null;
}

export function getActiveMealPlanCount(plans: MealPlanProjection[]): number {
  const plan = getActiveMealPlan(plans);
  if (!plan) return 0;
  return plan.state === 'finalized' ? plan.entries.length : plan.candidates.length;
}
