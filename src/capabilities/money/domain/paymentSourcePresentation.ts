export type InstitutionPalette = {
  primary: string;
  soft: string;
  foreground: string;
};

export type PaymentSourcePresentation =
  | { kind: 'credit_card' | 'debit_card'; palette: InstitutionPalette }
  | { kind: 'bank_account'; railLabel: string; palette: InstitutionPalette }
  | { kind: 'deposit'; railLabel: string; palette: InstitutionPalette }
  | { kind: 'account'; palette: InstitutionPalette };

export type PaymentSourceEvidence = {
  direction: 'inflow' | 'outflow';
  accountType?: string | null;
  accountSubtype?: string | null;
  institutionName?: string | null;
  accountName?: string | null;
  merchantName?: string | null;
  originalDescription?: string | null;
  providerCategoryPrimary?: string | null;
  providerCategoryDetailed?: string | null;
  paymentChannel?: string | null;
  transactionCode?: string | null;
};

const CHASE_PALETTE: InstitutionPalette = {
  primary: '#0A5DBB',
  soft: '#EAF3FF',
  foreground: '#FFFFFF',
};

const NEUTRAL_PALETTE: InstitutionPalette = {
  primary: '#315545',
  soft: '#EEF5F1',
  foreground: '#FFFFFF',
};

function getInstitutionPalette(institutionName?: string | null): InstitutionPalette {
  const normalized = institutionName?.trim().toLowerCase() ?? '';
  if (/\b(chase|jpmorgan)\b/.test(normalized)) return CHASE_PALETTE;
  return NEUTRAL_PALETTE;
}

function getRailLabel(evidence: PaymentSourceEvidence): string {
  const source = [
    evidence.providerCategoryPrimary,
    evidence.providerCategoryDetailed,
    evidence.transactionCode,
    evidence.merchantName,
    evidence.originalDescription,
  ].filter(Boolean).join(' ').toUpperCase();
  if (/REAL.?TIME|\bRTP\b/.test(source)) return 'Real-time payment';
  if (/ACCOUNT_TRANSFER/.test(source)) return 'Account transfer';
  if (/\bACH\b/.test(source)) return 'ACH transfer';
  if (/\bWIRE\b/.test(source)) return 'Wire transfer';
  if (/DIRECT_DEBIT/.test(source)) return 'Direct debit';
  return evidence.direction === 'inflow' ? 'Bank deposit' : 'Bank payment';
}

function hasExplicitDebitCardEvidence(evidence: PaymentSourceEvidence): boolean {
  const transactionCode = evidence.transactionCode?.trim().toLowerCase();
  const paymentChannel = evidence.paymentChannel?.trim().toLowerCase();
  return transactionCode === 'debit'
    && paymentChannel != null
    && ['in store', 'online', 'other'].includes(paymentChannel);
}

export function getPaymentSourcePresentation(
  evidence: PaymentSourceEvidence,
): PaymentSourcePresentation {
  const palette = getInstitutionPalette(evidence.institutionName);
  if (evidence.direction === 'inflow') {
    return { kind: 'deposit', railLabel: getRailLabel(evidence), palette };
  }

  const account = `${evidence.accountType ?? ''} ${evidence.accountSubtype ?? ''}`.toLowerCase();
  if (account.includes('credit')) return { kind: 'credit_card', palette };
  if (hasExplicitDebitCardEvidence(evidence)) return { kind: 'debit_card', palette };
  if (/depository|checking|savings/.test(account)) {
    return { kind: 'bank_account', railLabel: getRailLabel(evidence), palette };
  }
  return { kind: 'account', palette };
}
