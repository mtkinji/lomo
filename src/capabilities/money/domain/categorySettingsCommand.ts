import { parseCategoryName } from './categoryPlanDraft';
import { validateRolloverPolicy, type RolloverPolicy } from './categoryRollover';
import type { LivingPlanCandidate, LivingPlanAllocation } from './living-plan';

export type CategorySettings = {
  name: string;
  budgetCents: number;
  fundingRhythm: 'monthly' | 'reserve';
  rolloverEnabled: boolean;
  rolloverPolicy: RolloverPolicy | null;
  planRole: 'protected' | 'flexible';
  expectedNeedCents: number | null;
  expectedNeedDueMonth: string | null;
};
export type CategorySettingsGovernance = {
  expectedActiveVersionId: string | null;
  candidate: LivingPlanCandidate;
  components: LivingPlanAllocation[];
  receipt: { trigger: 'category_changed'; outcome: 'initial' | 'routine' | 'material'; cause: string;
    changedCategoryIds: string[]; materialReasons: string[] };
};
export type CategorySettingsRequest = {
  schemaVersion: 1;
  actorUserId: string;
  requestId: string;
  categoryId: string;
  expectedCategoryUpdatedAt: string;
  expectedPlanUpdatedAt: string;
  settings: CategorySettings;
  governance: CategorySettingsGovernance | null;
};
export type CategorySettingsReceipt = {
  requestId: string;
  categoryId: string;
  confirmedAt: string;
  categoryUpdatedAt: string;
  planUpdatedAt: string;
  activeVersionId: string | null;
  changes: CategorySettings;
};
export type CategorySettingsOutcome =
  | { outcome: 'confirmed'; receipt: CategorySettingsReceipt }
  | { outcome: 'rejected'; message: string; resolvesPending?: boolean }
  | { outcome: 'unknown'; message: string };

export const UNKNOWN_CATEGORY_SAVE = 'We could not confirm this save yet. Check the save again before making another change.';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid saved category request.');
  return value as Record<string, unknown>;
}
function identifier(value: unknown): string {
  if (typeof value !== 'string' || !uuid.test(value)) throw new Error('Invalid category request identity.');
  return value;
}
function timestamp(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error('Refresh this category before saving changes.');
  }
  return value;
}
function cents(value: unknown, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum || value > 1_000_000_000) {
    throw new Error('Enter a valid category amount.');
  }
  return value;
}
export function parseCategorySettings(value: unknown): CategorySettings {
  const input = record(value);
  if (typeof input.name !== 'string' || typeof input.rolloverEnabled !== 'boolean'
    || typeof input.fundingRhythm !== 'string' || typeof input.planRole !== 'string'
    || !['monthly', 'reserve'].includes(String(input.fundingRhythm))
    || !['protected', 'flexible'].includes(String(input.planRole))
    || !Object.hasOwn(input, 'rolloverPolicy') || !Object.hasOwn(input, 'expectedNeedCents') || !Object.hasOwn(input, 'expectedNeedDueMonth')) {
    throw new Error('Check the category settings.');
  }
  if (input.fundingRhythm === 'reserve' && input.rolloverEnabled) throw new Error('Reserve funding cannot also enable monthly rollover.');
  const need = input.expectedNeedCents === null ? null : cents(input.expectedNeedCents, 1);
  const due = input.expectedNeedDueMonth;
  if ((need === null) !== (due === null) || (due !== null && (input.fundingRhythm !== 'reserve'
    || typeof due !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(due)))) {
    throw new Error('Enter both an expected amount and a due month.');
  }
  return {
    name: parseCategoryName(input.name), budgetCents: cents(input.budgetCents),
    fundingRhythm: input.fundingRhythm as CategorySettings['fundingRhythm'], rolloverEnabled: input.rolloverEnabled,
    rolloverPolicy: input.rolloverPolicy === null ? null : validateRolloverPolicy(input.rolloverPolicy),
    planRole: input.planRole as CategorySettings['planRole'], expectedNeedCents: need, expectedNeedDueMonth: due as string | null,
  };
}

