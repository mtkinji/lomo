import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useAppStore } from '../../../store/useAppStore';
import { projectChoreReviewQueue } from '../domain/choreLearning';
import { useChoreLearningStore } from './useChoreLearningStore';

type ChoreCaregiverAttentionRuntimeHostProps = {
  userId: string | null;
};

export async function syncChoreCaregiverAppBadge(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(Math.max(0, count)).catch((error) => {
    if (__DEV__) {
      // Badge delivery is best-effort and must never block app startup.
      // eslint-disable-next-line no-console
      console.warn('[chores] app badge sync failed', error);
    }
  });
}

export function ChoreCaregiverAttentionRuntimeHost({
  userId,
}: ChoreCaregiverAttentionRuntimeHostProps) {
  const notificationsEnabled = useAppStore(
    (state) => state.notificationPreferences.notificationsEnabled,
  );
  const osPermissionStatus = useAppStore(
    (state) => state.notificationPreferences.osPermissionStatus,
  );
  const record = useChoreLearningStore((state) => state.record);

  const canShowBadge = Boolean(
    userId
    && notificationsEnabled
    && osPermissionStatus === 'authorized',
  );
  const attentionCount = canShowBadge
    ? projectChoreReviewQueue(record, record.activeMemberId).length
    : 0;

  useEffect(() => {
    void syncChoreCaregiverAppBadge(attentionCount);
  }, [attentionCount]);

  return null;
}
