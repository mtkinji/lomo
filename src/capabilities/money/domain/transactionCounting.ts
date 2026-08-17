export type CountableMoneyTransaction = {
  direction: 'inflow' | 'outflow';
  pending: boolean;
  moneyMeaning?: string | null;
};

export function isCommittedOutflow(transaction: CountableMoneyTransaction): boolean {
  return transaction.direction === 'outflow'
    && transaction.moneyMeaning !== 'transfer'
    && transaction.moneyMeaning !== 'internal_transfer'
    && transaction.moneyMeaning !== 'not_counted';
}

export function isPostedOutflow(transaction: CountableMoneyTransaction): boolean {
  return !transaction.pending && isCommittedOutflow(transaction);
}
