export type CashflowMeaning = 'income' | 'category_credit' | 'internal_transfer' | 'not_counted' | 'unknown';

export type PlanningRole =
  | 'recurring_planning_income'
  | 'irregular_planning_income'
  | 'asset_proceeds'
  | 'one_time_inflow'
  | 'ineligible_or_unknown';

export type PlanningIncomeSourceInput = {
  sourceKey: string;
  description: string;
  accountType?: string;
  providerCategory?: string;
  samples: number[];
  activePeriodCount: number;
  pairedTransfer?: boolean;
  matchedRefund?: boolean;
  userPlanningRole?: PlanningRole;
};

export type PlanningIncomeReceipt = {
  sourceKey: string;
  cashflowMeaning: CashflowMeaning;
  planningRole: PlanningRole;
  confidence: 'low' | 'medium' | 'high';
  eligibleForPlanning: boolean;
  expectedMonthlyCents: number;
  activePeriodCount: number;
  evidence: string[];
};

const ASSET_PATTERN = /\b(brokerage|fidelity|schwab|vanguard|robinhood|investment|securities|stock sale|reserve withdrawal|savings withdrawal)\b/;
const ONE_TIME_PATTERN = /\b(bonus|gift|inheritance|windfall|loan proceeds|loan disbursement)\b/;
const VARIABLE_PATTERN = /\b(commission|commissions|gig|contractor|business distribution|freelance)\b/;
const REGULAR_PATTERN = /\b(payroll|salary|benefit|pension|social security|employer)\b/;

export function classifyPlanningIncomeSource(input: PlanningIncomeSourceInput): PlanningIncomeReceipt {
  const description = `${input.description} ${input.providerCategory ?? ''}`.toLowerCase();
  const providerMarksIncome = /^income(?:\b|_)/i.test(input.providerCategory ?? '');
  const samples = input.samples.filter((value) => Number.isFinite(value) && value > 0).map(Math.round);
  const explicitRole = input.userPlanningRole;

  if (input.pairedTransfer) {
    return receipt(input, 'internal_transfer', 'ineligible_or_unknown', 'high', false, 0, ['paired owned-account transfer']);
  }
  if (input.matchedRefund) {
    return receipt(input, 'category_credit', 'ineligible_or_unknown', 'high', false, 0, ['matched prior outflow']);
  }
  if (explicitRole) {
    const eligible = explicitRole === 'recurring_planning_income' || explicitRole === 'irregular_planning_income';
    return receipt(input, 'income', explicitRole, 'high', eligible, eligible ? expectedForRole(explicitRole, samples) : 0, ['user-confirmed source rule']);
  }
  if (ASSET_PATTERN.test(description) || /investment|brokerage/.test(input.accountType ?? '')) {
    return receipt(input, 'income', 'asset_proceeds', 'high', false, 0, ['investment or reserve provenance']);
  }
  if (ONE_TIME_PATTERN.test(description)) {
    return receipt(input, 'income', 'one_time_inflow', 'high', false, 0, ['one-time source marker']);
  }
  if (VARIABLE_PATTERN.test(description) && input.activePeriodCount >= 3 && samples.length >= 3) {
    return receipt(input, 'income', 'irregular_planning_income', input.activePeriodCount >= 6 ? 'high' : 'medium', true, conservativeRange(samples), ['variable source', `${input.activePeriodCount} completed periods`]);
  }
  const regularSamples = recurringInliers(samples);
  const clearsPlanningFloor = median(regularSamples) >= 50000;
  if ((REGULAR_PATTERN.test(description) || providerMarksIncome) && input.activePeriodCount >= 3 && regularSamples.length >= 3 && isStable(regularSamples) && clearsPlanningFloor) {
    const excludedCount = samples.length - regularSamples.length;
    return receipt(input, 'income', 'recurring_planning_income', 'high', true, median(regularSamples), ['recurring source', `${input.activePeriodCount} completed periods`, ...(excludedCount ? [`${excludedCount} off-pattern amount excluded`] : [])]);
  }
  const conservativeExpected = conservativeRange(samples);
  if (providerMarksIncome && input.activePeriodCount >= 6 && samples.length >= 6 && conservativeExpected >= 50000) {
    return receipt(input, 'income', 'irregular_planning_income', 'high', true, conservativeExpected, ['provider-backed variable income', `${input.activePeriodCount} completed periods`, 'lower completed-period range']);
  }
  return receipt(input, 'unknown', 'ineligible_or_unknown', 'low', false, 0, ['insufficient planning evidence']);
}

function receipt(
  input: PlanningIncomeSourceInput,
  cashflowMeaning: CashflowMeaning,
  planningRole: PlanningRole,
  confidence: PlanningIncomeReceipt['confidence'],
  eligibleForPlanning: boolean,
  expectedMonthlyCents: number,
  evidence: string[],
): PlanningIncomeReceipt {
  return { sourceKey: input.sourceKey, cashflowMeaning, planningRole, confidence, eligibleForPlanning, expectedMonthlyCents, activePeriodCount: input.activePeriodCount, evidence };
}

function expectedForRole(role: PlanningRole, samples: number[]): number {
  return role === 'irregular_planning_income' ? conservativeRange(samples) : median(samples);
}

function isStable(values: number[]): boolean {
  const center = median(values);
  if (center <= 0) return false;
  return values.every((value) => Math.abs(value - center) <= Math.max(1000, center * 0.25));
}

function recurringInliers(values: number[]): number[] {
  const center = median(values);
  if (center <= 0) return [];
  return values.filter((value) => value >= center * 0.5 && value <= center * 1.75);
}

function conservativeRange(values: number[]): number {
  const ordered = [...values].sort((a, b) => a - b);
  if (ordered.length === 0) return 0;
  const lowerQuartileIndex = Math.floor((ordered.length - 1) * 0.25);
  return ordered[lowerQuartileIndex];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : Math.round((ordered[middle - 1] + ordered[middle]) / 2);
}
