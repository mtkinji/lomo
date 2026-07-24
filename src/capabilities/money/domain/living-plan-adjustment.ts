export type LivingPlanAdjustmentFacts = {
  livingPercent: number;
  resourceBasisCents: number;
  targetCents: number;
  plannedCents: number;
  unassignedCents: number;
  overTargetCents: number;
};

export type LivingPlanAdjustmentImpact = {
  fitsWithoutMovingOtherBudgetCents: number;
  plannedIncomePercent: number;
  targetPointDelta: number;
  targetDifferenceCents: number;
};

export function getLivingPlanAdjustmentImpact(input: {
  currentAmountCents: number;
  before: LivingPlanAdjustmentFacts | null;
  after: LivingPlanAdjustmentFacts;
}): LivingPlanAdjustmentImpact {
  const currentAmountCents = nonnegative(input.currentAmountCents);
  const openRoomCents = nonnegative(input.before?.unassignedCents ?? 0);
  const plannedIncomePercent = input.after.resourceBasisCents > 0
    ? roundToTenth((input.after.plannedCents / input.after.resourceBasisCents) * 100)
    : 0;

  return {
    fitsWithoutMovingOtherBudgetCents: currentAmountCents + openRoomCents,
    plannedIncomePercent,
    targetPointDelta: roundToTenth(plannedIncomePercent - input.after.livingPercent),
    targetDifferenceCents: input.after.plannedCents - input.after.targetCents,
  };
}

function nonnegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}
