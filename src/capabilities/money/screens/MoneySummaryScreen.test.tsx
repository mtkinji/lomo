import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { StyleSheet } from 'react-native';
import type { MoneySnapshot } from '../data/moneySnapshot';
import { MoneyOnboardingHandoffGuide, MoneySummaryScreen } from './MoneySummaryScreen';
import type { MoneyOnboardingHandoffState } from '../domain/moneyOnboardingHandoff';
import { colors, spacing } from '../../../theme';
import { setProEntitlement } from '../../../test/storeFixtures';

const mockAnswer: NonNullable<MoneySnapshot['livingLimitAnswer']> = {
  state: 'supported', headlineAmountCents: 34296,
  limitLine: { livingPercent: 70, livingLimitCents: 336000 }, qualification: null,
  recoveryAction: null, reviewTransactionIds: [],
  facts: {
    periodId: '2026-07', planVersionId: 'version-1', policyVersion: 'money-plan-limit-v3',
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
    transaction('flexible-purchase', 101704, { planRoleOverride: 'flexible', reviewState: 'assigned' }),
    transaction('account-transfer', 5000, { providerCategoryDetailed: 'TRANSFER_OUT_ACCOUNT_TRANSFER' }),
  ], accounts: [],
  livingLimitAnswer: mockAnswer,
  monthlyPlan: {
    periodId: '2026-07', regularPlanCents: 336000, committedPlanCents: 200000,
    flexiblePlanCents: 136000, additionCents: 0, plannedOutflowCents: 336000,
    derivation: 'detected_income',
  },
} as MoneySnapshot;

