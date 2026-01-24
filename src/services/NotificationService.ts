import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Activity } from '../domain/types';
import { useAppStore } from '../store/useAppStore';
import { rootNavigationRef } from '../navigation/rootNavigationRef';
import { posthogClient } from './analytics/posthogClient';
import { track } from './analytics/analytics';
import { AnalyticsEvent } from './analytics/events';
import {
  type SystemNudgeLedger,
  markActivityReminderCancelled,
  saveDailyShowUpLedger,
  saveDailyFocusLedger,
  upsertActivityReminderSchedule,
  saveGoalNudgeLedger,
  loadSystemNudgeLedger,
  recordSystemNudgeOpened,
  recordSystemNudgeScheduled,
  saveSetupNextStepLedger,
} from './notifications/NotificationDeliveryLedger';
import { pickGoalNudgeCandidate, buildGoalNudgeContent } from './notifications/goalNudge';
import { getSuggestedNextStep, hasAnyActivitiesScheduledForToday } from './recommendations/nextStep';

type OsPermissionStatus = 'notRequested' | 'authorized' | 'denied' | 'restricted';

type NotificationType =
  | 'activityReminder'
  | 'dailyShowUp'
  | 'dailyFocus'
  | 'goalNudge'
  | 'setupNextStep'
  | 'locationOffer'
  | 'streak'
  | 'reactivation';

type ActivitySnapshot = Pick<Activity, 'id' | 'reminderAt' | 'status' | 'repeatRule' | 'repeatCustom'>;
type ActivitySnapshotExtended = ActivitySnapshot & Pick<Activity, 'title' | 'goalId'>;

type NotificationPreferences = ReturnType<typeof useAppStore.getState>['notificationPreferences'];

type NotificationData =
  | { type: 'activityReminder'; activityId: string }
  | { type: 'dailyShowUp' }
  | { type: 'dailyFocus' }
  | { type: 'goalNudge'; goalId: string }
  | { type: 'setupNextStep'; reason: 'no_goals' | 'no_activities' }
  | { type: 'locationOffer'; activityId: string; event?: 'enter' | 'exit' }
  | { type: 'streak' }
  | { type: 'reactivation' };

// Local in-memory map of scheduled notification ids, hydrated on init.
const activityNotificationIds = new Map<string, string>();
let dailyShowUpNotificationId: string | null = null;
let dailyFocusNotificationId: string | null = null;
let goalNudgeNotificationId: string | null = null;
let setupNextStepNotificationId: string | null = null;

let isInitialized = false;
let hasAttachedStoreSubscription = false;

const SYSTEM_NUDGE_TYPES: Array<NotificationData['type']> = [
  'dailyShowUp',
  'setupNextStep',
  'dailyFocus',
  'goalNudge',
];
const SYSTEM_NUDGE_DAILY_CAP = 2;
const SYSTEM_NUDGE_MIN_SPACING_MS = 6 * 60 * 60 * 1000;
const SYSTEM_NUDGE_SUPPRESS_UPCOMING_ACTIVITY_REMINDER_MS = 3 * 60 * 60 * 1000;

let responseSubscription:
  | Notifications.Subscription
  | null = null;
let receivedSubscription: Notifications.Subscription | null = null;

/**
 * Configure the base notification handler so local notifications show as alerts
 * without playing sounds or setting badges by default.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function getPreferences(): NotificationPreferences {
  return useAppStore.getState().notificationPreferences;
}

function setPreferences(updater: (current: NotificationPreferences) => NotificationPreferences) {
  useAppStore.getState().setNotificationPreferences(updater);
}

async function syncOsPermissionStatus(): Promise<OsPermissionStatus> {
  const permissions = await Notifications.getPermissionsAsync();
  let status: OsPermissionStatus = 'notRequested';
  if (permissions.status === 'granted') {
    status = 'authorized';
  } else if (permissions.status === 'denied') {
    status = 'denied';
  } else if (permissions.status === 'undetermined') {
    status = 'notRequested';
  } else {
    status = 'restricted';
  }

  setPreferences((current) => ({
    ...current,
    osPermissionStatus: status,
  }));

  return status;
}

async function hydrateScheduledNotifications() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    activityNotificationIds.clear();
    scheduled.forEach((request) => {
      const data = request.content.data as Partial<NotificationData> | undefined;
      if (data && data.type === 'activityReminder' && 'activityId' in data && data.activityId) {
        activityNotificationIds.set(data.activityId, request.identifier);
      }
      if (data && data.type === 'dailyShowUp') {
        dailyShowUpNotificationId = request.identifier;
      }
      if (data && data.type === 'dailyFocus') {
        dailyFocusNotificationId = request.identifier;
      }
      if (data && data.type === 'goalNudge') {
        goalNudgeNotificationId = request.identifier;
      }
      if (data && data.type === 'setupNextStep') {
        setupNextStepNotificationId = request.identifier;
      }
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[notifications] failed to hydrate scheduled notifications', error);
    }
  }
}

function localDateKey(date: Date): string {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addLocalDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function hasUpcomingExplicitActivityReminder(params: {
  activities: ActivitySnapshotExtended[];
  now: Date;
  windowMs: number;
}): boolean {
  const { activities, now, windowMs } = params;
  const nowMs = now.getTime();
  const endMs = nowMs + windowMs;
  return activities.some((a) => {
    if (!a.reminderAt) return false;
    if (a.status === 'done' || a.status === 'cancelled') return false;
    const whenMs = new Date(a.reminderAt).getTime();
    if (Number.isNaN(whenMs)) return false;
    return whenMs > nowMs && whenMs <= endMs;
  });
}

async function applyGlobalSystemNudgeGuards(params: {
  fireAt: Date;
  /**
   * The nudge type we're scheduling. Used for debug + future refinement.
   */
  type: NotificationData['type'];
  ledger?: SystemNudgeLedger;
}): Promise<Date> {
  let fireAt = new Date(params.fireAt);
  const ledger = params.ledger ?? (await loadSystemNudgeLedger());

  // 1) Global per-day cap: if we already delivered N system nudges today, push to tomorrow.
  // Note: this uses the "fired estimated" ledger (local-only), which is best-effort.
  // We intentionally do not count merely-scheduled nudges toward the cap.
  for (let i = 0; i < 7; i++) {
    const dayKey = localDateKey(fireAt);
    const sentCount = ledger.sentCountByDate?.[dayKey] ?? 0;
    if (sentCount < SYSTEM_NUDGE_DAILY_CAP) break;
    fireAt = addLocalDays(fireAt, 1);
  }

  // 2) Global spacing across system nudges: enforce a 6h gap from the last delivered system nudge.
  const lastSentAtIsoValues = Object.entries(ledger.lastSentAtByType ?? {})
    .filter(([type]) => SYSTEM_NUDGE_TYPES.includes(type as NotificationData['type']))
    .map(([, iso]) => iso)
    .filter((v): v is string => typeof v === 'string' && v.length > 0);

  const lastSentAtMs = lastSentAtIsoValues.reduce<number | null>((max, iso) => {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return max;
    return max === null ? t : Math.max(max, t);
  }, null);

  if (lastSentAtMs !== null) {
    const minAllowed = lastSentAtMs + SYSTEM_NUDGE_MIN_SPACING_MS;
    if (fireAt.getTime() < minAllowed) {
      // Preserve the user's intended time-of-day by pushing to the next day
      // instead of shifting into an unexpected hour.
      fireAt = addLocalDays(fireAt, 1);
    }
  }

  return fireAt;
}

