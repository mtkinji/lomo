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
  markActivityReminderFired,
  saveDailyFocusLedger,
  saveDailyShowUpLedger,
} from './NotificationDeliveryLedger';
import { useAppStore } from '../../store/useAppStore';

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

  // 2) Daily show-up: repeating notifications do not “disappear”, so we estimate once/day after the time.
  const prefs = useAppStore.getState().notificationPreferences;
  if (prefs.notificationsEnabled && prefs.allowDailyShowUp && prefs.osPermissionStatus === 'authorized') {
    const daily = await loadDailyShowUpLedger();
    const timeLocal = daily.scheduleTimeLocal ?? prefs.dailyShowUpTime ?? null;
    if (timeLocal) {
      const today = dateKeyNow();
      const alreadyMarked = daily.lastFiredDateKey === today;
      if (!alreadyMarked && hasPassedLocalTime(timeLocal, now)) {
        track(posthogClient, AnalyticsEvent.NotificationFiredEstimated, {
          notification_type: 'dailyShowUp',
          notification_id: daily.notificationId ?? null,
          date_key: today,
          schedule_time_local: timeLocal,
          detected_at: nowIso,
          detection_source: source,
        });

        await saveDailyShowUpLedger({
          ...daily,
          scheduleTimeLocal: timeLocal,
          lastFiredDateKey: today,
        });
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
          });
        }
      }

      // Best-effort: estimate "fired" once/day after the scheduled time.
      const alreadyMarked = focusLedger.lastFiredDateKey === todayLocal;
      if (!alreadyMarked && hasPassedLocalTime(timeLocal, now)) {
        track(posthogClient, AnalyticsEvent.NotificationFiredEstimated, {
          notification_type: 'dailyFocus',
          notification_id: focusLedger.notificationId ?? null,
          date_key: todayLocal,
          schedule_time_local: timeLocal,
          detected_at: nowIso,
          detection_source: source,
        });

        await saveDailyFocusLedger({
          ...focusLedger,
          scheduleTimeLocal: timeLocal,
          lastFiredDateKey: todayLocal,
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


