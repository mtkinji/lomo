import type { LivingPlanCandidate } from './living-plan';

export type LivingPlanVersion = LivingPlanCandidate & {
  versionId: string;
  predecessorVersionId?: string | null;
  reversalOfVersionId?: string | null;
  createdAtIso?: string;
};

export type LivingPlanTrigger =
  | 'initial_sync'
  | 'account_scope_changed'
  | 'sync_evidence_changed'
  | 'target_changed'
  | 'override_changed'
  | 'category_changed'
  | 'period_rollover'
  | 'allocator_version_changed';

export type LivingPlanComparison = {
  outcome: 'no_op' | 'routine' | 'material' | 'blocked';
  materialReasons: string[];
  changedCategoryIds: string[];
  reversible: boolean;
};

export type LivingPlanAllocationChange = {
  categoryId: string;
  beforeCents: number | null;
  afterCents: number | null;
};

export function getLivingPlanAllocationChanges(
  prior: LivingPlanVersion | null,
  candidate: LivingPlanCandidate,
  changedCategoryIds: string[],
): LivingPlanAllocationChange[] {
  const beforeById = new Map((prior?.allocations ?? []).map((row) => [row.categoryId, row.amountCents]));
  const afterById = new Map(candidate.allocations.map((row) => [row.categoryId, row.amountCents]));
  return changedCategoryIds.map((categoryId) => ({
    categoryId,
    beforeCents: beforeById.get(categoryId) ?? null,
    afterCents: afterById.get(categoryId) ?? null,
  }));
}

export function compareLivingPlanVersions(input: {
  prior: LivingPlanVersion;
  candidate: LivingPlanCandidate;
  trigger: LivingPlanTrigger;
}): LivingPlanComparison {
  if (input.candidate.status === 'blocked' || input.candidate.status === 'missing_resource') {
    return { outcome: 'blocked', materialReasons: [input.candidate.status], changedCategoryIds: [], reversible: false };
  }
  if (input.prior.candidateHash === input.candidate.candidateHash || effectivePlanEqual(input.prior, input.candidate)) {
    return { outcome: 'no_op', materialReasons: [], changedCategoryIds: [], reversible: false };
  }
  const materialReasons: string[] = [];
  if (input.trigger === 'account_scope_changed') materialReasons.push('account_scope_changed');
  if (input.trigger === 'allocator_version_changed') materialReasons.push('allocator_version_changed');
  if (percentDelta(input.prior.targetCents, input.candidate.targetCents) >= 0.05) materialReasons.push('target_moved_5_percent');
  if ((input.prior.overTargetCents > 0) !== (input.candidate.overTargetCents > 0)) materialReasons.push('over_target_state_changed');

  const priorById = new Map(input.prior.allocations.map((row) => [row.categoryId, row]));
  const candidateById = new Map(input.candidate.allocations.map((row) => [row.categoryId, row]));
  const ids = new Set([...priorById.keys(), ...candidateById.keys()]);
  const changedCategoryIds: string[] = [];
  for (const id of [...ids].sort()) {
    const before = priorById.get(id);
    const after = candidateById.get(id);
    if (!before || !after) {
      changedCategoryIds.push(id);
      materialReasons.push('category_identity_changed');
      continue;
    }
    if (before.amountCents === after.amountCents) continue;
    changedCategoryIds.push(id);
    if (before.fixedCents !== after.fixedCents) materialReasons.push('fixed_component_changed');
    const absolute = Math.abs(after.amountCents - before.amountCents);
    if (absolute >= 10000 || (absolute >= 2500 && percentDelta(before.amountCents, after.amountCents) >= 0.2)) {
      materialReasons.push('flexible_amount_material');
    }
  }
  const uniqueReasons = [...new Set(materialReasons)];
  return { outcome: uniqueReasons.length > 0 ? 'material' : 'routine', materialReasons: uniqueReasons, changedCategoryIds, reversible: true };
}

function effectivePlanEqual(prior: LivingPlanVersion, candidate: LivingPlanCandidate): boolean {
  if (prior.periodId !== candidate.periodId || prior.livingPercent !== candidate.livingPercent || prior.resourceBasisCents !== candidate.resourceBasisCents || prior.targetCents !== candidate.targetCents || prior.plannedCents !== candidate.plannedCents || prior.unassignedCents !== candidate.unassignedCents || prior.overTargetCents !== candidate.overTargetCents || prior.status !== candidate.status) return false;
  if (prior.allocations.length !== candidate.allocations.length) return false;
  return prior.allocations.every((before, index) => {
    const after = candidate.allocations[index];
    return before.categoryId === after.categoryId && before.amountCents === after.amountCents && before.fixedCents === after.fixedCents && before.overrideCents === after.overrideCents && before.flexibleCents === after.flexibleCents && before.exposureCents === after.exposureCents && before.source === after.source;
  });
}

export function projectLivingPlanReversal(input: { active: LivingPlanVersion; restore: LivingPlanVersion; nowIso: string }): LivingPlanVersion {
  return {
    ...input.restore,
    versionId: `reversal-${input.nowIso}`,
    candidateHash: `${input.restore.candidateHash}-reversal-${input.active.versionId}`,
    predecessorVersionId: input.active.versionId,
    reversalOfVersionId: input.active.versionId,
    createdAtIso: input.nowIso,
  };
}

function percentDelta(before: number, after: number): number {
  if (before === after) return 0;
  if (before === 0) return 1;
  return Math.abs(after - before) / Math.abs(before);
}