async function cancelAllScheduledDailyShowUps(reason: 'reschedule' | 'explicit_cancel') {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const matches = scheduled.filter((req) => {
      const data = req.content.data as Partial<NotificationData> | undefined;
      return Boolean(data && data.type === 'dailyShowUp');
    });
    if (matches.length === 0) {
      dailyShowUpNotificationId = null;
      return;
    }

    await Promise.all(
      matches.map((req) =>
        Notifications.cancelScheduledNotificationAsync(req.identifier).catch(() => undefined),
      ),
    );

    matches.forEach((req) => {
      track(posthogClient, AnalyticsEvent.NotificationCancelled, {
        notification_type: 'dailyShowUp',
        notification_id: req.identifier,
        reason,
      });
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[notifications] failed to cancel daily show-up notification(s)', { error });
    }
  } finally {
    dailyShowUpNotificationId = null;
  }
}

async function cancelAllScheduledSetupNextSteps(reason: 'reschedule' | 'explicit_cancel') {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const matches = scheduled.filter((req) => {
      const data = req.content.data as Partial<NotificationData> | undefined;
      return Boolean(data && data.type === 'setupNextStep');
    });
    if (matches.length === 0) {
      setupNextStepNotificationId = null;
      return;
    }

    await Promise.all(
      matches.map((req) =>
        Notifications.cancelScheduledNotificationAsync(req.identifier).catch(() => undefined),
      ),
    );

    matches.forEach((req) => {
      track(posthogClient, AnalyticsEvent.NotificationCancelled, {
        notification_type: 'setupNextStep',
        notification_id: req.identifier,
        reason,
      });
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[notifications] failed to cancel setupNextStep notification(s)', { error });
    }
  } finally {
    setupNextStepNotificationId = null;
  }
}

async function cancelAllScheduledDailyFocuses(reason: 'reschedule' | 'explicit_cancel') {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const matches = scheduled.filter((req) => {
      const data = req.content.data as Partial<NotificationData> | undefined;
      return Boolean(data && data.type === 'dailyFocus');
    });
    if (matches.length === 0) {
      dailyFocusNotificationId = null;
      return;
    }

    await Promise.all(
      matches.map((req) =>
        Notifications.cancelScheduledNotificationAsync(req.identifier).catch(() => undefined),
      ),
    );

    matches.forEach((req) => {
      track(posthogClient, AnalyticsEvent.NotificationCancelled, {
        notification_type: 'dailyFocus',
        notification_id: req.identifier,
        reason,
      });
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[notifications] failed to cancel daily focus notification(s)', { error });
    }
  } finally {
    dailyFocusNotificationId = null;
  }
}

function shouldScheduleNotificationsForActivity(
  activity: ActivitySnapshot,
  prefs: NotificationPreferences,
): boolean {
  if (!prefs.notificationsEnabled || !prefs.allowActivityReminders) {
    return false;
  }
  if (prefs.osPermissionStatus !== 'authorized') {
    return false;
  }
  if (!activity.reminderAt) {
    return false;
  }
  // Skip completed activities.
  if (activity.status === 'done') {
    return false;
  }
  const when = new Date(activity.reminderAt);
  if (Number.isNaN(when.getTime())) {
    return false;
  }
  // For one-shot reminders, only schedule future times.
  // For repeating reminders, we schedule based on the local time-of-day/cadence.
  const isRepeating =
    Boolean(activity.repeatRule) &&
    (activity.repeatRule === 'custom' ? Boolean(activity.repeatCustom) : true);
  if (!isRepeating && when.getTime() <= Date.now()) {
    return false;
  }
  return true;
}

