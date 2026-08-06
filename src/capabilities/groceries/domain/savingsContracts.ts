export type SavingsEvidenceKind = 'regular_price' | 'public_promotion' | 'member_price' | 'coupon' | 'rebate' | 'fee';
export type SavingsEvidenceState = 'observed' | 'eligible' | 'activated' | 'redeemed' | 'expired';

export type SavingsEvidence = {
  id: string;
  kind: SavingsEvidenceKind;
  state: SavingsEvidenceState;
  provider: string | null;
  productId: string;
  amountCents: number;
  memberRequired: boolean;
  activationRequired: boolean;
  observedAt: string;
  expiresAt: string | null;
  acknowledgementRef?: string | null;
};

export function parseSavingsEvidence(value: SavingsEvidence, now = new Date().toISOString()): SavingsEvidence {
  if (!value.id || !value.productId || !Number.isSafeInteger(value.amountCents) || value.amountCents < 0) throw new Error('savings.money_invalid');
  if (!Number.isFinite(Date.parse(value.observedAt)) || (value.expiresAt && !Number.isFinite(Date.parse(value.expiresAt)))) throw new Error('savings.time_invalid');
  if (value.state === 'activated' && !value.acknowledgementRef) throw new Error('savings.activation_evidence_required');
  if (value.state === 'redeemed' && !value.acknowledgementRef) throw new Error('savings.redemption_evidence_required');
  return value.expiresAt && Date.parse(value.expiresAt) <= Date.parse(now) ? { ...value, state: 'expired' } : { ...value };
}

export function savingsActionLabel(value: Pick<SavingsEvidence, 'kind' | 'state' | 'activationRequired'>): 'Use this' | 'Open coupon' | 'Activate in retailer app' | 'Keep current' {
  if (value.state === 'expired') return 'Keep current';
  if (value.kind === 'coupon' && value.activationRequired && value.state !== 'activated' && value.state !== 'redeemed') return 'Activate in retailer app';
  if (value.kind === 'coupon' && !value.activationRequired) return 'Open coupon';
  return 'Use this';
}

export type SavingsOption = {
  id: string;
  groceryItemId: string;
  title: string;
  productId: string;
  store: string;
  quantity: number;
  baseUnits: number;
  baselineCents: number;
  netCents: number;
  predictedSavingsCents: number;
  evidence: SavingsEvidence[];
  evidenceObservedAt: string;
  expiresAt: string | null;
  nextAction: ReturnType<typeof savingsActionLabel>;
  assumptions: string[];
};
