import * as Notifications from 'expo-notifications';

jest.mock('../store/useAppStore', () => ({
  useAppStore: {
    getState: jest.fn(),
    setState: jest.fn(),
    subscribe: jest.fn(() => () => undefined),
  },
}));

jest.mock('./notifications/NotificationDeliveryLedger', () => ({
  loadSystemNudgeLedger: jest.fn(async () => ({
    days: {},
    lastOpenedAtByType: {},
    lastSentAtByType: {},
    consecutiveNoOpenByType: {},
    sentCountByDate: {},
    openHourCountsByType: {},
  })),
  saveDailyShowUpLedger: jest.fn(async () => undefined),
  saveSetupNextStepLedger: jest.fn(async () => undefined),
  saveDailyFocusLedger: jest.fn(async () => undefined),
  saveGoalNudgeLedger: jest.fn(async () => undefined),
  markActivityReminderCancelled: jest.fn(async () => undefined),
  upsertActivityReminderSchedule: jest.fn(async () => undefined),
  recordSystemNudgeOpened: jest.fn(async () => undefined),
  recordSystemNudgeScheduled: jest.fn(async () => undefined),
}));

jest.mock('./notifications/goalNudge', () => ({
  pickGoalNudgeCandidate: jest.fn(() => ({
    goalId: 'goal-1',
    goalTitle: 'Goal',
    arcName: 'Arc',
  })),
  buildGoalNudgeContent: jest.fn(() => ({ title: 't', body: 'b' })),
}));

jest.mock('./recommendations/nextStep', () => ({
  getSuggestedNextStep: jest.fn(() => ({ kind: 'setup', reason: 'no_goals' })),
  hasAnyActivitiesScheduledForToday: jest.fn(() => false),
}));

import { useAppStore } from '../store/useAppStore';
import { loadSystemNudgeLedger } from './notifications/NotificationDeliveryLedger';
import { NotificationService } from './NotificationService';

function setStoreState(overrides: any = {}) {
  (useAppStore.getState as jest.Mock).mockReturnValue({
    notificationPreferences: {
      notificationsEnabled: true,
      osPermissionStatus: 'authorized',
      allowDailyShowUp: true,
      dailyShowUpTime: '09:00',
      allowDailyFocus: true,
      dailyFocusTime: '14:00',
      allowGoalNudges: true,
      goalNudgeTime: '16:00',
      allowActivityReminders: false,
    },
    lastShowUpDate: null,
    lastCompletedFocusSessionDate: null,
    arcs: [],
    goals: [],
    activities: [],
    ...overrides,
  });
}

describe('NotificationService system-nudge policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setStoreState();
  });

  it('enforces global cap: if already 2 nudges fired today, daily show-up schedules for tomorrow', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T07:00:00.000'));

    (loadSystemNudgeLedger as jest.Mock).mockResolvedValueOnce({
      days: {},
      lastOpenedAtByType: {},
      lastSentAtByType: {},
      consecutiveNoOpenByType: {},
      sentCountByDate: { '2026-01-01': 2 },
      openHourCountsByType: {},
    });

    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync');

    await NotificationService.scheduleDailyShowUp('09:00');

    expect(scheduleSpy).toHaveBeenCalled();
    const arg = scheduleSpy.mock.calls[0]?.[0] as any;
    const fireAt = arg.trigger.date as Date;
    expect(fireAt.getFullYear()).toBe(2026);
    expect(fireAt.getMonth()).toBe(0);
    expect(fireAt.getDate()).toBe(2); // tomorrow
    expect(fireAt.getHours()).toBe(9);
    expect(fireAt.getMinutes()).toBe(0);
  });

  it('enforces global spacing: if a system nudge fired <6h ago, focus schedules next day (keeps time-of-day)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T12:00:00.000'));

    const now = new Date();
    const fireAtToday = new Date(now);
    fireAtToday.setHours(14, 0, 0, 0);
    const lastSentAt = new Date(fireAtToday.getTime() - 2 * 60 * 60 * 1000).toISOString(); // 2h before focus

    (loadSystemNudgeLedger as jest.Mock).mockResolvedValueOnce({
      days: {},
      lastOpenedAtByType: {},
      lastSentAtByType: { dailyShowUp: lastSentAt }, // <6h before focus fireAt
      consecutiveNoOpenByType: {},
      sentCountByDate: { '2026-01-01': 1 },
      openHourCountsByType: {},
    });

    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync');

    await NotificationService.scheduleDailyFocus('14:00');

    expect(scheduleSpy).toHaveBeenCalled();
    const arg = scheduleSpy.mock.calls[0]?.[0] as any;
    const fireAt = arg.trigger.date as Date;
    expect(fireAt.getDate()).toBe(2); // pushed to tomorrow (avoid unexpected time shift)
    expect(fireAt.getHours()).toBe(14);
    expect(fireAt.getMinutes()).toBe(0);
  });

  it('suppresses goal nudges after the user already showed up today (does not schedule)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T09:00:00.000'));
    setStoreState({ lastShowUpDate: '2026-01-01' });

    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync');

    await NotificationService.scheduleGoalNudge();

    expect(scheduleSpy).not.toHaveBeenCalled();
  });
});