function startOfWeekLocal(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0..6 (Sun..Sat)
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function buildUpcomingCustomWeeklyDates(params: {
  anchor: Date;
  hour: number;
  minute: number;
  intervalWeeks: number;
  weekdays: number[];
  maxOccurrences: number;
}): Date[] {
  const { anchor, hour, minute, intervalWeeks, weekdays, maxOccurrences } = params;

  const pickedDays =
    weekdays.length > 0
      ? Array.from(new Set(weekdays))
          .filter((d) => Number.isFinite(d) && d >= 0 && d <= 6)
          .sort((a, b) => a - b)
      : [anchor.getDay()];

  const now = new Date();
  const results: Date[] = [];
  const baseWeekStart = startOfWeekLocal(anchor);
  const stepWeeks = Math.max(1, Math.round(intervalWeeks));

  for (let w = 0; results.length < maxOccurrences && w < 52; w += stepWeeks) {
    const weekStart = new Date(baseWeekStart);
    weekStart.setDate(weekStart.getDate() + w * 7);
    pickedDays.forEach((day) => {
      if (results.length >= maxOccurrences) return;
      const dt = new Date(weekStart);
      dt.setDate(dt.getDate() + day);
      dt.setHours(hour, minute, 0, 0);
      if (dt.getTime() > now.getTime() + 60_000) {
        results.push(dt);
      }
    });
  }

  results.sort((a, b) => a.getTime() - b.getTime());
  return results.slice(0, maxOccurrences);
}

function buildUpcomingEveryNDays(params: {
  anchor: Date;
  hour: number;
  minute: number;
  intervalDays: number;
  maxOccurrences: number;
}): Date[] {
  const { anchor, hour, minute, intervalDays, maxOccurrences } = params;
  const step = Math.max(1, Math.round(intervalDays));
  const now = new Date();
  const out: Date[] = [];
  let next = new Date(anchor);
  next.setHours(hour, minute, 0, 0);
  while (next.getTime() <= now.getTime() + 60_000) {
    next.setDate(next.getDate() + step);
  }
  for (let i = 0; i < maxOccurrences; i += 1) {
    out.push(new Date(next));
    next.setDate(next.getDate() + step);
  }
  return out;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addMonthsClamped(date: Date, months: number, desiredDay: number): Date {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth();
  const targetMonthIndex = m + months;
  const target = new Date(y, targetMonthIndex, 1, d.getHours(), d.getMinutes(), 0, 0);
  const dim = daysInMonth(target.getFullYear(), target.getMonth());
  target.setDate(Math.min(Math.max(1, desiredDay), dim));
  return target;
}

function buildUpcomingEveryNMonths(params: {
  anchor: Date;
  hour: number;
  minute: number;
  intervalMonths: number;
  maxOccurrences: number;
}): Date[] {
  const { anchor, hour, minute, intervalMonths, maxOccurrences } = params;
  const step = Math.max(1, Math.round(intervalMonths));
  const now = new Date();
  const out: Date[] = [];
  const desiredDay = anchor.getDate();
  let next = new Date(anchor);
  next.setHours(hour, minute, 0, 0);
  while (next.getTime() <= now.getTime() + 60_000) {
    next = addMonthsClamped(next, step, desiredDay);
  }
  for (let i = 0; i < maxOccurrences; i += 1) {
    out.push(new Date(next));
    next = addMonthsClamped(next, step, desiredDay);
  }
  return out;
}

function buildUpcomingEveryNYears(params: {
  anchor: Date;
  hour: number;
  minute: number;
  intervalYears: number;
  maxOccurrences: number;
}): Date[] {
  const { anchor, hour, minute, intervalYears, maxOccurrences } = params;
  const step = Math.max(1, Math.round(intervalYears));
  const now = new Date();
  const out: Date[] = [];
  const desiredDay = anchor.getDate();
  const desiredMonth = anchor.getMonth(); // 0..11
  let year = anchor.getFullYear();
  let next = new Date(year, desiredMonth, 1, hour, minute, 0, 0);
  next.setDate(Math.min(desiredDay, daysInMonth(next.getFullYear(), next.getMonth())));
  while (next.getTime() <= now.getTime() + 60_000) {
    year += step;
    next = new Date(year, desiredMonth, 1, hour, minute, 0, 0);
    next.setDate(Math.min(desiredDay, daysInMonth(next.getFullYear(), next.getMonth())));
  }
  for (let i = 0; i < maxOccurrences; i += 1) {
    out.push(new Date(next));
    year += step;
    next = new Date(year, desiredMonth, 1, hour, minute, 0, 0);
    next.setDate(Math.min(desiredDay, daysInMonth(next.getFullYear(), next.getMonth())));
  }
  return out;
}

function jsDayToExpoWeekday(jsDay: number): number {
  // JS: 0=Sun..6=Sat. Expo calendar trigger: 1=Sun..7=Sat.
  if (!Number.isFinite(jsDay)) return 1;
  return jsDay === 0 ? 1 : jsDay + 1;
}

async function cancelAllScheduledActivityReminders(activityId: string, reason: 'reschedule' | 'explicit_cancel') {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const matches = scheduled.filter((req) => {
      const data = req.content.data as Partial<NotificationData> | undefined;
      return Boolean(
        data &&
          data.type === 'activityReminder' &&
          'activityId' in data &&
          (data as { activityId?: string }).activityId === activityId,
      );
    });
    if (matches.length === 0) {
      activityNotificationIds.delete(activityId);
      return;
    }

    await Promise.all(
      matches.map((req) =>
        Notifications.cancelScheduledNotificationAsync(req.identifier).catch(() => undefined),
      ),
    );
    activityNotificationIds.delete(activityId);

    // Ledger is best-effort: it currently models one-shot schedules, but cancelling here is still useful.
    await markActivityReminderCancelled(activityId, new Date().toISOString());

    // Analytics: emit one cancellation event per identifier so we can debug scheduling churn.
    matches.forEach((req) => {
      track(posthogClient, AnalyticsEvent.NotificationCancelled, {
        notification_type: 'activityReminder',
        notification_id: req.identifier,
        activity_id: activityId,
        reason,
      });
    });
    } catch (error) {
      if (__DEV__) {
      console.warn('[notifications] failed to cancel activity reminders', {
        activityId,
          error,
        });
      }
    }
  }

async function scheduleActivityReminderInternal(activity: ActivitySnapshotExtended, prefs: NotificationPreferences) {
  if (!shouldScheduleNotificationsForActivity(activity, prefs)) {
    return;
  }

  const when = new Date(activity.reminderAt!);

  // Cancel any existing scheduled notification(s) for this activity first.
  await cancelAllScheduledActivityReminders(activity.id, 'reschedule');

  try {
    const repeatRule = activity.repeatRule ?? null;
    const customCadence = repeatRule === 'custom' && activity.repeatCustom ? activity.repeatCustom.cadence : null;
    const isRepeating = Boolean(repeatRule) && repeatRule !== 'custom';

    const state = useAppStore.getState();
    const goal = activity.goalId ? state.goals.find((g) => g.id === activity.goalId) : null;
    const arc = goal?.arcId ? state.arcs.find((a) => a.id === goal.arcId) : null;
    const goalTitle = goal?.title?.trim() ?? '';
    const arcName = arc?.name?.trim() ?? '';
    const title = activity.title?.trim() ? activity.title.trim() : 'Activity reminder';
    const body =
      goalTitle.length > 0
        ? arcName.length > 0 && arcName.length <= 26
          ? `${goalTitle} · ${arcName}`
          : goalTitle
        : 'Take a tiny step on this activity.';

    const content: Notifications.NotificationContentInput = {
      title,
      body,
      data: {
        type: 'activityReminder',
        activityId: activity.id,
      } satisfies NotificationData,
    };

    if (customCadence) {
      const cfg = activity.repeatCustom!;
      const hour = when.getHours();
      const minute = when.getMinutes();
      const dates =
        cfg.cadence === 'weeks'
          ? buildUpcomingCustomWeeklyDates({
              anchor: when,
              hour,
              minute,
              intervalWeeks: cfg.interval ?? 1,
              weekdays: Array.isArray(cfg.weekdays) ? cfg.weekdays : [],
              maxOccurrences: 24,
            })
          : cfg.cadence === 'days'
            ? buildUpcomingEveryNDays({
                anchor: when,
                hour,
                minute,
                intervalDays: cfg.interval ?? 1,
                maxOccurrences: 24,
              })
            : cfg.cadence === 'months'
              ? buildUpcomingEveryNMonths({
                  anchor: when,
                  hour,
                  minute,
                  intervalMonths: cfg.interval ?? 1,
                  maxOccurrences: 24,
                })
              : buildUpcomingEveryNYears({
                  anchor: when,
                  hour,
                  minute,
                  intervalYears: cfg.interval ?? 1,
                  maxOccurrences: 24,
                });
      const identifiers: string[] = [];
      for (const date of dates) {
        const identifier = await Notifications.scheduleNotificationAsync({
          content,
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
        });
        identifiers.push(identifier);
        track(posthogClient, AnalyticsEvent.NotificationScheduled, {
          notification_type: 'activityReminder',
          notification_id: identifier,
          activity_id: activity.id,
          scheduled_for: date.toISOString(),
        });
      }
      if (identifiers.length > 0) {
        activityNotificationIds.set(activity.id, identifiers[0]!);
      }
      return;
    }

    // For repeating triggers, schedule based on the reminder's local time-of-day.
    if (isRepeating) {
      const hour = when.getHours();
      const minute = when.getMinutes();

      const scheduleOne = async (trigger: Notifications.NotificationTriggerInput) => {
        const identifier = await Notifications.scheduleNotificationAsync({
          content,
          trigger,
        });
        track(posthogClient, AnalyticsEvent.NotificationScheduled, {
          notification_type: 'activityReminder',
          notification_id: identifier,
          activity_id: activity.id,
          scheduled_for: activity.reminderAt ?? null,
        });
        return identifier;
      };

      const weekday = jsDayToExpoWeekday(when.getDay());
      const dayOfMonth = when.getDate();
      const month = when.getMonth() + 1;

      const baseCalendar = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour,
        minute,
        repeats: true,
      } as const;

      const identifiers: string[] = [];
      switch (repeatRule) {
        case 'daily': {
          identifiers.push(await scheduleOne(baseCalendar));
          break;
        }
        case 'weekly': {
          identifiers.push(await scheduleOne({ ...baseCalendar, weekday } as const));
          break;
        }
        case 'weekdays': {
          // Schedule Monday–Friday (Expo weekday: 2=Mon ... 6=Fri).
          for (const wd of [2, 3, 4, 5, 6]) {
            identifiers.push(await scheduleOne({ ...baseCalendar, weekday: wd } as const));
          }
          break;
        }
        case 'monthly': {
          identifiers.push(await scheduleOne({ ...baseCalendar, day: dayOfMonth } as const));
          break;
        }
        case 'yearly': {
          identifiers.push(
            await scheduleOne({ ...baseCalendar, month, day: dayOfMonth } as const),
          );
          break;
        }
        default: {
          // Unknown cadence: fall back to one-shot scheduling.
          const identifier = await Notifications.scheduleNotificationAsync({
            content,
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
          });
          identifiers.push(identifier);
        }
      }

      // Keep one identifier in-memory for quick cancellation, but cancellation is robust even
      // when multiple notifications exist (we scan scheduled notifications by activityId).
      if (identifiers.length > 0) {
        activityNotificationIds.set(activity.id, identifiers[0]!);
      }
      // NOTE: We intentionally do not write repeating schedules into the delivery ledger,
      // which is currently designed for one-shot notifications.
      return;
    }

    // One-shot reminder.
    const identifier = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
      },
    });
    activityNotificationIds.set(activity.id, identifier);
    track(posthogClient, AnalyticsEvent.NotificationScheduled, {
      notification_type: 'activityReminder',
      notification_id: identifier,
      activity_id: activity.id,
      scheduled_for: when.toISOString(),
    });
    await upsertActivityReminderSchedule({
      activityId: activity.id,
      notificationId: identifier,
      scheduledForIso: when.toISOString(),
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[notifications] failed to schedule activity reminder', {
        activityId: activity.id,
        error,
      });
    }
  }
}

