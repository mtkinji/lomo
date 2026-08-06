import { fireEvent, render } from '@testing-library/react-native';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { MoneySnapshot } from '../data/moneySnapshot';
import { MoneySummaryScreen } from './MoneySummaryScreen';

const mockAnswer: NonNullable<MoneySnapshot['livingLimitAnswer']> = {
  state: 'supported', headlineAmountCents: 34296,
  limitLine: { livingPercent: 70, livingLimitCents: 336000 }, qualification: null,
  recoveryAction: null, reviewTransactionIds: [],
  facts: {
    periodId: '2026-07', planVersionId: 'version-1', policyVersion: 'money-plan-limit-v2',
    resourceBasisCents: 480000, resourceBasisKind: 'detected_income', resourceBasisUpdatedAtIso: '2026-07-24T12:00:00Z',
    livingPercent: 70, livingLimitCents: 336000, protectedPlanCents: 200000, protectedOverageCents: 0, flexibleCapacityCents: 136000,
    countedFlexibleSpendCents: 101704, flexibleRoomCents: 34296, flexibleRoomLowCents: 34296,
    flexibleRoomHighCents: 34296, unresolvedInScopeCents: 0, plannedCents: 336000, unassignedCents: 0,
    overLimitCents: 0, freshness: 'fresh', confidence: 'supported', qualificationReason: null,
  },
};

const initialSnapshot = {
  periodLabel: 'July 2026', generatedAt: '2026-07-24T12:00:00Z', lastSyncedAt: '2026-07-24T12:00:00Z',
  totals: { plannedCents: 336000, spentCents: 101704, remainingCents: 234296, needsReviewCount: 0 },
  forecast: { projectedSpendCents: 101704, projectionRangeLowCents: 101704, projectionRangeHighCents: 101704, projectedRemainingCents: 234296, projectedOverageCents: 0, confidence: 'high', atRiskCategoryCount: 0 },
  outsidePlan: { spentCents: 0, transactionCount: 0 }, categories: [], transactions: [
    transaction('flexible-purchase', 101704),
    transaction('account-transfer', 5000, { providerCategoryDetailed: 'TRANSFER_OUT_ACCOUNT_TRANSFER' }),
  ], accounts: [],
  livingLimitAnswer: mockAnswer,
} as MoneySnapshot;

let mockSnapshot = initialSnapshot;
const mockRefresh = jest.fn(async () => undefined);
const mockReconcileGovernedPlanFoundation = jest.fn(async () => undefined);
const mockRefreshStaleMoneySummary = jest.fn(async (_input: unknown) => undefined);
const mockReorderCategories = jest.fn(async (_categoryIds: string[]) => undefined);

