import type { SupabaseClient } from '@supabase/supabase-js';
import type { LivingPlanCandidate, LivingPlanAllocation } from '../domain/living-plan';
import type { LivingPlanComparison, LivingPlanTrigger } from '../domain/living-plan-changes';
import type { LivingTargetIntent } from '../domain/living-target';
import type { LivingPlanReceiptFacts } from '../domain/living-plan-receipt';

export type ActiveLivingPlan = LivingPlanCandidate & {
  versionId: string;
  predecessorVersionId: string | null;
  receipt: LivingPlanReceipt | null;
};

export type LivingPlanReceipt = {
  id: string;
  planVersionId: string;
  priorVersionId: string | null;
  trigger: string;
  outcome: 'initial' | 'routine' | 'material' | 'reversal';
  cause: string;
  changedCategoryIds: string[];
  materialReasons: string[];
  seenAtIso: string | null;
};

export type LivingPlanReceiptDetail = LivingPlanReceipt & {
  activeVersionId: string;
  before: LivingPlanReceiptFacts | null;
  after: LivingPlanReceiptFacts;
  changed: Array<{ categoryId: string; beforeCents: number | null; afterCents: number | null }>;
  reversible: boolean;
};

export type LivingPlanSettingsSnapshot = {
  target: LivingTargetIntent | null;
  planningBasis: { monthlyBasisCents: number; provenance: 'user_set'; updatedAtIso: string } | null;
  promotionEnabled: boolean;
  active: ActiveLivingPlan | null;
  receipts: LivingPlanReceipt[];
};

export async function getLivingPlanSettings(client: SupabaseClient): Promise<LivingPlanSettingsSnapshot> {
  const userId = await requireUserId(client);
  const [targetResult, configResult, planningBasis, active, receiptResult] = await Promise.all([
    client.from('budget_living_target_intents').select('living_percent,provenance,updated_at').eq('user_id', userId).maybeSingle(),
    client.from('budget_living_plan_config').select('promotion_enabled').eq('user_id', userId).maybeSingle(),
    getOptionalPlanningBasis(client, userId),
    getActiveLivingPlan(client),
    client.from('budget_living_plan_receipts').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
  ]);
  const firstError = [targetResult.error, configResult.error, receiptResult.error].find(Boolean);
  if (firstError) throw firstError;
  return {
    target: targetResult.data ? {
      livingPercent: Number(targetResult.data.living_percent),
      provenance: targetResult.data.provenance,
      updatedAtIso: targetResult.data.updated_at,
    } : null,
    planningBasis,
    promotionEnabled: configResult.data?.promotion_enabled === true,
    active,
    receipts: (receiptResult.data ?? []).map(mapReceipt),
  };
}