async function cancelActivityReminderInternal(activityId: string) {
  await cancelAllScheduledActivityReminders(activityId, 'explicit_cancel');
}

async function scheduleDailyShowUpInternal(time: string, prefs: NotificationPreferences) {
  if (!prefs.notificationsEnabled || !prefs.allowDailyShowUp) {
    return;
  }
  if (prefs.osPermissionStatus !== 'authorized') {
    return;
  }
  const [hourString, minuteString] = time.split(':');
  const hour = Number.parseInt(hourString ?? '8', 10);
  const minute = Number.parseInt(minuteString ?? '0', 10);

  const now = new Date();
  const todayKey = localDateKey(now);

  const suggested = getSuggestedNextStep({
    arcs: useAppStore.getState().arcs,
    goals: useAppStore.getState().goals,
    activities: useAppStore.getState().activities,
    now,
  });
  const isSetup =
    suggested?.kind === 'setup' ? suggested : null;

  // Convert daily show-up to a one-shot schedule (we reschedule daily).
  // This enables suppression/caps/backoff (repeating schedules can't be stopped reliably).
  let fireAt = new Date(now);
  fireAt.setHours(Number.isNaN(hour) ? 8 : hour, Number.isNaN(minute) ? 0 : minute, 0, 0);

  // If the user already "showed up" today, schedule tomorrow.
  const state = useAppStore.getState();
  if (state.lastShowUpDate === todayKey || fireAt.getTime() <= now.getTime()) {
    fireAt.setDate(fireAt.getDate() + 1);
  }

  // Backoff: if the user ignored this nudge twice in a row, skip the next day.
  const systemLedger = await loadSystemNudgeLedger();
  const noOpenCount = systemLedger.consecutiveNoOpenByType?.[isSetup ? 'setupNextStep' : 'dailyShowUp'] ?? 0;
  if (noOpenCount >= 2) {
    fireAt.setDate(fireAt.getDate() + 1);
  }

  // Suppression: if the user already has an explicit Activity reminder coming up soon,
  // avoid stacking an additional system nudge in the same window.
  const activitySnapshots: ActivitySnapshotExtended[] = useAppStore.getState().activities.map((activity) => ({
    id: activity.id,
    title: activity.title,
    goalId: activity.goalId,
    reminderAt: activity.reminderAt ?? null,
    status: activity.status,
    repeatRule: activity.repeatRule ?? undefined,
    repeatCustom: activity.repeatCustom ?? undefined,
  }));
  if (
    hasUpcomingExplicitActivityReminder({
      activities: activitySnapshots,
      now,
      windowMs: SYSTEM_NUDGE_SUPPRESS_UPCOMING_ACTIVITY_REMINDER_MS,
    })
  ) {
    fireAt.setDate(fireAt.getDate() + 1);
  }

  fireAt = await applyGlobalSystemNudgeGuards({
    fireAt,
    type: isSetup ? 'setupNextStep' : 'dailyShowUp',
    ledger: systemLedger,
  });

  // Cancel any existing daily show-up notification(s) before scheduling a new one.
  if (isSetup) {
    await cancelAllScheduledDailyShowUps('reschedule');
    await cancelAllScheduledSetupNextSteps('reschedule');
    // Ensure the old daily-show-up ledger doesn't confuse background estimation.
    await saveDailyShowUpLedger({
      notificationId: null,
      scheduleTimeLocal: time,
      scheduledForIso: null,
    }).catch(() => undefined);
  } else {
    await cancelAllScheduledSetupNextSteps('reschedule');
    await cancelAllScheduledDailyShowUps('reschedule');
    // Ensure the old setup ledger doesn't confuse background estimation.
    await saveSetupNextStepLedger({
      notificationId: null,
      scheduleTimeLocal: time,
      scheduledForIso: null,
      reason: null,
    }).catch(() => undefined);
  }

  try {
    const type: NotificationData['type'] = isSetup ? 'setupNextStep' : 'dailyShowUp';
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title:
          type === 'setupNextStep'
            ? isSetup?.reason === 'no_goals'
              ? 'Start your first goal'
              : 'Add one tiny step'
            : 'Align your day with your arcs',
        body:
          type === 'setupNextStep'
            ? isSetup?.reason === 'no_goals'
              ? 'Create one goal so Kwilt can start nudging you at the right moments.'
              : 'Add one Activity so you can build momentum today.'
            : hasAnyActivitiesScheduledForToday({ activities: useAppStore.getState().activities, now })
              ? 'Open Kwilt to review Today and choose one tiny step.'
              : 'Today is empty—pick one tiny step to keep momentum.',
        data: {
          ...(type === 'setupNextStep'
            ? ({
                type: 'setupNextStep',
                reason: isSetup?.reason ?? 'no_activities',
              } satisfies NotificationData)
            : ({ type: 'dailyShowUp' } satisfies NotificationData)),
        } satisfies NotificationData,
      },
      // One-shot (we reschedule).
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
      },
    });
    if (type === 'setupNextStep') {
      setupNextStepNotificationId = identifier;
      await saveSetupNextStepLedger({
        notificationId: identifier,
        scheduleTimeLocal: time,
        scheduledForIso: fireAt.toISOString(),
        reason: isSetup?.reason ?? 'no_activities',
      }).catch(() => undefined);
    } else {
      dailyShowUpNotificationId = identifier;
      await saveDailyShowUpLedger({
        notificationId: identifier,
        scheduleTimeLocal: time,
        scheduledForIso: fireAt.toISOString(),
      });
    }
    track(posthogClient, AnalyticsEvent.NotificationScheduled, {
      notification_type: type,
      notification_id: identifier,
      schedule_time_local: time,
      scheduled_for: fireAt.toISOString(),
      platform_trigger_type: 'date',
    });
    await recordSystemNudgeScheduled({
      dateKey: localDateKey(fireAt),
      type,
      notificationId: identifier,
      scheduledForIso: fireAt.toISOString(),
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[notifications] failed to schedule daily show-up notification', { error });
    }
  }
}

