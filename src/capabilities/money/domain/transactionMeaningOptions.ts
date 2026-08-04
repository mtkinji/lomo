import type { MoneyTransaction } from '../data/moneySnapshot';

export type TransactionMeaningOption = {
  meaning: 'income' | 'transfer' | 'not_counted';
  label: string;
  detail: string;
};

const TRANSFER: TransactionMeaningOption = {
  meaning: 'transfer',
  label: 'Internal transfer',
  detail: 'Money moved between your own accounts—not spending',
};

function outsidePlanOption(direction: MoneyTransaction['direction']): TransactionMeaningOption {
  return {
    meaning: 'not_counted',
    label: 'Outside the plan',
    detail: direction === 'outflow'
      ? 'Spending you don’t want included in this monthly plan'
      : 'Money you don’t want included in income or this monthly plan',
  };
}

export function getTransactionMeaningOptions(
  direction: MoneyTransaction['direction'],
): TransactionMeaningOption[] {
  if (direction === 'inflow') {
    return [
      { meaning: 'income', label: 'Income', detail: 'Available to fund the plan' },
      TRANSFER,
      outsidePlanOption(direction),
    ];
  }
  return [TRANSFER, outsidePlanOption(direction)];
}
