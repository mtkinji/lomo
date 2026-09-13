type VersionedMealPlan = {
  planId: string | null;
  version: number | null;
};

type MealPlanMutationError = Error & { code?: unknown };

function isStaleMealPlanError(error: unknown): error is MealPlanMutationError {
  const code = (error as MealPlanMutationError | null)?.code;
  return code === 'stale_household_plan' || code === 'stale_or_unfinalized_meal_plan';
}

export async function runMealPlanMutationWithFreshVersion<Result>({
  planId,
  version,
  mutate,
  reload,
}: {
  planId: string;
  version: number;
  mutate: (planId: string, expectedVersion: number) => Promise<Result>;
  reload: () => Promise<VersionedMealPlan>;
}): Promise<Result> {
  try {
    return await mutate(planId, version);
  } catch (error) {
    if (!isStaleMealPlanError(error)) throw error;
    const current = await reload();
    if (!current.planId || current.version === null) throw error;
    return mutate(current.planId, current.version);
  }
}
