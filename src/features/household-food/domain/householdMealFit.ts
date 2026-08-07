export type PersonFoodNeed = {
  id: string;
  personId: string;
  kind: 'must_avoid';
  ingredientConcept: string;
  displayLabel: string;
};

export type MealFitConflict = {
  personId: string;
  ingredientConcept: string;
  displayLabel: string;
};

export type MealFitResult =
  | { status: 'recorded_conflict'; conflicts: MealFitConflict[] }
  | { status: 'no_recorded_conflict'; conflicts: [] }
  | { status: 'not_checked'; conflicts: [] };

function normalizeConcept(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function deriveMealFit(input: {
  dinerPersonIds: readonly string[];
  foodNeeds: readonly PersonFoodNeed[];
  recipe: { ingredientConcepts: readonly string[]; ingredientEvidenceComplete: boolean };
}): MealFitResult {
  const diners = new Set(input.dinerPersonIds);
  const ingredients = new Set(input.recipe.ingredientConcepts.map(normalizeConcept).filter(Boolean));
  const seen = new Set<string>();
  const conflicts = input.foodNeeds.flatMap((need) => {
    const concept = normalizeConcept(need.ingredientConcept);
    const key = `${need.personId}:${concept}`;
    if (!diners.has(need.personId) || !ingredients.has(concept) || seen.has(key)) return [];
    seen.add(key);
    return [{ personId: need.personId, ingredientConcept: concept, displayLabel: need.displayLabel }];
  });
  if (conflicts.length) return { status: 'recorded_conflict', conflicts };
  return input.recipe.ingredientEvidenceComplete
    ? { status: 'no_recorded_conflict', conflicts: [] }
    : { status: 'not_checked', conflicts: [] };
}
