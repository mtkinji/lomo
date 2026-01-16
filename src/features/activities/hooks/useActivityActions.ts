import React from 'react';
import { LayoutAnimation } from 'react-native';
import { useAppStore } from '../../../store/useAppStore';
import {
  celebrateFirstActivity,
  celebrateAllActivitiesDone,
  useCelebrationStore,
  recordShowUpWithCelebration,
} from '../../../store/useCelebrationStore';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { HapticsService } from '../../../services/HapticsService';
import { playActivityDoneSound } from '../../../services/uiSounds';
import { createProgressSignal } from '../../../services/progressSignals';
import type { Activity } from '../../../domain/types';

export type UseActivityActionsReturn = {
  handleToggleComplete: (activityId: string) => void;
  handleTogglePriorityOne: (activityId: string) => void;
  handleReorderActivities: (orderedIds: string[]) => void;
};

export function useActivityActions(): UseActivityActionsReturn {
  const activities = useAppStore((state) => state.activities);
  const updateActivity = useAppStore((state) => state.updateActivity);
  const reorderActivities = useAppStore((state) => state.reorderActivities);
  const { capture } = useAnalytics();

  const handleToggleComplete = React.useCallback(
    (activityId: string) => {
      const timestamp = new Date().toISOString();
      let didFireHaptic = false;
      let wasFirstCompletion = false;
      let completedGoalId: string | null = null;
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          220,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity,
        ),
      );
      updateActivity(activityId, (activity) => {
        const nextIsDone = activity.status !== 'done';
        if (!didFireHaptic) {
          didFireHaptic = true;
          void HapticsService.trigger(nextIsDone ? 'outcome.bigSuccess' : 'canvas.primary.confirm');
        }
        if (nextIsDone) {
          void playActivityDoneSound();
          wasFirstCompletion = true;
          // Capture goalId for progress signal
          completedGoalId = activity.goalId ?? null;
        }
        capture(AnalyticsEvent.ActivityCompletionToggled, {
          source: 'activities_list',
          activity_id: activityId,
          goal_id: activity.goalId ?? null,
          next_status: nextIsDone ? 'done' : 'planned',
          had_steps: Boolean(activity.steps && activity.steps.length > 0),
        });
        return {
          ...activity,
          status: nextIsDone ? 'done' : 'planned',
          completedAt: nextIsDone ? timestamp : null,
          updatedAt: timestamp,
        };
      });

      // Fire progress signal for shared goals (fire-and-forget)
      if (completedGoalId) {
        void createProgressSignal({ goalId: completedGoalId, type: 'progress_made' });
      }

      // Celebration checks (run after state update settles)
      if (wasFirstCompletion) {
        // Record the show-up (this also triggers daily streak celebration if milestone)
        recordShowUpWithCelebration();

        // Check if this is the user's very first completed activity
        const { hasBeenShown } = useCelebrationStore.getState();
        if (!hasBeenShown('first-activity-ever')) {
          // Check if there were any previously completed activities
          const completedActivities = activities.filter((a) => a.status === 'done');
          if (completedActivities.length === 0) {
            // This is their first activity completion ever!
            setTimeout(() => celebrateFirstActivity(), 600);
          }
        }

        // Check if all scheduled activities for today are now done
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);

        const todayActivities = activities.filter((a) => {
          if (!a.scheduledDate) return false;
          const scheduled = new Date(a.scheduledDate);
          return scheduled >= todayStart && scheduled < todayEnd;
        });

        // After this completion, all today's activities are done
        const remainingIncomplete = todayActivities.filter(
          (a) => a.id !== activityId && a.status !== 'done' && a.status !== 'skipped' && a.status !== 'cancelled'
        );

        if (todayActivities.length >= 3 && remainingIncomplete.length === 0) {
          // All done for today! (only if they had 3+ activities planned)
          const celebrationId = `all-done-${todayStart.toISOString().slice(0, 10)}`;
          if (!hasBeenShown(celebrationId)) {
            setTimeout(() => celebrateAllActivitiesDone(), 800);
          }
        }
      }
    },
    [activities, capture, updateActivity],
  );

  const handleTogglePriorityOne = React.useCallback(
    (activityId: string) => {
      const timestamp = new Date().toISOString();
      let didFireHaptic = false;
      updateActivity(activityId, (activity) => {
        const nextPriority = activity.priority === 1 ? undefined : 1;
        if (!didFireHaptic) {
          didFireHaptic = true;
          void HapticsService.trigger(nextPriority === 1 ? 'canvas.toggle.on' : 'canvas.toggle.off');
        }
        return {
          ...activity,
          priority: nextPriority,
          updatedAt: timestamp,
        };
      });
    },
    [updateActivity],
  );

  // Handle reorder - called immediately when user drops an item
  const handleReorderActivities = React.useCallback(
    (orderedIds: string[]) => {
      reorderActivities(orderedIds);
    },
    [reorderActivities],
  );

  return {
    handleToggleComplete,
    handleTogglePriorityOne,
    handleReorderActivities,
  };
}

