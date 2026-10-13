import type { MoneyCategory, MoneyTransaction } from '../data/moneySnapshot';
import { formatRolloverMonth, parseRolloverBalance, projectCategoryRollover, rolloverHistoryGaps, validateRolloverPolicy, type RolloverPolicy } from './categoryRollover';
import { parseMonthlyAmount } from './categoryPlanDraft';

export type RolloverDraft = { enabled: boolean; startMonth: string; balance: string; historicalAmount: string; historyReviewed: boolean };
export function initialRolloverDraft(category: MoneyCategory, currentMonth: string): RolloverDraft {
  const policy = category.rolloverPolicy;
  return {
    enabled: category.rolloverEnabled || category.fundingRhythm === 'reserve',
    startMonth: policy?.startMonth ?? currentMonth,
    balance: ((policy?.startingBalanceCents ?? (category.fundingRhythm === 'reserve' ? category.remainingCents - category.plannedCents + category.spentCents : 0)) / 100).toFixed(2),
    historicalAmount: ((policy?.monthlyAmounts[policy.startMonth] ?? category.plannedCents) / 100).toFixed(2),
    historyReviewed: !!policy,
  };
}
export function reviewRolloverDraft(category: MoneyCategory, draft: RolloverDraft, monthlyAmount: string, transactions: MoneyTransaction[], currentMonth: string) {
  if (!draft.enabled) return { policy: null, preview: null, error: null, historyRequired: false };
  try {
    if (draft.startMonth > currentMonth) throw new Error('Choose this month or an earlier month.');
    const plannedCents = parseMonthlyAmount(monthlyAmount);
    const historicalCents = parseMonthlyAmount(draft.historicalAmount);
    const existing = category.rolloverPolicy;
    const unchangedHistory = existing?.startMonth === draft.startMonth && existing.monthlyAmounts[existing.startMonth] === historicalCents;
    const monthlyAmounts = unchangedHistory ? { ...existing.monthlyAmounts, [currentMonth]: plannedCents }
      : { [draft.startMonth]: historicalCents, [currentMonth]: plannedCents };
    const policy: RolloverPolicy = validateRolloverPolicy({
      startMonth: draft.startMonth, startingBalanceCents: parseRolloverBalance(draft.balance), monthlyAmounts,
      timeZone: existing?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    const historyRequired = draft.startMonth < currentMonth && !unchangedHistory;
    const gaps = historyRequired ? rolloverHistoryGaps(draft.startMonth, currentMonth, transactions) : [];
    if (gaps.length) return { policy, preview: null, historyRequired, error: `No imported activity for ${gaps.map(formatRolloverMonth).join(', ')}. Start this month with your known balance, or import the missing history first.` };
    const preview = projectCategoryRollover({ ...category, plannedCents }, policy, transactions, currentMonth, category.spentCents);
    return { policy, preview, historyRequired, error: historyRequired && !draft.historyReviewed ? 'Review the earlier spending and confirm the monthly amount before saving.' : null };
  } catch (error) {
    return { policy: null, preview: null, historyRequired: false, error: error instanceof Error ? error.message : 'Check the rollover settings.' };
  }
}
