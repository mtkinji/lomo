const verifiedFixedRules = {
  BA001: { 7: 'as_needed' },
  BR016: { 12: 'reviewed_other' },
  BR031: { 5: 'vessel' },
  BR073: {},
  BR078: { 9: 'to_taste', 12: 'reviewed_other' },
  DI061: {},
  DI133: { 11: 'vessel' },
  LU037: { 9: 'vessel' },
  LU038: {},
  LU050: { 3: 'vessel' },
  SO011: { 19: 'reviewed_other' },
};

const unavailableReason = 'Ingredient and instruction quantities have not yet completed a whole-batch scaling review.';

export function reviewedScalingForRecipe(rosterId, ingredientCount) {
  const fixedRules = verifiedFixedRules[rosterId];
  if (!fixedRules) {
    return { scalingState: 'unavailable', scalingUnavailableReason: unavailableReason };
  }
  if (!Number.isInteger(ingredientCount)) throw new Error(`${rosterId} is missing structured ingredients for scaling review.`);
  return {
    scalingReview: Object.fromEntries(Array.from({ length: ingredientCount }, (_, position) => [
      position,
      fixedRules[position]
        ? { kind: 'fixed', reason: fixedRules[position] }
        : { kind: 'multiply' },
    ])),
  };
}

export function applyReviewedScaling(authoring, existingRecords) {
  const existingById = new Map(existingRecords.map((record) => [record.rosterId, record]));
  return Object.fromEntries(Object.entries(authoring).map(([rosterId, authored]) => {
    const ingredientCount = existingById.get(rosterId)?.structuredIngredients?.length;
    return [rosterId, { ...authored, ...reviewedScalingForRecipe(rosterId, ingredientCount) }];
  }));
}
