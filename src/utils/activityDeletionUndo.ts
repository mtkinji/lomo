import type { Activity } from '../domain/types';

export type ActivityDeleteUndoSnapshot = {
  activity: Activity;
  relatedActivities: Activity[];
  originalIndex: number;
};

export function buildActivityDeleteUndoSnapshot(
  activities: Activity[],
  activityId: string,
): ActivityDeleteUndoSnapshot | null {
  const originalIndex = activities.findIndex((activity) => activity.id === activityId);
  const activity = originalIndex >= 0 ? activities[originalIndex] : null;
  if (!activity) return null;

  const relatedActivities = activities.filter((candidate) => {
    if (candidate.id === activityId) return false;
    const hasLinkedStep = (candidate.steps ?? []).some((step: any) => step?.linkedActivityId === activityId);
    const origin = (candidate as any).origin;
    const hasOriginLink = origin?.kind === 'activity_step' && origin?.parentActivityId === activityId;
    return hasLinkedStep || hasOriginLink;
  });

  return {
    activity,
    relatedActivities,
    originalIndex,
  };
}
