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
import { getSuggestedNextStep } from './recommendations/nextStep';

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
      allowStreakAndReactivation: true,
    },
    lastShowUpDate: null,
    lastCompletedFocusSessionDate: null,
    currentShowUpStreak: 0,
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

  it('suppresses daily show-up if an explicit Activity reminder is coming up soon (push to tomorrow)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T07:00:00.000'));

    setStoreState({
      activities: [
        {
          id: 'a1',
          title: 'Reminder soon',
          goalId: 'goal-1',
          status: 'planned',
          reminderAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // +1h
          repeatRule: null,
          repeatCustom: null,
        },
      ],
    });

    (loadSystemNudgeLedger as jest.Mock).mockResolvedValueOnce({
      days: {},
      lastOpenedAtByType: {},
      lastSentAtByType: {},
      consecutiveNoOpenByType: {},
      sentCountByDate: { '2026-01-01': 0 },
      openHourCountsByType: {},
    });

    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync');
    await NotificationService.scheduleDailyShowUp('09:00');

    const arg = scheduleSpy.mock.calls[0]?.[0] as any;
    const fireAt = arg.trigger.date as Date;
    expect(fireAt.getDate()).toBe(2);
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

  it('suppresses goal nudge if an explicit Activity reminder is coming up soon (push to tomorrow)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T12:00:00.000'));

    setStoreState({
      goals: [{ id: 'goal-1' }],
      activities: [
        {
          id: 'a1',
          title: 'Reminder soon',
          goalId: 'goal-1',
          status: 'planned',
          reminderAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // +30m
          repeatRule: null,
          repeatCustom: null,
        },
      ],
    });

    (loadSystemNudgeLedger as jest.Mock).mockResolvedValueOnce({
      days: {},
      lastOpenedAtByType: {},
      lastSentAtByType: {},
      consecutiveNoOpenByType: {},
      sentCountByDate: { '2026-01-01': 0 },
      openHourCountsByType: {},
    });

    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync');
    await NotificationService.scheduleGoalNudge();

    const arg = scheduleSpy.mock.calls[0]?.[0] as any;
    const fireAt = arg.trigger.date as Date;
    expect(fireAt.getDate()).toBe(2);
    // still should be roughly afternoon-ish (goal nudge defaults to 16:00)
    expect(fireAt.getHours()).toBe(16);
  });

  it('backoff: if daily show-up was ignored twice, it skips the next day', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T07:00:00.000'));

    // Ensure this schedules a dailyShowUp (not setupNextStep), otherwise the backoff key differs.
    (getSuggestedNextStep as unknown as jest.Mock).mockReturnValueOnce({
      kind: 'activity',
      activityId: 'a1',
      goalId: 'goal-1',
    });

    (loadSystemNudgeLedger as jest.Mock).mockResolvedValueOnce({
      days: {},
      lastOpenedAtByType: {},
      lastSentAtByType: {},
      consecutiveNoOpenByType: { dailyShowUp: 2 },
      sentCountByDate: { '2026-01-01': 0 },
      openHourCountsByType: {},
    });

    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync');
    await NotificationService.scheduleDailyShowUp('09:00');

    const arg = scheduleSpy.mock.calls[0]?.[0] as any;
    const fireAt = arg.trigger.date as Date;
    // +1 day due to backoff
    expect(fireAt.getDate()).toBe(2);
    expect(fireAt.getHours()).toBe(9);
  });

  it('suppresses goal nudges after the user already showed up today (does not schedule)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T09:00:00.000'));
    setStoreState({ lastShowUpDate: '2026-01-01' });

    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync');

    await NotificationService.scheduleGoalNudge();

    expect(scheduleSpy).not.toHaveBeenCalled();
  });
});