let mockSnapshot = initialSnapshot;
const mockReconcileConnectedActivity = jest.fn(async () => null);
const mockRefresh = jest.fn(async () => undefined);
const mockRefreshStaleMoneySummary = jest.fn(async (_input: unknown) => undefined);
const mockReorderCategories = jest.fn(async (_categoryIds: string[]) => undefined);
const mockRootNavigate = jest.fn();
const mockConnectMoneyAccount = jest.fn();
let mockMoneyScreenFrameOnRefresh: (() => Promise<unknown>) | undefined;
const mockBottomDrawerProps: Array<Record<string, unknown>> = [];

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 34, left: 0 }),
}));
jest.mock('../data/MoneyDataContext', () => ({
  useMoneyData: () => ({
    snapshot: mockSnapshot,
    refresh: mockRefresh,
    reconcileConnectedActivity: mockReconcileConnectedActivity,
    reorderCategories: mockReorderCategories,
    savingCategoryOrder: false,
    userId: null,
  }),
}));
jest.mock('../runtime/moneySummaryAutoRefresh', () => ({
  refreshStaleMoneySummary: (input: unknown) => mockRefreshStaleMoneySummary(input),
}));
jest.mock('../../../navigation/rootNavigationRef', () => ({
  rootNavigationRef: { navigate: (...args: unknown[]) => mockRootNavigate(...args) },
}));
jest.mock('../runtime/connectMoneyAccount', () => ({
  connectMoneyAccount: (...args: unknown[]) => mockConnectMoneyAccount(...args),
}));
jest.mock('../native/moneyPlaidLink', () => ({
  startMoneyPlaidLink: jest.fn(),
}));
jest.mock('../../../services/analytics/useFeatureFlag', () => ({ useFeatureFlag: () => false }));
jest.mock('../components/MoneyCategoryMeterTile', () => ({
  ...jest.requireActual('../components/MoneyCategoryMeterTile'),
  MoneyCategoryListRow: ({ category, targetRef }: { category: { name: string }; targetRef?: unknown }) => {
    const { Text, View } = require('react-native');
    return <View testID={targetRef ? `guide-target-${category.name}` : undefined}><Text>{category.name}</Text></View>;
  },
  MoneyCategoryMeterTile: ({ category, targetRef }: { category: { name: string }; targetRef?: unknown }) => {
    const { Text, View } = require('react-native');
    return <View testID={targetRef ? `guide-target-${category.name}` : undefined}><Text>{category.name}</Text></View>;
  },
}));
jest.mock('./MoneyScreenFrame', () => {
  const { Text, View } = require('react-native');
  return {
    MoneyScreenFrame: ({ children, headerRightElement, moreMenu, onRefresh, title }: {
      children: React.ReactNode;
      headerRightElement?: React.ReactNode;
      moreMenu?: React.ReactNode;
      onRefresh?: () => Promise<unknown>;
      title: string;
    }) => {
      mockMoneyScreenFrameOnRefresh = onRefresh;
      return <View><Text>{title}</Text>{moreMenu}{headerRightElement}{children}</View>;
    },
  };
});
jest.mock('../../../ui/BottomDrawer', () => {
  const { View } = require('react-native');
  return {
    BottomDrawer: ({ children, visible, bottomAccessory, ...props }: {
      children: React.ReactNode;
      visible: boolean;
      bottomAccessory?: React.ReactNode;
    } & Record<string, unknown>) => {
      mockBottomDrawerProps.push({ visible, ...props });
      return visible ? (
        <View>
          {children}
          <View testID="money-bottom-guide-accessory">{bottomAccessory}</View>
        </View>
      ) : null;
    },
    BottomDrawerScrollView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});
jest.mock('../../../ui/Coachmark', () => {
  const { View } = require('react-native');
  return { Coachmark: ({ visible }: { visible: boolean }) => visible ? <View testID="money-app-control-guide" /> : null };
});
jest.mock('../../../ui/CelebrationGif', () => {
  const { View } = require('react-native');
  return { CelebrationGif: () => <View testID="money-budget-ready-celebration" /> };
});
jest.mock('../../../ui/DropdownMenu', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');
  const MenuContext = React.createContext({ open: false, setOpen: (_open: boolean) => undefined });
  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) => {
      const [open, setOpen] = React.useState(false);
      return <MenuContext.Provider value={{ open, setOpen }}>{children}</MenuContext.Provider>;
    },
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => {
      const { open } = React.useContext(MenuContext);
      return open ? <View>{children}</View> : null;
    },
    DropdownMenuItem: ({ accessibilityLabel, children, label, onPress }: {
      accessibilityLabel?: string;
      children?: React.ReactNode;
      label?: string;
      onPress?: () => void;
    }) => {
      const { setOpen } = React.useContext(MenuContext);
      return (
        <Pressable accessibilityLabel={accessibilityLabel ?? label} accessibilityRole="menuitem" onPress={() => { onPress?.(); setOpen(false); }}>
          {children ?? <Text>{label}</Text>}
        </Pressable>
      );
    },
    DropdownMenuRadioGroup: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    DropdownMenuRadioItem: ({ accessibilityLabel, children, onPress }: {
      accessibilityLabel?: string;
      children?: React.ReactNode;
      onPress?: () => void;
    }) => <Pressable accessibilityLabel={accessibilityLabel} onPress={onPress}>{children}</Pressable>,
    DropdownMenuSeparator: () => <View />,
    DropdownMenuTrigger: ({ children }: { children: React.ReactElement<{
      accessibilityState?: Record<string, unknown>;
      onPress?: () => void;
    }> }) => {
      const { open, setOpen } = React.useContext(MenuContext);
      return React.cloneElement(children, {
        accessibilityState: { ...children.props.accessibilityState, expanded: open },
        onPress: () => {
          children.props.onPress?.();
          setOpen(!open);
        },
      });
    },
  };
});

