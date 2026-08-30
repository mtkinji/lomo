import type { CalendarAccount, CalendarListItem, CalendarRef } from '../../../services/plan/calendarApi';

export type PlanCalendarPreferenceSnapshot = {
  version: number;
  authorization: 'connected' | 'not_connected' | 'needs_reconnect';
  errors: string[];
  calendars: Array<{
    id: string;
    name: string;
    provider: 'google' | 'microsoft';
    accountLabel: string;
    canWrite: boolean;
    shared: boolean;
    selectedForBusyTime: boolean;
    selectedForCommitments: boolean;
  }>;
};

export type PlanCalendarPreferenceReview = {
  expectedVersion: number;
  readCalendarIds: string[];
  writeCalendarId: string | null;
  addedReadCalendarIds: string[];
  removedReadCalendarIds: string[];
  writeCalendarChanged: boolean;
};

export class PlanCalendarPreferenceConflictError extends Error {
  readonly code = 'plan_calendar_preferences_version_stale';
}

export function encodePlanCalendarRef(ref: CalendarRef): string {
  return `${ref.provider}:${ref.accountId}:${ref.calendarId}`;
}

export function decodePlanCalendarRef(value: string): CalendarRef | null {
  const [provider, accountId, ...calendarParts] = value.split(':');
  const calendarId = calendarParts.join(':');
  if ((provider !== 'google' && provider !== 'microsoft') || !accountId || !calendarId) return null;
  return { provider, accountId, calendarId };
}

export function buildPlanCalendarPreferenceSnapshot(input: {
  accounts: CalendarAccount[];
  calendars: CalendarListItem[];
  preferences: { version: number; readCalendarRefs: CalendarRef[]; writeCalendarRef: CalendarRef | null };
  errors?: string[];
}): PlanCalendarPreferenceSnapshot {
  const readIds = new Set(input.preferences.readCalendarRefs.map(encodePlanCalendarRef));
  const writeId = input.preferences.writeCalendarRef ? encodePlanCalendarRef(input.preferences.writeCalendarRef) : null;
  const accountLabels = new Map(input.accounts.map((account) => [
    `${account.provider}:${account.accountId}`,
    (account.displayName || account.email || account.accountId).trim(),
  ]));
  return {
    version: Number.isInteger(input.preferences.version) && input.preferences.version >= 0 ? input.preferences.version : 0,
    authorization: input.errors?.length ? 'needs_reconnect' : input.accounts.length ? 'connected' : 'not_connected',
    errors: [...(input.errors ?? [])],
    calendars: input.calendars.map((calendar) => {
      const id = encodePlanCalendarRef(calendar);
      return {
        id, name: calendar.name || calendar.calendarId, provider: calendar.provider,
        accountLabel: accountLabels.get(`${calendar.provider}:${calendar.accountId}`) ?? calendar.accountId,
        canWrite: calendar.canWrite !== false, shared: calendar.shared === true,
        selectedForBusyTime: readIds.has(id), selectedForCommitments: writeId === id,
      };
    }),
  };
}

export function reviewPlanCalendarPreferenceUpdate(
  snapshot: PlanCalendarPreferenceSnapshot,
  input: { expectedVersion: number; readCalendarIds: string[]; writeCalendarId: string | null },
): PlanCalendarPreferenceReview {
  if (input.expectedVersion !== snapshot.version) {
    throw new PlanCalendarPreferenceConflictError(`Calendar preferences changed from version ${input.expectedVersion} to ${snapshot.version}.`);
  }
  if (!Array.isArray(input.readCalendarIds) || input.readCalendarIds.length > 50
    || new Set(input.readCalendarIds).size !== input.readCalendarIds.length) throw new Error('Plan calendar selection is invalid.');
  const available = new Map(snapshot.calendars.map((calendar) => [calendar.id, calendar]));
  if (input.readCalendarIds.some((id) => !available.has(id))) throw new Error('A selected Plan calendar is no longer available.');
  if (input.writeCalendarId !== null && (!available.has(input.writeCalendarId)
    || available.get(input.writeCalendarId)?.canWrite !== true)) throw new Error('The commitment calendar is not writable.');
  const previousRead = snapshot.calendars.filter((calendar) => calendar.selectedForBusyTime).map((calendar) => calendar.id);
  const previousWrite = snapshot.calendars.find((calendar) => calendar.selectedForCommitments)?.id ?? null;
  return {
    expectedVersion: input.expectedVersion,
    readCalendarIds: [...input.readCalendarIds], writeCalendarId: input.writeCalendarId,
    addedReadCalendarIds: input.readCalendarIds.filter((id) => !previousRead.includes(id)),
    removedReadCalendarIds: previousRead.filter((id) => !input.readCalendarIds.includes(id)),
    writeCalendarChanged: previousWrite !== input.writeCalendarId,
  };
}
