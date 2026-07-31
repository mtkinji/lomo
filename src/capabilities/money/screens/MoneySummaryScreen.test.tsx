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

const mockSnapshot = {
  periodLabel: 'July 2026', generatedAt: '2026-07-24T12:00:00Z', lastSyncedAt: '2026-07-24T12:00:00Z',
  totals: { plannedCents: 336000, spentCents: 101704, remainingCents: 234296, needsReviewCount: 0 },
  forecast: { projectedSpendCents: 101704, projectionRangeLowCents: 101704, projectionRangeHighCents: 101704, projectedRemainingCents: 234296, projectedOverageCents: 0, confidence: 'high', atRiskCategoryCount: 0 },
  outsidePlan: { spentCents: 0, transactionCount: 0 }, categories: [], transactions: [], accounts: [],
  livingLimitAnswer: mockAnswer,
} as MoneySnapshot;

jest.mock('../data/MoneyDataContext', () => ({ useMoneyData: () => ({ snapshot: mockSnapshot }) }));
jest.mock('../../../services/analytics/useFeatureFlag', () => ({ useFeatureFlag: () => true }));
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
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-24T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('puts the current answer before the category area and reveals the supporting facts', () => {
    const navigation = { navigate: jest.fn() };
    const screen = render(<MoneySummaryScreen navigation={navigation as never} route={{ key: 'summary', name: 'MoneySummary' } as never} />);

    expect(screen.getByText('$343 left for flexible spending')).toBeTruthy();
    expect(screen.queryByText('$1,017.04 / $3,360 (30%)')).toBeNull();
    expect(screen.getAllByText('Saved transaction history').length).toBeGreaterThan(0);
    fireEvent.press(screen.getByRole('button', { name: 'How this works' }));
    expect(screen.getByText('Planning income')).toBeTruthy();
    expect(screen.getByText('$4,800 · Detected income')).toBeTruthy();
    expect(screen.getByText('Flexible capacity')).toBeTruthy();
    expect(screen.getByText('$1,360')).toBeTruthy();
  });
});
