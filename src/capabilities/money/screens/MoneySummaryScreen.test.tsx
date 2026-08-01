import { fireEvent, render } from '@testing-library/react-native';
import type { MoneySnapshot } from '../data/moneySnapshot';
import { MoneySummaryScreen } from './MoneySummaryScreen';

const mockAnswer: NonNullable<MoneySnapshot['livingLimitAnswer']> = {
  state: 'supported', headlineAmountCents: 34296,
  limitLine: { livingPercent: 70, livingLimitCents: 336000 }, qualification: null,
  recoveryAction: null, reviewTransactionIds: [],
  facts: {
    periodId: '2026-07', planVersionId: 'version-1', policyVersion: 'money-plan-limit-v1',
    resourceBasisCents: 480000, resourceBasisKind: 'detected_income', resourceBasisUpdatedAtIso: '2026-07-24T12:00:00Z',
    livingPercent: 70, livingLimitCents: 336000, protectedPlanCents: 200000, flexibleCapacityCents: 136000,
    countedFlexibleSpendCents: 101704, flexibleRoomCents: 34296, flexibleRoomLowCents: 34296,
    flexibleRoomHighCents: 34296, unresolvedInScopeCents: 0, plannedCents: 336000, unassignedCents: 0,
    overLimitCents: 0, freshness: 'fresh', confidence: 'supported', qualificationReason: null,
  },
};

const initialSnapshot = {
  periodLabel: 'July 2026', generatedAt: '2026-07-24T12:00:00Z', lastSyncedAt: '2026-07-24T12:00:00Z',
  totals: { plannedCents: 336000, spentCents: 101704, remainingCents: 234296, needsReviewCount: 0 },
  forecast: { projectedSpendCents: 101704, projectionRangeLowCents: 101704, projectionRangeHighCents: 101704, projectedRemainingCents: 234296, projectedOverageCents: 0, confidence: 'high', atRiskCategoryCount: 0 },
  outsidePlan: { spentCents: 0, transactionCount: 0 }, categories: [], transactions: [], accounts: [],
  livingLimitAnswer: mockAnswer,
} as MoneySnapshot;

let mockSnapshot = initialSnapshot;
const mockRefresh = jest.fn(async () => undefined);
const mockReconcileGovernedPlanFoundation = jest.fn(async () => undefined);
const mockRefreshStaleMoneySummary = jest.fn(async (_input: unknown) => undefined);

jest.mock('../data/MoneyDataContext', () => ({
  useMoneyData: () => ({
    snapshot: mockSnapshot,
    refresh: mockRefresh,
    reconcileGovernedPlanFoundation: mockReconcileGovernedPlanFoundation,
  }),
}));
jest.mock('../runtime/moneySummaryAutoRefresh', () => ({
  refreshStaleMoneySummary: (input: unknown) => mockRefreshStaleMoneySummary(input),
}));
jest.mock('../../../services/analytics/useFeatureFlag', () => ({ useFeatureFlag: () => false }));
jest.mock('../components/MoneyCategoryMeterTile', () => ({ MoneyCategoryMeterTile: () => null }));
jest.mock('./MoneyScreenFrame', () => {
  const { Text, View } = require('react-native');
  return { MoneyScreenFrame: ({ children, title }: { children: React.ReactNode; title: string }) => <View><Text>{title}</Text>{children}</View> };
});
jest.mock('../../../ui/BottomDrawer', () => {
  const { View } = require('react-native');
  return { BottomDrawer: ({ children, visible }: { children: React.ReactNode; visible: boolean }) => visible ? <View>{children}</View> : null };
});

describe('MoneySummaryScreen living limit answer', () => {
  beforeEach(() => {
    mockSnapshot = initialSnapshot;
    mockRefresh.mockClear();
    mockReconcileGovernedPlanFoundation.mockClear();
    mockRefreshStaleMoneySummary.mockClear();
  });

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-24T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('puts the current answer before the category area even when the remote feature flag is off', () => {
    const navigation = { navigate: jest.fn() };
    const screen = render(<MoneySummaryScreen navigation={navigation as never} route={{ key: 'summary', name: 'MoneySummary' } as never} />);

    expect(screen.getByText('Budget')).toBeTruthy();
    expect(screen.getByText('$342.96 left for flexible spending this month')).toBeTruthy();
    expect(screen.getByText('$1,017.04 of $1,360 used')).toBeTruthy();
    expect(screen.queryByText('$1,017.04 / $3,360 (30%)')).toBeNull();
    expect(screen.getAllByText('Saved transaction history').length).toBeGreaterThan(0);
    fireEvent.press(screen.getByRole('button', { name: 'See monthly plan' }));
    expect(screen.getByText('Monthly living money')).toBeTruthy();
    expect(screen.getByText('Protected costs')).toBeTruthy();
    expect(screen.getByText('Flexible money')).toBeTruthy();
    expect(screen.getByText('$1,360')).toBeTruthy();
    expect(screen.getByText('Flexible spending so far')).toBeTruthy();
    expect(screen.getByText('Left')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Change plan' }));
    expect(navigation.navigate).toHaveBeenCalledWith('MoneyLivingPlan');
  });

  it('quietly refreshes stale connected activity without adding a user decision', () => {
    mockSnapshot = {
      ...initialSnapshot,
      livingLimitAnswer: {
        ...mockAnswer,
        state: 'stale',
        recoveryAction: 'refresh',
        facts: { ...mockAnswer.facts, freshness: 'stale', qualificationReason: 'stale_evidence' },
      },
    };
    const navigation = { navigate: jest.fn() };
    const screen = render(<MoneySummaryScreen navigation={navigation as never} route={{ key: 'summary', name: 'MoneySummary' } as never} />);

    expect(mockRefreshStaleMoneySummary).toHaveBeenCalledWith({
      reconcileGovernedPlanFoundation: mockReconcileGovernedPlanFoundation,
      refreshSnapshot: mockRefresh,
    });
    expect(screen.queryByText(/transactions need/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open connected accounts' })).toBeNull();
    expect(screen.getByText('$342.96 left for flexible spending this month')).toBeTruthy();
  });
});
