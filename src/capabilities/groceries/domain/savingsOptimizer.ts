import { parseSavingsEvidence, savingsActionLabel, type SavingsEvidence, type SavingsOption } from './savingsContracts';

export type SavingsCandidate = { id: string; title: string; productId: string; store: string; packageBaseUnits: number; packagePriceCents: number; feeCents: number; evidence: SavingsEvidence[] };
export type SavingsOptimizerInput = { now: string; tripTargetCents: number | null; hasMemberships: string[]; items: Array<{ groceryItemId: string; neededBaseUnits: number; confirmedStockBaseUnits: number; likelyUseBaseUnits: number; storageBaseUnits: number; candidates: SavingsCandidate[] }> };

export function optimizeSavings(input: SavingsOptimizerInput): SavingsOption[] {
  const options: Array<SavingsOption & { score: number }> = [];
  for (const item of input.items) {
    const remaining = Math.max(0, item.neededBaseUnits - item.confirmedStockBaseUnits);
    if (remaining === 0) {
      options.push({ id: `no_purchase:${item.groceryItemId}`, groceryItemId: item.groceryItemId, title: 'Use what you have', productId: '', store: 'Home', quantity: 0, baseUnits: 0, baselineCents: 0, netCents: 0, predictedSavingsCents: 0, evidence: [], evidenceObservedAt: input.now, expiresAt: null, nextAction: 'Keep current', assumptions: ['Confirmed stock covers this need'], score: Number.MAX_SAFE_INTEGER });
      continue;
    }
    const valid = item.candidates.flatMap((candidate) => {
      if (!Number.isFinite(candidate.packageBaseUnits) || candidate.packageBaseUnits <= 0 || !Number.isSafeInteger(candidate.packagePriceCents) || candidate.packagePriceCents < 0) return [];
      let evidence: SavingsEvidence[];
      try { evidence = candidate.evidence.map((entry) => parseSavingsEvidence(entry, input.now)); } catch { return []; }
      if (evidence.some((entry) => entry.state === 'expired' || (entry.memberRequired && (!entry.provider || !input.hasMemberships.includes(entry.provider))))) return [];
      const quantity = Math.ceil(remaining / candidate.packageBaseUnits);
      const regularReduction = evidence.filter((entry) => entry.kind !== 'regular_price' && entry.kind !== 'fee').reduce((sum, entry) => sum + entry.amountCents, 0);
      const netCents = Math.max(0, candidate.packagePriceCents * quantity - regularReduction) + candidate.feeCents;
      const equivalentUnitCents = candidate.packagePriceCents / candidate.packageBaseUnits;
      return [{ candidate, evidence, quantity, netCents, equivalentBaselineCents: Math.round(equivalentUnitCents * remaining) }];
    });
    if (!valid.length) continue;
    const baselineCents = Math.max(...valid.map((entry) => entry.equivalentBaselineCents));
    for (const entry of valid) {
      const excess = Math.max(0, entry.quantity * entry.candidate.packageBaseUnits - Math.max(item.likelyUseBaseUnits, remaining));
      const storageOverflow = Math.max(0, entry.quantity * entry.candidate.packageBaseUnits - item.storageBaseUnits);
      const activationCount = entry.evidence.filter((evidence) => evidence.activationRequired && evidence.state !== 'activated').length;
      const storeBurden = entry.candidate.store === 'Primary' ? 0 : 75;
      const burden = Math.round(excess * (entry.candidate.packagePriceCents / entry.candidate.packageBaseUnits) * 0.5) + storageOverflow * 100 + activationCount * 50 + storeBurden;
      const predictedSavingsCents = Math.max(0, baselineCents - entry.netCents);
      const evidenceObservedAt = entry.evidence.map((evidence) => evidence.observedAt).sort().at(-1) ?? input.now;
      const expiry = entry.evidence.flatMap((evidence) => evidence.expiresAt ? [evidence.expiresAt] : []).sort()[0] ?? null;
      const principal = entry.evidence.find((evidence) => evidence.kind !== 'regular_price' && evidence.kind !== 'fee');
      options.push({ id: entry.candidate.id, groceryItemId: item.groceryItemId, title: entry.candidate.title, productId: entry.candidate.productId, store: entry.candidate.store, quantity: entry.quantity, baseUnits: entry.quantity * entry.candidate.packageBaseUnits, baselineCents, netCents: entry.netCents, predictedSavingsCents, evidence: entry.evidence, evidenceObservedAt, expiresAt: expiry, nextAction: principal ? savingsActionLabel(principal) : 'Keep current', assumptions: [entry.candidate.feeCents ? `Includes ${entry.candidate.feeCents}¢ in fees` : '', excess > 0 ? `May leave ${excess} extra units` : '', input.tripTargetCents !== null ? `Compared with ${input.tripTargetCents}¢ trip target` : ''].filter(Boolean), score: predictedSavingsCents - burden });
    }
  }
  return options.sort((a, b) => b.score - a.score || a.netCents - b.netCents || a.id.localeCompare(b.id)).slice(0, 3).map(({ score: _score, ...option }) => option);
}
