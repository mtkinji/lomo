export type NotificationPreferences = {
  notificationsEnabled: boolean;
  osPermissionStatus: 'notRequested' | 'authorized' | 'denied' | 'restricted';
  allowActivityReminders: boolean;
  allowDailyShowUp: boolean;
  dailyShowUpTime: string | null;
  allowPlanKickoff: boolean;
  planKickoffCadence?: 'daily' | 'weekdays' | 'weekly';
  planKickoffWeeklyDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  allowDailyFocus: boolean;
  dailyFocusTime: string | null;
  dailyFocusTimeMode?: 'auto' | 'manual';
  allowGoalNudges: boolean;
  goalNudgeTime: string | null;
  allowStreakAndReactivation: boolean;
  allowHouseholdMealPlanPush?: boolean;
};

export type NotificationPreferencePatch = Partial<Omit<NotificationPreferences, 'osPermissionStatus'>>;

export class InvalidNotificationPreferencePatchError extends Error {}

const BOOLEAN_FIELDS = new Set([
  'notificationsEnabled', 'allowActivityReminders', 'allowDailyShowUp', 'allowPlanKickoff',
  'allowDailyFocus', 'allowGoalNudges', 'allowStreakAndReactivation', 'allowHouseholdMealPlanPush',
]);
const TIME_FIELDS = new Set(['dailyShowUpTime', 'dailyFocusTime', 'goalNudgeTime']);
const ALLOWED_FIELDS = new Set([
  ...BOOLEAN_FIELDS, ...TIME_FIELDS, 'planKickoffCadence', 'planKickoffWeeklyDay', 'dailyFocusTimeMode',
]);

export function buildNotificationPreferenceReview(
  current: NotificationPreferences,
  patch: NotificationPreferencePatch,
): { next: NotificationPreferences; changedFields: string[]; requiresNativePermission: boolean } {
  const keys = Object.keys(patch);
  if (keys.length === 0 || keys.some((key) => !ALLOWED_FIELDS.has(key))) {
    throw new InvalidNotificationPreferencePatchError('Choose at least one supported notification setting.');
  }
  for (const key of BOOLEAN_FIELDS) {
    if (key in patch && typeof (patch as Record<string, unknown>)[key] !== 'boolean') {
      throw new InvalidNotificationPreferencePatchError(`${key} must be on or off.`);
    }
  }
  for (const key of TIME_FIELDS) {
    const value = (patch as Record<string, unknown>)[key];
    if (key in patch && value !== null && (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))) {
      throw new InvalidNotificationPreferencePatchError(`${key} must be a 24-hour local time.`);
    }
  }
  if (patch.planKickoffCadence !== undefined && !['daily', 'weekdays', 'weekly'].includes(patch.planKickoffCadence)) {
    throw new InvalidNotificationPreferencePatchError('Choose a supported Plan kickoff cadence.');
  }
  if (patch.planKickoffWeeklyDay !== undefined && (!Number.isInteger(patch.planKickoffWeeklyDay)
      || patch.planKickoffWeeklyDay < 0 || patch.planKickoffWeeklyDay > 6)) {
    throw new InvalidNotificationPreferencePatchError('Choose a valid Plan kickoff weekday.');
  }
  if (patch.dailyFocusTimeMode !== undefined && !['auto', 'manual'].includes(patch.dailyFocusTimeMode)) {
    throw new InvalidNotificationPreferencePatchError('Choose automatic or manual Focus timing.');
  }
  const next = { ...current, ...patch, osPermissionStatus: current.osPermissionStatus };
  const changedFields = keys.filter((key) => (
    (current as unknown as Record<string, unknown>)[key] !== (next as unknown as Record<string, unknown>)[key]
  ));
  return {
    next,
    changedFields,
    requiresNativePermission: next.notificationsEnabled && current.osPermissionStatus !== 'authorized',
  };
}
