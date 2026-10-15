import type { MoneyCategory, MoneyTransaction } from '../data/moneySnapshot';
import { parseRolloverBalance, projectCategoryRollover, validateRolloverPolicy, type RolloverPolicy } from './categoryRollover';
import { parseMonthlyAmount } from './categoryPlanDraft';

export type RolloverDraft = { enabled: boolean; startMonth: string; balance: string };
export function initialRolloverDraft(category: MoneyCategory, currentMonth: string): RolloverDraft {
  const policy = category.rolloverPolicy;
  return {
    enabled: category.rolloverEnabled || category.fundingRhythm === 'reserve',
    startMonth: policy?.startMonth ?? currentMonth,
    balance: ((policy?.startingBalanceCents ?? (category.fundingRhythm === 'reserve' ? category.remainingCents - category.plannedCents + category.spentCents : 0)) / 100).toFixed(2),
  };
}
export function reviewRolloverDraft(category: MoneyCategory, draft: RolloverDraft, monthlyAmount: string, transactions: MoneyTransaction[], currentMonth: string) {
  if (!draft.enabled) return { policy: null, preview: null, error: null };
  try {
    if (draft.startMonth > currentMonth) throw new Error('Choose this month or an earlier month.');
    const plannedCents = parseMonthlyAmount(monthlyAmount);
    const existing = category.rolloverPolicy;
    const unchangedHistory = existing?.startMonth === draft.startMonth;
    const monthlyAmounts = unchangedHistory ? { ...existing.monthlyAmounts, [currentMonth]: plannedCents }
      : { [draft.startMonth]: plannedCents, [currentMonth]: plannedCents };
    const policy: RolloverPolicy = validateRolloverPolicy({
      startMonth: draft.startMonth, startingBalanceCents: parseRolloverBalance(draft.balance), monthlyAmounts,
      timeZone: existing?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    const preview = projectCategoryRollover({ ...category, plannedCents }, policy, transactions, currentMonth, category.spentCents);
    return { policy, preview, error: null };
  } catch (error) {
    return { policy: null, preview: null, error: error instanceof Error ? error.message : 'Check the rollover settings.' };
  }
}
