export type MoneyGoalBridgeCategory = { id: string; name: string; spentCents: number; plannedCents: number };
export type MoneyGoalBridgeDraft = { sourceCategoryId: string; title: string; description: string; evidenceLabel: string };

export function buildMoneyGoalBridgeDraft(categories: MoneyGoalBridgeCategory[]): MoneyGoalBridgeDraft | null {
  const candidate = categories
    .filter((category) => category.plannedCents > 0 && category.spentCents > 0)
    .map((category) => ({ category, usage: category.spentCents / category.plannedCents * 100 }))
    .filter(({ usage }) => usage >= 95)
    .sort((left, right) => right.usage - left.usage)[0];
  if (!candidate) return null;
  const categoryName = candidate.category.name.trim() || 'This category';
  const extras = categoryName.toLowerCase().includes('shopping') ? 'household extras' : `${categoryName} extras`;
  const evidenceLabel = `${formatCurrency(candidate.category.spentCents)} spent of ${formatCurrency(candidate.category.plannedCents)} planned`;
  return {
    sourceCategoryId: candidate.category.id,
    title: `Pause before ${extras} this month`,
    description: `${categoryName} is ahead of the plan. ${evidenceLabel}. Before buying ${extras}, add it to a 24-hour list.`,
    evidenceLabel,
  };
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
}
