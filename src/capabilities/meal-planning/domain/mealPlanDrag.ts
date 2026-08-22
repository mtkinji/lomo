export type MealPlanDropSection = 'ideas' | 'planned';

type MealPlanDragEntry = {
  kind: 'meal' | 'plannedHeading' | string;
};

export function hasCompleteMealPlanOrder(
  localIds: readonly string[],
  items: readonly { id: string }[],
): boolean {
  if (localIds.length !== items.length) return false;
  if (new Set(localIds).size !== localIds.length) return false;
  const authoritativeIds = new Set(items.map((item) => item.id));
  return localIds.every((id) => authoritativeIds.has(id));
}

export function getMealPlanDropSection(
  entries: readonly MealPlanDragEntry[],
  from: number,
  to: number,
): MealPlanDropSection {
  const reordered = [...entries];
  const [moved] = reordered.splice(from, 1);
  if (moved) reordered.splice(to, 0, moved);

  const plannedHeadingIndex = reordered.findIndex((entry) => entry.kind === 'plannedHeading');
  const movedIndex = moved ? reordered.indexOf(moved) : -1;
  return plannedHeadingIndex >= 0 && movedIndex > plannedHeadingIndex ? 'planned' : 'ideas';
}
