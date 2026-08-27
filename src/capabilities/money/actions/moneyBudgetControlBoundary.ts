import type { ConfirmedCategoryWrite } from '../data/moneyRepository';
import type { MoneySnapshot } from '../data/moneySnapshot';
import type {
  LivingPlanOverridePreview,
  ReadyLivingPlanOverridePreview,
} from '../runtime/livingPlanReconciliation';

type MoneyBudgetSettings = { promotionEnabled: boolean; target: unknown | null };
type FundingInput = {
  fundingRhythm: 'monthly' | 'reserve';
  expectedNeedCents: number | null;
  expectedNeedDueMonth: string | null;
};
type GovernedCommitInput = FundingInput & {
  planCategoryId: string;
  allocationCategoryId: string;
  amountCents: number;
  preview: ReadyLivingPlanOverridePreview;
};

export async function applyGovernedMoneyBudgetUpdate(input: {
  categoryId: string;
  budgetCents: number;
  expectedUpdatedAt: string;
  loadSnapshot: () => Promise<MoneySnapshot>;
  directUpdate: (
    categoryId: string,
    update: { budgetCents: number },
    version: { expectedUpdatedAt: string },
  ) => Promise<Pick<ConfirmedCategoryWrite, 'confirmedAt'>>;
  loadSettings: () => Promise<MoneyBudgetSettings>;
  preview: (
    categoryId: string,
    amountCents: number,
    funding: FundingInput,
  ) => Promise<LivingPlanOverridePreview>;
  commit: (commit: GovernedCommitInput) => Promise<{ outcome: string; versionId?: string }>;
}): Promise<{ confirmedAt: string }> {
  const before = await input.loadSnapshot();
  const category = before.categories.find((candidate) => (
    candidate.sourceId === input.categoryId || candidate.id === input.categoryId
  ));
  if (!category) throw new Error('money_target_not_found');
  if (category.updatedAt !== input.expectedUpdatedAt) throw new Error('money_target_stale');

  const settings = await input.loadSettings();
  if (!settings.promotionEnabled || !settings.target) {
    return input.directUpdate(
      category.sourceId,
      { budgetCents: input.budgetCents },
      { expectedUpdatedAt: input.expectedUpdatedAt },
    );
  }

  const funding: FundingInput = {
    fundingRhythm: category.fundingRhythm,
    expectedNeedCents: category.fundingRhythm === 'reserve'
      ? category.expectedNeed?.amountCents ?? null
      : null,
    expectedNeedDueMonth: category.fundingRhythm === 'reserve'
      ? category.expectedNeed?.dueMonth ?? null
      : null,
  };
  const preview = await input.preview(category.id, input.budgetCents, funding);
  if (preview.outcome === 'no_op') return { confirmedAt: category.updatedAt ?? before.generatedAt };
  if (preview.outcome !== 'ready') {
    throw new Error('money_plan_preview_not_ready');
  }
  const result = await input.commit({
    planCategoryId: category.sourceId,
    allocationCategoryId: category.id,
    amountCents: input.budgetCents,
    ...funding,
    preview,
  });
  if (result.outcome !== 'promoted' || !result.versionId) {
    throw new Error('money_plan_commit_not_confirmed');
  }
  const after = await input.loadSnapshot();
  const updated = after.categories.find((candidate) => candidate.sourceId === category.sourceId);
  if (!updated || updated.plannedCents !== input.budgetCents) {
    throw new Error('money_plan_receipt_not_confirmed');
  }
  return { confirmedAt: updated.updatedAt ?? after.generatedAt };
}
