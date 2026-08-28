import {
  buildPlanCalendarPreferenceSnapshot,
  reviewPlanCalendarPreferenceUpdate,
  PlanCalendarPreferenceConflictError,
} from './planCalendarPreferenceActions';

const calendars = [
  { provider: 'google' as const, accountId: 'account-1', calendarId: 'primary', name: 'Work', canWrite: true },
  { provider: 'google' as const, accountId: 'account-1', calendarId: 'family', name: 'Family', canWrite: false, shared: true },
];
const workId = 'google:account-1:primary';
const familyId = 'google:account-1:family';

test('reads only calendar identity, availability, and selection without event contents', () => {
  expect(buildPlanCalendarPreferenceSnapshot({
    accounts: [{ id: '1', provider: 'google', accountId: 'account-1', email: 'a@example.com', displayName: 'Andrew', status: 'active' }],
    calendars,
    preferences: {
      version: 5,
      readCalendarRefs: [calendars[1]],
      writeCalendarRef: calendars[0],
    },
  })).toEqual({
    version: 5, authorization: 'connected', errors: [],
    calendars: [
      { id: workId, name: 'Work', provider: 'google', accountLabel: 'Andrew', canWrite: true, shared: false, selectedForBusyTime: false, selectedForCommitments: true },
      { id: familyId, name: 'Family', provider: 'google', accountLabel: 'Andrew', canWrite: false, shared: true, selectedForBusyTime: true, selectedForCommitments: false },
    ],
  });
});

test('reviews exact read and write calendar selection against one version', () => {
  const snapshot = buildPlanCalendarPreferenceSnapshot({ accounts: [], calendars, preferences: {
    version: 5, readCalendarRefs: [calendars[1]], writeCalendarRef: calendars[0],
  } });
  expect(reviewPlanCalendarPreferenceUpdate(snapshot, {
    expectedVersion: 5, readCalendarIds: [workId, familyId], writeCalendarId: workId,
  })).toEqual({
    expectedVersion: 5,
    readCalendarIds: [workId, familyId], writeCalendarId: workId,
    addedReadCalendarIds: [workId], removedReadCalendarIds: [], writeCalendarChanged: false,
  });
});

test('rejects stale, unknown, duplicate, and read-only write targets', () => {
  const snapshot = buildPlanCalendarPreferenceSnapshot({ accounts: [], calendars, preferences: {
    version: 5, readCalendarRefs: [], writeCalendarRef: null,
  } });
  expect(() => reviewPlanCalendarPreferenceUpdate(snapshot, {
    expectedVersion: 4, readCalendarIds: [], writeCalendarId: null,
  })).toThrow(PlanCalendarPreferenceConflictError);
  for (const input of [
    { expectedVersion: 5, readCalendarIds: ['missing'], writeCalendarId: null },
    { expectedVersion: 5, readCalendarIds: [workId, workId], writeCalendarId: null },
    { expectedVersion: 5, readCalendarIds: [], writeCalendarId: familyId },
  ]) expect(() => reviewPlanCalendarPreferenceUpdate(snapshot, input)).toThrow();
});