async function cancelDailyShowUpInternal() {
  await cancelAllScheduledDailyShowUps('explicit_cancel');
  await cancelAllScheduledSetupNextSteps('explicit_cancel');
  await saveDailyShowUpLedger({
    notificationId: null,
    scheduleTimeLocal: null,
    scheduledForIso: null,
  }).catch(() => undefined);
  await saveSetupNextStepLedger({
    notificationId: null,
    scheduleTimeLocal: null,
    scheduledForIso: null,
    reason: null,
  }).catch(() => undefined);
}

async function scheduleDailyFocusInternal(time: string, prefs: NotificationPreferences) {
  if (!prefs.notificationsEnabled || !prefs.allowDailyFocus) {
    return;
  }
  if (prefs.osPermissionStatus !== 'authorized') {
    return;
  }

  const state = useAppStore.getState();
  const todayKey = localDateKey(new Date());
  const alreadyCompletedFocusToday = state.lastCompletedFocusSessionDate === todayKey;

  const [hourString, minuteString] = time.split(':');
  const hour = Number.parseInt(hourString ?? '8', 10);
  const minute = Number.parseInt(minuteString ?? '0', 10);

  const now = new Date();
  let fireAt = new Date(now);
  fireAt.setHours(Number.isNaN(hour) ? 8 : hour, Number.isNaN(minute) ? 0 : minute, 0, 0);

  // If the user already completed Focus today, schedule tomorrow.
  // If today’s time has already passed, schedule tomorrow.
  if (alreadyCompletedFocusToday || fireAt.getTime() <= now.getTime()) {
    fireAt.setDate(fireAt.getDate() + 1);
  }

  const systemLedger = await loadSystemNudgeLedger();
  fireAt = await applyGlobalSystemNudgeGuards({ fireAt, type: 'dailyFocus', ledger: systemLedger });

  // Cancel any existing daily focus notification before scheduling a new one.
  await cancelAllScheduledDailyFocuses('reschedule');

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Finish one focus session today',
        body:
          'Complete one full timer—earn clarity now, and build momentum that makes tomorrow easier.',
        data: {
          type: 'dailyFocus',
        } satisfies NotificationData,
      },
      // One-shot (we reschedule). This lets us avoid nudging after Focus is already completed today.
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
      },
    });
    dailyFocusNotificationId = identifier;
    track(posthogClient, AnalyticsEvent.NotificationScheduled, {
      notification_type: 'dailyFocus',
      notification_id: identifier,
      scheduled_for: fireAt.toISOString(),
      schedule_time_local: time,
    });
    await saveDailyFocusLedger({
      notificationId: identifier,
      scheduleTimeLocal: time,
      scheduledForIso: fireAt.toISOString(),
    });
    await recordSystemNudgeScheduled({
      dateKey: localDateKey(fireAt),
      type: 'dailyFocus',
      notificationId: identifier,
      scheduledForIso: fireAt.toISOString(),
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[notifications] failed to schedule daily focus notification', { error });
    }
  }
}

async function cancelDailyFocusInternal() {
  try {
    await cancelAllScheduledDailyFocuses('explicit_cancel');
  } catch (error) {
    if (__DEV__) {
      console.warn('[notifications] failed to cancel daily focus notification', { error });
    }
  } finally {
    await saveDailyFocusLedger({
      notificationId: null,
      scheduleTimeLocal: null,
      scheduledForIso: null,
    }).catch(() => undefined);
    dailyFocusNotificationId = null;
  }
}

async function cancelAllScheduledGoalNudges(reason: 'reschedule' | 'explicit_cancel') {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const matches = scheduled.filter((req) => {
      const data = req.content.data as Partial<NotificationData> | undefined;
      return Boolean(data && data.type === 'goalNudge');
    });
    if (matches.length === 0) {
      goalNudgeNotificationId = null;
      return;
    }

    await Promise.all(
      matches.map((req) =>
        Notifications.cancelScheduledNotificationAsync(req.identifier).catch(() => undefined),
      ),
    );

    matches.forEach((req) => {
      track(posthogClient, AnalyticsEvent.NotificationCancelled, {
        notification_type: 'goalNudge',
        notification_id: req.identifier,
        reason,
      });
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[notifications] failed to cancel goal nudge notification', { error });
    }
  } finally {
    goalNudgeNotificationId = null;
  }
}

async function cancelGoalNudgeInternal() {
  await cancelAllScheduledGoalNudges('explicit_cancel');
  await saveGoalNudgeLedger({
    notificationId: null,
    scheduleTimeLocal: null,
    scheduledForIso: null,
    goalId: null,
  }).catch(() => undefined);
}

