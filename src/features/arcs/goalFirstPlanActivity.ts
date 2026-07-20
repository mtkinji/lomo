import type { Activity } from '../../domain/types';

export function selectFirstGoalPlanActivityId(goalActivities: Activity[]): string | null {
  const activeActivities = goalActivities.filter((activity) => activity.status !== 'done');
  if (activeActivities.length === 0) return goalActivities[0]?.id ?? null;

  activeActivities.sort((a, b) => {
    const orderA = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;

    const createdA = a.createdAt ?? '';
    const createdB = b.createdAt ?? '';
    return createdA.localeCompare(createdB);
  });

  return activeActivities[0]?.id ?? null;
}
