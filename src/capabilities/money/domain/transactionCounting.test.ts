import { isCommittedOutflow, isPostedOutflow } from './transactionCounting';

const pendingPurchase = {
  direction: 'outflow' as const,
  pending: true,
  moneyMeaning: null,
};

describe('transaction counting', () => {
  it('treats a pending purchase as a current commitment but not posted history', () => {
    expect(isCommittedOutflow(pendingPurchase)).toBe(true);
    expect(isPostedOutflow(pendingPurchase)).toBe(false);
  });

  it('excludes transfers and explicit outside-plan treatment from committed spend', () => {
    expect(isCommittedOutflow({ ...pendingPurchase, moneyMeaning: 'transfer' })).toBe(false);
    expect(isCommittedOutflow({ ...pendingPurchase, moneyMeaning: 'internal_transfer' })).toBe(false);
    expect(isCommittedOutflow({ ...pendingPurchase, moneyMeaning: 'not_counted' })).toBe(false);
  });

  it('recognizes an ordinary settled purchase as posted history', () => {
    expect(isPostedOutflow({ ...pendingPurchase, pending: false })).toBe(true);
  });

  it('never treats inflows as committed outflows', () => {
    expect(isCommittedOutflow({ ...pendingPurchase, direction: 'inflow' })).toBe(false);
  });
});