async function scheduleGoalNudgeInternal(prefs: NotificationPreferences) {
  if (!prefs.notificationsEnabled || !prefs.allowGoalNudges) {
    await cancelGoalNudgeInternal();
    return;
  }
  if (prefs.osPermissionStatus !== 'authorized') {
    await cancelGoalNudgeInternal();
    return;
  }

  const state = useAppStore.getState();
  const now = new Date();
  const candidate = pickGoalNudgeCandidate({
    arcs: state.arcs,
    goals: state.goals,
    activities: state.activities,
    now,
  });
  if (!candidate) {
    await cancelGoalNudgeInternal();
    return;
  }

  const systemLedger = await loadSystemNudgeLedger();
  const todayKey = localDateKey(now);
  const alreadyShowedUpToday = useAppStore.getState().lastShowUpDate === todayKey;
  // Suppress goal nudges after the user has already "shown up" today.
  if (alreadyShowedUpToday) {
    await cancelGoalNudgeInternal();
    return;
  }

  // Backoff: if ignored twice, skip the next day.
  const noOpenCount = systemLedger.consecutiveNoOpenByType?.goalNudge ?? 0;

  // Personalization (v2.2): if we have enough opens, schedule goal nudges at the best-performing hour.
  const baseTimeLocal = prefs.goalNudgeTime ?? '16:00';
  const [, baseMinuteString] = baseTimeLocal.split(':');
  const baseMinute = baseMinuteString ?? '00';
  const histogram = systemLedger.openHourCountsByType?.goalNudge ?? {};
  const totalOpens = Object.values(histogram).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const bestHourRaw =
    totalOpens >= 5
      ? Object.entries(histogram).reduce<{ hour: number; count: number }>(
          (best, [hourKey, count]) => {
            const hour = Number.parseInt(hourKey, 10);
            const c = Number(count) || 0;
            if (!Number.isFinite(hour) || hour < 0 || hour > 23) return best;
            return c > best.count ? { hour, count: c } : best;
          },
          { hour: 16, count: -1 },
        ).hour
      : Number.parseInt((baseTimeLocal.split(':')[0] ?? '16') as string, 10);
  const bestHour = Math.min(19, Math.max(15, Number.isNaN(bestHourRaw) ? 16 : bestHourRaw));
  const timeLocal = `${String(bestHour).padStart(2, '0')}:${baseMinute.padStart(2, '0')}`;
  const [hourString, minutePart] = timeLocal.split(':');
  const hour = Number.parseInt(hourString ?? '16', 10);
  const minute = Number.parseInt(minutePart ?? '0', 10);
  let fireAt = new Date(now);
  fireAt.setHours(Number.isNaN(hour) ? 16 : hour, Number.isNaN(minute) ? 0 : minute, 0, 0);
  if (fireAt.getTime() <= now.getTime()) {
    fireAt.setDate(fireAt.getDate() + 1);
  }
  if (noOpenCount >= 2) {
    fireAt.setDate(fireAt.getDate() + 1);
  }

  // Suppression: if the user already has an explicit Activity reminder coming up soon,
  // avoid stacking a goal nudge in the same window.
  const activitySnapshots: ActivitySnapshotExtended[] = state.activities.map((activity) => ({
    id: activity.id,
    title: activity.title,
    goalId: activity.goalId,
    reminderAt: activity.reminderAt ?? null,
    status: activity.status,
    repeatRule: activity.repeatRule ?? undefined,
    repeatCustom: activity.repeatCustom ?? undefined,
  }));
  if (
    hasUpcomingExplicitActivityReminder({
      activities: activitySnapshots,
      now,
      windowMs: SYSTEM_NUDGE_SUPPRESS_UPCOMING_ACTIVITY_REMINDER_MS,
    })
  ) {
    fireAt.setDate(fireAt.getDate() + 1);
  }

  fireAt = await applyGlobalSystemNudgeGuards({ fireAt, type: 'goalNudge', ledger: systemLedger });

  // Cancel any existing scheduled goal nudges before rescheduling.
  await cancelAllScheduledGoalNudges('reschedule');

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      ...buildGoalNudgeContent({ goalTitle: candidate.goalTitle, arcName: candidate.arcName }),
      data: { type: 'goalNudge', goalId: candidate.goalId } satisfies NotificationData,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
    },
  });
  goalNudgeNotificationId = identifier;
  track(posthogClient, AnalyticsEvent.NotificationScheduled, {
    notification_type: 'goalNudge',
    notification_id: identifier,
    goal_id: candidate.goalId,
    scheduled_for: fireAt.toISOString(),
    schedule_time_local: timeLocal,
  });
  await saveGoalNudgeLedger({
    notificationId: identifier,
    scheduleTimeLocal: timeLocal,
    goalId: candidate.goalId,
    scheduledForIso: fireAt.toISOString(),
  }).catch(() => undefined);
  await recordSystemNudgeScheduled({
    dateKey: localDateKey(fireAt),
    type: 'goalNudge',
    notificationId: identifier,
    scheduledForIso: fireAt.toISOString(),
  });
}

function attachStoreSubscription() {
  if (hasAttachedStoreSubscription) {
    return;
  }
  hasAttachedStoreSubscription = true;

  let prevActivities: ActivitySnapshotExtended[] = useAppStore
    .getState()
    .activities.map((activity) => ({
      id: activity.id,
      title: activity.title,
      goalId: activity.goalId,
      reminderAt: activity.reminderAt ?? null,
      repeatRule: activity.repeatRule ?? undefined,
      repeatCustom: activity.repeatCustom ?? undefined,
      status: activity.status,
    }));

  const initial = useAppStore.getState();
  let prevFocusDateKey = initial.lastCompletedFocusSessionDate;
  let prevFocusPrefKey = JSON.stringify({
    notificationsEnabled: initial.notificationPreferences.notificationsEnabled,
    allowDailyFocus: initial.notificationPreferences.allowDailyFocus,
    dailyFocusTime: initial.notificationPreferences.dailyFocusTime,
    osPermissionStatus: initial.notificationPreferences.osPermissionStatus,
  });

  useAppStore.subscribe((state) => {
    const nextActivities: ActivitySnapshotExtended[] = state.activities.map((activity) => ({
      id: activity.id,
      title: activity.title,
      goalId: activity.goalId,
      reminderAt: activity.reminderAt ?? null,
      repeatRule: activity.repeatRule ?? undefined,
      repeatCustom: activity.repeatCustom ?? undefined,
      status: activity.status,
    }));

    const prefs = state.notificationPreferences;

    // Keep the one-shot daily focus nudge aligned with:
    // - preference toggle/time changes
    // - OS permission changes
    // - completing Focus today (so we can reschedule for tomorrow)
    const nextFocusPrefKey = JSON.stringify({
      notificationsEnabled: prefs.notificationsEnabled,
      allowDailyFocus: prefs.allowDailyFocus,
      dailyFocusTime: prefs.dailyFocusTime,
      osPermissionStatus: prefs.osPermissionStatus,
    });
    const focusDateChanged = prevFocusDateKey !== state.lastCompletedFocusSessionDate;
    const focusPrefsChanged = prevFocusPrefKey !== nextFocusPrefKey;
    if (focusDateChanged || focusPrefsChanged) {
      prevFocusDateKey = state.lastCompletedFocusSessionDate;
      prevFocusPrefKey = nextFocusPrefKey;
      const allowDailyFocus = prefs.allowDailyFocus;
      const dailyFocusTime = prefs.dailyFocusTime;
      if (
        !prefs.notificationsEnabled ||
        !allowDailyFocus ||
        !dailyFocusTime ||
        prefs.osPermissionStatus !== 'authorized'
      ) {
        void cancelDailyFocusInternal();
      } else {
        void scheduleDailyFocusInternal(dailyFocusTime, prefs);
      }
    }

    // Goal nudge: schedule opportunistically when notifications are enabled and allowed.
    // This is best-effort and is further maintained by the background reconcile task.
    if (
      prefs.notificationsEnabled &&
      prefs.allowGoalNudges &&
      prefs.osPermissionStatus === 'authorized'
    ) {
      void scheduleGoalNudgeInternal(prefs);
    }

    const prevById = new Map(prevActivities.map((a) => [a.id, a]));
    const nextById = new Map(nextActivities.map((a) => [a.id, a]));

    const changed: {
      addedOrUpdated: ActivitySnapshotExtended[];
      removedIds: string[];
    } = {
      addedOrUpdated: [],
      removedIds: [],
    };

    nextById.forEach((next, id) => {
      const prev = prevById.get(id);
      if (!prev) {
        changed.addedOrUpdated.push(next);
        return;
      }
      if (
        prev.reminderAt !== next.reminderAt ||
        prev.title !== next.title ||
        prev.goalId !== next.goalId ||
        prev.repeatRule !== next.repeatRule ||
        JSON.stringify(prev.repeatCustom ?? null) !== JSON.stringify(next.repeatCustom ?? null) ||
        prev.status !== next.status
      ) {
        changed.addedOrUpdated.push(next);
      }
    });

    prevById.forEach((_prev, id) => {
      if (!nextById.has(id)) {
        changed.removedIds.push(id);
      }
    });

    // Handle removals: cancel any notifications for deleted activities.
    changed.removedIds.forEach((id) => {
      void cancelActivityReminderInternal(id);
    });

    // Handle adds/updates.
    changed.addedOrUpdated.forEach((snapshot) => {
      if (!snapshot.reminderAt || snapshot.status === 'done') {
        void cancelActivityReminderInternal(snapshot.id);
      } else {
        void scheduleActivityReminderInternal(snapshot, prefs);
      }
    });

    prevActivities = nextActivities;
  });
}

