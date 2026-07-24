export type LivingPlanReceiptFacts = {
  resourceBasisCents: number;
  targetCents: number;
  plannedCents: number;
  unassignedCents: number;
};

export type LivingPlanReceiptSummary = {
  headline: string;
  explanation: string;
  facts: Array<{ label: string; beforeCents: number; afterCents: number }>;
};

export function getLivingPlanReceiptSummary(input: {
  before: LivingPlanReceiptFacts | null;
  after: LivingPlanReceiptFacts;
  changedCategoryCount: number;
}): LivingPlanReceiptSummary {
  const { before, after, changedCategoryCount } = input;
  const facts: LivingPlanReceiptSummary['facts'] = [];

  if (before && before.targetCents !== after.targetCents) {
    facts.push({ label: 'Available for monthly budgets', beforeCents: before.targetCents, afterCents: after.targetCents });
  }
  if (before && before.unassignedCents !== after.unassignedCents) {
    facts.push({ label: 'Left unassigned', beforeCents: before.unassignedCents, afterCents: after.unassignedCents });
  }

  if (changedCategoryCount === 0) {
    return {
      headline: 'Your budget amounts stayed the same',
      explanation: facts.length > 0
        ? 'New history changed the amount available to plan, but none of your monthly budget amounts needed to move.'
        : 'Kwilt checked the refreshed plan and none of your monthly budget amounts needed to move.',
      facts,
    };
  }

  return {
    headline: `${changedCategoryCount} monthly budget${changedCategoryCount === 1 ? '' : 's'} changed`,
    explanation: 'Kwilt kept your fixed costs and amounts you set in place, then adjusted the budgets shown below.',
    facts,
  };
}

export function hasVisibleLivingPlanReceiptChange(input: {
  before: LivingPlanReceiptFacts | null;
  after: LivingPlanReceiptFacts;
  changedCategoryCount: number;
}): boolean {
  return input.changedCategoryCount > 0 || getLivingPlanReceiptSummary(input).facts.length > 0;
}
