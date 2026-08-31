type HouseholdScopeSnapshot = {
  household: { id: string } | null;
};

export async function resolveCurrentMealPlanHouseholdId(
  loadHouseholdSnapshot: () => Promise<HouseholdScopeSnapshot>,
): Promise<string | null> {
  const snapshot = await loadHouseholdSnapshot();
  return snapshot.household?.id ?? null;
}

export async function loadCurrentHouseholdMealCart<Cart>(
  loadHouseholdSnapshot: () => Promise<HouseholdScopeSnapshot>,
  readMealCart: (householdId: string | null) => Promise<Cart>,
): Promise<{ householdId: string | null; cart: Cart }> {
  const householdId = await resolveCurrentMealPlanHouseholdId(loadHouseholdSnapshot);
  return { householdId, cart: await readMealCart(householdId) };
}
