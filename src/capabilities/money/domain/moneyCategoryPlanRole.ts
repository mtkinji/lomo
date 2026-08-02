import type { MoneyCategory } from '../data/moneySnapshot';

export type MoneyCategoryPlanRole = 'protected' | 'flexible';

const PROTECTED_MAPPING_TAGS = new Set([
  'childcare',
  'debt',
  'fees',
  'housing',
  'insurance',
  'utilities',
]);

export function inferMoneyCategoryPlanRole(
  category: Pick<MoneyCategory, 'forecastSettings' | 'mappingTags' | 'planRoleOverride'>,
): MoneyCategoryPlanRole {
  if (category.planRoleOverride) return category.planRoleOverride;
  const scheduledAmountCents = category.forecastSettings?.scheduledAmountCents ?? 0;
  if (scheduledAmountCents > 0) return 'protected';
  return category.mappingTags?.some((tag) => PROTECTED_MAPPING_TAGS.has(tag))
    ? 'protected'
    : 'flexible';
}