function attachNotificationResponseListener() {
  if (responseSubscription) return;

  responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Partial<NotificationData> | undefined;
    if (!data || !('type' in data) || !data.type) {
      return;
    }
    const openedAtIso = new Date().toISOString();
    const openedLocalHour = new Date().getHours();
    const dateKey = localDateKey(new Date());

    track(posthogClient, AnalyticsEvent.NotificationOpened, {
      notification_type: data.type,
      notification_id: response.notification.request.identifier,
      action_identifier: response.actionIdentifier,
      activity_id:
        data.type === 'activityReminder'
          ? (data as { activityId?: string }).activityId ?? null
          : null,
    });

    if (
      data.type === 'dailyShowUp' ||
      data.type === 'dailyFocus' ||
      data.type === 'goalNudge' ||
      data.type === 'setupNextStep'
    ) {
      void recordSystemNudgeOpened({
        dateKey,
        type: data.type,
        notificationId: response.notification.request.identifier,
        openedAtIso,
        openedAtLocalHour: openedLocalHour,
      });
    }

    switch (data.type) {
      case 'activityReminder': {
        if (!rootNavigationRef.isReady()) {
          return;
        }
        const activityId = (data as { activityId?: string }).activityId;
        if (!activityId) return;
        rootNavigationRef.navigate('MainTabs', {
          screen: 'ActivitiesTab',
          params: { screen: 'ActivityDetail', params: { activityId } },
        });
        break;
      }
      case 'locationOffer': {
        if (!rootNavigationRef.isReady()) {
          return;
        }
        const activityId = (data as { activityId?: string }).activityId;
        if (!activityId) return;
        rootNavigationRef.navigate('MainTabs', {
          screen: 'ActivitiesTab',
          params: { screen: 'ActivityDetail', params: { activityId } },
        });
        break;
      }
      case 'goalNudge': {
        if (!rootNavigationRef.isReady()) {
          return;
        }
        const goalId = (data as { goalId?: string }).goalId;
        if (!goalId) return;
        rootNavigationRef.navigate('MainTabs', {
          screen: 'GoalsTab',
          params: {
            screen: 'GoalDetail',
            params: { goalId, entryPoint: 'goalsTab', initialTab: 'plan' },
          },
        });
        break;
      }
      case 'dailyShowUp': {
        // If the user has already completed an Activity today, we can quietly
        // skip the daily show-up navigation to avoid redundant nudges.
        const state = useAppStore.getState();
        const todayKey = localDateKey(new Date());
        if (state.lastShowUpDate === todayKey) {
          return;
        }
        if (!rootNavigationRef.isReady()) {
          return;
        }
        // Land on Activities list and highlight Suggested if Today has no scheduled items.
        rootNavigationRef.navigate('MainTabs', {
          screen: 'ActivitiesTab',
          params: {
            screen: 'ActivitiesList',
            params: { highlightSuggested: true, suggestedSource: 'notification' },
          },
        });
        break;
      }
      case 'setupNextStep': {
        if (!rootNavigationRef.isReady()) {
          return;
        }
        rootNavigationRef.navigate('MainTabs', {
          screen: 'ActivitiesTab',
          params: {
            screen: 'ActivitiesList',
            params: { highlightSuggested: true, suggestedSource: 'notification' },
          },
        });
        break;
      }
      case 'dailyFocus': {
        const state = useAppStore.getState();
        const todayKey = localDateKey(new Date());
        if (state.lastCompletedFocusSessionDate === todayKey) {
          return;
        }
        if (!rootNavigationRef.isReady()) {
          return;
        }
        rootNavigationRef.navigate('MainTabs', {
          screen: 'ActivitiesTab',
          params: { screen: 'ActivitiesList' },
        });
        break;
      }
      case 'streak':
      case 'reactivation': {
        if (!rootNavigationRef.isReady()) {
          return;
        }
        rootNavigationRef.navigate('MainTabs', {
          screen: 'ActivitiesTab',
          params: { screen: 'ActivitiesList' },
        });
        break;
      }
      default:
        break;
    }
  });
}

async function ensurePermissionWithRationaleInternal(reason: 'activity' | 'daily'): Promise<boolean> {
  const currentStatus = (await syncOsPermissionStatus()) as OsPermissionStatus;
  if (currentStatus === 'authorized') {
    return true;
  }

  if (currentStatus === 'denied' || currentStatus === 'restricted') {
    // Respect OS-level denial; direct the user to system settings via in-app copy.
    const friendlyPlatform =
      Platform.OS === 'ios' ? 'Settings → Notifications → Kwilt' : 'Settings → Apps → Kwilt → Notifications';
    Alert.alert(
      'Notifications disabled',
      `Notifications are currently disabled for Kwilt in system settings. You can re-enable them from ${friendlyPlatform}.`,
    );
    return false;
  }

  // notRequested: show a lightweight rationale before triggering the OS prompt.
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      'Allow gentle reminders?',
      reason === 'activity'
        ? 'Kwilt can send you gentle reminders when Activities are due so tiny steps don’t slip through the cracks.'
        : 'Kwilt can send a daily nudge to review Today and choose one tiny step for your arcs.',
      [
        {
          text: 'Not now',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Allow',
          onPress: async () => {
            const requested = await Notifications.requestPermissionsAsync();
            const granted = requested.status === 'granted';
            await syncOsPermissionStatus();
            resolve(granted);
          },
        },
      ],
    );
  });
}

function attachNotificationReceivedListener() {
  if (receivedSubscription) return;
  receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data as Partial<NotificationData> | undefined;
    if (!data || !('type' in data) || !data.type) return;
    track(posthogClient, AnalyticsEvent.NotificationReceived, {
      notification_type: data.type,
      notification_id: notification.request.identifier,
      activity_id:
        data.type === 'activityReminder'
          ? (data as { activityId?: string }).activityId ?? null
          : null,
      received_context: 'foreground',
    });
  });
}

