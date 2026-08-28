import type {
  HouseholdMealPreferencesProjection,
  HouseholdMealPreferencesRepository,
  MealSetupState,
} from '../../../features/household-food/data/householdMealPreferencesRepository';

export type MealPreferenceFoodNeedChange = {
  personId: string;
  ingredientConcept: string;
  displayLabel: string;
  present: boolean;
};

export type MealPreferencePatch = {
  usualDinerCount?: number;
  usualDinerPersonIds?: string[];
  setupState?: MealSetupState;
  foodNeedChanges?: MealPreferenceFoodNeedChange[];
};

export class MealPreferenceStaleError extends Error {
  constructor() { super('meal_preferences.stale_version'); }
}

function normalizePatch(current: HouseholdMealPreferencesProjection, patch: MealPreferencePatch) {
  const usualDinerPersonIds = [...new Set(patch.usualDinerPersonIds ?? current.usualDinerPersonIds)];
  const memberPersonIds = new Set(current.members.map((member) => member.personId));
  if (usualDinerPersonIds.some((personId) => !memberPersonIds.has(personId))) {
    throw new Error('meal_preferences.invalid_diner');
  }
  const usualDinerCount = patch.usualDinerCount ?? current.usualDinerCount;
  if (!Number.isInteger(usualDinerCount) || usualDinerCount < usualDinerPersonIds.length) {
    throw new Error('meal_preferences.invalid_diner_count');
  }
  const foodNeedChanges = (patch.foodNeedChanges ?? []).map((change) => {
    if (!memberPersonIds.has(change.personId)) throw new Error('meal_preferences.invalid_food_need_person');
    const ingredientConcept = change.ingredientConcept.trim().toLocaleLowerCase();
    const displayLabel = change.displayLabel.trim();
    if (!ingredientConcept || !displayLabel) throw new Error('meal_preferences.invalid_food_need');
    return { ...change, ingredientConcept, displayLabel };
  });
  return {
    householdId: current.householdId,
    usualDinerCount,
    usualDinerPersonIds,
    setupState: patch.setupState ?? current.setupState,
    foodNeedChanges,
  };
}

export function createMealPreferenceActions(repository: HouseholdMealPreferencesRepository) {
  const pending = new Map<string, Promise<unknown>>();
  return {
    async read() {
      const projection = await repository.load();
      if (!projection) throw new Error('meal_preferences.unavailable');
      return { status: 'completed' as const, operationId: 'meal_planning.preferences.read' as const, result: projection };
    },
    update(input: { requestId: string; confirmed: boolean; expectedVersion: number; patch: MealPreferencePatch }) {
      const existing = pending.get(input.requestId);
      if (existing) return existing;
      const promise = (async () => {
        if (!input.confirmed) throw new Error('meal_preferences.confirmation_required');
        const current = await repository.load();
        if (!current) throw new Error('meal_preferences.unavailable');
        if (current.version !== input.expectedVersion) throw new MealPreferenceStaleError();
        const reviewed = normalizePatch(current, input.patch);
        const receipt = await repository.updateReviewed({
          ...reviewed,
          expectedVersion: input.expectedVersion,
          idempotencyKey: input.requestId,
        });
        return {
          status: 'completed' as const,
          operationId: 'meal_planning.preferences.update' as const,
          resourceId: current.householdId,
          beforeVersion: input.expectedVersion,
          effectiveVersion: receipt.version,
          replayed: receipt.replayed,
        };
      })().finally(() => pending.delete(input.requestId));
      pending.set(input.requestId, promise);
      return promise;
    },
  };
}

export type MealPreferenceActions = ReturnType<typeof createMealPreferenceActions>;
