export type CategoryPlanDraft = {
  name: string;
  monthlyAmount: string;
};

export type CategoryPlanInput = {
  name: string;
  budgetCents: number;
};

export function parseCategoryPlanDraft(draft: CategoryPlanDraft): CategoryPlanInput {
  return { name: parseCategoryName(draft.name), budgetCents: parseMonthlyAmount(draft.monthlyAmount) };
}

export function parseCategoryName(value: string): string {
  const name = value.trim();
  if (!name) throw new Error('Enter a category name.');
  return name;
}

export function parseMonthlyAmount(value: string): number {
  const normalizedAmount = value.trim().replace(/^\$/, '').replace(/,/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedAmount)) {
    if (/^-/.test(normalizedAmount)) throw new Error('Enter a monthly amount of zero or more.');
    throw new Error('Enter a valid monthly amount.');
  }
  const budgetCents = Math.round(Number(normalizedAmount) * 100);
  if (!Number.isSafeInteger(budgetCents) || budgetCents < 0) {
    throw new Error('Enter a valid monthly amount.');
  }
  return budgetCents;
}
