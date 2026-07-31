import type { LivingPlanAdjustmentFacts } from './living-plan-adjustment';
import type { LivingPlanAllocationChange } from './living-plan-changes';

type MoneyRebalancePreview = {
  changes: LivingPlanAllocationChange[];
  before: LivingPlanAdjustmentFacts | null;
  after: LivingPlanAdjustmentFacts;
  protectedAmountsUnchanged: boolean;
};

export type MoneyRebalanceAnswer = {
  state: 'within_unassigned' | 'within_reallocated' | 'over_limit' | 'no_change';
  headlineAmountCents: number;
  movedCents: number;
  protectedAmountsUnchanged: boolean;
  changedCategories: Array<{
    categoryId: string;
    beforeCents: number | null;
    afterCents: number | null;
    deltaCents: number;
  }>;
};

export function projectMoneyRebalanceAnswer(
  preview: MoneyRebalancePreview,
  editedCategoryId: string,
): MoneyRebalanceAnswer {
  const changedCategories = preview.changes
    .map((change) => ({
      ...change,
      deltaCents: (change.afterCents ?? 0) - (change.beforeCents ?? 0),
    }))
    .filter((change) => change.deltaCents !== 0)
    .sort((left, right) => Math.abs(right.deltaCents) - Math.abs(left.deltaCents) || left.categoryId.localeCompare(right.categoryId));
  const editedDeltaCents = changedCategories.find((change) => change.categoryId === editedCategoryId)?.deltaCents ?? 0;
  const increaseCents = Math.max(0, editedDeltaCents);
  const movedCents = changedCategories
    .filter((change) => change.categoryId !== editedCategoryId && change.deltaCents < 0)
    .reduce((sum, change) => sum + Math.abs(change.deltaCents), 0);
  const state: MoneyRebalanceAnswer['state'] = changedCategories.length === 0
    ? 'no_change'
    : preview.after.overTargetCents > 0
      ? 'over_limit'
      : increaseCents > 0 && increaseCents <= (preview.before?.unassignedCents ?? 0) && movedCents === 0
        ? 'within_unassigned'
        : 'within_reallocated';
  return {
    state,
    headlineAmountCents: state === 'over_limit'
      ? preview.after.overTargetCents
      : state === 'within_unassigned'
        ? increaseCents
        : movedCents,
    movedCents,
    protectedAmountsUnchanged: preview.protectedAmountsUnchanged,
    changedCategories,
  };
}
