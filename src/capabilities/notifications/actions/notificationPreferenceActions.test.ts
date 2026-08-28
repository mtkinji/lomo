import { buildNotificationPreferenceReview, InvalidNotificationPreferencePatchError } from './notificationPreferenceActions';

const current = {
  notificationsEnabled: false,
  osPermissionStatus: 'notRequested' as const,
  allowActivityReminders: false,
  allowDailyShowUp: false,
  dailyShowUpTime: null,
  allowPlanKickoff: true,
  planKickoffCadence: 'daily' as const,
  planKickoffWeeklyDay: 1 as const,
  allowDailyFocus: false,
  dailyFocusTime: null,
  dailyFocusTimeMode: 'auto' as const,
  allowGoalNudges: true,
  goalNudgeTime: null,
  allowStreakAndReactivation: true,
  allowHouseholdMealPlanPush: true,
};

test('prepares an exact patch without changing the OS permission status', () => {
  const review = buildNotificationPreferenceReview(current, {
    notificationsEnabled: true, allowDailyFocus: true, dailyFocusTime: '08:30', dailyFocusTimeMode: 'manual',
  });
  expect(review.requiresNativePermission).toBe(true);
  expect(review.next).toMatchObject({
    notificationsEnabled: true, osPermissionStatus: 'notRequested', allowDailyFocus: true,
    dailyFocusTime: '08:30', dailyFocusTimeMode: 'manual',
  });
  expect(review.changedFields).toEqual(['notificationsEnabled', 'allowDailyFocus', 'dailyFocusTime', 'dailyFocusTimeMode']);
});

test('does not request OS permission for an all-off change', () => {
  expect(buildNotificationPreferenceReview({ ...current, notificationsEnabled: true }, {
    notificationsEnabled: false,
  }).requiresNativePermission).toBe(false);
});

test('rejects unsupported fields and malformed local times', () => {
  expect(() => buildNotificationPreferenceReview(current, { surprise: true } as never))
    .toThrow(InvalidNotificationPreferencePatchError);
  expect(() => buildNotificationPreferenceReview(current, { dailyShowUpTime: 'breakfast' }))
    .toThrow(InvalidNotificationPreferencePatchError);
});
