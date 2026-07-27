import type { SupabaseClient } from '@supabase/supabase-js';
import { buildLivingPlanEvidence, getCompletedCategorySpendingGuidepost, type CompletedCategorySpendingGuidepost, type LivingPlanEvidenceTransaction } from '../domain/living-plan-evidence';
import { collectAllPages } from '../domain/living-plan-pagination';
import { projectLivingPlanCandidate, type LivingPlanAllocation } from '../domain/living-plan';
import type { LivingPlanAdjustmentFacts } from '../domain/living-plan-adjustment';
import { compareLivingPlanVersions, getLivingPlanAllocationChanges, type LivingPlanAllocationChange, type LivingPlanTrigger } from '../domain/living-plan-changes';
import { classifyPlanningIncomeSource } from '../domain/planning-income';
import { applyGovernedCategoryPlanChange, getActiveLivingPlan, holdLivingPlanCandidate, promoteLivingPlan } from '../data/livingPlanRepository';
import { decideLivingPlanActivation } from '../domain/living-plan-promotion';

export type LivingPlanReconciliationResult = { outcome: 'promoted' | 'held' | 'no_op' | 'blocked' | 'disabled' | 'not_ready'; versionId?: string; activationPeriodId?: string; reason?: string; hasUsablePlan?: boolean };
export type LivingPlanOverridePreview =
  | {
      outcome: 'ready' | 'no_op';
      cause?: string;
      changes: LivingPlanAllocationChange[];
      before: LivingPlanAdjustmentFacts | null;
      after: LivingPlanAdjustmentFacts;
      recentSpending: CompletedCategorySpendingGuidepost | null;
      currentSource: LivingPlanAllocation['source'] | null;
    }
  | {
      outcome: 'blocked' | 'not_ready';
      changes: LivingPlanAllocationChange[];
      reason?: string;
    };

export type LivingPlanPlanChangePreview = {
  categoryId: string;
  amountCents: number;
  fundingRhythm?: 'monthly' | 'reserve';
  expectedNeedCents?: number | null;
  expectedNeedDueMonth?: string | null;
};

export async function reconcileLivingPlan(client: SupabaseClient, trigger: LivingPlanTrigger): Promise<LivingPlanReconciliationResult> {
  return evaluateLivingPlan(client, trigger) as Promise<LivingPlanReconciliationResult>;
}

export async function previewLivingPlanOverride(
  client: SupabaseClient,
  categoryId: string,
  amountCents: number,
  funding?: Omit<LivingPlanPlanChangePreview, 'categoryId' | 'amountCents'>,
): Promise<LivingPlanOverridePreview> {
  const result = await evaluateLivingPlan(client, 'override_changed', { categoryId, amountCents, ...funding });
  return { changes: [], ...result } as LivingPlanOverridePreview;
}

export async function commitLivingPlanCategoryChange(client: SupabaseClient, input: {
  planCategoryId: string;
  allocationCategoryId: string;
  amountCents: number;
  fundingRhythm: 'monthly' | 'reserve';
  expectedNeedCents: number | null;
  expectedNeedDueMonth: string | null;
}): Promise<LivingPlanReconciliationResult> {
  return evaluateLivingPlan(
    client,
    'category_changed',
    {
      categoryId: input.allocationCategoryId,
      amountCents: input.amountCents,
      fundingRhythm: input.fundingRhythm,
      expectedNeedCents: input.expectedNeedCents,
      expectedNeedDueMonth: input.expectedNeedDueMonth,
    },
    input,
  ) as Promise<LivingPlanReconciliationResult>;
}

