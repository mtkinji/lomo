import { buildActivityReminderStartupPlan } from './activityReminderStartupReconciliation';

const authorizedPreferences = {
  notificationsEnabled: true,
  osPermissionStatus: 'authorized' as const,
  allowActivityReminders: true,
};

describe('buildActivityReminderStartupPlan', () => {
  it('reconciles a hydrated Activity collection from one scheduled-notification inventory', () => {
    const activities = Array.from({ length: 80 }, (_, index) => ({
      id: `activity-${index}`,
      title: `Activity ${index}`,
      goalId: null,
      status: 'planned' as const,
      reminderAt: index === 12 ? '2030-01-02T15:00:00.000Z' : null,
      repeatRule: undefined,
      repeatCustom: undefined,
    }));
    const scheduled = [
      {
        identifier: 'existing-12',
        content: { data: { type: 'activityReminder', activityId: 'activity-12' } },
      },
      {
        identifier: 'orphaned',
        content: { data: { type: 'activityReminder', activityId: 'deleted-activity' } },
      },
      {
        identifier: 'daily-focus',
        content: { data: { type: 'dailyFocus' } },
      },
    ];

    const plan = buildActivityReminderStartupPlan({
      activities,
      preferences: authorizedPreferences,
      scheduled,
      nowMs: Date.parse('2029-12-31T12:00:00.000Z'),
    });

    expect(plan.cancelIdentifiers).toEqual(['existing-12', 'orphaned']);
    expect(plan.activitiesToSchedule.map((activity) => activity.id)).toEqual(['activity-12']);
  });

  it('cancels existing Activity reminders without scheduling when reminders are disabled', () => {
    const plan = buildActivityReminderStartupPlan({
      activities: [{
        id: 'activity-1',
        title: 'Activity 1',
        goalId: null,
        status: 'planned',
        reminderAt: '2030-01-02T15:00:00.000Z',
        repeatRule: undefined,
        repeatCustom: undefined,
      }],
      preferences: { ...authorizedPreferences, allowActivityReminders: false },
      scheduled: [{
        identifier: 'existing-1',
        content: { data: { type: 'activityReminder', activityId: 'activity-1' } },
      }],
      nowMs: Date.parse('2029-12-31T12:00:00.000Z'),
    });

    expect(plan.cancelIdentifiers).toEqual(['existing-1']);
    expect(plan.activitiesToSchedule).toEqual([]);
  });
});
