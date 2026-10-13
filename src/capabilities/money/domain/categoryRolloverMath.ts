import { isPostedOutflow } from './transactionCounting.ts';
export type RolloverTransaction = {
  date: string; pending: boolean; amountCents: number; direction: 'inflow' | 'outflow';
  providerCategoryDetailed?: string | null;
  categoryId: string | null; moneyMeaning?: string | null; savedResourceCents?: number | null;
  allocations?: Array<{ categoryId: string; sourceCategoryId: string; amountCents: number }>;
};

export type RolloverPolicy = {
  startMonth: string;
  startingBalanceCents: number;
  /** Effective-month schedule, not a multiplier derived from today's budget. */
  monthlyAmounts: Record<string, number>;
  timeZone: string;
};
const monthPattern = /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/;
const boundedCents = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && Math.abs(value) <= 1_000_000_000;

export function validateRolloverPolicy(value: unknown): RolloverPolicy {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Check the rollover settings.');
  const policy = value as RolloverPolicy;
  if (!monthPattern.test(policy.startMonth) || !boundedCents(policy.startingBalanceCents)) throw new Error('Enter a valid rollover month and starting balance.');
  if (!policy.monthlyAmounts || typeof policy.monthlyAmounts !== 'object' || Array.isArray(policy.monthlyAmounts)
    || !Object.hasOwn(policy.monthlyAmounts, policy.startMonth)
    || Object.entries(policy.monthlyAmounts).some(([month, amount]) => !monthPattern.test(month) || month < policy.startMonth || !boundedCents(amount) || amount < 0)) {
    throw new Error('Check the monthly amounts used for rollover.');
  }
  if (typeof policy.timeZone !== 'string' || !policy.timeZone) throw new Error('Choose a valid rollover time zone.');
  try { new Intl.DateTimeFormat('en-US', { timeZone: policy.timeZone }).format(); }
  catch { throw new Error('Choose a valid rollover time zone.'); }
  return { startMonth: policy.startMonth, startingBalanceCents: policy.startingBalanceCents, monthlyAmounts: { ...policy.monthlyAmounts }, timeZone: policy.timeZone };
}

export function monthsBefore(startMonth: string, targetMonth: string): string[] {
  if (!monthPattern.test(startMonth) || !monthPattern.test(targetMonth)) return [];
  const result: string[] = [];
  let [year, month] = startMonth.split('-').map(Number);
  while (`${year}-${String(month).padStart(2, '0')}` < targetMonth) {
    result.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month === 13) { year += 1; month = 1; }
  }
  return result;
}

export function rolloverHistoryGaps(start: string, target: string, transactions: RolloverTransaction[]): string[] {
  const imported = new Set(transactions.filter((transaction) => !transaction.pending).map((transaction) => transaction.date.slice(0, 7)));
  return monthsBefore(start, target).filter((month) => !imported.has(month));
}

export function projectCategoryRollover(
  category: { id: string; sourceId: string; plannedCents: number },
  policy: RolloverPolicy,
  transactions: RolloverTransaction[],
  targetMonth: string,
  currentSpentCents: number,
): { carriedInCents: number; availableCents: number } | null {
  if (targetMonth < policy.startMonth) return null;
  let carriedInCents = policy.startingBalanceCents;
  const schedule = Object.keys(policy.monthlyAmounts).sort();
  for (const month of monthsBefore(policy.startMonth, targetMonth)) {
    const effective = schedule.filter((start) => start <= month).pop();
    carriedInCents += effective ? policy.monthlyAmounts[effective] : 0;
  }
  for (const transaction of transactions) {
    const month = transaction.date.slice(0, 7);
    if (month < policy.startMonth || month >= targetMonth || transaction.pending
      || transaction.moneyMeaning === 'not_counted' || transaction.moneyMeaning === 'transfer') continue;
    const direct = transaction.categoryId === category.id || transaction.categoryId === category.sourceId;
    const allocations = transaction.allocations ?? [];
    const allocation = allocations.find((part) => part.categoryId === category.id || part.sourceCategoryId === category.sourceId);
    if (!direct && !allocation) continue;
    if (transaction.direction === 'inflow') {
      if (transaction.moneyMeaning === 'category_credit') carriedInCents += direct ? transaction.amountCents : allocation!.amountCents;
    } else if (isPostedOutflow(transaction)) {
      const covered = Math.max(0, transaction.amountCents - (transaction.savedResourceCents ?? 0));
      const allocatedTotal = allocations.reduce((total, part) => total + part.amountCents, 0);
      carriedInCents -= direct ? covered : allocatedTotal > 0 ? Math.floor(covered * allocation!.amountCents / allocatedTotal) : 0;
    }
  }
  return { carriedInCents, availableCents: carriedInCents + category.plannedCents - currentSpentCents };
}

export function formatRolloverMonth(month: string): string {
  const [year, number] = month.split('-').map(Number);
  return new Date(year, number - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function parseRolloverBalance(value: string): number {
  if (!/^-?\d+(\.\d{0,2})?$/.test(value.trim())) throw new Error('Enter a starting balance with up to two decimal places.');
  const cents = Math.round(Number(value) * 100);
  if (!boundedCents(cents)) throw new Error('Enter a valid starting balance.');
  return cents;
}
