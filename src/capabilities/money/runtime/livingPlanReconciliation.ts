import type { SupabaseClient } from '@supabase/supabase-js';
import { buildLivingPlanEvidence, getCompletedCategorySpendingGuidepost, type CompletedCategorySpendingGuidepost, type LivingPlanEvidenceTransaction } from '../domain/living-plan-evidence';
import { collectAllPages } from '../domain/living-plan-pagination';
import { projectLivingPlanCandidate, type LivingPlanAllocation } from '../domain/living-plan';
import type { LivingPlanAdjustmentFacts } from '../domain/living-plan-adjustment';
import { compareLivingPlanVersions, getLivingPlanAllocationChanges, type LivingPlanAllocationChange, type LivingPlanTrigger } from '../domain/living-plan-changes';
import { classifyPlanningIncomeSource } from '../domain/planning-income';
import { getActiveLivingPlan, promoteLivingPlan } from '../data/livingPlanRepository';

export type LivingPlanReconciliationResult = { outcome: 'promoted' | 'no_op' | 'blocked' | 'disabled' | 'not_ready'; versionId?: string; reason?: string; hasUsablePlan?: boolean };
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

export async function reconcileLivingPlan(client: SupabaseClient, trigger: LivingPlanTrigger): Promise<LivingPlanReconciliationResult> {
  return evaluateLivingPlan(client, trigger) as Promise<LivingPlanReconciliationResult>;
}

export async function previewLivingPlanOverride(client: SupabaseClient, categoryId: string, amountCents: number): Promise<LivingPlanOverridePreview> {
  const result = await evaluateLivingPlan(client, 'override_changed', { categoryId, amountCents });
  return { changes: [], ...result } as LivingPlanOverridePreview;
}

async function evaluateLivingPlan(
  client: SupabaseClient,
  trigger: LivingPlanTrigger,
  hypotheticalOverride?: { categoryId: string; amountCents: number },
): Promise<LivingPlanReconciliationResult | LivingPlanOverridePreview> {
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) return { outcome: 'not_ready', reason: 'signed_out' };
  const userId = auth.user.id;
  const [targetResult, transactions, accountResult, forecastResult, overrideResult, connectionResult, categoryResult, planResult, active] = await Promise.all([
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
    client.from('budget_plans').select('category_id,base_budget_cents,forecast_mode,scheduled_amount_cents').eq('user_id', userId).eq('status', 'active'),
    getActiveLivingPlan(client),
  ]);
  const firstError = [targetResult.error, accountResult.error, forecastResult.error, overrideResult.error, connectionResult.error, categoryResult.error, planResult.error].find(Boolean);
  if (firstError) throw firstError;
  if (!targetResult.data || !transactions.length) return { outcome: 'not_ready', reason: 'target_or_history_missing', hasUsablePlan: Boolean(active) };
  const accounts = new Map((accountResult.data ?? []).map((row) => [row.id, row]));
  const connectionDates = (connectionResult.data ?? []).filter((row) => row.status !== 'error' && row.last_synced_at).map((row) => row.last_synced_at as string).sort();
  const categoryKeys = new Map((categoryResult.data ?? []).map((row) => [row.id, row.legacy_budget_id || row.slug]));
  const productPlans = (planResult.data ?? []).map((row) => ({ ...row, budgetId: categoryKeys.get(row.category_id) })).filter((row) => row.budgetId);
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
    existingPlanAmounts: productPlans.map((row) => ({ categoryId: row.budgetId!, amountCents: row.base_budget_cents })),
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
    allocatorVersion: 'living-plan-v1', evidenceHash: evidence.evidenceHash, syncFresh: evidence.syncFresh,
    resourceReceipts, categories: evidence.categories, priorResourceBasisCents: active?.resourceBasisCents,
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
  if (comparison.outcome === 'no_op') return hypotheticalOverride ? { outcome: 'no_op', changes: [], ...previewFacts! } : { outcome: 'no_op' };
  if (hypotheticalOverride) {
    return {
      outcome: 'ready',
      cause: causeFor(trigger, comparison.changedCategoryIds.length),
      changes: getLivingPlanAllocationChanges(active, candidate, comparison.changedCategoryIds),
      ...previewFacts!,
    };
  }
  try {
    const versionId = await promoteLivingPlan(client, { expectedActiveVersionId: active?.versionId ?? null, candidate, comparison, trigger, cause: causeFor(trigger, comparison.changedCategoryIds.length) });
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
  if (trigger === 'period_rollover') return 'New month history refreshed your flexible budgets.';
  return changedCount > 0 ? `New account history updated ${changedCount} monthly budget${changedCount === 1 ? '' : 's'}.` : 'New account history refreshed your monthly budgets.';
}
