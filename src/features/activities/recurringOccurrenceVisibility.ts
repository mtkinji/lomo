import type { Activity } from '../../domain/types';

export function findNewRecurringOccurrencesForList({
  previousActivityIds,
  previousListActivityIds,
  activities,
}: {
  previousActivityIds: ReadonlySet<string>;
  previousListActivityIds: ReadonlySet<string>;
  activities: readonly Activity[];
}): string[] {
  return activities
    .filter((activity) => {
      if (previousActivityIds.has(activity.id)) return false;
      const sourceId = activity.repeatCreatedFromActivityId;
      return Boolean(sourceId && previousListActivityIds.has(sourceId));
    })
    .map((activity) => activity.id);
}
