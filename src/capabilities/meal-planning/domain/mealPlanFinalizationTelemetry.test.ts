import { classifyMealPlanFinalizeFailure } from './mealPlanFinalizationTelemetry';

describe('classifyMealPlanFinalizeFailure', () => {
  it.each([
    [{ code: 'meal_plan.version_conflict' }, 'version_conflict'],
    [new Error('meal_plan.idempotency_conflict'), 'version_conflict'],
    [{ code: 'meal_plan.finalization_invalid' }, 'validation'],
    [new Error('meal_plan.diners_invalid'), 'validation'],
    [{ status: 503 }, 'provider_unavailable'],
    [new TypeError('Network request failed'), 'provider_unavailable'],
    [new TypeError('Failed to fetch'), 'provider_unavailable'],
    [new Error('Customer-specific backend detail'), 'unknown'],
    ['meal_plan.version_conflict', 'unknown'],
    [null, 'unknown'],
  ])('maps bounded failure evidence without returning raw text', (error, expected) => {
    expect(classifyMealPlanFinalizeFailure(error)).toBe(expected);
  });
});
