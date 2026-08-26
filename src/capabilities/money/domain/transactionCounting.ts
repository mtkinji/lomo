export type CountableMoneyTransaction = {
  direction: 'inflow' | 'outflow';
  pending: boolean;
  moneyMeaning?: string | null;
  providerCategoryDetailed?: string | null;
};

export function isCommittedOutflow(transaction: CountableMoneyTransaction): boolean {
  return transaction.direction === 'outflow'
    && transaction.moneyMeaning !== 'transfer'
    && transaction.moneyMeaning !== 'internal_transfer'
    && transaction.moneyMeaning !== 'not_counted'
    && transaction.providerCategoryDetailed !== 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT';
}

export function isPostedOutflow(transaction: CountableMoneyTransaction): boolean {
  return !transaction.pending && isCommittedOutflow(transaction);
}
