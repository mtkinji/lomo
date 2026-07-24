export type CategoryPlanDraft = {
  name: string;
  monthlyAmount: string;
};

export type CategoryPlanInput = {
  name: string;
  budgetCents: number;
};

export function parseCategoryPlanDraft(draft: CategoryPlanDraft): CategoryPlanInput {
  const name = draft.name.trim();
  if (!name) throw new Error('Enter a category name.');

  const normalizedAmount = draft.monthlyAmount.trim().replace(/^\$/, '').replace(/,/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedAmount)) {
    if (/^-/.test(normalizedAmount)) throw new Error('Enter a monthly amount of zero or more.');
    throw new Error('Enter a valid monthly amount.');
  }
  const budgetCents = Math.round(Number(normalizedAmount) * 100);
  if (!Number.isSafeInteger(budgetCents) || budgetCents < 0) {
    throw new Error('Enter a valid monthly amount.');
  }
  return { name, budgetCents };
}