/** Validate stored envelope/identity; governed financial invariants are enforced by the RPC. */
export function parseCategorySettingsRequest(value: unknown): CategorySettingsRequest {
  const input = record(value);
  if (input.schemaVersion !== 1 || !Object.hasOwn(input, 'governance')) throw new Error('Invalid saved category request.');
  if (input.governance !== null) {
    const governance = record(input.governance);
    record(governance.candidate); record(governance.receipt);
    if (!Array.isArray(governance.components)) throw new Error('Invalid saved plan review.');
    if (governance.expectedActiveVersionId !== null) identifier(governance.expectedActiveVersionId);
  }
  return {
    schemaVersion: 1, actorUserId: identifier(input.actorUserId), requestId: identifier(input.requestId), categoryId: identifier(input.categoryId),
    expectedCategoryUpdatedAt: timestamp(input.expectedCategoryUpdatedAt), expectedPlanUpdatedAt: timestamp(input.expectedPlanUpdatedAt),
    settings: parseCategorySettings(input.settings), governance: input.governance as CategorySettingsGovernance | null,
  };
}

export function parseCategorySettingsReceipt(value: unknown, request: CategorySettingsRequest): CategorySettingsReceipt {
  const input = record(value);
  const changes = parseCategorySettings(input.changes);
  if (input.requestId !== request.requestId || input.categoryId !== request.categoryId
    || input.activeVersionId === undefined) throw new Error('The category confirmation did not match this save.');
  for (const key of ['name', 'budgetCents', 'fundingRhythm', 'rolloverEnabled', 'planRole', 'expectedNeedCents', 'expectedNeedDueMonth'] as const) {
    if (changes[key] !== request.settings[key]) throw new Error('The saved settings did not match this request.');
  }
  const expectedPolicy = request.settings.rolloverPolicy;
  const actualPolicy = changes.rolloverPolicy;
  if ((expectedPolicy === null) !== (actualPolicy === null)) throw new Error('Rollover confirmation does not match.');
  if (expectedPolicy && actualPolicy) {
    const confirmedMonth = new Intl.DateTimeFormat('en-CA', { timeZone: expectedPolicy.timeZone,
      year: 'numeric', month: '2-digit' }).formatToParts(new Date(timestamp(input.confirmedAt)));
    const month = `${confirmedMonth.find((part) => part.type === 'year')!.value}-${confirmedMonth.find((part) => part.type === 'month')!.value}`;
    if (expectedPolicy.startMonth !== actualPolicy.startMonth
      || expectedPolicy.startingBalanceCents !== actualPolicy.startingBalanceCents
      || expectedPolicy.timeZone !== actualPolicy.timeZone
      || [...new Set([...Object.keys(expectedPolicy.monthlyAmounts), ...Object.keys(actualPolicy.monthlyAmounts)])]
        .some((key) => actualPolicy.monthlyAmounts[key] !== expectedPolicy.monthlyAmounts[key]
          && (key !== month || actualPolicy.monthlyAmounts[key] !== request.settings.budgetCents))) {
      throw new Error('Rollover confirmation does not match.');
    }
  }
  return {
    requestId: request.requestId, categoryId: request.categoryId, confirmedAt: timestamp(input.confirmedAt),
    categoryUpdatedAt: timestamp(input.categoryUpdatedAt), planUpdatedAt: timestamp(input.planUpdatedAt),
    activeVersionId: input.activeVersionId === null ? null : identifier(input.activeVersionId), changes,
  };
}

export function categorySettingsRequestKey(request: Pick<CategorySettingsRequest, 'actorUserId' | 'categoryId'>): string {
  return `${request.actorUserId}:${request.categoryId}`;
}

export function categorySettingsRequestBody(request: CategorySettingsRequest): string {
  return JSON.stringify(request, (_key, value: unknown) => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value);
}

/** Rejection receipts are durable too; replay can never apply that request later. */
export function parseCategorySettingsResult(value: unknown, request: CategorySettingsRequest): CategorySettingsOutcome {
  const input = record(value);
  if (input.outcome === 'rejected') {
    if (input.requestId !== request.requestId || input.categoryId !== request.categoryId
      || typeof input.message !== 'string' || !input.message || typeof input.code !== 'string') {
      throw new Error('Invalid category rejection receipt.');
    }
    return { outcome: 'rejected', resolvesPending: true,
      message: input.code === '40001' || input.message.includes('active living plan changed')
        ? 'The category or Money plan changed since you reviewed it. Reopen settings and review your change.'
        : input.message };
  }
  return { outcome: 'confirmed', receipt: parseCategorySettingsReceipt(value, request) };
}
