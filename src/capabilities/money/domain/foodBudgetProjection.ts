export type FoodBudgetProjection = {
  state: 'current' | 'stale' | 'unauthorized'; categoryIds: string[];
  period: { startsOn: string; endsOn: string }; plannedCents: number | null; spentCents: number | null; remainingCents: number | null;
  forecastRangeCents: { min: number; max: number } | null; sourcePlanVersionId: string | null; observedAt: string | null; freshUntil: string | null;
};
export class FoodBudgetProjectionError extends Error { constructor(public readonly code: string, message: string) { super(message); this.name = 'FoodBudgetProjectionError'; } }
function cents(value: number, label: string) { if (!Number.isSafeInteger(value) || value < 0) throw new FoodBudgetProjectionError('food_budget.money_invalid', `${label} must be non-negative integer cents.`); }

export function projectFoodBudget(input: {
  authorized: boolean; selectedCategoryIds: string[]; period: { startsOn: string; endsOn: string };
  categories: Array<{ id: string; plannedCents: number; spentCents: number }>; forecastRangeCents: { min: number; max: number } | null;
  sourcePlanVersionId: string; observedAt: string; now: string; maxAgeSeconds: number;
}): FoodBudgetProjection {
  const categoryIds = [...new Set(input.selectedCategoryIds)];
  if (!input.authorized) return { state: 'unauthorized', categoryIds, period: { ...input.period }, plannedCents: null, spentCents: null, remainingCents: null, forecastRangeCents: null, sourcePlanVersionId: null, observedAt: null, freshUntil: null };
  if (!categoryIds.length || !input.sourcePlanVersionId || !Number.isInteger(input.maxAgeSeconds) || input.maxAgeSeconds < 1 || !Number.isFinite(Date.parse(input.observedAt)) || !Number.isFinite(Date.parse(input.now))) throw new FoodBudgetProjectionError('food_budget.evidence_invalid', 'Authorized Food budget evidence is incomplete.');
  const selected = categoryIds.map((id) => input.categories.find((category) => category.id === id) ?? (() => { throw new FoodBudgetProjectionError('food_budget.category_missing', `Selected category ${id} is unavailable.`); })());
  selected.forEach((category) => { cents(category.plannedCents, 'plannedCents'); cents(category.spentCents, 'spentCents'); });
  if (input.forecastRangeCents) { cents(input.forecastRangeCents.min, 'forecast min'); cents(input.forecastRangeCents.max, 'forecast max'); if (input.forecastRangeCents.max < input.forecastRangeCents.min) throw new FoodBudgetProjectionError('food_budget.forecast_invalid', 'Forecast range is inverted.'); }
  const plannedCents = selected.reduce((sum, category) => sum + category.plannedCents, 0); const spentCents = selected.reduce((sum, category) => sum + category.spentCents, 0);
  const freshUntil = new Date(Date.parse(input.observedAt) + input.maxAgeSeconds * 1000).toISOString();
  return { state: Date.parse(input.now) <= Date.parse(freshUntil) ? 'current' : 'stale', categoryIds, period: { ...input.period }, plannedCents, spentCents, remainingCents: plannedCents - spentCents, forecastRangeCents: input.forecastRangeCents ? { ...input.forecastRangeCents } : null, sourcePlanVersionId: input.sourcePlanVersionId, observedAt: input.observedAt, freshUntil };
}
