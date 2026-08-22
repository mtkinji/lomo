export type PlanLifecycle = 'idea' | 'sent' | 'ready';

type PlanOrderCandidate = {
  id: string;
  lifecycle: PlanLifecycle;
  voteCount: number;
  downvoteCount?: number;
  createdAt: string;
};

const lifecycleRank: Record<PlanLifecycle, number> = { ready: 0, sent: 1, idea: 2 };

export function getPlanLifecycleSignature<T extends Pick<PlanOrderCandidate, 'id' | 'lifecycle'>>(
  candidates: readonly T[],
): string {
  return candidates
    .map((candidate) => `${candidate.id}:${candidate.lifecycle}`)
    .sort()
    .join('|');
}

export function getPlanOrderSignature<T extends PlanOrderCandidate>(candidates: readonly T[]): string {
  return candidates
    .map((candidate) => [
      candidate.id,
      candidate.lifecycle,
      candidate.voteCount,
      candidate.downvoteCount ?? 0,
      candidate.createdAt,
    ].join(':'))
    .sort()
    .join('|');
}

export function sortPlanCandidates<T extends PlanOrderCandidate>(candidates: readonly T[]): T[] {
  return [...candidates].sort((left, right) =>
    lifecycleRank[left.lifecycle] - lifecycleRank[right.lifecycle]
    || right.voteCount - left.voteCount
    || (left.downvoteCount ?? 0) - (right.downvoteCount ?? 0)
    || Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
}

export function reconcilePlanCandidateOrder<T extends PlanOrderCandidate>(
  currentIds: readonly string[],
  candidates: readonly T[],
  reason: 'open' | 'lifecycle' | 'reaction',
): string[] {
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  const hasCompleteCurrentOrder = currentIds.length === candidates.length
    && new Set(currentIds).size === currentIds.length
    && currentIds.every((id) => candidateIds.has(id));
  if (reason === 'lifecycle' && hasCompleteCurrentOrder) return [...currentIds];
  return sortPlanCandidates(candidates).map((candidate) => candidate.id);
}

export function groupPlanCandidates<T extends PlanOrderCandidate>(candidates: readonly T[]) {
  const sorted = sortPlanCandidates(candidates);
  return (['ready', 'sent', 'idea'] as const).flatMap((lifecycle) => {
    const items = sorted.filter((candidate) => candidate.lifecycle === lifecycle);
    return items.length ? [{ lifecycle, items }] : [];
  });
}