describe('NotificationService streak-at-risk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('schedules a streak-at-risk notification at 19:00 when streak > 0 and not showed up today', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T12:00:00.000'));
    setStoreState({
      currentShowUpStreak: 5,
      lastShowUpDate: '2025-12-31',
    });

    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync');
    await NotificationService.scheduleStreakAtRisk();

    expect(scheduleSpy).toHaveBeenCalledTimes(1);
    const arg = scheduleSpy.mock.calls[0]?.[0] as any;
    expect(arg.content.title).toBe('Your 5-day streak is at risk');
    const fireAt = arg.trigger.date as Date;
    expect(fireAt.getHours()).toBe(19);
    expect(fireAt.getMinutes()).toBe(0);
    expect(fireAt.getDate()).toBe(1); // today
  });

  it('does not schedule when the user already showed up today', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T12:00:00.000'));
    setStoreState({
      currentShowUpStreak: 5,
      lastShowUpDate: '2026-01-01',
    });

    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync');
    await NotificationService.scheduleStreakAtRisk();

    expect(scheduleSpy).not.toHaveBeenCalled();
  });

  it('does not schedule when streak is 0', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T12:00:00.000'));
    setStoreState({
      currentShowUpStreak: 0,
      lastShowUpDate: null,
    });

    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync');
    await NotificationService.scheduleStreakAtRisk();

    expect(scheduleSpy).not.toHaveBeenCalled();
  });

  it('does not schedule when 19:00 has already passed', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T20:00:00.000'));
    setStoreState({
      currentShowUpStreak: 3,
      lastShowUpDate: '2025-12-31',
    });

    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync');
    await NotificationService.scheduleStreakAtRisk();

    expect(scheduleSpy).not.toHaveBeenCalled();
  });

  it('backs off after 2 consecutive ignores', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T12:00:00.000'));
    setStoreState({
      currentShowUpStreak: 5,
      lastShowUpDate: '2025-12-31',
    });

    (loadSystemNudgeLedger as jest.Mock).mockResolvedValueOnce({
      days: {},
      lastOpenedAtByType: {},
      lastSentAtByType: {},
      consecutiveNoOpenByType: { streak: 2 },
      sentCountByDate: {},
      openHourCountsByType: {},
    });

    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync');
    await NotificationService.scheduleStreakAtRisk();

    expect(scheduleSpy).not.toHaveBeenCalled();
  });

  it('does not schedule when allowStreakAndReactivation is false', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T12:00:00.000'));
    setStoreState({
      currentShowUpStreak: 5,
      lastShowUpDate: '2025-12-31',
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
        allowStreakAndReactivation: false,
      },
    });

    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync');
    await NotificationService.scheduleStreakAtRisk();

    expect(scheduleSpy).not.toHaveBeenCalled();
  });
});

describe('NotificationService reactivation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('schedules a reactivation notification 3 days in the future at show-up time', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-05T10:00:00.000'));
    setStoreState({
      currentShowUpStreak: 4,
      lastShowUpDate: '2026-01-04',
    });

    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync');
    await NotificationService.scheduleReactivation();

    expect(scheduleSpy).toHaveBeenCalledTimes(1);
    const arg = scheduleSpy.mock.calls[0]?.[0] as any;
    expect(arg.content.title).toBe('You had a 4-day streak going');
    const fireAt = arg.trigger.date as Date;
    expect(fireAt.getDate()).toBe(8); // 3 days from Jan 5
    expect(fireAt.getHours()).toBe(9); // dailyShowUpTime default
  });

  it('uses generic copy when streak is 0', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-05T10:00:00.000'));
    setStoreState({
      currentShowUpStreak: 0,
      lastShowUpDate: null,
    });

    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync');
    await NotificationService.scheduleReactivation();

    expect(scheduleSpy).toHaveBeenCalledTimes(1);
    const arg = scheduleSpy.mock.calls[0]?.[0] as any;
    expect(arg.content.title).toBe('Your goals are waiting');
  });

  it('backs off after 2 consecutive ignores', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-05T10:00:00.000'));
    setStoreState({
      currentShowUpStreak: 3,
      lastShowUpDate: '2026-01-04',
    });

    (loadSystemNudgeLedger as jest.Mock).mockResolvedValueOnce({
      days: {},
      lastOpenedAtByType: {},
      lastSentAtByType: {},
      consecutiveNoOpenByType: { reactivation: 2 },
      sentCountByDate: {},
      openHourCountsByType: {},
    });

    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync');
    await NotificationService.scheduleReactivation();

    expect(scheduleSpy).not.toHaveBeenCalled();
  });
});

describe('NotificationService streak-aware copy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('appends streak day count to daily show-up title when streak >= 2', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T07:00:00.000'));
    setStoreState({ currentShowUpStreak: 5 });

    (getSuggestedNextStep as unknown as jest.Mock).mockReturnValueOnce({
      kind: 'activity',
      activityId: 'a1',
      goalId: 'goal-1',
    });

    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync');
    await NotificationService.scheduleDailyShowUp('09:00');

    expect(scheduleSpy).toHaveBeenCalled();
    const arg = scheduleSpy.mock.calls[0]?.[0] as any;
    expect(arg.content.title).toBe('Align your day with your arcs — day 6');
  });

  it('does not append streak suffix when streak < 2', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T07:00:00.000'));
    setStoreState({ currentShowUpStreak: 1 });

    (getSuggestedNextStep as unknown as jest.Mock).mockReturnValueOnce({
      kind: 'activity',
      activityId: 'a1',
      goalId: 'goal-1',
    });

    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync');
    await NotificationService.scheduleDailyShowUp('09:00');

    expect(scheduleSpy).toHaveBeenCalled();
    const arg = scheduleSpy.mock.calls[0]?.[0] as any;
    expect(arg.content.title).toBe('Align your day with your arcs');
  });
});


