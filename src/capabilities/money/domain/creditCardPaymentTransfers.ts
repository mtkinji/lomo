import type { MoneyTransaction } from '../data/moneySnapshot';

const CREDIT_CARD_PAYMENT_DETAIL = 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT';
const MAX_SETTLEMENT_GAP_DAYS = 3;

type PairCandidate = {
  anchorId: string;
  counterpartId: string;
};

export function linkCreditCardPaymentTransfers(rows: MoneyTransaction[]): MoneyTransaction[] {
  const normalized = rows.map((row) => isInferableCardPaymentOutflow(row)
    ? asInternalTransfer(row)
    : row);
  const anchors = normalized.filter(isInferableCardPaymentOutflow);
  const inflows = normalized.filter(isInferableCreditCardInflow);
  const candidates: PairCandidate[] = anchors.flatMap((anchor) => {
    const eligible = inflows.filter((inflow) => isEligibleCounterpart(anchor, inflow));
    const maskMatches = eligible.filter((inflow) => descriptionReferencesMask(anchor, inflow.accountMask));
    const selected = maskMatches.length === 1
      ? maskMatches[0]
      : eligible.length === 1 ? eligible[0] : null;
    return selected ? [{ anchorId: anchor.id, counterpartId: selected.id }] : [];
  });
  const counterpartUseCount = candidates.reduce((counts, candidate) => {
    counts.set(candidate.counterpartId, (counts.get(candidate.counterpartId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const pairById = new Map<string, MoneyTransaction['transferPair']>();
  const rowById = new Map(normalized.map((row) => [row.id, row]));

  candidates.forEach((candidate) => {
    if (counterpartUseCount.get(candidate.counterpartId) !== 1) return;
    const anchor = rowById.get(candidate.anchorId);
    const counterpart = rowById.get(candidate.counterpartId);
    if (!anchor || !counterpart) return;
    const relation = {
      sourceAccountName: anchor.accountName,
      destinationAccountName: counterpart.accountName,
    };
    pairById.set(anchor.id, { ...relation, counterpartTransactionId: counterpart.id });
    pairById.set(counterpart.id, { ...relation, counterpartTransactionId: anchor.id });
  });

  return normalized.map((row) => {
    const transferPair = pairById.get(row.id);
    return transferPair ? { ...asInternalTransfer(row), transferPair } : row;
  });
}

export function collapseLinkedCreditCardPaymentTransfers(rows: MoneyTransaction[]): MoneyTransaction[] {
  const visibleIds = new Set(rows.map((row) => row.id));
  return rows.filter((row) => !(row.direction === 'inflow'
    && row.transferPair
    && visibleIds.has(row.transferPair.counterpartTransactionId)));
}

function isInferableCardPaymentOutflow(row: MoneyTransaction): boolean {
  return row.direction === 'outflow'
    && !row.pending
    && row.providerCategoryDetailed === CREDIT_CARD_PAYMENT_DETAIL
    && canInferTransfer(row);
}

function isInferableCreditCardInflow(row: MoneyTransaction): boolean {
  return row.direction === 'inflow'
    && !row.pending
    && (row.accountType === 'credit' || row.accountSubtype === 'credit card')
    && canInferTransfer(row);
}

function canInferTransfer(row: MoneyTransaction): boolean {
  return row.moneyMeaning == null || row.moneyMeaning === 'unknown' || row.moneyMeaning === 'transfer';
}

function isEligibleCounterpart(anchor: MoneyTransaction, inflow: MoneyTransaction): boolean {
  return anchor.id !== inflow.id
    && anchor.amountCents === inflow.amountCents
    && anchor.currencyCode === inflow.currencyCode
    && dayDistance(anchor.date, inflow.date) <= MAX_SETTLEMENT_GAP_DAYS;
}

function descriptionReferencesMask(anchor: MoneyTransaction, mask: string | null | undefined): boolean {
  const digits = mask?.replace(/\D/g, '');
  if (!digits || digits.length < 4) return false;
  return `${anchor.originalDescription ?? ''} ${anchor.merchantName}`.replace(/\D/g, '').includes(digits.slice(-4));
}

function dayDistance(left: string, right: string): number {
  const leftTime = Date.parse(`${left}T00:00:00.000Z`);
  const rightTime = Date.parse(`${right}T00:00:00.000Z`);
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return Number.POSITIVE_INFINITY;
  return Math.abs(leftTime - rightTime) / (24 * 60 * 60 * 1000);
}

function asInternalTransfer(row: MoneyTransaction): MoneyTransaction {
  if (!canInferTransfer(row)) return row;
  return {
    ...row,
    categoryId: null,
    categoryName: 'Internal transfer',
    moneyMeaning: 'transfer',
    reviewState: 'not_counted',
  };
}
