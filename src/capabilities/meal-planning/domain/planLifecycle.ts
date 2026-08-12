export type PlanLifecycle = 'idea' | 'sent' | 'ready';

type PlanOrderCandidate = {
  id: string;
  lifecycle: PlanLifecycle;
  voteCount: number;
  createdAt: string;
};

const lifecycleRank: Record<PlanLifecycle, number> = { ready: 0, sent: 1, idea: 2 };

export function sortPlanCandidates<T extends PlanOrderCandidate>(candidates: readonly T[]): T[] {
  return [...candidates].sort((left, right) =>
    lifecycleRank[left.lifecycle] - lifecycleRank[right.lifecycle]
    || right.voteCount - left.voteCount
    || Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
}

export function reconcilePlanCandidateOrder<T extends PlanOrderCandidate>(
  currentIds: readonly string[],
  candidates: readonly T[],
  reason: 'open' | 'lifecycle' | 'reaction',
): string[] {
  const sortedIds = sortPlanCandidates(candidates).map((candidate) => candidate.id);
  if (reason !== 'reaction' || currentIds.length === 0) return sortedIds;
  const available = new Set(sortedIds);
  const retained = currentIds.filter((id) => available.has(id));
  const retainedSet = new Set(retained);
  return [...retained, ...sortedIds.filter((id) => !retainedSet.has(id))];
}

export function groupPlanCandidates<T extends PlanOrderCandidate>(candidates: readonly T[]) {
  const sorted = sortPlanCandidates(candidates);
  return (['ready', 'sent', 'idea'] as const).flatMap((lifecycle) => {
    const items = sorted.filter((candidate) => candidate.lifecycle === lifecycle);
    return items.length ? [{ lifecycle, items }] : [];
  });
}
