export type HardPassReviewInput = {
  selectedCandidateIds: readonly string[];
  candidates: readonly { id: string; hardPassOverriddenAt: string | null }[];
  hardPasses: readonly { candidateId: string; createdAt: string }[];
};

export function resolveHardPassReview(input: HardPassReviewInput): string[] {
  const selected = new Set(input.selectedCandidateIds);
  const overrideByCandidate = new Map(
    input.candidates.map((candidate) => [candidate.id, candidate.hardPassOverriddenAt]),
  );
  const latestHardPassByCandidate = new Map<string, string>();

  for (const hardPass of input.hardPasses) {
    if (!selected.has(hardPass.candidateId)) continue;
    const current = latestHardPassByCandidate.get(hardPass.candidateId);
    if (!current || hardPass.createdAt > current) {
      latestHardPassByCandidate.set(hardPass.candidateId, hardPass.createdAt);
    }
  }

  return input.selectedCandidateIds.filter((candidateId) => {
    const latestHardPass = latestHardPassByCandidate.get(candidateId);
    if (!latestHardPass) return false;
    const overriddenAt = overrideByCandidate.get(candidateId);
    return !overriddenAt || latestHardPass > overriddenAt;
  });
}
