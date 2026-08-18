export type StartupActivityReminder = {
  id: string;
  title: string;
  goalId?: string | null;
  status: string;
  reminderAt?: string | null;
  repeatRule?: unknown;
  repeatCustom?: unknown;
};

type StartupNotificationPreferences = {
  notificationsEnabled: boolean;
  osPermissionStatus: string;
  allowActivityReminders: boolean;
};

type ScheduledNotification = {
  identifier: string;
  content: { data?: unknown };
};

function shouldScheduleActivityReminder(
  activity: StartupActivityReminder,
  preferences: StartupNotificationPreferences,
  nowMs: number,
): boolean {
  if (!preferences.notificationsEnabled || !preferences.allowActivityReminders) return false;
  if (preferences.osPermissionStatus !== 'authorized') return false;
  if (!activity.reminderAt) return false;
  if (activity.status === 'done' || activity.status === 'skipped' || activity.status === 'cancelled') return false;
  const reminderMs = Date.parse(activity.reminderAt);
  return Number.isFinite(reminderMs) && reminderMs > nowMs;
}

export function buildActivityReminderStartupPlan(params: {
  activities: StartupActivityReminder[];
  preferences: StartupNotificationPreferences;
  scheduled: ScheduledNotification[];
  nowMs?: number;
}): {
  cancelIdentifiers: string[];
  activitiesToSchedule: StartupActivityReminder[];
} {
  const cancelIdentifiers = params.scheduled.flatMap((request) => {
    const data = request.content.data as { type?: unknown } | null | undefined;
    return data?.type === 'activityReminder' ? [request.identifier] : [];
  });
  const nowMs = params.nowMs ?? Date.now();
  const activitiesToSchedule = params.activities.filter((activity) =>
    shouldScheduleActivityReminder(activity, params.preferences, nowMs));

  return { cancelIdentifiers, activitiesToSchedule };
}
