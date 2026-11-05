type CategoryIdentity = { id: string; legacy_budget_id: string | null; slug: string };

/** Plan allocations use the same legacy-key/slug convention as MoneySnapshot.
 * Transaction rows may instead carry the category's database UUID.
 * Keep unknown keys unresolved so the save contract still rejects missing categories.
 */
export function livingPlanCategoryResolver(categories: CategoryIdentity[]): (key: string) => string {
  const aliases = new Map<string, { id: string; key: string }>();
  for (const category of categories) {
    const key = category.legacy_budget_id?.trim() || category.slug;
    for (const alias of [category.id, category.legacy_budget_id, category.slug]) {
      if (!alias) continue;
      const existing = aliases.get(alias);
      if (existing && existing.id !== category.id) {
        throw new Error('Budget categories have conflicting identifiers. This plan cannot be saved safely.');
      }
      aliases.set(alias, { id: category.id, key });
    }
  }
  return (key) => aliases.get(key)?.key ?? key;
}

export function uniqueLivingPlanOverrides(overrides: Array<{ categoryId: string; amountCents: number }>): Array<{ categoryId: string; amountCents: number }> {
  const amounts = new Map<string, number>();
  for (const override of overrides) {
    const prior = amounts.get(override.categoryId);
    if (prior !== undefined && prior !== override.amountCents) {
      throw new Error('A Budget category has conflicting saved amounts. Review its amount before changing this plan.');
    }
    amounts.set(override.categoryId, override.amountCents);
  }
  return [...amounts].map(([categoryId, amountCents]) => ({ categoryId, amountCents }));
}