export async function savePlanningBasisOverride(client: SupabaseClient, monthlyBasisCents: number): Promise<void> {
  if (!Number.isSafeInteger(monthlyBasisCents) || monthlyBasisCents <= 0) {
    throw new Error('Enter a valid monthly planning amount.');
  }
  const userId = await requireUserId(client);
  const { error } = await client.from('budget_planning_basis_overrides').upsert({
    user_id: userId,
    monthly_basis_cents: monthlyBasisCents,
    active: true,
    provenance: 'user_set',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function holdLivingPlanCandidate(client: SupabaseClient, input: {
  activationPeriodId: string;
  candidate: LivingPlanCandidate;
  trigger: LivingPlanTrigger;
  cause: string;
}): Promise<void> {
  const userId = await requireUserId(client);
  const { error } = await client.from('budget_held_living_plan_candidates').upsert({
    user_id: userId,
    activation_period_id: input.activationPeriodId,
    candidate: input.candidate,
    trigger: input.trigger,
    cause: input.cause,
    evidence_hash: input.candidate.evidenceHash,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function saveLivingPlanPromotionEnabled(client: SupabaseClient, enabled: boolean): Promise<void> {
  const userId = await requireUserId(client);
  const { error } = await client.from('budget_living_plan_config').upsert({
    user_id: userId,
    promotion_enabled: enabled,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function saveLivingTargetIntent(client: SupabaseClient, intent: LivingTargetIntent): Promise<void> {
  const userId = await requireUserId(client);
  const { error } = await client.from('budget_living_target_intents').upsert({
    user_id: userId,
    living_percent: intent.livingPercent,
    provenance: intent.provenance,
    updated_at: intent.updatedAtIso,
  });
  if (error) throw error;
}

export async function getActiveLivingPlan(client: SupabaseClient): Promise<ActiveLivingPlan | null> {
  const userId = await requireUserId(client);
  const { data: pointer, error: pointerError } = await client
    .from('budget_active_living_plans').select('plan_version_id').eq('user_id', userId).maybeSingle();
  if (pointerError) throw pointerError;
  if (!pointer?.plan_version_id) return null;
  const [versionResult, componentsResult, receiptResult] = await Promise.all([
    client.from('budget_living_plan_versions').select('*').eq('id', pointer.plan_version_id).single(),
    client.from('budget_living_plan_components').select('*').eq('plan_version_id', pointer.plan_version_id).order('category_id'),
    client.from('budget_living_plan_receipts').select('*').eq('plan_version_id', pointer.plan_version_id).maybeSingle(),
  ]);
  if (versionResult.error) throw versionResult.error;
  if (componentsResult.error) throw componentsResult.error;
  if (receiptResult.error) throw receiptResult.error;
  const row = versionResult.data;
  const allocations: LivingPlanAllocation[] = (componentsResult.data ?? []).map((component) => ({
    categoryId: component.category_id, amountCents: Number(component.amount_cents), fixedCents: Number(component.fixed_cents),
    overrideCents: Number(component.override_cents), flexibleCents: Number(component.flexible_cents), exposureCents: Number(component.exposure_cents), source: component.source,
    fundingRhythm: component.funding_rhythm === 'reserve' ? 'reserve' : 'monthly',
    priorReserveCents: Number(component.prior_reserve_cents ?? 0),
    expectedNeed: component.expected_need_cents != null && component.expected_need_due_month
      ? { amountCents: Number(component.expected_need_cents), dueMonth: component.expected_need_due_month }
      : null,
  }));
  return {
    versionId: row.id, predecessorVersionId: row.predecessor_version_id, periodId: row.period_id,
    livingPercent: row.living_percent, allocatorVersion: row.allocator_version, evidenceHash: row.evidence_hash,
    candidateHash: row.candidate_hash, status: row.status, resourceBasisCents: Number(row.resource_basis_cents),
    targetCents: Number(row.target_cents), plannedCents: Number(row.planned_cents), unassignedCents: Number(row.unassigned_cents),
    overTargetCents: Number(row.over_target_cents), allocations, receipt: receiptResult.data ? mapReceipt(receiptResult.data) : null,
  };
}

export async function promoteLivingPlan(client: SupabaseClient, input: {
  expectedActiveVersionId: string | null; candidate: LivingPlanCandidate; comparison: LivingPlanComparison; trigger: LivingPlanTrigger; cause: string;
}): Promise<string> {
  const outcome = input.expectedActiveVersionId == null ? 'initial' : input.comparison.outcome;
  if (outcome === 'no_op' || outcome === 'blocked') throw new Error(`Cannot promote a ${outcome} living plan.`);
  const { data, error } = await client.rpc('promote_budget_living_plan', {
    expected_active_version_id: input.expectedActiveVersionId,
    candidate: input.candidate,
    components: input.candidate.allocations,
    receipt: { trigger: input.trigger, outcome, cause: input.cause, changedCategoryIds: input.comparison.changedCategoryIds, materialReasons: input.comparison.materialReasons },
  });
  if (error) throw error;
  return String(data);
}

export async function applyGovernedCategoryPlanChange(client: SupabaseClient, input: {
  planCategoryId: string;
  allocationCategoryId: string;
  amountCents: number;
  fundingRhythm: 'monthly' | 'reserve';
  expectedNeedCents: number | null;
  expectedNeedDueMonth: string | null;
  expectedActiveVersionId: string | null;
  candidate: LivingPlanCandidate;
  comparison: LivingPlanComparison;
  trigger: LivingPlanTrigger;
  cause: string;
}): Promise<string> {
  const outcome = input.expectedActiveVersionId == null ? 'initial' : input.comparison.outcome;
  if (outcome === 'no_op' || outcome === 'blocked') {
    throw new Error(`Cannot commit a ${outcome} governed category plan.`);
  }
  const { data, error } = await client.rpc('apply_governed_category_plan_change', {
    p_plan_category_id: input.planCategoryId,
    p_allocation_category_id: input.allocationCategoryId,
    p_budget_cents: input.amountCents,
    p_funding_rhythm: input.fundingRhythm,
    p_expected_need_cents: input.expectedNeedCents,
    p_expected_need_due_month: input.expectedNeedDueMonth,
    expected_active_version_id: input.expectedActiveVersionId,
    candidate: input.candidate,
    components: input.candidate.allocations,
    receipt: {
      trigger: input.trigger,
      outcome,
      cause: input.cause,
      changedCategoryIds: input.comparison.changedCategoryIds,
      materialReasons: input.comparison.materialReasons,
    },
  });
  if (error) throw error;
  return String(data);
}

export async function reverseLivingPlan(client: SupabaseClient, activeVersionId: string, restoreVersionId: string): Promise<string> {
  const { data, error } = await client.rpc('reverse_budget_living_plan', { expected_active_version_id: activeVersionId, restore_version_id: restoreVersionId });
  if (error) throw error;
  return String(data);
}

export async function getLivingPlanReceiptDetail(client: SupabaseClient, receiptId: string): Promise<LivingPlanReceiptDetail> {
  const userId = await requireUserId(client);
  const { data: receiptRow, error: receiptError } = await client.from('budget_living_plan_receipts').select('*').eq('id', receiptId).eq('user_id', userId).single();
  if (receiptError) throw receiptError;
  const { data: pointer, error: pointerError } = await client.from('budget_active_living_plans').select('plan_version_id').eq('user_id', userId).single();
  if (pointerError) throw pointerError;
  const versionIds = [receiptRow.prior_version_id, receiptRow.plan_version_id].filter(Boolean);
  const [componentResult, versionResult] = await Promise.all([
    client.from('budget_living_plan_components').select('plan_version_id,category_id,amount_cents').in('plan_version_id', versionIds),
    client.from('budget_living_plan_versions').select('id,resource_basis_cents,target_cents,planned_cents,unassigned_cents').in('id', versionIds),
  ]);
  const { data: rows, error: rowsError } = componentResult;
  if (rowsError) throw rowsError;
  if (versionResult.error) throw versionResult.error;
  const before = new Map((rows ?? []).filter((row) => row.plan_version_id === receiptRow.prior_version_id).map((row) => [row.category_id, Number(row.amount_cents)]));
  const after = new Map((rows ?? []).filter((row) => row.plan_version_id === receiptRow.plan_version_id).map((row) => [row.category_id, Number(row.amount_cents)]));
  const ids = receiptRow.changed_category_ids?.length ? receiptRow.changed_category_ids : [...new Set([...before.keys(), ...after.keys()])].filter((id) => before.get(id) !== after.get(id));
  const factsById = new Map((versionResult.data ?? []).map((row) => [row.id, mapReceiptFacts(row)]));
  const afterFacts = factsById.get(receiptRow.plan_version_id);
  if (!afterFacts) throw new Error('The updated budget plan is unavailable.');
  return { ...mapReceipt(receiptRow), activeVersionId: pointer.plan_version_id, before: receiptRow.prior_version_id ? factsById.get(receiptRow.prior_version_id) ?? null : null, after: afterFacts, changed: ids.map((categoryId: string) => ({ categoryId, beforeCents: before.get(categoryId) ?? null, afterCents: after.get(categoryId) ?? null })), reversible: receiptRow.outcome === 'material' && pointer.plan_version_id === receiptRow.plan_version_id && Boolean(receiptRow.prior_version_id) };
}

export async function markLivingPlanReceiptSeen(client: SupabaseClient, receiptId: string): Promise<void> {
  const { error } = await client.rpc('mark_budget_living_plan_receipt_seen', { receipt_id: receiptId });
  if (error) throw error;
}

export async function saveLivingPlanOverride(client: SupabaseClient, categoryId: string, amountCents: number): Promise<void> {
  const userId = await requireUserId(client);
  const { error } = await client.from('budget_living_plan_overrides').upsert({ user_id: userId, category_id: categoryId, amount_cents: Math.max(0, Math.round(amountCents)), active: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id,category_id' });
  if (error) throw error;
}

function mapReceipt(row: any): LivingPlanReceipt {
  return { id: row.id, planVersionId: row.plan_version_id, priorVersionId: row.prior_version_id, trigger: row.trigger, outcome: row.outcome, cause: row.cause, changedCategoryIds: row.changed_category_ids ?? [], materialReasons: row.material_reasons ?? [], seenAtIso: row.seen_at };
}

function mapReceiptFacts(row: any): LivingPlanReceiptFacts {
  return { resourceBasisCents: Number(row.resource_basis_cents), targetCents: Number(row.target_cents), plannedCents: Number(row.planned_cents), unassignedCents: Number(row.unassigned_cents) };
}

async function getOptionalPlanningBasis(
  client: SupabaseClient,
  userId: string,
): Promise<LivingPlanSettingsSnapshot['planningBasis']> {
  const { data, error } = await client
    .from('budget_planning_basis_overrides')
    .select('monthly_basis_cents,provenance,updated_at')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();
  if (error) {
    const missing = error.code === 'PGRST205'
      || error.message?.includes('budget_planning_basis_overrides');
    if (missing) return null;
    throw error;
  }
  return data ? {
    monthlyBasisCents: Number(data.monthly_basis_cents),
    provenance: 'user_set',
    updatedAtIso: data.updated_at,
  } : null;
}

async function requireUserId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Sign in to use automatic living plans.');
  return data.user.id;
}
