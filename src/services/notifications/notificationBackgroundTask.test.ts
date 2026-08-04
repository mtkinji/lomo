/**
 * Guardrail test: background reconcile should not schedule system nudges directly.
 * It should delegate to NotificationService so v2 caps/suppression/backoff are consistent.
 */

jest.mock('expo-task-manager', () => {
  const executors = new Map<string, () => Promise<number>>();
  const isTaskRegisteredAsync = jest.fn(async () => false);
  return {
    __executors: executors,
    __isTaskRegisteredAsync: isTaskRegisteredAsync,
    defineTask: jest.fn((name: string, executor: () => Promise<number>) => {
      executors.set(name, executor);
    }),
    isTaskRegisteredAsync,
  };
});

jest.mock('expo-background-task', () => {
  const getStatusAsync = jest.fn(async () => 2);
  const registerTaskAsync = jest.fn(async () => undefined);
  const unregisterTaskAsync = jest.fn(async () => undefined);
  return {
    BackgroundTaskResult: { Success: 1, Failed: 2 },
    BackgroundTaskStatus: { Restricted: 1, Available: 2 },
    getStatusAsync,
    registerTaskAsync,
    unregisterTaskAsync,
  };
});

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
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { NotificationService } from '../NotificationService';
import {
  NOTIFICATION_RECONCILE_TASK,
  reconcileNotificationsFiredEstimated,
  registerNotificationReconcileTask,
  unregisterNotificationReconcileTask,
} from './notificationBackgroundTask';

const mockNotificationTaskRegistered = TaskManager.isTaskRegisteredAsync as jest.Mock;
const mockBackgroundTaskStatus = BackgroundTask.getStatusAsync as jest.Mock;
const mockRegisterBackgroundTask = BackgroundTask.registerTaskAsync as jest.Mock;
const mockUnregisterBackgroundTask = BackgroundTask.unregisterTaskAsync as jest.Mock;

describe('notificationBackgroundTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationTaskRegistered.mockResolvedValue(false);
    mockBackgroundTaskStatus.mockResolvedValue(2);
  });

  it('delegates system nudge scheduling to NotificationService (no direct scheduleNotificationAsync)', async () => {
    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync');

    await reconcileNotificationsFiredEstimated('background_fetch');

    expect(NotificationService.scheduleDailyShowUp).toHaveBeenCalledWith('09:00');
    expect(NotificationService.scheduleDailyFocus).toHaveBeenCalledWith('14:00');
    expect(NotificationService.scheduleGoalNudge).toHaveBeenCalled();

    // System nudges should not be scheduled directly from the background task.
    expect(scheduleSpy).not.toHaveBeenCalled();
  });

  it('keeps the stable task name and registers an available task at the 15-minute minimum', async () => {
    await registerNotificationReconcileTask();

    expect(NOTIFICATION_RECONCILE_TASK).toBe('kwilt-notification-reconcile-v1');
    expect(mockRegisterBackgroundTask).toHaveBeenCalledWith(NOTIFICATION_RECONCILE_TASK, {
      minimumInterval: 15,
    });
  });

  it('does not register twice or when background work is restricted', async () => {
    mockNotificationTaskRegistered.mockResolvedValueOnce(true);
    await registerNotificationReconcileTask();
    expect(mockRegisterBackgroundTask).not.toHaveBeenCalled();

    mockNotificationTaskRegistered.mockResolvedValueOnce(false);
    mockBackgroundTaskStatus.mockResolvedValueOnce(1);
    await registerNotificationReconcileTask();
    expect(mockRegisterBackgroundTask).not.toHaveBeenCalled();
  });

  it('unregisters only when the task is registered', async () => {
    await unregisterNotificationReconcileTask();
    expect(mockUnregisterBackgroundTask).not.toHaveBeenCalled();

    mockNotificationTaskRegistered.mockResolvedValueOnce(true);
    await unregisterNotificationReconcileTask();
    expect(mockUnregisterBackgroundTask).toHaveBeenCalledWith(NOTIFICATION_RECONCILE_TASK);
  });

  it('maps notification delivery success and failure to the new task result contract', async () => {
    const executor = (TaskManager as unknown as { __executors: Map<string, () => Promise<number>> })
      .__executors.get(NOTIFICATION_RECONCILE_TASK);
    expect(executor).toBeDefined();
    await expect(executor?.()).resolves.toBe(1);

    jest.spyOn(Notifications, 'getAllScheduledNotificationsAsync').mockRejectedValueOnce(new Error('native unavailable'));
    await expect(executor?.()).resolves.toBe(2);
  });
});
