import type { Activity, Goal } from '../../../domain/types';

export const MONEY_ONBOARDING_SAVINGS_GOAL_ID = 'goal-money-onboarding-spend-less-v1';

export type MoneyOnboardingFollowThrough = {
  goal: Goal;
  activities: Activity[];
  savingsCents: number;
};

export function buildMoneyOnboardingFollowThrough({
  createdAtIso,
  evidenceScope,
  observedMonthlySpendingCents,
  selectedPlanCents,
}: {
  createdAtIso: string;
  evidenceScope: 'household' | 'connected_accounts';
  observedMonthlySpendingCents: number | null;
  selectedPlanCents: number;
}): MoneyOnboardingFollowThrough {
  const observed = validCents(observedMonthlySpendingCents);
  const selected = Math.max(0, Math.round(selectedPlanCents));
  const savingsCents = observed == null ? 0 : Math.max(0, observed - selected);
  const scope = evidenceScope === 'household'
    ? 'across your household'
    : 'in the accounts you connected';
  const goalTitle = savingsCents > 0
    ? `Spend ${formatMoney(savingsCents)} less each month`
    : 'Spend less each month';
  const description = savingsCents > 0
    ? `Keep monthly spending near ${formatMoney(selected)}. That would save about ${formatMoney(savingsCents)} from the recent pace Kwilt found ${scope}.`
    : `Keep monthly spending near ${formatMoney(selected)} while Kwilt learns which costs are practical to change ${scope}.`;

  const goal: Goal = {
    id: MONEY_ONBOARDING_SAVINGS_GOAL_ID,
    arcId: null,
    title: goalTitle,
    description,
    status: 'in_progress',
    qualityState: 'draft',
    startDate: createdAtIso,
    forceIntent: {},
    metrics: [],
    createdAt: createdAtIso,
    updatedAt: createdAtIso,
  };

  return {
    goal,
    savingsCents,
    activities: [
      buildStarterActivity({
        id: 'activity-money-onboarding-review-recurring-v1',
        title: 'Review recurring services for one to stop or downgrade',
        notes: 'Start with services you no longer use or could replace with a less expensive option.',
        createdAtIso,
        priority: 1,
      }),
      buildStarterActivity({
        id: 'activity-money-onboarding-lower-cost-food-week-v1',
        title: 'Plan one lower-cost week of meals',
        notes: 'Use meals your household already likes and reuse ingredients across the week.',
        createdAtIso,
        priority: 2,
      }),
    ],
  };
}

function buildStarterActivity({
  createdAtIso,
  id,
  notes,
  priority,
  title,
}: {
  createdAtIso: string;
  id: string;
  notes: string;
  priority: 1 | 2;
  title: string;
}): Activity {
  return {
    id,
    goalId: MONEY_ONBOARDING_SAVINGS_GOAL_ID,
    title,
    type: 'task',
    tags: ['Money'],
    notes,
    reminderAt: null,
    priority,
    priorityState: 'active',
    priorityRankSource: 'auto',
    priorityReasonCodes: ['explicit_priority', 'goal_priority'],
    estimateMinutes: priority === 1 ? 15 : 20,
    difficulty: 'easy',
    creationSource: 'ai',
    status: 'planned',
    forceActual: {},
    createdAt: createdAtIso,
    updatedAt: createdAtIso,
  };
}

function validCents(value: number | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : null;
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Math.abs(cents) % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
