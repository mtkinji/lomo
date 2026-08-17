export const DEFAULT_MEAL_SERVINGS = 4;
export const MIN_MEAL_SERVINGS = 1;
export const MAX_MEAL_SERVINGS = 20;

export function clampDefaultMealServings(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MEAL_SERVINGS;
  return Math.min(MAX_MEAL_SERVINGS, Math.max(MIN_MEAL_SERVINGS, Math.round(value)));
}

export function resolveDefaultMealServings(value: number | null | undefined): number {
  return typeof value === 'number' ? clampDefaultMealServings(value) : DEFAULT_MEAL_SERVINGS;
}

export function resolveSuggestedMealServings(input: {
  selectedServings?: number | null;
  usualDinerCount?: number | null;
  usualDinerPersonIds?: readonly string[];
  numericFallback?: number | null;
}): number {
  if (typeof input.selectedServings === 'number') return clampDefaultMealServings(input.selectedServings);
  if (typeof input.usualDinerCount === 'number') return clampDefaultMealServings(input.usualDinerCount);
  if (input.usualDinerPersonIds?.length) return clampDefaultMealServings(new Set(input.usualDinerPersonIds).size);
  return resolveDefaultMealServings(input.numericFallback);
}

export function resolveCandidateMealServings(
  recipeSnapshot: Record<string, unknown> | null,
  fallback: number,
): number {
  const selectedServings = recipeSnapshot?.selectedServings;
  return typeof selectedServings === 'number'
    ? clampDefaultMealServings(selectedServings)
    : clampDefaultMealServings(fallback);
}
