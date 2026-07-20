import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AnalyticsEvent } from '../../services/analytics/events';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import type { PlanMode } from '../../services/plan/planAvailability';
import type { PlanUnplacedPriorityReason } from '../../services/plan/planScheduling';

type RecommendationTelemetryItem = {
  activityId: string;
  durationMinutes: number;
  priorityPosition?: number;
};

type UnplacedTelemetryItem = RecommendationTelemetryItem & {
  reason: PlanUnplacedPriorityReason;
  mode: PlanMode;
};

export function usePlanRecommendationFunnel(params: {
  visible: boolean;
  dateKey: string;
  recommendations: RecommendationTelemetryItem[];
  unplacedPriorities: UnplacedTelemetryItem[];
}) {
  const { visible, dateKey, recommendations, unplacedPriorities } = params;
  const { capture } = useAnalytics();
  const exposureKeysRef = useRef(new Set<string>());

  const metadataByActivityId = useMemo(() => {
    const next = new Map<string, { position: number; durationMinutes: number }>();
    recommendations.forEach((item, index) => {
      next.set(item.activityId, {
        position: (item.priorityPosition ?? index) + 1,
        durationMinutes: item.durationMinutes,
      });
    });
    unplacedPriorities.forEach((item, index) => {
      if (!next.has(item.activityId)) {
        next.set(item.activityId, {
          position: (item.priorityPosition ?? index) + 1,
          durationMinutes: item.durationMinutes,
        });
      }
    });
    return next;
  }, [recommendations, unplacedPriorities]);

  useEffect(() => {
    if (!visible) return;
    recommendations.forEach((item, index) => {
      const key = `shown:${dateKey}:${item.activityId}`;
      if (exposureKeysRef.current.has(key)) return;
      exposureKeysRef.current.add(key);
      capture(AnalyticsEvent.PlanRecommendationShown, {
        activity_id: item.activityId,
        date_key: dateKey,
        position: (item.priorityPosition ?? index) + 1,
        duration_minutes: item.durationMinutes,
      });
    });
    unplacedPriorities.forEach((item, index) => {
      const key = `unplaced:${dateKey}:${item.activityId}:${item.reason}`;
      if (exposureKeysRef.current.has(key)) return;
      exposureKeysRef.current.add(key);
      capture(AnalyticsEvent.PlanRecommendationUnplaced, {
        activity_id: item.activityId,
        date_key: dateKey,
        position: (item.priorityPosition ?? index) + 1,
        duration_minutes: item.durationMinutes,
        reason: item.reason,
        mode: item.mode,
      });
    });
  }, [capture, dateKey, recommendations, unplacedPriorities, visible]);

  const recordCommitted = useCallback(
    (activityId: string) => {
      const metadata = metadataByActivityId.get(activityId);
      if (!metadata) return;
      capture(AnalyticsEvent.PlanRecommendationCommitted, {
        activity_id: activityId,
        date_key: dateKey,
        position: metadata.position,
        duration_minutes: metadata.durationMinutes,
      });
    },
    [capture, dateKey, metadataByActivityId],
  );

  const recordDismissed = useCallback(
    (activityId: string, action: 'skip' | 'not_today') => {
      const metadata = metadataByActivityId.get(activityId);
      if (!metadata) return;
      capture(AnalyticsEvent.PlanRecommendationDismissed, {
        activity_id: activityId,
        date_key: dateKey,
        position: metadata.position,
        duration_minutes: metadata.durationMinutes,
        action,
      });
    },
    [capture, dateKey, metadataByActivityId],
  );

  return { recordCommitted, recordDismissed };
}
