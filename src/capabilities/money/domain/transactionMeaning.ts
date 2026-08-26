import type { MoneyTransaction } from '../data/moneySnapshot';

type MeaningTransaction = Pick<MoneyTransaction,
  'allocations' | 'direction' | 'matchSource' | 'moneyMeaning' | 'providerCategoryPrimary'
>;

export function isProviderIncome(transaction: Pick<MeaningTransaction,
  'direction' | 'moneyMeaning' | 'providerCategoryPrimary'
>): boolean {
  return transaction.direction === 'inflow'
    && transaction.moneyMeaning !== 'not_counted'
    && transaction.moneyMeaning !== 'transfer'
    && transaction.moneyMeaning !== 'category_credit'
    && /^INCOME(?:_|$)/.test(transaction.providerCategoryPrimary ?? '');
}

export function getEffectiveMoneyMeaning(
  transaction: Pick<MeaningTransaction, 'direction' | 'moneyMeaning' | 'providerCategoryPrimary'>,
): MoneyTransaction['moneyMeaning'] {
  if (transaction.moneyMeaning && transaction.moneyMeaning !== 'unknown') return transaction.moneyMeaning;
  return isProviderIncome(transaction) ? 'income' : transaction.moneyMeaning;
}

export function isTransactionExplicitlyReviewed(transaction: MeaningTransaction): boolean {
  return transaction.matchSource === 'confirmed'
    || transaction.matchSource === 'corrected'
    || transaction.matchSource === 'excluded'
    || Boolean(transaction.allocations?.length);
}
