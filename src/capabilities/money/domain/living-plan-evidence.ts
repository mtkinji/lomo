import type { LivingPlanCategoryInput } from './living-plan';
import type { PlanningIncomeSourceInput } from './planning-income';
import type { CategoryExpectedNeed, CategoryFundingRhythm } from './categoryFunding';

export type LivingPlanEvidenceTransaction = {
  id: string; date: string; direction: 'inflow' | 'outflow'; amountCents: number; description: string;
  budgetId?: string | null; pending?: boolean; moneyMeaning?: string | null; accountType?: string | null; providerCategory?: string | null;
};

export type LivingPlanEvidenceInput = {
  nowIso: string; lastSyncedAtIso?: string | null; transactions: LivingPlanEvidenceTransaction[];
  forecastSettings: Array<{ budgetId: string; mode: string; scheduledAmountCents?: number | null }>;
  existingPlanAmounts?: Array<{
    categoryId: string;
    amountCents: number;
    starterWeight?: number;
    fundingRhythm?: CategoryFundingRhythm;
    priorReserveCents?: number;
    expectedNeed?: CategoryExpectedNeed | null;
  }>;
  overrides: Array<{ categoryId: string; amountCents: number }>;
};

export type LivingPlanEvidence = {
  sourceInputs: PlanningIncomeSourceInput[]; categories: LivingPlanCategoryInput[]; evidenceHash: string; syncFresh: boolean;
  evidenceConfidence: number;
};

export type CompletedCategorySpendingGuidepost = {
  amountCents: number;
  completedPeriodCount: number;
};

export function getCompletedCategorySpendingGuidepost(input: {
  nowIso: string;
  categoryId: string;
  transactions: LivingPlanEvidenceTransaction[];
}): CompletedCategorySpendingGuidepost | null {
  const currentPeriodId = input.nowIso.slice(0, 7);
  const completedRows = input.transactions.filter((row) =>
    !row.pending
    && row.direction === 'outflow'
    && row.budgetId === input.categoryId
    && row.moneyMeaning !== 'not_counted'
    && row.date.slice(0, 7) < currentPeriodId,
  );
  const values = monthlyTotals(completedRows);
  if (values.length < 2) return null;
  return { amountCents: median(values), completedPeriodCount: values.length };
}