async function evaluateLivingPlan(
  client: SupabaseClient,
  trigger: LivingPlanTrigger,
  hypotheticalOverride?: LivingPlanPlanChangePreview,
  committedCategoryChange?: {
    planCategoryId: string;
    allocationCategoryId: string;
    amountCents: number;
    fundingRhythm: 'monthly' | 'reserve';
    expectedNeedCents: number | null;
    expectedNeedDueMonth: string | null;
  },
): Promise<LivingPlanReconciliationResult | LivingPlanOverridePreview> {
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) return { outcome: 'not_ready', reason: 'signed_out' };
  const userId = auth.user.id;
  const [targetResult, transactions, accountResult, forecastResult, overrideResult, connectionResult, categoryResult, productPlanRows, planningBasis, active] = await Promise.all([
    client.from('budget_living_target_intents').select('living_percent').eq('user_id', userId).maybeSingle(),
    collectAllPages(async (from, to) => {
      const { data, error } = await client.from('budget_transactions').select('id,date,direction,amount_cents,name,merchant_name,original_description,budget_id,pending,money_meaning,financial_account_id,personal_finance_category_primary').eq('user_id', userId).order('date', { ascending: true }).order('id', { ascending: true }).range(from, to);
      if (error) throw error;
      return data ?? [];
    }),
    client.from('budget_financial_accounts').select('id,type,subtype').eq('user_id', userId),
    client.from('budget_forecast_settings').select('budget_id,forecast_mode,scheduled_amount_cents').eq('user_id', userId),
    client.from('budget_living_plan_overrides').select('category_id,amount_cents').eq('user_id', userId).eq('active', true),
    client.from('budget_financial_connections').select('last_synced_at,status').eq('user_id', userId),
    client.from('budget_categories').select('id,legacy_budget_id,slug').eq('user_id', userId).eq('status', 'active'),
    readReconciliationPlans(client, userId),
    readPlanningBasisOverride(client, userId),
    getActiveLivingPlan(client),
  ]);
  const firstError = [targetResult.error, accountResult.error, forecastResult.error, overrideResult.error, connectionResult.error, categoryResult.error].find(Boolean);
  if (firstError) throw firstError;
  if (!targetResult.data || !transactions.length) return { outcome: 'not_ready', reason: 'target_or_history_missing', hasUsablePlan: Boolean(active) };
  const accounts = new Map((accountResult.data ?? []).map((row) => [row.id, row]));
  const connectionDates = (connectionResult.data ?? []).filter((row) => row.status !== 'error' && row.last_synced_at).map((row) => row.last_synced_at as string).sort();
  const categoryKeys = new Map((categoryResult.data ?? []).map((row) => [row.id, row.legacy_budget_id || row.slug]));
  const productPlans = productPlanRows.map((row) => ({ ...row, budgetId: categoryKeys.get(row.category_id) })).filter((row) => row.budgetId);
  const overrides = (overrideResult.data ?? [])
    .filter((row) => row.category_id !== hypotheticalOverride?.categoryId)
    .map((row) => ({ categoryId: row.category_id, amountCents: Number(row.amount_cents) }));
  if (hypotheticalOverride) overrides.push({ categoryId: hypotheticalOverride.categoryId, amountCents: hypotheticalOverride.amountCents });
  const evidenceTransactions: LivingPlanEvidenceTransaction[] = transactions.map((row) => {
    const account = accounts.get(row.financial_account_id);
    return {
      id: row.id, date: row.date, direction: row.direction, amountCents: row.amount_cents,
      description: row.merchant_name || row.name || row.original_description || 'Unknown source', budgetId: row.budget_id,
      pending: row.pending, moneyMeaning: row.money_meaning, accountType: account ? `${account.type ?? ''} ${account.subtype ?? ''}` : null,
      providerCategory: row.personal_finance_category_primary,
    };
  });
  const evidence = buildLivingPlanEvidence({
    nowIso: new Date().toISOString(), lastSyncedAtIso: connectionDates.at(-1) ?? null,
    transactions: evidenceTransactions,
    forecastSettings: [...(forecastResult.data ?? []).map((row) => ({ budgetId: row.budget_id, mode: row.forecast_mode, scheduledAmountCents: row.scheduled_amount_cents })), ...productPlans.map((row) => ({ budgetId: row.budgetId!, mode: row.forecast_mode, scheduledAmountCents: row.scheduled_amount_cents }))],
    existingPlanAmounts: productPlans.map((row) => {
      const preview = row.budgetId === hypotheticalOverride?.categoryId ? hypotheticalOverride : undefined;
      const expectedNeedCents = preview && 'expectedNeedCents' in preview
        ? preview.expectedNeedCents
        : row.expected_need_cents;
      const expectedNeedDueMonth = preview && 'expectedNeedDueMonth' in preview
        ? preview.expectedNeedDueMonth
        : row.expected_need_due_month;
      return {
        categoryId: row.budgetId!,
        amountCents: row.base_budget_cents,
        starterWeight: Number(row.starter_weight ?? 0),
        fundingRhythm: preview?.fundingRhythm
          ? preview.fundingRhythm
          : row.funding_rhythm === 'reserve' ? 'reserve' as const : 'monthly' as const,
        priorReserveCents: Number(row.reserve_balance_cents ?? 0),
        expectedNeed: expectedNeedCents != null && expectedNeedDueMonth
          ? { amountCents: Number(expectedNeedCents), dueMonth: expectedNeedDueMonth }
          : null,
      };
    }),
    overrides,
  });
  const resourceReceipts = evidence.sourceInputs.map(classifyPlanningIncomeSource);
  if (!hypotheticalOverride) {
    const { error: deactivateSourceError } = await client.from('budget_planning_income_sources').update({ active: false, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('active', true);
    if (deactivateSourceError) throw deactivateSourceError;
    const { error: sourceReceiptError } = await client.from('budget_planning_income_sources').upsert(resourceReceipts.map((receipt) => ({
      user_id: userId, source_key: receipt.sourceKey, cashflow_meaning: receipt.cashflowMeaning,
      planning_role: receipt.planningRole, confidence: receipt.confidence, expected_monthly_cents: receipt.expectedMonthlyCents,
      evidence: receipt.evidence, evidence_hash: evidence.evidenceHash, active: true, policy_version: 'planning-income-v1', user_confirmed: false, updated_at: new Date().toISOString(),
    })), { onConflict: 'user_id,source_key,policy_version' });
    if (sourceReceiptError) throw sourceReceiptError;
  }
  const candidate = projectLivingPlanCandidate({
    periodId: new Date().toISOString().slice(0, 7), livingPercent: targetResult.data.living_percent,
    allocatorVersion: 'living-plan-v2', evidenceHash: evidence.evidenceHash, syncFresh: evidence.syncFresh,
    resourceReceipts, categories: evidence.categories, priorResourceBasisCents: active?.resourceBasisCents,
    evidenceConfidence: evidence.evidenceConfidence,
    userResourceBasisCents: planningBasis,
  });
  if (candidate.status === 'blocked' || candidate.status === 'missing_resource') return { outcome: 'blocked', reason: candidate.status, hasUsablePlan: Boolean(active) };
  const comparison = active
    ? compareLivingPlanVersions({ prior: active, candidate, trigger })
    : { outcome: 'material' as const, materialReasons: ['initial_plan'], changedCategoryIds: candidate.allocations.map((row) => row.categoryId), reversible: false };
  const previewFacts = hypotheticalOverride ? {
    before: active ? toAdjustmentFacts(active) : null,
    after: toAdjustmentFacts(candidate),
    recentSpending: getCompletedCategorySpendingGuidepost({
      nowIso: new Date().toISOString(),
      categoryId: hypotheticalOverride.categoryId,
      transactions: evidenceTransactions,
    }),
    currentSource: active?.allocations.find((row) => row.categoryId === hypotheticalOverride.categoryId)?.source ?? null,
  } : null;
  if (comparison.outcome === 'no_op') return committedCategoryChange
    ? { outcome: 'no_op' }
    : hypotheticalOverride ? { outcome: 'no_op', changes: [], ...previewFacts! } : { outcome: 'no_op' };
  if (hypotheticalOverride) {
    if (committedCategoryChange) {
      const cause = causeFor(trigger, comparison.changedCategoryIds.length);
      const versionId = await applyGovernedCategoryPlanChange(client, {
        ...committedCategoryChange,
        expectedActiveVersionId: active?.versionId ?? null,
        candidate,
        comparison,
        trigger,
        cause,
      });
      return { outcome: 'promoted', versionId };
    }
    return {
      outcome: 'ready',
      cause: causeFor(trigger, comparison.changedCategoryIds.length),
      changes: getLivingPlanAllocationChanges(active, candidate, comparison.changedCategoryIds),
      ...previewFacts!,
    };
  }
  const cause = causeFor(trigger, comparison.changedCategoryIds.length);
  const activation = decideLivingPlanActivation({
    trigger,
    candidatePeriodId: candidate.periodId,
    activePeriodId: active?.periodId ?? null,
  });
  if (activation.action === 'hold_for_period') {
    await holdLivingPlanCandidate(client, {
      activationPeriodId: activation.activationPeriodId,
      candidate,
      trigger,
      cause,
    });
    return { outcome: 'held', activationPeriodId: activation.activationPeriodId, hasUsablePlan: Boolean(active) };
  }
  try {
    const versionId = await promoteLivingPlan(client, { expectedActiveVersionId: active?.versionId ?? null, candidate, comparison, trigger, cause });
    return { outcome: 'promoted', versionId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes('promotion disabled')) return { outcome: 'disabled', reason: message };
    throw error;
  }
}

function toAdjustmentFacts(plan: {
  livingPercent: number;
  resourceBasisCents: number;
  targetCents: number;
  plannedCents: number;
  unassignedCents: number;
  overTargetCents: number;
}): LivingPlanAdjustmentFacts {
  return {
    livingPercent: plan.livingPercent,
    resourceBasisCents: plan.resourceBasisCents,
    targetCents: plan.targetCents,
    plannedCents: plan.plannedCents,
    unassignedCents: plan.unassignedCents,
    overTargetCents: plan.overTargetCents,
  };
}

function causeFor(trigger: LivingPlanTrigger, changedCount: number): string {
  if (trigger === 'account_scope_changed') return `An account change updated ${changedCount} monthly budget${changedCount === 1 ? '' : 's'}.`;
  if (trigger === 'target_changed') return `Your living target updated ${changedCount} monthly budget${changedCount === 1 ? '' : 's'}.`;
  if (trigger === 'override_changed') return 'An amount you set was preserved while flexible budgets adjusted.';
  if (trigger === 'planning_basis_changed') return `Your monthly planning amount updated ${changedCount} category contribution${changedCount === 1 ? '' : 's'}.`;
  if (trigger === 'category_changed') return `A category plan change updated ${changedCount} category contribution${changedCount === 1 ? '' : 's'}.`;
  if (trigger === 'period_rollover') return 'New month history refreshed your flexible budgets.';
  return changedCount > 0 ? `New account history updated ${changedCount} monthly budget${changedCount === 1 ? '' : 's'}.` : 'New account history refreshed your monthly budgets.';
}

type ReconciliationPlanRow = {
  category_id: string;
  base_budget_cents: number;
  forecast_mode: string;
  scheduled_amount_cents: number | null;
  starter_weight?: number | null;
  funding_rhythm?: string | null;
  reserve_balance_cents?: number | null;
  expected_need_cents?: number | null;
  expected_need_due_month?: string | null;
};

async function readReconciliationPlans(client: SupabaseClient, userId: string): Promise<ReconciliationPlanRow[]> {
  const expanded = await client.from('budget_plans')
    .select('category_id,base_budget_cents,forecast_mode,scheduled_amount_cents,starter_weight,funding_rhythm,reserve_balance_cents,expected_need_cents,expected_need_due_month')
    .eq('user_id', userId).eq('status', 'active');
  if (!expanded.error) return expanded.data ?? [];
  const missing = expanded.error.code === 'PGRST204'
    || expanded.error.message?.includes('funding_rhythm')
    || expanded.error.message?.includes('starter_weight');
  if (!missing) throw expanded.error;
  const legacy = await client.from('budget_plans')
    .select('category_id,base_budget_cents,forecast_mode,scheduled_amount_cents')
    .eq('user_id', userId).eq('status', 'active');
  if (legacy.error) throw legacy.error;
  return legacy.data ?? [];
}

async function readPlanningBasisOverride(client: SupabaseClient, userId: string): Promise<number | undefined> {
  const result = await client.from('budget_planning_basis_overrides')
    .select('monthly_basis_cents').eq('user_id', userId).eq('active', true).maybeSingle();
  if (result.error) {
    const missing = result.error.code === 'PGRST205'
      || result.error.message?.includes('budget_planning_basis_overrides');
    if (missing) return undefined;
    throw result.error;
  }
  const value = Number(result.data?.monthly_basis_cents);
  return Number.isSafeInteger(value) && value > 0 ? value : undefined;
}
