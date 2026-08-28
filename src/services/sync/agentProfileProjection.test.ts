import { agentProfileProjectionSignature, buildAgentProfileProjectionRow } from './agentProfileProjection';

test('projects only bounded Phone-safe Profile fields and the native optimistic version', () => {
  const profile = {
    id: 'profile-1', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-23T18:00:00.000Z',
    fullName: '  Andrew  ', ageRange: '35-44' as const, email: 'private@example.com',
    birthdate: '1988-01-01', identitySummary: 'Private identity context', coachContextRaw: 'Private raw context',
    timezone: 'America/Denver',
    preferences: { plan: { availabilityVersion: 4, availability: {
      sun: { enabled: false, windows: { work: [], personal: [] } },
      mon: { enabled: true, windows: { work: [{ start: '09:00', end: '17:00' }], personal: [] } },
      tue: { enabled: false, windows: { work: [], personal: [] } },
      wed: { enabled: false, windows: { work: [], personal: [] } },
      thu: { enabled: false, windows: { work: [], personal: [] } },
      fri: { enabled: false, windows: { work: [], personal: [] } },
      sat: { enabled: false, windows: { work: [], personal: [] } },
    } } },
    communication: {}, visuals: {},
  };
  expect(buildAgentProfileProjectionRow({ userId: ' user-1 ', profile, now: () => 'now' })).toEqual({
    user_id: 'user-1', profile_id: 'profile-1', full_name: 'Andrew', age_range: '35-44',
    timezone: 'America/Denver', plan_availability_version: 4,
    plan_availability: [{ weekday: 1, mode: 'work', startLocalTime: '09:00', endLocalTime: '17:00' }],
    notification_preferences: null,
    profile_updated_at: '2026-07-23T18:00:00.000Z', updated_at: 'now',
  });
  expect(JSON.stringify(buildAgentProfileProjectionRow({ userId: 'user-1', profile }))).not.toMatch(
    /private@example|birthdate|identity|coachContext/i,
  );
});

test('projects bounded notification choices without device permission state', () => {
  const notificationPreferences = {
    notificationsEnabled: true, osPermissionStatus: 'authorized' as const,
    allowActivityReminders: true, allowDailyShowUp: false, dailyShowUpTime: null,
    allowPlanKickoff: true, planKickoffCadence: 'weekdays' as const, planKickoffWeeklyDay: 1,
    allowDailyFocus: true, dailyFocusTime: '08:30', dailyFocusTimeMode: 'manual' as const,
    allowGoalNudges: true, goalNudgeTime: '17:00', allowStreakAndReactivation: true,
    allowHouseholdMealPlanPush: false,
  };
  const row = buildAgentProfileProjectionRow({ userId: 'user-1', profile: null, notificationPreferences, now: () => 'now' });
  expect(row.notification_preferences).toMatchObject({
    notificationsEnabled: true, allowDailyFocus: true, dailyFocusTime: '08:30', allowHouseholdMealPlanPush: false,
  });
  expect(JSON.stringify(row.notification_preferences)).not.toContain('osPermissionStatus');
  expect(agentProfileProjectionSignature(null, { ...notificationPreferences, dailyFocusTime: '09:00' }))
    .not.toBe(agentProfileProjectionSignature(null, notificationPreferences));
});

test('changes its signature only when the bounded projection changes', () => {
  const base = {
    id: 'profile-1', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-23T18:00:00.000Z',
    fullName: 'Andrew', ageRange: '35-44' as const, communication: {}, visuals: {},
  };
  expect(agentProfileProjectionSignature({ ...base, coachContextRaw: 'one' }))
    .toBe(agentProfileProjectionSignature({ ...base, coachContextRaw: 'two' }));
  expect(agentProfileProjectionSignature({ ...base, fullName: 'Andy' }))
    .not.toBe(agentProfileProjectionSignature(base));
  expect(agentProfileProjectionSignature({ ...base, timezone: 'America/Chicago' }))
    .not.toBe(agentProfileProjectionSignature(base));
});
