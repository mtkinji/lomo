export type MealPlanFinalizeFailureClass =
  | 'version_conflict'
  | 'validation'
  | 'provider_unavailable'
  | 'unknown';

const VERSION_CODES = new Set([
  'meal_plan.version_conflict',
  'meal_plan.idempotency_conflict',
]);

const VALIDATION_CODES = new Set([
  'meal_plan.ai_evidence_unauthorized',
  'meal_plan.candidate_invalid',
  'meal_plan.date_invalid',
  'meal_plan.diners_invalid',
  'meal_plan.dish_invalid',
  'meal_plan.finalization_invalid',
  'meal_plan.horizon_invalid',
  'meal_plan.idempotency_invalid',
  'meal_plan.identity_invalid',
  'meal_plan.occasion_invalid',
  'meal_plan.organizer_required',
  'meal_plan.recipe_snapshot_invalid',
  'meal_plan.recipe_snapshot_required',
  'meal_plan.servings_invalid',
  'meal_plan.state_invalid',
  'meal_plan.timing_invalid',
]);

function exactErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const record = error as { code?: unknown; message?: unknown };
  if (typeof record.code === 'string') return record.code;
  if (typeof record.message !== 'string') return null;
  return VERSION_CODES.has(record.message) || VALIDATION_CODES.has(record.message)
    ? record.message
    : null;
}

export function classifyMealPlanFinalizeFailure(error: unknown): MealPlanFinalizeFailureClass {
  const code = exactErrorCode(error);
  if (code && VERSION_CODES.has(code)) return 'version_conflict';
  if (code && VALIDATION_CODES.has(code)) return 'validation';

  if (error && typeof error === 'object') {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number' && status >= 500) return 'provider_unavailable';
    if (error instanceof TypeError && (error.message === 'Network request failed' || error.message === 'Failed to fetch')) {
      return 'provider_unavailable';
    }
  }
  return 'unknown';
}