async function captureLastNotificationOpenIfAny() {
  try {
    const last = await Notifications.getLastNotificationResponseAsync();
    if (!last) return;
    const data = last.notification.request.content.data as Partial<NotificationData> | undefined;
    if (!data || !('type' in data) || !data.type) return;
    track(posthogClient, AnalyticsEvent.NotificationOpened, {
      notification_type: data.type,
      notification_id: last.notification.request.identifier,
      action_identifier: last.actionIdentifier,
      activity_id:
        data.type === 'activityReminder'
          ? (data as { activityId?: string }).activityId ?? null
          : null,
      opened_context: 'cold_start_or_resume',
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[notifications] failed to read last notification response', error);
    }
  }
}

export const NotificationService = {
  /**
   * Initialize notifications:
   * - Sync OS permission state into the store.
   * - Hydrate any previously scheduled notifications.
   * - Attach store subscription for Activity changes.
   * - Attach tap handler for deep-link navigation.
   */
  async init() {
    if (isInitialized) return;
    isInitialized = true;
    await syncOsPermissionStatus();
    await hydrateScheduledNotifications();
    // Ensure daily focus is scheduled (one-shot) on launch as a fallback in case
    // the previous day's notification already fired and background fetch didn't run.
    const prefs = getPreferences();
    if (prefs.notificationsEnabled && prefs.allowDailyFocus && prefs.dailyFocusTime) {
      await scheduleDailyFocusInternal(prefs.dailyFocusTime, prefs);
    }
    attachStoreSubscription();
    attachNotificationReceivedListener();
    attachNotificationResponseListener();
    await captureLastNotificationOpenIfAny();
  },

  async ensurePermissionWithRationale(reason: 'activity' | 'daily'): Promise<boolean> {
    return ensurePermissionWithRationaleInternal(reason);
  },

  /**
   * Refresh the OS permission status in the store.
   * Useful for screens that need to reflect current Settings state (e.g. onboarding).
   */
  async syncOsPermissionStatus(): Promise<OsPermissionStatus> {
    return await syncOsPermissionStatus();
  },

  /**
   * Request OS notification permission without showing an in-app rationale alert.
   * Use this when the current screen already explains the value (e.g. onboarding).
   */
  async requestOsPermission(): Promise<boolean> {
    const currentStatus = (await syncOsPermissionStatus()) as OsPermissionStatus;
    if (currentStatus === 'authorized') {
      return true;
    }
    if (currentStatus === 'denied' || currentStatus === 'restricted') {
      // OS-level denial/restriction: request won't show again; caller can direct to Settings.
      return false;
    }

    const requested = await Notifications.requestPermissionsAsync();
    const granted = requested.status === 'granted';
    await syncOsPermissionStatus();
    return granted;
  },

  /**
   * Explicitly schedule an Activity reminder for the given activity id.
   * In most cases, the store subscription should keep things in sync, but
   * this can be used for one-off flows if needed.
   */
  async scheduleActivityReminder(activityId: string) {
    const state = useAppStore.getState();
    const activity = state.activities.find((a) => a.id === activityId);
    if (!activity) return;
    const snapshot: ActivitySnapshotExtended = {
      id: activity.id,
      title: activity.title,
      goalId: activity.goalId,
      reminderAt: activity.reminderAt ?? null,
      status: activity.status,
    };
    await scheduleActivityReminderInternal(snapshot, state.notificationPreferences);
  },

  async cancelActivityReminder(activityId: string) {
    await cancelActivityReminderInternal(activityId);
  },

  async scheduleDailyShowUp(time: string) {
    const prefs = getPreferences();
    await scheduleDailyShowUpInternal(time, prefs);
  },

  async cancelDailyShowUp() {
    await cancelDailyShowUpInternal();
  },

  async scheduleDailyFocus(time: string) {
    const prefs = getPreferences();
    await scheduleDailyFocusInternal(time, prefs);
  },

  async cancelDailyFocus() {
    await cancelDailyFocusInternal();
  },

  async scheduleGoalNudge() {
    const prefs = getPreferences();
    await scheduleGoalNudgeInternal(prefs);
  },

  /**
   * Apply new notification preferences. This is intended to be called from
   * settings screens. It updates the store and cleans up any scheduled
   * notifications that are no longer allowed.
   */
  async applySettings(next: NotificationPreferences) {
    setPreferences(() => next);

    // If notifications are globally disabled, cancel everything we know about.
    if (!next.notificationsEnabled) {
      const ids = Array.from(activityNotificationIds.keys());
      await Promise.all(ids.map((id) => cancelActivityReminderInternal(id)));
      await cancelDailyShowUpInternal();
      await cancelDailyFocusInternal();
      await cancelGoalNudgeInternal();
      return;
    }

    // Activity reminders
    if (!next.allowActivityReminders) {
      const ids = Array.from(activityNotificationIds.keys());
      await Promise.all(ids.map((id) => cancelActivityReminderInternal(id)));
    } else {
      const state = useAppStore.getState();
      const snapshots: ActivitySnapshotExtended[] = state.activities.map((activity) => ({
        id: activity.id,
        title: activity.title,
        goalId: activity.goalId,
        reminderAt: activity.reminderAt ?? null,
        status: activity.status,
      }));
      await Promise.all(
        snapshots.map((snapshot) => scheduleActivityReminderInternal(snapshot, next)),
      );
    }

    // Daily show-up
    if (!next.allowDailyShowUp || !next.dailyShowUpTime) {
      await cancelDailyShowUpInternal();
    } else {
      await scheduleDailyShowUpInternal(next.dailyShowUpTime, next);
    }

    // Daily focus
    if (!next.allowDailyFocus || !next.dailyFocusTime) {
      await cancelDailyFocusInternal();
    } else {
      await scheduleDailyFocusInternal(next.dailyFocusTime, next);
    }

    // Goal nudges (system nudge)
    if (!next.allowGoalNudges) {
      await cancelGoalNudgeInternal();
    } else {
      await scheduleGoalNudgeInternal(next);
    }
  },

  /**
   * Dev-only helper to fire a notification of the given kind after a short
   * delay, regardless of scheduled reminders. This respects OS permissions
   * but does not consult app-level preferences, so it should only be used
   * from the DevTools screen.
   */
  async debugFireNotification(kind: NotificationType) {
    const permissions = await Notifications.getPermissionsAsync();
    if (permissions.status !== 'granted') {
      Alert.alert(
        'Notifications disabled',
        'Enable notifications for kwilt in system settings and in the Notifications settings screen before testing.',
      );
      return;
    }

    let content: Notifications.NotificationContentInput;
    switch (kind) {
      case 'dailyShowUp':
        content = {
          title: 'Dev: Daily show-up test',
          body: 'This is a dev-mode daily show-up notification.',
          data: { type: 'dailyShowUp' satisfies NotificationData['type'] },
        };
        break;
      case 'setupNextStep':
        content = {
          title: 'Dev: Setup next step test',
          body: 'Tap to open Activities and highlight Suggested.',
          data: { type: 'setupNextStep', reason: 'no_goals' } satisfies NotificationData,
        };
        break;
      case 'goalNudge':
        content = {
          title: 'Dev: Goal nudge test',
          body: 'Tap to open a Goal plan.',
          data: { type: 'goalNudge', goalId: useAppStore.getState().goals[0]?.id ?? 'missing' },
        };
        break;
      case 'dailyFocus':
        content = {
          title: 'Dev: Daily focus test',
          body: 'This is a dev-mode daily focus notification.',
          data: { type: 'dailyFocus' satisfies NotificationData['type'] },
        };
        break;
      case 'streak':
        content = {
          title: 'Dev: Streak test',
          body: 'Pretend you are about to break a streak.',
          data: { type: 'streak' satisfies NotificationData['type'] },
        };
        break;
      case 'reactivation':
        content = {
          title: 'Dev: Reactivation test',
          body: 'Pretend you have been away for a while.',
          data: { type: 'reactivation' satisfies NotificationData['type'] },
        };
        break;
      case 'activityReminder':
      default:
        content = {
          title: 'Dev: Generic notification',
          body: 'Tapped from dev tools.',
          data: { type: 'dailyShowUp' satisfies NotificationData['type'] },
        };
        break;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2,
          repeats: false,
        },
      });
    } catch (error) {
      if (__DEV__) {
        console.warn('[notifications] debugFireNotification failed', { kind, error });
      }
    }
  },
};