jest.mock('../data/MoneyDataContext', () => ({
  useMoneyData: () => ({
    snapshot: mockSnapshot,
    refresh: mockRefresh,
    reconcileGovernedPlanFoundation: mockReconcileGovernedPlanFoundation,
    reorderCategories: mockReorderCategories,
    savingCategoryOrder: false,
  }),
}));
jest.mock('../runtime/moneySummaryAutoRefresh', () => ({
  refreshStaleMoneySummary: (input: unknown) => mockRefreshStaleMoneySummary(input),
}));
jest.mock('../../../services/analytics/useFeatureFlag', () => ({ useFeatureFlag: () => false }));
jest.mock('../components/MoneyCategoryMeterTile', () => ({
  ...jest.requireActual('../components/MoneyCategoryMeterTile'),
  MoneyCategoryListRow: ({ category }: { category: { name: string } }) => {
    const { Text } = require('react-native');
    return <Text>{category.name}</Text>;
  },
  MoneyCategoryMeterTile: ({ category }: { category: { name: string } }) => {
    const { Text } = require('react-native');
    return <Text>{category.name}</Text>;
  },
}));
jest.mock('./MoneyScreenFrame', () => {
  const { Text, View } = require('react-native');
  return { MoneyScreenFrame: ({ children, title }: { children: React.ReactNode; title: string }) => <View><Text>{title}</Text>{children}</View> };
});
jest.mock('../../../ui/BottomDrawer', () => {
  const { View } = require('react-native');
  return {
    BottomDrawer: ({ children, visible }: { children: React.ReactNode; visible: boolean }) => visible ? <View>{children}</View> : null,
    BottomDrawerScrollView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

describe('MoneySummaryScreen living limit answer', () => {
  beforeEach(() => {
    mockSnapshot = initialSnapshot;
    mockRefresh.mockClear();
    mockReconcileGovernedPlanFoundation.mockClear();
    mockRefreshStaleMoneySummary.mockClear();
    mockReorderCategories.mockClear();
  });

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-24T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('puts the current answer inside the flexible section even when the remote feature flag is off', () => {
    const navigation = { navigate: jest.fn() };
    const screen = render(<MoneySummaryScreen navigation={navigation as never} route={{ key: 'summary', name: 'MoneySummary' } as never} />);

    expect(screen.getByText('Budget')).toBeTruthy();
    expect(screen.getByTestId('money-limit-amount-row').props.accessibilityLabel).toBe('$342.96 left');
    expect(screen.getByText('left')).toBeTruthy();
    expect(screen.getByText('out of $1,360')).toBeTruthy();
    expect(screen.getAllByText('Flexible spending').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('money-limit-header')).toBeNull();
    expect(screen.queryByText('Categories')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'View category display' }).length).toBeGreaterThan(0);
    expect(screen.queryByText('$1,017.04 / $3,360 (30%)')).toBeNull();
    expect(screen.getAllByText('Saved transaction history').length).toBeGreaterThan(0);
    fireEvent.press(screen.getByRole('button', { name: 'What’s included?' }));
    expect(screen.getAllByText('Flexible spending').length).toBeGreaterThan(0);
    expect(screen.getByText('$342.96 left this month')).toBeTruthy();
    expect(screen.getByText('YOUR MONTHLY BOUNDARY')).toBeTruthy();
    expect(screen.getByText('Living target · 70%')).toBeTruthy();
    expect(screen.getByText('Bills and money set aside')).toBeTruthy();
    expect(screen.getByText('Flexible room')).toBeTruthy();
    expect(screen.getByText('THIS MONTH')).toBeTruthy();
    expect(screen.getByText('$1,360')).toBeTruthy();
    expect(screen.getByText('Left')).toBeTruthy();
    expect(screen.getByText('All July activity is accounted for')).toBeTruthy();
    expect(screen.queryByText('Protected costs')).toBeNull();
    expect(screen.queryByText('Not included in flexible spending')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Adjust plan' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Change 70% living target' }));
    expect(navigation.navigate).toHaveBeenCalledWith('MoneyLivingPlan');
  });

  it('separates flexible and committed categories and explains both concepts', () => {
    mockSnapshot = {
      ...initialSnapshot,
      categories: [
        category('groceries', 'Groceries', 'flexible'),
        category('housing', 'Housing', 'protected'),
      ],
    };
    const navigation = { navigate: jest.fn() };
    const screen = render(<MoneySummaryScreen navigation={navigation as never} route={{ key: 'summary', name: 'MoneySummary' } as never} />);

    expect(screen.getAllByText('Flexible spending').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Groceries').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Committed spending').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Housing').length).toBeGreaterThan(0);

    const flexibleInfo = screen.getAllByRole('button', { name: 'About flexible spending' })[0];
    expect(flexibleInfo.props.accessibilityHint).toBe('Everyday categories that use the flexible spending amount shown here.');
    fireEvent.press(flexibleInfo);
    expect(flexibleInfo.props.accessibilityState).toMatchObject({ expanded: true });
    fireEvent.press(flexibleInfo);

    const committedInfo = screen.getAllByRole('button', { name: 'About committed spending' })[0];
    expect(committedInfo.props.accessibilityHint).toBe('Bills and money already set aside before your flexible spending is calculated.');
    fireEvent.press(committedInfo);
    expect(committedInfo.props.accessibilityState).toMatchObject({ expanded: true });
  });

  it('opens category reordering from the View menu', () => {
    const source = readFileSync(path.join(__dirname, 'MoneySummaryScreen.tsx'), 'utf8');
    expect(source).toContain('<DropdownMenuSeparator />');
    expect(source).toContain('accessibilityLabel="Reorder categories" onPress={onReorder}');
    expect(source).toContain('<MoneyCategoryReorderDrawer');
  });

  it('opens the exact transactions behind flexible spending', () => {
    const navigation = { navigate: jest.fn() };
    const screen = render(<MoneySummaryScreen navigation={navigation as never} route={{ key: 'summary', name: 'MoneySummary' } as never} />);

    fireEvent.press(screen.getByRole('button', { name: 'What’s included?' }));
    fireEvent.press(screen.getByRole('button', { name: 'Review flexible spending transactions' }));

    expect(navigation.navigate).toHaveBeenCalledWith('MoneyTransactions', {
      inventoryTitle: 'Flexible spending',
      reviewTransactionIds: ['flexible-purchase'],
    });
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
    expect(screen.getByTestId('money-limit-amount-row').props.accessibilityLabel).toBe('$342.96 left');
    expect(screen.getByText('left')).toBeTruthy();
  });
});

function transaction(id: string, amountCents: number, overrides: Record<string, unknown> = {}) {
  return {
    id, accountId: 'checking', accountName: 'Checking', institutionName: 'Bank', merchantName: id,
    amountCents, direction: 'outflow', date: '2026-07-15', pending: false,
    currencyCode: 'USD', categoryId: null, categoryName: 'Needs review', reviewState: 'needs_review', moneyMeaning: null,
    ...overrides,
  };
}

function category(id: string, name: string, planRole: 'protected' | 'flexible'): MoneySnapshot['categories'][number] {
  return {
    id,
    sourceId: id,
    name,
    description: null,
    accentColor: '#315545',
    plannedCents: 10000,
    spentCents: 2500,
    remainingCents: 7500,
    percentUsed: 25,
    transactionCount: 0,
    rolloverEnabled: false,
    fundingRhythm: 'monthly',
    fundingPolicyVersion: null,
    starterWeight: 1,
    monthlyContributionCents: 10000,
    reserveAvailableCents: 0,
    reserveBalanceCents: 0,
    reserveBalancePeriodId: null,
    reserveAvailabilityKnown: true,
    expectedNeed: null,
    fundingCoverage: { status: 'none' },
    forecastSettings: { mode: 'paced', manualProjectedSpendCents: null, scheduledAmountCents: null, scheduledDueDay: null },
    forecast: {
      mode: 'paced', claim: 'monthly_range', expectedSpendCents: 2500, projectedSpendCents: 2500,
      projectionRangeLowCents: 2500, projectionRangeHighCents: 2500, projectedRemainingCents: 7500,
      projectedOverageCents: 0, confidence: 'high', status: 'steady',
    },
    planRole,
  };
}
