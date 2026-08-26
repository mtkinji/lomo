type OrderedMoneyCategory = { sourceId: string };
type GroupedMoneyCategory = OrderedMoneyCategory & { planRole?: 'protected' | 'flexible' };

export function splitMoneyCategoriesByPlanRole<T extends GroupedMoneyCategory>(
  categories: readonly T[],
): { flexible: T[]; committed: T[] } {
  return categories.reduce<{ flexible: T[]; committed: T[] }>((groups, category) => {
    if (category.planRole === 'protected') groups.committed.push(category);
    else groups.flexible.push(category);
    return groups;
  }, { flexible: [], committed: [] });
}

export function mergeMoneyCategoryGroupOrder<T extends GroupedMoneyCategory>(
  initial: readonly T[],
  flexible: readonly T[],
  committed: readonly T[],
): readonly T[] {
  let flexibleIndex = 0;
  let committedIndex = 0;

  return initial.map((category) => {
    if (category.planRole === 'protected') {
      return committed[committedIndex++] ?? category;
    }
    return flexible[flexibleIndex++] ?? category;
  });
}

export function moveMoneyCategory<T extends OrderedMoneyCategory>(
  categories: readonly T[],
  sourceId: string,
  offset: -1 | 1,
): readonly T[] {
  const currentIndex = categories.findIndex((category) => category.sourceId === sourceId);
  const nextIndex = currentIndex + offset;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= categories.length) return categories;

  const next = [...categories];
  const [moved] = next.splice(currentIndex, 1);
  next.splice(nextIndex, 0, moved);
  return next;
}

export function moneyCategoryOrderChanged(
  initial: readonly OrderedMoneyCategory[],
  current: readonly OrderedMoneyCategory[],
): boolean {
  return initial.length !== current.length
    || initial.some((category, index) => category.sourceId !== current[index]?.sourceId);
}
