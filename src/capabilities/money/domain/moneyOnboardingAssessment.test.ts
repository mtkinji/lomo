import {
  buildMoneyOnboardingAssessment,
  buildMoneyOnboardingTargetGuidance,
  getMoneyConnectionDecision,
  getMoneyInstitutionCoverage,
  MONEY_ONBOARDING_DEMO_EVIDENCE,
} from './moneyOnboardingAssessment';

describe('Money onboarding assessment', () => {
  it('treats every account from one institution login as one free connection', () => {
    expect(getMoneyInstitutionCoverage(MONEY_ONBOARDING_DEMO_EVIDENCE.accounts)).toEqual([
      {
        institutionName: 'Chase',
        accountCount: 3,
        accountNames: ['Total Checking', 'Premier Savings', 'Freedom Unlimited'],
      },
    ]);
  });

  it('turns connected evidence into a concrete recommended household plan', () => {
    const result = buildMoneyOnboardingAssessment(MONEY_ONBOARDING_DEMO_EVIDENCE);

    expect(result).toMatchObject({
      evidenceLabel: '3 Chase accounts · May–July 2026',
      householdSize: 4,
      monthlyIncomeCents: 950_000,
      observedMonthlySpendingCents: 638_000,
      recommendedLivingPercent: 70,
      recommendedPlanCents: 665_000,
      committedPlanCents: 478_000,
      flexiblePlanCents: 187_000,
    });
  });

  it('raises the recommendation only when observed needs and household margin do not fit at 70 percent', () => {
    expect(buildMoneyOnboardingAssessment({
      ...MONEY_ONBOARDING_DEMO_EVIDENCE,
      householdSize: 7,
    }).recommendedLivingPercent).toBe(75);
  });

  it('does not invent a recommendation when dependable income is missing', () => {
    expect(buildMoneyOnboardingAssessment({
      ...MONEY_ONBOARDING_DEMO_EVIDENCE,
      dependableMonthlyIncomeCents: null,
    })).toMatchObject({
      confidence: 'insufficient',
      recommendedPlanCents: null,
      recommendedLivingPercent: null,
    });
  });

  it('offers Pro only after a free member asks for another institution', () => {
    expect(getMoneyConnectionDecision(false)).toBe('offer_pro');
    expect(getMoneyConnectionDecision(true)).toBe('open_connection');
  });

  it('turns the intent into a linked percent and dollar target without asking the user to choose a representation', () => {
    const assessment = buildMoneyOnboardingAssessment(MONEY_ONBOARDING_DEMO_EVIDENCE);

    expect(buildMoneyOnboardingTargetGuidance(assessment, 'complete', 'current')).toMatchObject({
      kind: 'recommendation',
      percent: 70,
      planCents: 665_000,
      observedMonthlySpendingCents: 638_000,
      differenceFromObservedCents: 27_000,
      outsidePlanCents: 285_000,
      markerPercent: 70,
    });
    expect(buildMoneyOnboardingTargetGuidance(assessment, 'complete', 'recommend')).toMatchObject({
      kind: 'recommendation',
      percent: 70,
      markerPercent: 70,
    });
  });

  it('suggests a real reduction below observed spending while protecting regular commitments', () => {
    const assessment = buildMoneyOnboardingAssessment(MONEY_ONBOARDING_DEMO_EVIDENCE);

    expect(buildMoneyOnboardingTargetGuidance(assessment, 'complete', 'reduce')).toMatchObject({
      kind: 'recommendation',
      percent: 65,
      planCents: 617_500,
      differenceFromObservedCents: -20_500,
      markerPercent: 65,
    });
  });

  it('uses a neutral starting point when the person says the connected accounts are incomplete', () => {
    const assessment = buildMoneyOnboardingAssessment(MONEY_ONBOARDING_DEMO_EVIDENCE);

    expect(buildMoneyOnboardingTargetGuidance(assessment, 'partial', 'recommend')).toMatchObject({
      kind: 'starting_point',
      percent: 70,
      markerPercent: null,
      evidenceScope: 'connected_accounts',
    });
  });

  it('still honors a spend-less goal when claims are scoped to connected accounts', () => {
    const assessment = buildMoneyOnboardingAssessment(MONEY_ONBOARDING_DEMO_EVIDENCE);

    expect(buildMoneyOnboardingTargetGuidance(assessment, 'partial', 'reduce')).toMatchObject({
      kind: 'starting_point',
      percent: 65,
      planCents: 617_500,
      differenceFromObservedCents: -20_500,
      markerPercent: null,
      evidenceScope: 'connected_accounts',
    });
  });
});