describe('MoneySummaryScreen living limit answer', () => {
  beforeEach(() => {
    setProEntitlement(true);
    mockSnapshot = initialSnapshot;
    mockMoneyScreenFrameOnRefresh = undefined;
    mockBottomDrawerProps.length = 0;
    mockReconcileConnectedActivity.mockClear();
    mockRefresh.mockClear();
    mockRefreshStaleMoneySummary.mockClear();
    mockReorderCategories.mockClear();
    mockRootNavigate.mockClear();
    mockConnectMoneyAccount.mockReset().mockResolvedValue({ status: 'connected', institutionName: 'Chase' });
  });

  it('checks connected institutions before rebuilding Budget on pull-to-refresh', async () => {
    mockSnapshot = {
      ...initialSnapshot,
      accounts: [{
        id: 'account-1', name: 'Credit card', institutionName: 'Bank', mask: '1234',
        type: 'credit', subtype: 'credit card', status: 'healthy',
        lastSyncedAt: initialSnapshot.lastSyncedAt, transactionCount: 1,
        latestTransactionDate: '2026-07-24',
      }],
    };
    const screen = render(<MoneySummaryScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'summary-refresh', name: 'MoneySummary' } as never} />);

    expect(screen.getByRole('button', { name: 'Connect another account' })).toBeTruthy();

    await act(async () => {
      await mockMoneyScreenFrameOnRefresh?.();
    });

    expect(mockReconcileConnectedActivity).toHaveBeenCalledWith({ trigger: 'manual_sync', sync: true });
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(screen.getByText('Just now')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(5_000);
    });

    expect(screen.getByRole('button', { name: 'Connect another account' })).toBeTruthy();
  });

  it('shows checking while connected-account refresh is still in flight', async () => {
    let finishRefresh: (() => void) | undefined;
    mockSnapshot = {
      ...initialSnapshot,
      accounts: [{
        id: 'account-1', name: 'Credit card', institutionName: 'Bank', mask: '1234',
        type: 'credit', subtype: 'credit card', status: 'healthy',
        lastSyncedAt: initialSnapshot.lastSyncedAt, transactionCount: 1,
        latestTransactionDate: '2026-07-24',
      }],
    };
    mockReconcileConnectedActivity.mockImplementationOnce(() => new Promise((resolve) => {
      finishRefresh = () => resolve(null);
    }));
    const screen = render(<MoneySummaryScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'summary-refresh-pending', name: 'MoneySummary' } as never} />);

    let refreshRequest: Promise<unknown> | undefined;
    act(() => {
      refreshRequest = mockMoneyScreenFrameOnRefresh?.();
    });

    expect(screen.getByLabelText('Checking for new activity')).toBeTruthy();

    await act(async () => {
      finishRefresh?.();
      await refreshRequest;
    });
  });

  it('keeps a failed refresh action visible for retry', async () => {
    mockSnapshot = {
      ...initialSnapshot,
      accounts: [{
        id: 'account-1', name: 'Credit card', institutionName: 'Bank', mask: '1234',
        type: 'credit', subtype: 'credit card', status: 'healthy',
        lastSyncedAt: initialSnapshot.lastSyncedAt, transactionCount: 1,
        latestTransactionDate: '2026-07-24',
      }],
    };
    mockReconcileConnectedActivity.mockRejectedValueOnce(new Error('Provider unavailable'));
    const screen = render(<MoneySummaryScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'summary-refresh-error', name: 'MoneySummary' } as never} />);

    await act(async () => {
      await expect(mockMoneyScreenFrameOnRefresh?.()).rejects.toThrow('Provider unavailable');
    });

    fireEvent.press(screen.getByRole('button', { name: 'Couldn’t refresh bank data. Try again' }));

    await act(async () => undefined);

    expect(mockReconcileConnectedActivity).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Just now')).toBeTruthy();
  });

  it('reloads Kwilt data without asking Plaid when Budget has no connected accounts', async () => {
    render(<MoneySummaryScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'summary-empty-refresh', name: 'MoneySummary' } as never} />);

    await act(async () => {
      await mockMoneyScreenFrameOnRefresh?.();
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockReconcileConnectedActivity).not.toHaveBeenCalled();
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
    expect(screen.getByTestId('money-limit-amount-row').props.accessibilityLabel).toBe('$343 left');
    expect(screen.queryByText('Committed spending plan')).toBeNull();
    expect(screen.queryByText('Planned flexible spending')).toBeNull();
    expect(screen.getByText('left')).toBeTruthy();
    expect(screen.queryByText('Current budget $1,360')).toBeNull();
    expect(screen.getByText('Monthly plan')).toBeTruthy();
    expect(within(screen.getByTestId('money-month-summary')).getAllByText('$3,360').length).toBeGreaterThan(0);
    const monthSummary = screen.getByTestId('money-month-summary');
    expect(within(monthSummary).getByText('July summary')).toBeTruthy();
    expect(within(monthSummary).getByText('ACTUAL')).toBeTruthy();
    expect(within(monthSummary).getByText('Income received')).toBeTruthy();
    expect(within(monthSummary).getByText('$0')).toBeTruthy();
    expect(within(monthSummary).getByText('Total spent')).toBeTruthy();
    expect(within(monthSummary).getByText('$1,017')).toBeTruthy();
    expect(within(monthSummary).getByText('Difference')).toBeTruthy();
    expect(within(monthSummary).getByText('-$1,017')).toBeTruthy();
    expect(within(monthSummary).getByText('TARGET & PLAN')).toBeTruthy();
    expect(within(monthSummary).getByText('Plan target · 70%')).toBeTruthy();
    expect(within(monthSummary).getByText('Monthly plan')).toBeTruthy();
    expect(within(monthSummary).getByText('On target')).toBeTruthy();
    expect(monthSummary.props.accessibilityLabel).toContain('$1,017.04 spent');
    expect(monthSummary.props.accessibilityLabel).toContain('$1,017.04 spent, -$1,017 difference');
    fireEvent.press(monthSummary);
    expect(screen.getByRole('header', { name: 'July summary' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Review monthly plan' }));
    expect(mockRootNavigate).toHaveBeenCalledWith('Settings', { screen: 'SettingsBudget' });
    expect(screen.getAllByText('Flexible spending').length).toBeGreaterThan(0);
    expect(screen.getByTestId('money-limit-header')).toBeTruthy();
    expect(screen.queryByText('Categories')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'View category display' }).length).toBeGreaterThan(0);
    const monthSwitcher = screen.getByTestId('money-month-switcher');
    expect(monthSwitcher).toBeTruthy();
    expect(within(monthSwitcher).queryByText('July 2026')).toBeNull();
    expect(screen.getByText('July 2026')).toBeTruthy();
    fireEvent.press(screen.getByTestId('money-add-category-fab'));
    expect(navigation.navigate).toHaveBeenCalledWith('MoneyCategoryCreate');
    expect(StyleSheet.flatten(screen.getAllByTestId('money-flexible-category-collection')[0].props.style)).toMatchObject({
      marginTop: spacing.sm,
      borderWidth: 0,
      backgroundColor: colors.fieldFill,
    });
    expect(screen.queryByText('$1,017.04 / $3,360 (30%)')).toBeNull();
    expect(screen.getAllByText('Saved transaction history').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'What’s included?' })).toBeNull();
    fireEvent.press(screen.getByTestId('money-limit-explanation-trigger'));
    expect(screen.getByText('Spending you can adjust month to month, after bills and money set aside.')).toBeTruthy();
    expect(screen.queryByText('HOW YOUR FLEXIBLE ROOM WORKS')).toBeNull();
    fireEvent.press(monthSummary);
    expect(screen.getByText('SPENDING')).toBeTruthy();
    expect(screen.getAllByText('TARGET & PLAN').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Monthly plan').length).toBeGreaterThan(0);
    expect(screen.getByText('Bills and money set aside')).toBeTruthy();
    expect(screen.getByText('Flexible spending from plan')).toBeTruthy();
    expect(screen.getByText('Budget $1,360 · $342.96 left')).toBeTruthy();
    expect(screen.getByText('Left in plan')).toBeTruthy();
    expect(screen.getByText('$50 in income, transfers, and other non-spending activity is outside this total.')).toBeTruthy();
    expect(screen.queryByText('Protected costs')).toBeNull();
    expect(screen.queryByText('Not included in flexible spending')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Adjust plan' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Monthly living boundary · 70%' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Flexible spending this month' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Change 70% target' })).toBeNull();
    expect(mockBottomDrawerProps.some((props) => (
      Array.isArray(props.snapPoints) && props.snapPoints.includes('78%')
    ))).toBe(false);
  });

  it('keeps actual spending primary and routes an above-target plan to adjustment', () => {
    mockSnapshot = {
      ...initialSnapshot,
      livingLimitAnswer: {
        ...mockAnswer,
        state: 'over_limit',
        headlineAmountCents: 5000,
        facts: {
          ...mockAnswer.facts,
          livingLimitCents: 75000,
          flexibleCapacityCents: 60000,
          countedFlexibleSpendCents: 40000,
          flexibleRoomCents: 20000,
          flexibleRoomLowCents: 20000,
          flexibleRoomHighCents: 20000,
          plannedCents: 80000,
          overLimitCents: 5000,
        },
      },
      monthlyPlan: {
        ...initialSnapshot.monthlyPlan!,
        regularPlanCents: 80000,
        committedPlanCents: 20000,
        flexiblePlanCents: 60000,
        plannedOutflowCents: 80000,
      },
    };

    const screen = render(<MoneySummaryScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'actual-first', name: 'MoneySummary' } as never} />);

    expect(screen.getByTestId('money-limit-amount-row').props.accessibilityLabel).toBe('$200 left');
    expect(screen.queryByRole('button', { name: 'Review overages' })).toBeNull();
    expect(screen.getByText('Plan is $50 above target')).toBeTruthy();
    expect(screen.getByText('$800 planned · 70% target $750')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Adjust monthly plan' }));
    expect(mockRootNavigate).toHaveBeenCalledWith('Settings', { screen: 'SettingsBudget' });
  });

  it('shows actual spending without charging saved-money or outside-plan spending to the plan result', () => {
    mockSnapshot = {
      ...initialSnapshot,
      transactions: [
        transaction('paycheck', 100000, { direction: 'inflow', moneyMeaning: 'income' }),
        transaction('purchase', 50000, {
          planRoleOverride: 'flexible', reviewState: 'assigned', savedResourceCents: 10000,
        }),
        transaction('outside', 5000, { reviewState: 'not_counted', moneyMeaning: 'not_counted' }),
      ],
      livingLimitAnswer: {
        ...mockAnswer,
        headlineAmountCents: 20000,
        facts: {
          ...mockAnswer.facts,
          resourceBasisCents: 100000,
          livingPercent: 75,
          livingLimitCents: 75000,
          protectedPlanCents: 20000,
          flexibleCapacityCents: 60000,
          countedFlexibleSpendCents: 40000,
          flexibleRoomCents: 20000,
          flexibleRoomLowCents: 20000,
          flexibleRoomHighCents: 20000,
          plannedCents: 80000,
        },
      },
      monthlyPlan: {
        ...initialSnapshot.monthlyPlan!,
        regularPlanCents: 80000,
        committedPlanCents: 20000,
        flexiblePlanCents: 60000,
        plannedOutflowCents: 80000,
      },
    };

    const screen = render(<MoneySummaryScreen navigation={{ navigate: jest.fn() } as never} route={{ key: 'summary-actual-plan', name: 'MoneySummary' } as never} />);
    const summary = screen.getByTestId('money-month-summary');

    expect(within(summary).getByText('$1,000')).toBeTruthy();
    expect(within(summary).getByText('$550')).toBeTruthy();
    expect(within(summary).getByText('Includes $100 paid from saved money')).toBeTruthy();
    expect(within(summary).getByText('Plan target · 75%')).toBeTruthy();
    expect(within(summary).getByText('$750')).toBeTruthy();
    expect(within(summary).getByText('$800')).toBeTruthy();
    expect(within(summary).getByText('$50 above target')).toBeTruthy();
    expect(within(summary).getByText('$450')).toBeTruthy();
    fireEvent.press(summary);
    expect(screen.getByText('Counted toward monthly plan')).toBeTruthy();
    expect(screen.getByText('Paid from saved money')).toBeTruthy();
    expect(screen.getByText('Outside the plan')).toBeTruthy();
    expect(screen.getAllByText('55% of income received').length).toBeGreaterThan(0);
  });

  it('keeps flexible and committed variances separate before totaling the month', () => {
    mockSnapshot = {
      ...initialSnapshot,
      livingLimitAnswer: {
        ...mockAnswer,
        state: 'over_flexible_room',
        headlineAmountCents: 247_996,
        facts: {
          ...mockAnswer.facts,
          livingLimitCents: 774_519,
          protectedPlanCents: 400_000,
          protectedOverageCents: 21_253,
          flexibleCapacityCents: 374_519,
          countedFlexibleSpendCents: 622_515,
          flexibleRoomCents: -247_996,
          flexibleRoomLowCents: -247_996,
          flexibleRoomHighCents: -247_996,
          plannedCents: 774_519,
        },
      },
      monthlyPlan: {
        ...initialSnapshot.monthlyPlan!,
        regularPlanCents: 774_519,
        committedPlanCents: 400_000,
        flexiblePlanCents: 374_519,
        plannedOutflowCents: 774_519,
      },
    };
    const navigation = { navigate: jest.fn() };
    const screen = render(<MoneySummaryScreen navigation={navigation as never} route={{ key: 'fixed-plan', name: 'MoneySummary' } as never} />);

    expect(screen.getByTestId('money-limit-amount-row').props.accessibilityLabel).toBe('$2,480 over budget');
    expect(screen.queryByText('Current budget $3,745')).toBeNull();
    expect(screen.getByRole('button', { name: 'Review overages' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Review overages' }));
    expect(navigation.navigate).toHaveBeenCalledWith('MoneyTransactions', expect.objectContaining({ overageReview: true }));
    fireEvent.press(screen.getByTestId('money-month-summary'));
    expect(screen.getAllByText('Monthly plan').length).toBeGreaterThan(0);
    expect(screen.getByText('Bills and money set aside')).toBeTruthy();
    expect(screen.getByText('Budget $4,000 · $212.53 over')).toBeTruthy();
    expect(screen.getByText('Flexible spending from plan')).toBeTruthy();
    expect(screen.getByText('Budget $3,745.19 · $2,479.96 over')).toBeTruthy();
    expect(screen.getByText('Over plan')).toBeTruthy();
    expect(screen.getByText('$2,692.49')).toBeTruthy();
  });

  it('projects unclear spending as review work and explains the complete spending total', () => {
    mockSnapshot = {
      ...initialSnapshot,
      categories: [
        category('housing', 'Housing', 'protected'),
        category('shopping', 'Shopping', 'flexible'),
      ],
      transactions: [
        transaction('rent', 8000, { categoryId: 'housing', categoryName: 'Housing', reviewState: 'assigned' }),
        transaction('purchase', 1200, { categoryId: 'shopping', categoryName: 'Shopping', reviewState: 'assigned' }),
        transaction('unclear-charge', 800),
        transaction('outside', 500, { reviewState: 'not_counted', moneyMeaning: 'not_counted' }),
        transaction('transfer', 30000, { providerCategoryDetailed: 'TRANSFER_OUT_ACCOUNT_TRANSFER' }),
      ],
    };
    const navigation = { navigate: jest.fn() };
    const screen = render(<MoneySummaryScreen navigation={navigation as never} route={{ key: 'summary-reconciliation', name: 'MoneySummary' } as never} />);

    const unclearSummary = screen.getByRole('button', { name: 'Review unclear spending, $8 across 1 transaction' });
    expect(unclearSummary).toBeTruthy();
    fireEvent.press(unclearSummary);
    expect(screen.getByRole('header', { name: 'Unclear spending' })).toBeTruthy();
    expect(screen.getByText('1 transaction · $8')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Review unclear-charge, $8' }));
    expect(navigation.navigate).toHaveBeenCalledWith('MoneyTransactionDetail', {
      transactionId: 'unclear-charge',
      economicRoleReview: true,
    });

    fireEvent.press(screen.getByTestId('money-month-summary'));
    expect(screen.getByText('SPENDING')).toBeTruthy();
    expect(screen.getAllByText('Total spent').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$105').length).toBeGreaterThan(0);
    expect(screen.getByText('Counted toward monthly plan')).toBeTruthy();
    expect(screen.getByText('Outside the plan')).toBeTruthy();
    expect(screen.getByText('CURRENT PLAN')).toBeTruthy();
    expect(screen.getByText('Flexible and unclear spending')).toBeTruthy();
    expect(screen.getByText('$300 in income, transfers, and other non-spending activity is outside this total.')).toBeTruthy();
  });

  it('offers account-backed setup instead of an invented empty budget', () => {
    mockSnapshot = {
      ...initialSnapshot,
      accounts: [],
      transactions: [],
      categories: [],
      livingLimitAnswer: null,
    };
    const navigation = { navigate: jest.fn() };
    const screen = render(<MoneySummaryScreen navigation={navigation as never} route={{ key: 'summary-empty', name: 'MoneySummary' } as never} />);

    expect(screen.getByText('Build your budget from real life')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Connect another account' })).toBeNull();
    fireEvent.press(screen.getByText('Connect accounts'));
    expect(navigation.navigate).toHaveBeenCalledWith('MoneyEntry', {
      requestedPlace: 'MoneySummary',
      source: 'empty-state',
      mode: 'setup',
    });
  });

  it('lands directly on Budget with a focused budget-ready guide', () => {
    const handoff = moneyOnboardingHandoff();
    const navigation = { addListener: jest.fn(() => jest.fn()), navigate: jest.fn(), setParams: jest.fn() };
    const screen = render(<MoneySummaryScreen
      navigation={navigation as never}
      route={{ key: 'summary-ready', name: 'MoneySummary', params: { onboardingHandoff: handoff } } as never}
    />);

    expect(screen.getByText('Budget')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Your budgets are ready 🎉' })).toBeTruthy();
    expect(screen.getByTestId('money-budget-ready-celebration')).toBeTruthy();
    expect(screen.getByText('We built a $6,175 monthly plan from the accounts you connected. You can change any budget.')).toBeTruthy();
    expect(screen.queryByText('Goal ready')).toBeNull();
    expect(screen.queryByText('2 To-dos ready')).toBeNull();
    expect(within(screen.getByTestId('money-bottom-guide-accessory')).getByRole('button', {
      name: 'Explore budgets',
    })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Explore budgets' }));
    expect(screen.queryByRole('header', { name: 'Your budgets are ready 🎉' })).toBeNull();
    expect(navigation.setParams).toHaveBeenCalledWith({ onboardingHandoff: undefined });
  });

  it('keeps the development handoff and the Budget canvas on the same sample plan', () => {
    const navigation = { addListener: jest.fn(() => jest.fn()), navigate: jest.fn(), setParams: jest.fn() };
    const screen = render(<MoneySummaryScreen
      navigation={navigation as never}
      route={{
        key: 'summary-demo-ready',
        name: 'MoneySummary',
        params: { onboardingHandoff: moneyOnboardingHandoff(), devBudgetState: 'onboarding-sample' },
      } as never}
    />);

    expect(screen.getByText('We built a $6,175 monthly plan from the accounts you connected. You can change any budget.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Review July summary, .*\$6,175 monthly plan/ })).toBeTruthy();
    expect(screen.getAllByText('Groceries').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Housing').length).toBeGreaterThan(0);
  });

  it('reveals the Spend Less follow-through without exposing every To-do on the Budget canvas', () => {
    const onAcknowledgeFollowThrough = jest.fn();
    const screen = render(<MoneyOnboardingHandoffGuide
      guide="follow_through"
      handoff={{ ...moneyOnboardingHandoff(), budgetGuideAcknowledgedAt: '2026-08-21T18:01:00.000Z' }}
      onAcknowledgeBudgets={jest.fn()}
      onAcknowledgeFollowThrough={onAcknowledgeFollowThrough}
    />);

    expect(screen.getByRole('header', { name: 'Your Spend Less goal is ready' })).toBeTruthy();
    expect(screen.getByText('Save about $205 a month with 2 practical first steps. Nothing has been scheduled.')).toBeTruthy();
    expect(screen.queryByText('Review recurring services for one to stop or downgrade')).toBeNull();
    expect(screen.queryByText('Plan one lower-cost week of meals')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Review goal' }));
    expect(onAcknowledgeFollowThrough).toHaveBeenCalledWith(true);
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
    expect(flexibleInfo.props.accessibilityHint).toBe('Explains flexible spending.');
    fireEvent.press(flexibleInfo);
    expect(screen.getByText('Spending you can adjust month to month, after bills and money set aside.')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'About flexible spending' })[0].props.accessibilityState).toMatchObject({ expanded: true });

    const committedInfo = screen.getAllByRole('button', { name: 'About committed spending' })[0];
    expect(committedInfo.props.accessibilityHint).toBe('Explains committed spending.');
    fireEvent.press(committedInfo);
    expect(screen.getByText('Bills and money set aside before Kwilt calculates your flexible room.')).toBeTruthy();
    expect(committedInfo.props.accessibilityState).toMatchObject({ expanded: true });
  });

  it('does not turn the Budget summary into an app-control picker', () => {
    mockSnapshot = {
      ...initialSnapshot,
      categories: [
        category('groceries', 'Groceries', 'flexible'),
        category('shopping', 'Shopping', 'flexible'),
      ],
    };
    const navigation = { navigate: jest.fn(), setParams: jest.fn() };
    const screen = render(<MoneySummaryScreen
      navigation={navigation as never}
      route={{ key: 'summary', name: 'MoneySummary', params: { entryIntent: 'app-control-onboarding' } } as never}
    />);

    expect(screen.queryByTestId('money-app-control-guide')).toBeNull();
    expect(screen.getAllByText('Groceries').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Shopping').length).toBeGreaterThan(0);
    expect(navigation.navigate).not.toHaveBeenCalledWith('MoneyCategoryCreate');
  });

  it('opens category reordering from the View menu', () => {
    const source = readFileSync(path.join(__dirname, 'MoneySummaryScreen.tsx'), 'utf8');
    expect(source).toContain('<DropdownMenuSeparator />');
    expect(source).toContain('accessibilityLabel="Reorder categories" onPress={onReorder}');
    expect(source).toContain('<MoneyCategoryReorderDrawer');
  });

  it('opens the canonical Budget settings page from the ellipsis menu', () => {
    const navigation = { navigate: jest.fn() };
    const screen = render(<MoneySummaryScreen navigation={navigation as never} route={{ key: 'summary-settings', name: 'MoneySummary' } as never} />);

    fireEvent.press(screen.getByRole('button', { name: 'Budget options' }));
    fireEvent.press(screen.getByRole('menuitem', { name: 'Settings' }));

    expect(mockRootNavigate).toHaveBeenCalledWith('Settings', { screen: 'SettingsBudget' });
  });

  it('opens all transactions as a secondary Budget destination', () => {
    const navigation = { navigate: jest.fn() };
    const screen = render(<MoneySummaryScreen navigation={navigation as never} route={{ key: 'summary-transactions', name: 'MoneySummary' } as never} />);

    fireEvent.press(screen.getByRole('button', { name: 'Budget options' }));
    fireEvent.press(screen.getByRole('menuitem', { name: 'All transactions' }));

    expect(navigation.navigate).toHaveBeenCalledWith('MoneyTransactions', {});
  });

  it('connects another account directly from the Budget header', async () => {
    const navigation = { navigate: jest.fn() };
    const screen = render(<MoneySummaryScreen navigation={navigation as never} route={{ key: 'summary-connect', name: 'MoneySummary' } as never} />);

    fireEvent.press(screen.getByRole('button', { name: 'Connect another account' }));

    await waitFor(() => expect(mockConnectMoneyAccount).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Chase connected. Budget updated.')).toBeTruthy();
  });

  it('opens account provenance from Accounts & connections in the Budget menu', () => {
    mockSnapshot = {
      ...initialSnapshot,
      accounts: [{
        id: 'checking', name: 'Total Checking', institutionName: 'Chase', mask: '1842',
        type: 'depository', subtype: 'checking', status: 'healthy',
        transactionCount: 2, lastSyncedAt: initialSnapshot.lastSyncedAt,
        latestTransactionDate: '2026-07-24',
      }],
    };
    const navigation = { navigate: jest.fn() };
    const screen = render(<MoneySummaryScreen navigation={navigation as never} route={{ key: 'summary-sources', name: 'MoneySummary' } as never} />);

    fireEvent.press(screen.getByRole('button', { name: 'Budget options' }));
    fireEvent.press(screen.getByRole('menuitem', { name: 'Accounts & connections' }));

    expect(screen.getByText('1 connected account')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Manage accounts' }));
    expect(navigation.navigate).toHaveBeenCalledWith('MoneyAccounts');
  });

  it('opens the exact transactions behind flexible spending', () => {
    const navigation = { navigate: jest.fn() };
    const screen = render(<MoneySummaryScreen navigation={navigation as never} route={{ key: 'summary', name: 'MoneySummary' } as never} />);

    fireEvent.press(screen.getByTestId('money-month-summary'));
    fireEvent.press(screen.getByRole('button', { name: 'Review flexible transactions' }));

    expect(navigation.navigate).toHaveBeenCalledWith('MoneyTransactions', {
      inventoryTitle: 'Flexible spending',
      reviewTransactionIds: ['flexible-purchase'],
    });
  });

  it('quietly refreshes stale connected activity without adding a user decision', async () => {
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

    expect(screen.getByRole('button', { name: 'Open accounts and connection status' })).toBeTruthy();
    expect(mockRefreshStaleMoneySummary).toHaveBeenCalledWith({
      reconcileConnectedActivity: expect.any(Function),
    });
    const input = mockRefreshStaleMoneySummary.mock.calls[0]?.[0] as { reconcileConnectedActivity: () => Promise<void> };
    await input.reconcileConnectedActivity();
    expect(mockReconcileConnectedActivity).toHaveBeenCalledWith({ trigger: 'stale_summary', sync: true });
    expect(screen.queryByText(/transactions need/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open connected accounts' })).toBeNull();
    expect(screen.getByTestId('money-limit-amount-row').props.accessibilityLabel).toBe('$343 left');
    expect(screen.getByText('left')).toBeTruthy();
  });
});

function moneyOnboardingHandoff(): MoneyOnboardingHandoffState {
  return {
    createdAtIso: '2026-08-21T18:00:00.000Z',
    selectedPlanCents: 617_500,
    goalId: 'goal-money-onboarding-spend-less-v1',
    goalTitle: 'Spend $205 less each month',
    savingsCents: 20_500,
    todoCount: 2,
    budgetGuideAcknowledgedAt: null,
    followThroughGuideAcknowledgedAt: null,
  };
}

describe('MoneySummaryScreen drawer anatomy', () => {
  it('inherits the compact standard drawer title', () => {
    const source = readFileSync(path.join(__dirname, 'MoneySummaryScreen.tsx'), 'utf8');

    expect(source).toContain('<BottomDrawerHeader');
    expect(source).not.toContain('titleVariant="lg"');
  });
});

function transaction(
  id: string,
  amountCents: number,
  overrides: Partial<MoneySnapshot['transactions'][number]> = {},
): MoneySnapshot['transactions'][number] {
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
