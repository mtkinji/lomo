/**
 * Guardrail test: background reconcile should not schedule system nudges directly.
 * It should delegate to NotificationService so v2 caps/suppression/backoff are consistent.
 */

jest.mock('../NotificationService', () => ({
  NotificationService: {
    scheduleDailyShowUp: jest.fn(async () => undefined),
    scheduleDailyFocus: jest.fn(async () => undefined),
    scheduleGoalNudge: jest.fn(async () => undefined),
  },
}));

jest.mock('../../store/useAppStore', () => ({
  useAppStore: {
    getState: jest.fn(() => ({
      notificationPreferences: {
        notificationsEnabled: true,
        allowDailyShowUp: true,
        dailyShowUpTime: '09:00',
        allowDailyFocus: true,
        dailyFocusTime: '14:00',
        allowGoalNudges: true,
        goalNudgeTime: '16:00',
        osPermissionStatus: 'authorized',
      },
      arcs: [],
      goals: [],
      activities: [],
      lastCompletedFocusSessionDate: null,
    })),
  },
}));

jest.mock('./NotificationDeliveryLedger', () => ({
  loadActivityReminderLedger: jest.fn(async () => ({})),
  deleteActivityReminderLedgerEntry: jest.fn(async () => undefined),
  markActivityReminderFired: jest.fn(async () => undefined),

  loadDailyShowUpLedger: jest.fn(async () => ({ notificationId: null, scheduleTimeLocal: '09:00', scheduledForIso: null })),
  saveDailyShowUpLedger: jest.fn(async () => undefined),

  loadSetupNextStepLedger: jest.fn(async () => ({ notificationId: null, scheduleTimeLocal: '09:00', scheduledForIso: null, reason: null })),
  saveSetupNextStepLedger: jest.fn(async () => undefined),

  loadDailyFocusLedger: jest.fn(async () => ({ notificationId: null, scheduleTimeLocal: '14:00', scheduledForIso: null })),
  saveDailyFocusLedger: jest.fn(async () => undefined),

  loadGoalNudgeLedger: jest.fn(async () => ({ notificationId: null, scheduleTimeLocal: '16:00', scheduledForIso: null, goalId: null })),
  saveGoalNudgeLedger: jest.fn(async () => undefined),

  recordSystemNudgeFiredEstimated: jest.fn(async () => undefined),
}));

import * as Notifications from 'expo-notifications';
import { NotificationService } from '../NotificationService';
import { reconcileNotificationsFiredEstimated } from './notificationBackgroundTask';

describe('notificationBackgroundTask', () => {
  it('delegates system nudge scheduling to NotificationService (no direct scheduleNotificationAsync)', async () => {
    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync');

    await reconcileNotificationsFiredEstimated('background_fetch');

    expect(NotificationService.scheduleDailyShowUp).toHaveBeenCalledWith('09:00');
    expect(NotificationService.scheduleDailyFocus).toHaveBeenCalledWith('14:00');
    expect(NotificationService.scheduleGoalNudge).toHaveBeenCalled();

    // System nudges should not be scheduled directly from the background task.
    expect(scheduleSpy).not.toHaveBeenCalled();
  });
});


