const messages: Record<string, string> = {
  missing_recipe_version: 'A recipe in this plan could not be loaded for groceries. Refresh Meals and try again.',
  stale_household_plan: 'This meal plan changed. Refresh Meals and try again.',
  stale_or_unfinalized_meal_plan: 'This meal plan changed. Refresh Meals and try again.',
  household_plan_grocery_manage_forbidden: 'Only a household owner or caregiver can change planned meals.',
  personal_plan_grocery_manage_forbidden: 'Only the plan’s owner can change planned meals.',
  hard_pass_review_required: 'Review the household’s hard passes before planning this meal.',
  unauthorized: 'Sign in again to update meals and groceries.',
};

type FunctionFailure = {
  context?: { status?: number; clone?: () => FunctionFailure['context']; json?: () => Promise<unknown> };
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

/** Keep the server reason for diagnostics without displaying the SDK wrapper. */
export async function groceryCompileError(error: unknown): Promise<Error> {
  const context = (error as FunctionFailure | null)?.context;
  const status = typeof context?.status === 'number' ? context.status : null;
  let body: Record<string, unknown> | null = null;
  try {
    const response = context?.clone ? context.clone() : context;
    body = record(await response?.json?.());
  } catch {
    // Gateways can return an empty or non-JSON error response.
  }
  const serverError = record(body?.error) ?? body;
  const code = typeof serverError?.code === 'string' ? serverError.code : null;
  const message = (status === 401 ? messages.unauthorized : code ? messages[code] : null)
    ?? 'Meals and groceries could not be updated. Try again in a moment.';
  return Object.assign(new Error(message), { code, status, cause: error });
}
