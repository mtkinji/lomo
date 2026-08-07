export type MealChoiceResponseInput = {
  selectedCandidateIds: string[];
  pass: boolean;
  suggestion: string | null;
};

export function validateMealChoiceResponse(input: MealChoiceResponseInput, context: { candidateIds: string[]; limit: number }): MealChoiceResponseInput {
  if (!Number.isInteger(context.limit) || context.limit < 1 || context.limit > 3) throw new Error('Choice limit is invalid.');
  if (input.pass && input.selectedCandidateIds.length) throw new Error('Pass cannot include meal choices.');
  if (!input.pass && input.selectedCandidateIds.length > context.limit) throw new Error(`Choose up to ${context.limit} meals.`);
  if (new Set(input.selectedCandidateIds).size !== input.selectedCandidateIds.length) throw new Error('Meal choices must be unique.');
  const allowed = new Set(context.candidateIds);
  if (input.selectedCandidateIds.some((id) => !allowed.has(id))) throw new Error('Response references an unavailable candidate.');
  const suggestion = input.suggestion?.trim() || null;
  if (suggestion && suggestion.length > 240) throw new Error('Suggestion must be 240 characters or fewer.');
  return { selectedCandidateIds: [...input.selectedCandidateIds], pass: input.pass, suggestion };
}

export function aggregateMealChoices(input: {
  candidateIds: string[];
  responses: Array<{ selectedCandidateIds: string[]; pass: boolean }>;
}): Array<{ candidateId: string; pickCount: number }> {
  const order = new Map(input.candidateIds.map((id, index) => [id, index]));
  const counts = new Map(input.candidateIds.map((id) => [id, 0]));
  for (const response of input.responses) {
    if (response.pass) continue;
    for (const candidateId of new Set(response.selectedCandidateIds)) {
      if (counts.has(candidateId)) counts.set(candidateId, (counts.get(candidateId) ?? 0) + 1);
    }
  }
  return input.candidateIds.map((candidateId) => ({ candidateId, pickCount: counts.get(candidateId) ?? 0 }))
    .sort((a, b) => b.pickCount - a.pickCount || (order.get(a.candidateId) ?? 0) - (order.get(b.candidateId) ?? 0));
}

export function groupMealChoices(rows: Array<{candidateId:string;pickCount:number}>): {family_favorites:string[];sounded_good:string[];still_available:string[]} {
  return rows.reduce((groups,row)=>{groups[row.pickCount>=2?'family_favorites':row.pickCount===1?'sounded_good':'still_available'].push(row.candidateId);return groups;},{family_favorites:[],sounded_good:[],still_available:[]} as {family_favorites:string[];sounded_good:string[];still_available:string[]});
}
