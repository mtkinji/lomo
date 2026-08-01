export const MONEY_SAVED_CHECK_ID = 'money-limit';
export const MONEY_SAVED_CHECK_KIND = 'current_plan_within_income_limit';

export type MoneySavedCheck = {
  id: typeof MONEY_SAVED_CHECK_ID;
  kind: typeof MONEY_SAVED_CHECK_KIND;
  cadence: {
    kind: 'weekly';
    weekday: number;
    hour: number;
    minute: number;
    timezone: string;
  };
  disclosure: 'private_prompt_only';
  active: boolean;
  notificationId: string | null;
  lastRun: { status: 'opened' | 'delivery_failed'; atIso: string } | null;
  createdAtIso: string;
  updatedAtIso: string;
};

export function createWeeklyMoneySavedCheck(input: {
  nowIso: string;
  timezone: string;
}): MoneySavedCheck {
  return {
    id: MONEY_SAVED_CHECK_ID,
    kind: MONEY_SAVED_CHECK_KIND,
    cadence: { kind: 'weekly', weekday: 5, hour: 9, minute: 0, timezone: input.timezone },
    disclosure: 'private_prompt_only',
    active: true,
    notificationId: null,
    lastRun: null,
    createdAtIso: input.nowIso,
    updatedAtIso: input.nowIso,
  };
}

export function normalizeMoneySavedCheck(value: unknown): MoneySavedCheck | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<MoneySavedCheck>;
  const cadence = candidate.cadence;
  if (
    candidate.id !== MONEY_SAVED_CHECK_ID
    || candidate.kind !== MONEY_SAVED_CHECK_KIND
    || candidate.disclosure !== 'private_prompt_only'
    || typeof candidate.active !== 'boolean'
    || (candidate.notificationId !== null && typeof candidate.notificationId !== 'string')
    || !cadence
    || cadence.kind !== 'weekly'
    || !Number.isInteger(cadence.weekday) || cadence.weekday < 0 || cadence.weekday > 6
    || !Number.isInteger(cadence.hour) || cadence.hour < 0 || cadence.hour > 23
    || !Number.isInteger(cadence.minute) || cadence.minute < 0 || cadence.minute > 59
    || typeof cadence.timezone !== 'string' || cadence.timezone.trim().length === 0 || cadence.timezone.length > 100
    || !isIso(candidate.createdAtIso)
    || !isIso(candidate.updatedAtIso)
    || !isLastRun(candidate.lastRun)
  ) return null;
  return {
    ...candidate,
    id: MONEY_SAVED_CHECK_ID,
    kind: MONEY_SAVED_CHECK_KIND,
    cadence: { ...cadence, timezone: cadence.timezone.trim() },
    disclosure: 'private_prompt_only',
    active: candidate.active,
    notificationId: candidate.notificationId,
    lastRun: candidate.lastRun,
    createdAtIso: candidate.createdAtIso,
    updatedAtIso: candidate.updatedAtIso,
  };
}

export function updateMoneySavedCheck(
  check: MoneySavedCheck,
  patch: Partial<Pick<MoneySavedCheck, 'active' | 'notificationId' | 'lastRun' | 'updatedAtIso' | 'cadence'>>,
): MoneySavedCheck {
  const normalized = normalizeMoneySavedCheck({ ...check, ...patch });
  if (!normalized) throw new Error('The weekly Money check update is invalid.');
  return normalized;
}

function isIso(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value));
}

function isLastRun(value: unknown): value is MoneySavedCheck['lastRun'] {
  if (value === null) return true;
  if (!value || typeof value !== 'object') return false;
  const run = value as NonNullable<MoneySavedCheck['lastRun']>;
  return (run.status === 'opened' || run.status === 'delivery_failed') && isIso(run.atIso);
}
