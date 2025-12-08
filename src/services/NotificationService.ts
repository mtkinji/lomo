import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Activity } from '../domain/types';
import { useAppStore } from '../store/useAppStore';
import { rootNavigationRef } from '../navigation/RootNavigator';

type OsPermissionStatus = 'notRequested' | 'authorized' | 'denied' | 'restricted';

type NotificationType = 'activityReminder' | 'dailyShowUp' | 'streak' | 'reactivation';

type ActivitySnapshot = Pick<Activity, 'id' | 'reminderAt' | 'status'>;

type NotificationPreferences = ReturnType<typeof useAppStore.getState>['notificationPreferences'];

type NotificationData =
  | { type: 'activityReminder'; activityId: string }
  | { type: 'dailyShowUp' }
  | { type: 'streak' }
  | { type: 'reactivation' };

// Local in-memory map of scheduled notification ids, hydrated on init.
const activityNotificationIds = new Map<string, string>();
let dailyShowUpNotificationId: string | null = null;

let isInitialized = false;
let hasAttachedStoreSubscription = false;

let responseSubscription:
  | Notifications.Subscription
  | null = null;

/**
 * Configure the base notification handler so local notifications show as alerts
 * without playing sounds or setting badges by default.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[notifications] failed to hydrate scheduled notifications', error);
    }
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
  // Only schedule for future times.
  const when = new Date(activity.reminderAt);
  if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
    return false;
  }
  // Skip completed activities.
  if (activity.status === 'done') {
    return false;
  }
  return true;
}

async function scheduleActivityReminderInternal(activity: ActivitySnapshot, prefs: NotificationPreferences) {
  if (!shouldScheduleNotificationsForActivity(activity, prefs)) {
    return;
  }

  const when = new Date(activity.reminderAt!);

  // Cancel any existing scheduled notification for this activity first.
  const existingId = activityNotificationIds.get(activity.id);
  if (existingId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existingId);
    } catch (error) {
      if (__DEV__) {
        console.warn('[notifications] failed to cancel previous activity notification', {
          activityId: activity.id,
          error,
        });
      }
    }
  }

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Activity reminder',
        body: 'Take a tiny step on this activity.',
        data: {
          type: 'activityReminder',
          activityId: activity.id,
        } satisfies NotificationData,
      },
      trigger: when,
    });
    activityNotificationIds.set(activity.id, identifier);
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
  const existingId = activityNotificationIds.get(activityId);
  if (!existingId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(existingId);
    activityNotificationIds.delete(activityId);
  } catch (error) {
    if (__DEV__) {
      console.warn('[notifications] failed to cancel activity reminder', {
        activityId,
        error,
      });
    }
  }
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

  // Cancel any existing daily show-up notification before scheduling a new one.
  if (dailyShowUpNotificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(dailyShowUpNotificationId);
    } catch (error) {
      if (__DEV__) {
        console.warn('[notifications] failed to cancel previous daily show-up notification', {
          error,
        });
      }
    }
    dailyShowUpNotificationId = null;
  }

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Align your day with your arcs',
        body: 'Open kwilt to review Today and choose one tiny step.',
        data: {
          type: 'dailyShowUp',
        } satisfies NotificationData,
      },
      // Fire at the chosen local time every day.
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });
    dailyShowUpNotificationId = identifier;
  } catch (error) {
    if (__DEV__) {
      console.warn('[notifications] failed to schedule daily show-up notification', { error });
    }
  }
}

async function cancelDailyShowUpInternal() {
  if (!dailyShowUpNotificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(dailyShowUpNotificationId);
  } catch (error) {
    if (__DEV__) {
      console.warn('[notifications] failed to cancel daily show-up notification', { error });
    }
  } finally {
    dailyShowUpNotificationId = null;
  }
}

function attachStoreSubscription() {
  if (hasAttachedStoreSubscription) {
    return;
  }
  hasAttachedStoreSubscription = true;

  let prevActivities: ActivitySnapshot[] = useAppStore
    .getState()
    .activities.map((activity) => ({
      id: activity.id,
      reminderAt: activity.reminderAt ?? null,
      status: activity.status,
    }));

  useAppStore.subscribe((state) => {
    const nextActivities: ActivitySnapshot[] = state.activities.map((activity) => ({
      id: activity.id,
      reminderAt: activity.reminderAt ?? null,
      status: activity.status,
    }));

    const prefs = state.notificationPreferences;

    const prevById = new Map(prevActivities.map((a) => [a.id, a]));
    const nextById = new Map(nextActivities.map((a) => [a.id, a]));

    const changed: {
      addedOrUpdated: ActivitySnapshot[];
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
      if (prev.reminderAt !== next.reminderAt || prev.status !== next.status) {
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

    switch (data.type) {
      case 'activityReminder': {
        if (!rootNavigationRef.isReady()) {
          return;
        }
        const activityId = (data as { activityId?: string }).activityId;
        if (!activityId) return;
        rootNavigationRef.navigate('Activities', {
          screen: 'ActivityDetail',
          params: { activityId },
        });
        break;
      }
      case 'dailyShowUp': {
        // If the user has already completed an Activity today, we can quietly
        // skip the daily show-up navigation to avoid redundant nudges.
        const state = useAppStore.getState();
        const todayKey = new Date().toISOString().slice(0, 10);
        if (state.lastShowUpDate === todayKey) {
          return;
        }
        if (!rootNavigationRef.isReady()) {
          return;
        }
        // For now, land on the Activities list as the primary daily canvas.
        rootNavigationRef.navigate('Activities', {
          screen: 'ActivitiesList',
        });
        break;
      }
      case 'streak':
      case 'reactivation': {
        if (!rootNavigationRef.isReady()) {
          return;
        }
        rootNavigationRef.navigate('Activities', {
          screen: 'ActivitiesList',
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
      Platform.OS === 'ios' ? 'Settings → Notifications → kwilt' : 'Settings → Apps → kwilt → Notifications';
    Alert.alert(
      'Notifications disabled',
      `Notifications are currently disabled for kwilt in system settings. You can re-enable them from ${friendlyPlatform}.`,
    );
    return false;
  }

  // notRequested: show a lightweight rationale before triggering the OS prompt.
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      'Allow gentle reminders?',
      reason === 'activity'
        ? 'kwilt can send you gentle reminders when Activities are due so tiny steps don’t slip through the cracks.'
        : 'kwilt can send a daily nudge to review Today and choose one tiny step for your arcs.',
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
    attachStoreSubscription();
    attachNotificationResponseListener();
  },

  async ensurePermissionWithRationale(reason: 'activity' | 'daily'): Promise<boolean> {
    return ensurePermissionWithRationaleInternal(reason);
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
    const snapshot: ActivitySnapshot = {
      id: activity.id,
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
      return;
    }

    // Activity reminders
    if (!next.allowActivityReminders) {
      const ids = Array.from(activityNotificationIds.keys());
      await Promise.all(ids.map((id) => cancelActivityReminderInternal(id)));
    } else {
      const state = useAppStore.getState();
      const snapshots: ActivitySnapshot[] = state.activities.map((activity) => ({
        id: activity.id,
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
          seconds: 2,
        },
      });
    } catch (error) {
      if (__DEV__) {
        console.warn('[notifications] debugFireNotification failed', { kind, error });
      }
    }
  },
};


