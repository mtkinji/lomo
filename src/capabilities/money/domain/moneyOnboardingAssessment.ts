export type MoneyOnboardingAccountEvidence = {
  id: string;
  institutionName: string;
  name: string;
  mask: string | null;
};

export type MoneyOnboardingEvidenceSet = {
  accounts: MoneyOnboardingAccountEvidence[];
  coverageLabel: string;
  dependableMonthlyIncomeCents: number | null;
  committedMonthlyCents: number | null;
  typicalFlexibleMonthlyCents: number | null;
  householdSize: number | null;
};

export type MoneyOnboardingAssessment = {
  confidence: 'supported' | 'insufficient';
  evidenceLabel: string;
  monthlyIncomeCents: number | null;
  observedMonthlySpendingCents: number | null;
  recommendedPlanCents: number | null;
  committedPlanCents: number | null;
  flexiblePlanCents: number | null;
  householdSize: number | null;
  recommendedLivingPercent: number | null;
};

export type MoneyOnboardingCoverageConfidence = 'complete' | 'partial';
export type MoneyPlanningIntent = 'current' | 'reduce' | 'recommend';

export type MoneyOnboardingTargetGuidance = {
  kind: 'recommendation' | 'starting_point';
  evidenceScope: 'household' | 'connected_accounts';
  percent: number;
  markerPercent: number | null;
  planCents: number;
  observedMonthlySpendingCents: number | null;
  differenceFromObservedCents: number | null;
  outsidePlanCents: number;
};

export function getMoneyInstitutionCoverage(accounts: MoneyOnboardingAccountEvidence[]) {
  const groups = new Map<string, string[]>();
  accounts.forEach((account) => {
    const names = groups.get(account.institutionName) ?? [];
    names.push(account.name);
    groups.set(account.institutionName, names);
  });
  return [...groups.entries()].map(([institutionName, accountNames]) => ({
    institutionName,
    accountCount: accountNames.length,
    accountNames,
  }));
}

export function getAdditionalInstitutionDecision(isPro: boolean): 'open_connection' | 'offer_pro' {
  return isPro ? 'open_connection' : 'offer_pro';
}

export function buildMoneyOnboardingAssessment(evidence: MoneyOnboardingEvidenceSet): MoneyOnboardingAssessment {
  const institutions = getMoneyInstitutionCoverage(evidence.accounts);
  const accountCount = evidence.accounts.length;
  const institutionLabel = institutions.length === 1 ? institutions[0].institutionName : `${institutions.length} institutions`;
  const evidenceLabel = `${accountCount} ${institutionLabel} ${accountCount === 1 ? 'account' : 'accounts'} · ${evidence.coverageLabel}`;
  const income = validPositiveCents(evidence.dependableMonthlyIncomeCents);
  const committed = validPositiveCents(evidence.committedMonthlyCents);
  if (income == null || committed == null) {
    return {
      confidence: 'insufficient', evidenceLabel, monthlyIncomeCents: income,
      observedMonthlySpendingCents: null,
      recommendedPlanCents: null, committedPlanCents: committed, flexiblePlanCents: null,
      householdSize: evidence.householdSize, recommendedLivingPercent: null,
    };
  }
  const householdSize = validHouseholdSize(evidence.householdSize);
  const typicalFlexible = validPositiveCents(evidence.typicalFlexibleMonthlyCents) ?? 0;
  const observedMonthlySpendingCents = committed + typicalFlexible;
  const householdMarginCents = Math.max(Math.round(income * 0.02), householdSize * 5_000);
  const requiredPercent = Math.ceil(((committed + typicalFlexible + householdMarginCents) / income) * 20) * 5;
  const recommendedLivingPercent = Math.max(70, Math.min(100, requiredPercent));
  const recommendedPlanCents = Math.round(income * recommendedLivingPercent / 100);
  return {
    confidence: 'supported', evidenceLabel, monthlyIncomeCents: income,
    observedMonthlySpendingCents,
    recommendedPlanCents,
    committedPlanCents: committed,
    flexiblePlanCents: Math.max(0, recommendedPlanCents - committed),
    householdSize,
    recommendedLivingPercent,
  };
}

export function buildMoneyOnboardingTargetGuidance(
  assessment: MoneyOnboardingAssessment,
  coverage: MoneyOnboardingCoverageConfidence,
  intent: MoneyPlanningIntent,
): MoneyOnboardingTargetGuidance | null {
  const income = assessment.monthlyIncomeCents;
  if (assessment.confidence !== 'supported' || income == null || income <= 0) return null;

  const observed = assessment.observedMonthlySpendingCents;
  const recommendation = assessment.recommendedLivingPercent ?? 70;
  let percent = recommendation;
  let markerPercent: number | null = recommendation;
  let kind: MoneyOnboardingTargetGuidance['kind'] = 'recommendation';

  if (coverage === 'partial' && intent === 'recommend') {
    percent = 70;
  } else if (intent === 'reduce' && observed != null) {
    const observedPercent = observed / income * 100;
    const lowerObservedStep = Math.ceil(observedPercent / 5) * 5 - 5;
    const commitmentFloor = assessment.committedPlanCents == null
      ? 50
      : Math.ceil((assessment.committedPlanCents / income) * 20) * 5;
    percent = Math.max(50, Math.min(100, Math.max(lowerObservedStep, commitmentFloor)));
    markerPercent = Math.round(income * percent / 100) < observed ? percent : null;
    if (markerPercent == null) kind = 'starting_point';
  } else if (intent === 'current' && observed != null) {
    percent = Math.max(50, Math.min(100, Math.ceil((observed / income) * 20) * 5));
    markerPercent = percent;
  }

  if (coverage === 'partial') {
    markerPercent = null;
    kind = 'starting_point';
  }

  const planCents = Math.round(income * percent / 100);
  return {
    kind,
    evidenceScope: coverage === 'complete' ? 'household' : 'connected_accounts',
    percent,
    markerPercent,
    planCents,
    observedMonthlySpendingCents: observed,
    differenceFromObservedCents: observed == null ? null : planCents - observed,
    outsidePlanCents: Math.max(0, income - planCents),
  };
}

function validPositiveCents(value: number | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function validHouseholdSize(value: number | null): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.round(value)) : 1;
}

export const MONEY_ONBOARDING_DEMO_EVIDENCE: MoneyOnboardingEvidenceSet = {
  accounts: [
    { id: 'demo-checking', institutionName: 'Chase', name: 'Total Checking', mask: '1842' },
    { id: 'demo-savings', institutionName: 'Chase', name: 'Premier Savings', mask: '6031' },
    { id: 'demo-card', institutionName: 'Chase', name: 'Freedom Unlimited', mask: '7719' },
  ],
  coverageLabel: 'May–July 2026',
  dependableMonthlyIncomeCents: 950_000,
  committedMonthlyCents: 478_000,
  typicalFlexibleMonthlyCents: 160_000,
  householdSize: 4,
};
