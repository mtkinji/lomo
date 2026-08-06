export type MealCandidateQuery = 'make_now' | 'almost_there' | 'use_soon' | 'stay_near_target' | 'best_use';
export type PreparedMealCandidate = {
  recipeId: string; recipeVersionId: string; title: string; qualification: 'make_now' | 'almost_there' | 'use_soon' | 'near_target' | 'best_use';
  reason: string; needsStockConfirmation: boolean; confirmedConcepts: string[]; likelyConcepts: string[]; missingConcepts: string[];
  estimatedGapCostCents: { min: number; max: number }; evidence: Array<{ capabilityId: string; authorized: boolean; fresh: boolean }>;
};
export class MealCandidatePreparationError extends Error { constructor(public readonly code: string, message: string) { super(message); this.name = 'MealCandidatePreparationError'; } }
export function prepareMealCandidates(input: {
  query: MealCandidateQuery;
  recipes: Array<{ id: string; versionId: string; title: string; requiredConcepts: string[]; estimatedGapCostCents: { min: number; max: number }; lastCookedAt: string | null; useSoonConcepts: string[] }>;
  stock: Array<{ concept: string; state: 'confirmed' | 'likely' | 'check_first' | 'depleted' }>;
  tripTargetCents: number | null;
  evidence: Array<{ capabilityId: string; authorized: boolean; fresh: boolean }>;
}): PreparedMealCandidate[] {
  if (input.evidence.some((item) => !item.authorized)) throw new MealCandidatePreparationError('meal_candidate.evidence_unauthorized', 'Meal suggestions cannot use unauthorized capability evidence.');
  const stockFresh = input.evidence.some((item) => item.capabilityId === 'groceries' && item.fresh);
  const stock = stockFresh ? new Map(input.stock.map((item) => [item.concept.toLowerCase(), item.state])) : new Map<string, 'confirmed'|'likely'|'check_first'|'depleted'>();
  const candidates = input.recipes.map((recipe): PreparedMealCandidate => {
    const confirmedConcepts: string[] = []; const likelyConcepts: string[] = []; const missingConcepts: string[] = [];
    for (const concept of recipe.requiredConcepts) { const state = stock.get(concept.toLowerCase()); if (state === 'confirmed') confirmedConcepts.push(concept); else if (state === 'likely') likelyConcepts.push(concept); else missingConcepts.push(concept); }
    const allConfirmed = confirmedConcepts.length === recipe.requiredConcepts.length; const useSoon = recipe.useSoonConcepts.some((concept) => recipe.requiredConcepts.includes(concept));
    const qualification: PreparedMealCandidate['qualification'] = allConfirmed ? 'make_now' : useSoon ? 'use_soon' : missingConcepts.length <= 3 ? 'almost_there' : input.tripTargetCents !== null && recipe.estimatedGapCostCents.max <= input.tripTargetCents ? 'near_target' : 'best_use';
    const reason = allConfirmed ? 'Every required ingredient is confirmed on hand.' : likelyConcepts.length ? `${likelyConcepts.length} ingredient${likelyConcepts.length === 1 ? '' : 's'} likely on hand; confirm before relying on them.` : useSoon ? `Uses ${recipe.useSoonConcepts.join(', ')} marked to use soon.` : `${missingConcepts.length} grocery gap${missingConcepts.length === 1 ? '' : 's'} to review.`;
    return { recipeId: recipe.id, recipeVersionId: recipe.versionId, title: recipe.title, qualification, reason, needsStockConfirmation: likelyConcepts.length > 0, confirmedConcepts, likelyConcepts, missingConcepts, estimatedGapCostCents: { ...recipe.estimatedGapCostCents }, evidence: input.evidence.map((item) => ({ ...item })) };
  });
  const filtered = candidates.filter((candidate) => input.query === 'make_now' ? candidate.qualification === 'make_now' : input.query === 'almost_there' ? candidate.missingConcepts.length >= 1 && candidate.missingConcepts.length <= 3 : input.query === 'use_soon' ? candidate.qualification === 'use_soon' : input.query === 'stay_near_target' ? input.tripTargetCents !== null && candidate.estimatedGapCostCents.max <= input.tripTargetCents : true);
  return filtered.sort((a, b) => (b.confirmedConcepts.length + b.likelyConcepts.length) - (a.confirmedConcepts.length + a.likelyConcepts.length) || a.estimatedGapCostCents.max - b.estimatedGapCostCents.max || a.title.localeCompare(b.title));
}