export function buildLivingPlanEvidence(input: LivingPlanEvidenceInput): LivingPlanEvidence {
  const validRows = input.transactions.filter((row) => Number.isFinite(row.amountCents) && row.amountCents >= 0);
  const postedRows = validRows.filter((row) => !row.pending);
  const inflowGroups = new Map<string, LivingPlanEvidenceTransaction[]>();
  for (const row of postedRows.filter((item) => item.direction === 'inflow')) {
    const description = `${row.description} ${row.providerCategory ?? ''}`.toLowerCase();
    const exceptional = /\b(brokerage|fidelity|schwab|vanguard|robinhood|investment|securities|stock sale|reserve withdrawal|savings withdrawal|bonus|gift|inheritance|windfall|loan proceeds|loan disbursement)\b/.test(description);
    const providerIncome = /^income(?:\b|_)/i.test(row.providerCategory ?? '');
    const key = providerIncome && !exceptional ? 'provider-income-aggregate' : normalizeSource(row.description);
    const group = inflowGroups.get(key) ?? [];
    group.push(row);
    inflowGroups.set(key, group);
  }
  const sourceInputs: PlanningIncomeSourceInput[] = [...inflowGroups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([sourceKey, rows]) => ({
    sourceKey, description: rows[0]?.description ?? sourceKey, accountType: rows[0]?.accountType ?? undefined,
    providerCategory: rows[0]?.providerCategory ?? undefined, samples: monthlyTotals(rows),
    activePeriodCount: new Set(rows.map((row) => row.date.slice(0, 7))).size,
    pairedTransfer: rows.every((row) => row.moneyMeaning === 'transfer' || row.moneyMeaning === 'internal_transfer'),
    matchedRefund: rows.every((row) => row.moneyMeaning === 'category_credit'),
  }));

  const categories = new Map<string, LivingPlanCategoryInput>();
  for (const setting of input.forecastSettings) {
    if (setting.mode !== 'scheduled' || !setting.scheduledAmountCents) continue;
    categories.set(setting.budgetId, { categoryId: setting.budgetId, fixedCents: nonnegative(setting.scheduledAmountCents) });
  }
  for (const override of input.overrides) {
    categories.set(override.categoryId, { ...categories.get(override.categoryId), categoryId: override.categoryId, overrideCents: nonnegative(override.amountCents) });
  }
  for (const existing of input.existingPlanAmounts ?? []) {
    categories.set(existing.categoryId, {
      ...categories.get(existing.categoryId),
      categoryId: existing.categoryId,
      supportedFlexibleCents: nonnegative(existing.amountCents),
      starterWeight: nonnegativeWeight(existing.starterWeight ?? 0),
      fundingRhythm: existing.fundingRhythm ?? 'monthly',
      priorReserveCents: nonnegative(existing.priorReserveCents ?? 0),
      ...(existing.expectedNeed ? { expectedNeed: existing.expectedNeed } : {}),
    });
  }
  const spendGroups = new Map<string, LivingPlanEvidenceTransaction[]>();
  for (const row of validRows.filter((item) => item.direction === 'outflow' && item.budgetId && item.moneyMeaning !== 'not_counted')) {
    const group = spendGroups.get(row.budgetId!) ?? [];
    group.push(row);
    spendGroups.set(row.budgetId!, group);
  }
  const currentPeriodId = input.nowIso.slice(0, 7);
  const completedPeriodIds = new Set<string>();
  for (const [categoryId, rows] of spendGroups) {
    const completedRows = rows.filter((row) => !row.pending && row.date.slice(0, 7) < currentPeriodId);
    completedRows.forEach((row) => completedPeriodIds.add(row.date.slice(0, 7)));
    const values = monthlyTotals(completedRows);
    const currentExposure = rows
      .filter((row) => row.date.slice(0, 7) === currentPeriodId)
      .reduce((sum, row) => sum + nonnegative(row.amountCents), 0);
    categories.set(categoryId, {
      ...categories.get(categoryId),
      categoryId,
      supportedFlexibleCents: values.length >= 2
        ? median(values)
        : (categories.get(categoryId)?.supportedFlexibleCents ?? 0),
      exposureCents: currentExposure,
    });
  }
  const syncFresh = isFresh(input.lastSyncedAtIso, input.nowIso);
  const sortedCategories = [...categories.values()].sort((a, b) => a.categoryId.localeCompare(b.categoryId));
  return {
    sourceInputs,
    categories: sortedCategories,
    syncFresh,
    evidenceConfidence: Math.min(1, completedPeriodIds.size / 6),
    evidenceHash: stableHash({ transactions: validRows.map(({ id, date, direction, amountCents, budgetId, moneyMeaning, pending }) => ({ id, date, direction, amountCents, budgetId, moneyMeaning, pending: pending === true })).sort((a, b) => a.id.localeCompare(b.id)), forecastSettings: input.forecastSettings, overrides: input.overrides }),
  };
}

function monthlyTotals(rows: LivingPlanEvidenceTransaction[]): number[] {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.date.slice(0, 7), (totals.get(row.date.slice(0, 7)) ?? 0) + nonnegative(row.amountCents));
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, total]) => total);
}
function normalizeSource(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\b(direct|deposit|inc|llc|corp|company)\b/g, ' ').replace(/\s+/g, ' ').trim() || 'unknown'; }
function nonnegative(value: number): number { return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0; }
function nonnegativeWeight(value: number): number { return Number.isFinite(value) ? Math.max(0, value) : 0; }
function median(values: number[]): number { const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2); }
function isFresh(lastSyncedAtIso: string | null | undefined, nowIso: string): boolean { if (!lastSyncedAtIso) return false; const age = new Date(nowIso).getTime() - new Date(lastSyncedAtIso).getTime(); return Number.isFinite(age) && age >= 0 && age <= 72 * 60 * 60 * 1000; }
function stableHash(value: unknown): string { const source = JSON.stringify(value); let hash = 2166136261; for (let index = 0; index < source.length; index += 1) { hash ^= source.charCodeAt(index); hash = Math.imul(hash, 16777619); } return `e-${(hash >>> 0).toString(16).padStart(8, '0')}`; }
