import type { MoneyTransaction } from '../data/moneySnapshot';

export type TransactionMeaningOption = {
  meaning: 'income' | 'transfer' | 'not_counted';
  label: string;
  detail: string;
};

const TRANSFER: TransactionMeaningOption = {
  meaning: 'transfer',
  label: 'Internal transfer',
  detail: 'Money moved between your accounts',
};

const OUTSIDE_PLAN: TransactionMeaningOption = {
  meaning: 'not_counted',
  label: 'Outside the plan',
  detail: 'Do not count this as spending or income',
};

export function getTransactionMeaningOptions(
  direction: MoneyTransaction['direction'],
): TransactionMeaningOption[] {
  if (direction === 'inflow') {
    return [
      { meaning: 'income', label: 'Income', detail: 'Available to fund the plan' },
      TRANSFER,
      OUTSIDE_PLAN,
    ];
  }
  return [TRANSFER, OUTSIDE_PLAN];
}
