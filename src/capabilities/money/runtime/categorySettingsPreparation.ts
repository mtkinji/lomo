import type { MoneyCategory } from '../data/moneySnapshot';
import { parseCategorySettings, parseCategorySettingsRequest, type CategorySettings, type CategorySettingsGovernance, type CategorySettingsRequest } from '../domain/categorySettingsCommand';
import { validateReviewedCategoryPlan, type ReadyLivingPlanOverridePreview } from './livingPlanReconciliation';

export function prepareCategorySettingsRequest(input: {
  actorUserId: string; requestId: string; category: MoneyCategory; settings: CategorySettings;
  preview?: ReadyLivingPlanOverridePreview | null;
}): CategorySettingsRequest {
  const settings = parseCategorySettings(input.settings);
  const preview = input.preview;
  let governance: CategorySettingsGovernance | null = null;
  if (preview) {
    validateReviewedCategoryPlan({ allocationCategoryId: input.category.id, amountCents: settings.budgetCents,
      fundingRhythm: settings.fundingRhythm, expectedNeedCents: settings.expectedNeedCents,
      expectedNeedDueMonth: settings.expectedNeedDueMonth, preview });
    const outcome = preview.expectedActiveVersionId === null ? 'initial' : preview.comparison.outcome;
    if (outcome === 'no_op' || outcome === 'blocked') throw new Error('Review this category change again before saving.');
    const count = preview.comparison.changedCategoryIds.length;
    governance = {
      expectedActiveVersionId: preview.expectedActiveVersionId, candidate: preview.candidate, components: preview.candidate.allocations,
      receipt: { trigger: 'category_changed', outcome, cause: `A category plan change updated ${count} category contribution${count === 1 ? '' : 's'}.`,
        changedCategoryIds: preview.comparison.changedCategoryIds, materialReasons: preview.comparison.materialReasons },
    };
  }
  return parseCategorySettingsRequest({
    schemaVersion: 1, actorUserId: input.actorUserId, requestId: input.requestId, categoryId: input.category.sourceId,
    expectedCategoryUpdatedAt: input.category.categoryUpdatedAt, expectedPlanUpdatedAt: input.category.planUpdatedAt,
    settings, governance,
  });
}
