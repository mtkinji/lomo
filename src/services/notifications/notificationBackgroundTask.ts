import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { posthogClient } from '../analytics/posthogClient';
import { track } from '../analytics/analytics';
import { AnalyticsEvent } from '../analytics/events';
import {
  deleteActivityReminderLedgerEntry,
  loadActivityReminderLedger,
  loadDailyFocusLedger,
  loadDailyShowUpLedger,
  loadGoalNudgeLedger,
  loadSetupNextStepLedger,
  markActivityReminderFired,
  recordSystemNudgeFiredEstimated,
  recordSystemNudgeScheduled,
  saveDailyFocusLedger,
  saveDailyShowUpLedger,
  saveGoalNudgeLedger,
  saveSetupNextStepLedger,
} from './NotificationDeliveryLedger';
import { useAppStore } from '../../store/useAppStore';
import { pickGoalNudgeCandidate, buildGoalNudgeContent } from './goalNudge';
import { getSuggestedNextStep } from '../recommendations/nextStep';

export const NOTIFICATION_RECONCILE_TASK = 'kwilt-notification-reconcile-v1';

function dateKeyNow(): string {
  return new Date().toISOString().slice(0, 10);
}

function localDateKey(date: Date): string {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function hasPassedLocalTime(scheduleTimeLocal: string, now: Date): boolean {
  const [h, m] = scheduleTimeLocal.split(':');
  const hour = Number.parseInt(h ?? '0', 10);
  const minute = Number.parseInt(m ?? '0', 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return false;
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const minutesTarget = hour * 60 + minute;
  return minutesNow >= minutesTarget;
}

function nextLocalOccurrence(timeLocal: string, now: Date): Date {
  const [h, m] = timeLocal.split(':');
  const hour = Number.parseInt(h ?? '9', 10);
  const minute = Number.parseInt(m ?? '0', 10);
  const fireAt = new Date(now);
  fireAt.setHours(Number.isNaN(hour) ? 9 : hour, Number.isNaN(minute) ? 0 : minute, 0, 0);
  if (fireAt.getTime() <= now.getTime()) {
    fireAt.setDate(fireAt.getDate() + 1);
  }
  return fireAt;
}

export async function reconcileNotificationsFiredEstimated(
  source: 'background_fetch' | 'app_launch',
): Promise<void> {
  const now = new Date();
  const nowIso = now.toISOString();

  // 1) Activity reminders: one-shot notifications disappear from scheduled list after firing.
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const scheduledIds = new Set(scheduled.map((req) => req.identifier));

  const activityLedger = await loadActivityReminderLedger();
  for (const entry of Object.values(activityLedger)) {
    if (entry.cancelledAtIso) continue;
    if (entry.firedAtIso) continue;
    if (!entry.scheduledForIso) continue;

    const when = new Date(entry.scheduledForIso);
    if (Number.isNaN(when.getTime())) continue;

    // Don’t mark as fired until it’s safely in the past.
    if (when.getTime() > now.getTime() - 60_000) continue;

    const stillScheduled = scheduledIds.has(entry.notificationId);
    if (stillScheduled) continue;

    track(posthogClient, AnalyticsEvent.NotificationFiredEstimated, {
      notification_type: 'activityReminder',
      notification_id: entry.notificationId,
      activity_id: entry.activityId,
      scheduled_for: entry.scheduledForIso,
      detected_at: nowIso,
      detection_source: source,
    });

    await markActivityReminderFired(entry.activityId, entry.scheduledForIso, nowIso);
    await deleteActivityReminderLedgerEntry(entry.activityId);
  }

  // 2) Daily show-up: one-shot notification; estimate fired when it disappears from scheduled list.
  const prefs = useAppStore.getState().notificationPreferences;
  if (prefs.notificationsEnabled && prefs.allowDailyShowUp && prefs.osPermissionStatus === 'authorized') {
    const daily = await loadDailyShowUpLedger();
    const timeLocal = daily.scheduleTimeLocal ?? prefs.dailyShowUpTime ?? null;
    if (timeLocal) {
      const scheduledShowUps = scheduled.filter((req) => {
        const data = req.content.data as any;
        return data && data.type === 'dailyShowUp';
      });

      if (daily.scheduledForIso && daily.notificationId) {
        const when = new Date(daily.scheduledForIso);
        if (!Number.isNaN(when.getTime()) && when.getTime() <= now.getTime() - 60_000) {
          const stillScheduled = scheduledIds.has(daily.notificationId);
          if (!stillScheduled) {
            const todayLocal = localDateKey(now);
            track(posthogClient, AnalyticsEvent.NotificationFiredEstimated, {
              notification_type: 'dailyShowUp',
              notification_id: daily.notificationId ?? null,
              date_key: todayLocal,
              schedule_time_local: timeLocal,
              detected_at: nowIso,
              detection_source: source,
            });
            await recordSystemNudgeFiredEstimated({
              dateKey: todayLocal,
              type: 'dailyShowUp',
              notificationId: daily.notificationId,
              firedAtIso: nowIso,
            });
            await saveDailyShowUpLedger({
              notificationId: null,
              scheduleTimeLocal: timeLocal,
              scheduledForIso: null,
              lastFiredDateKey: todayLocal,
            });
          }
        }
      }

      // Ensure there is a future daily show-up scheduled (best-effort).
      if (scheduledShowUps.length === 0) {
        const state = useAppStore.getState();
        const suggested = getSuggestedNextStep({
          arcs: state.arcs,
          goals: state.goals,
          activities: state.activities,
          now,
        });
        const isSetup = suggested?.kind === 'setup';

        const fireAt = nextLocalOccurrence(timeLocal, now);
        const type = isSetup ? 'setupNextStep' : 'dailyShowUp';
        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title:
              type === 'setupNextStep'
                ? suggested?.kind === 'setup' && suggested.reason === 'no_goals'
                  ? 'Start your first goal'
                  : 'Add one tiny step'
                : 'Align your day with your arcs',
            body:
              type === 'setupNextStep'
                ? suggested?.kind === 'setup' && suggested.reason === 'no_goals'
                  ? 'Create one goal so Kwilt can start nudging you at the right moments.'
                  : 'Add one Activity so you can build momentum today.'
                : 'Open Kwilt to review Today and choose one tiny step.',
            data:
              type === 'setupNextStep'
                ? { type: 'setupNextStep', reason: suggested?.kind === 'setup' ? suggested.reason : 'no_activities' }
                : { type: 'dailyShowUp' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireAt,
          },
        });
        track(posthogClient, AnalyticsEvent.NotificationScheduled, {
          notification_type: type,
          notification_id: identifier,
          scheduled_for: fireAt.toISOString(),
          schedule_time_local: timeLocal,
          scheduled_source: source,
        });
        if (type === 'setupNextStep') {
          await saveSetupNextStepLedger({
            notificationId: identifier,
            scheduleTimeLocal: timeLocal,
            reason: suggested?.kind === 'setup' ? suggested.reason : 'no_activities',
            scheduledForIso: fireAt.toISOString(),
          });
        } else {
          await saveDailyShowUpLedger({
            notificationId: identifier,
            scheduleTimeLocal: timeLocal,
            scheduledForIso: fireAt.toISOString(),
          });
        }
        await recordSystemNudgeScheduled({
          dateKey: localDateKey(fireAt),
          type,
          notificationId: identifier,
          scheduledForIso: fireAt.toISOString(),
        });
      }
    }
  }

  // 2b) setupNextStep: estimate fired when it disappears from scheduled list (one-shot).
  if (prefs.notificationsEnabled && prefs.allowDailyShowUp && prefs.osPermissionStatus === 'authorized') {
    const setupLedger = await loadSetupNextStepLedger();
    if (setupLedger.scheduledForIso && setupLedger.notificationId) {
      const when = new Date(setupLedger.scheduledForIso);
      if (!Number.isNaN(when.getTime()) && when.getTime() <= now.getTime() - 60_000) {
        const stillScheduled = scheduledIds.has(setupLedger.notificationId);
        if (!stillScheduled) {
          const todayLocal = localDateKey(now);
          track(posthogClient, AnalyticsEvent.NotificationFiredEstimated, {
            notification_type: 'setupNextStep',
            notification_id: setupLedger.notificationId ?? null,
            date_key: todayLocal,
            schedule_time_local: setupLedger.scheduleTimeLocal ?? null,
            detected_at: nowIso,
            detection_source: source,
          });
          await recordSystemNudgeFiredEstimated({
            dateKey: todayLocal,
            type: 'setupNextStep',
            notificationId: setupLedger.notificationId,
            firedAtIso: nowIso,
          });
          await saveSetupNextStepLedger({
            notificationId: null,
            scheduleTimeLocal: setupLedger.scheduleTimeLocal ?? null,
            scheduledForIso: null,
            lastFiredDateKey: todayLocal,
            reason: setupLedger.reason ?? null,
          });
        }
      }
    }
  }

  // 3) Daily focus: one-shot notification we keep scheduled for the next occurrence.
  if (prefs.notificationsEnabled && prefs.allowDailyFocus && prefs.osPermissionStatus === 'authorized') {
    const focusLedger = await loadDailyFocusLedger();
    const timeLocal = focusLedger.scheduleTimeLocal ?? prefs.dailyFocusTime ?? null;
    if (timeLocal) {
      const state = useAppStore.getState();
      const todayLocal = localDateKey(now);
      const completedToday = state.lastCompletedFocusSessionDate === todayLocal;

      // Find any scheduled daily focus notifications.
      const scheduledDailyFocus = scheduled.filter((req) => {
        const data = req.content.data as any;
        return data && data.type === 'dailyFocus';
      });

      // Estimate fired when it disappears.
      if (focusLedger.scheduledForIso && focusLedger.notificationId) {
        const when = new Date(focusLedger.scheduledForIso);
        if (!Number.isNaN(when.getTime()) && when.getTime() <= now.getTime() - 60_000) {
          const stillScheduled = scheduledIds.has(focusLedger.notificationId);
          if (!stillScheduled) {
            track(posthogClient, AnalyticsEvent.NotificationFiredEstimated, {
              notification_type: 'dailyFocus',
              notification_id: focusLedger.notificationId ?? null,
              date_key: todayLocal,
              schedule_time_local: timeLocal,
              detected_at: nowIso,
              detection_source: source,
            });
            await recordSystemNudgeFiredEstimated({
              dateKey: todayLocal,
              type: 'dailyFocus',
              notificationId: focusLedger.notificationId,
              firedAtIso: nowIso,
            });
            await saveDailyFocusLedger({
              ...focusLedger,
              notificationId: null,
              scheduleTimeLocal: timeLocal,
              scheduledForIso: null,
              lastFiredDateKey: todayLocal,
            });
          }
        }
      }

      // If focus is completed today, cancel any scheduled daily-focus nudges and schedule tomorrow.
      if (completedToday) {
        await Promise.all(
          scheduledDailyFocus.map((req) =>
            Notifications.cancelScheduledNotificationAsync(req.identifier).catch(() => undefined),
          ),
        );

        const [h, m] = timeLocal.split(':');
        const hour = Number.parseInt(h ?? '8', 10);
        const minute = Number.parseInt(m ?? '0', 10);
        const fireAt = new Date(now);
        fireAt.setHours(Number.isNaN(hour) ? 8 : hour, Number.isNaN(minute) ? 0 : minute, 0, 0);
        fireAt.setDate(fireAt.getDate() + 1);

        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Finish one focus session today',
            body:
              'Complete one full timer—earn clarity now, and build momentum that makes tomorrow easier.',
            data: { type: 'dailyFocus' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireAt,
          },
        });

        await saveDailyFocusLedger({
          notificationId: identifier,
          scheduleTimeLocal: timeLocal,
          scheduledForIso: fireAt.toISOString(),
        });
        await recordSystemNudgeScheduled({
          dateKey: localDateKey(fireAt),
          type: 'dailyFocus',
          notificationId: identifier,
          scheduledForIso: fireAt.toISOString(),
        });
      } else {
        // If nothing is scheduled, schedule the next occurrence (today if still upcoming; else tomorrow).
        if (scheduledDailyFocus.length === 0) {
          const [h, m] = timeLocal.split(':');
          const hour = Number.parseInt(h ?? '8', 10);
          const minute = Number.parseInt(m ?? '0', 10);
          const fireAt = new Date(now);
          fireAt.setHours(Number.isNaN(hour) ? 8 : hour, Number.isNaN(minute) ? 0 : minute, 0, 0);
          if (fireAt.getTime() <= now.getTime()) {
            fireAt.setDate(fireAt.getDate() + 1);
          }

          const identifier = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Finish one focus session today',
              body:
                'Complete one full timer—earn clarity now, and build momentum that makes tomorrow easier.',
              data: { type: 'dailyFocus' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: fireAt,
            },
          });

          await saveDailyFocusLedger({
            notificationId: identifier,
            scheduleTimeLocal: timeLocal,
            scheduledForIso: fireAt.toISOString(),
          });
          await recordSystemNudgeScheduled({
            dateKey: localDateKey(fireAt),
            type: 'dailyFocus',
            notificationId: identifier,
            scheduledForIso: fireAt.toISOString(),
          });
        }
      }
    }
  }

  // 4) Goal nudges: one-shot notification; estimate fired when it disappears from scheduled list.
  if (prefs.notificationsEnabled && prefs.allowGoalNudges && prefs.osPermissionStatus === 'authorized') {
    const goalNudgeLedger = await loadGoalNudgeLedger();
    const timeLocal = goalNudgeLedger.scheduleTimeLocal ?? (prefs as any).goalNudgeTime ?? '16:00';

    const scheduledGoalNudges = scheduled.filter((req) => {
      const data = req.content.data as any;
      return data && data.type === 'goalNudge';
    });

    // If we had a recorded scheduledForIso and it is in the past, but the notification is no longer scheduled,
    // treat it as fired and update system-nudge caps.
    if (goalNudgeLedger.scheduledForIso && goalNudgeLedger.notificationId) {
      const when = new Date(goalNudgeLedger.scheduledForIso);
      if (!Number.isNaN(when.getTime()) && when.getTime() <= now.getTime() - 60_000) {
        const stillScheduled = scheduledIds.has(goalNudgeLedger.notificationId);
        if (!stillScheduled) {
          const todayLocal = localDateKey(now);
          await recordSystemNudgeFiredEstimated({
            dateKey: todayLocal,
            type: 'goalNudge',
            notificationId: goalNudgeLedger.notificationId,
            firedAtIso: nowIso,
          });

          await saveGoalNudgeLedger({
            notificationId: null,
            scheduleTimeLocal: timeLocal,
            lastFiredDateKey: todayLocal,
            goalId: goalNudgeLedger.goalId ?? null,
            scheduledForIso: null,
          });
        }
      }
    }

    // Ensure there is a future goal nudge scheduled if eligible (best-effort).
    if (scheduledGoalNudges.length === 0) {
      const state = useAppStore.getState();
      const candidate = pickGoalNudgeCandidate({
        arcs: state.arcs,
        goals: state.goals,
        activities: state.activities,
        now,
      });
      if (candidate) {
        // v2 caps/backoff are enforced by NotificationService scheduling, but background reconcile
        // should still record scheduled entries for telemetry + future caps.
          const fireAt = nextLocalOccurrence(timeLocal, now);
          const identifier = await Notifications.scheduleNotificationAsync({
            content: {
              ...buildGoalNudgeContent({ goalTitle: candidate.goalTitle, arcName: candidate.arcName }),
              data: { type: 'goalNudge', goalId: candidate.goalId },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: fireAt,
            },
          });

          track(posthogClient, AnalyticsEvent.NotificationScheduled, {
            notification_type: 'goalNudge',
            notification_id: identifier,
            goal_id: candidate.goalId,
            scheduled_for: fireAt.toISOString(),
            schedule_time_local: timeLocal,
            scheduled_source: source,
          });

          await saveGoalNudgeLedger({
            notificationId: identifier,
            scheduleTimeLocal: timeLocal,
            goalId: candidate.goalId,
            scheduledForIso: fireAt.toISOString(),
          });

          const dateKey = localDateKey(fireAt);
          await recordSystemNudgeScheduled({
            dateKey,
            type: 'goalNudge',
            notificationId: identifier,
            scheduledForIso: fireAt.toISOString(),
          });
      }
    }
  }
}

TaskManager.defineTask(NOTIFICATION_RECONCILE_TASK, async () => {
  try {
    await reconcileNotificationsFiredEstimated('background_fetch');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[notifications] background reconcile failed', error);
    }
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerNotificationReconcileTask(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync();
  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    return;
  }

  const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(NOTIFICATION_RECONCILE_TASK);
  if (alreadyRegistered) return;

  await BackgroundFetch.registerTaskAsync(NOTIFICATION_RECONCILE_TASK, {
    minimumInterval: 15 * 60, // iOS/Android clamp this; best-effort.
    stopOnTerminate: false,
    startOnBoot: true,
  });
}


