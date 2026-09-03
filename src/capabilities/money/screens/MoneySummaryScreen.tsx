import { Pressable } from '@/src/ui/HapticPressable';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { FlatList, Image, type NativeScrollEvent, type NativeSyntheticEvent, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { HapticsService } from '../../../services/HapticsService';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { colors, fonts, radii, spacing } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { rootNavigationRef } from '../../../navigation/rootNavigationRef';
import { Icon } from '../../../ui/Icon';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Button } from '../../../ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../ui/DropdownMenu';
import { menuItemTextProps, menuStyles } from '../../../ui/menuStyles';
import {
  formatMoney,
  formatMoneyFreshness,
  type MoneyTransaction,
  type MonthlyHouseholdPlanStatement,
} from '../data/moneySnapshot';
import { useMoneyData } from '../data/MoneyDataContext';
import { projectMoneyPeriodView, type MoneyPeriodView } from '../domain/moneyPeriodView';
import type { MoneyStackParamList } from '../navigation/types';
import {
  MoneyCategoryListRow,
  MoneyCategoryMeterTile,
  type MoneyCategoryPresentation,
  resolveCategoryPresentation,
} from '../components/MoneyCategoryMeterTile';
import { MoneyPlanLimitAnswer } from '../components/MoneyPlanLimitAnswer';
import type { MoneyPlanLimitAnswer as LivingLimitAnswer } from '../domain/moneyPlanLimitAnswer';
import { MoneyScreenFrame } from './MoneyScreenFrame';
import { buildMoneyBudgetAnswerViewedProps, buildMoneyBudgetExplanationOpenedProps } from '../runtime/moneyPlanLimitAnalytics';
import { refreshStaleMoneySummary } from '../runtime/moneySummaryAutoRefresh';
import { projectMoneyPlanAudit, type MoneyPlanAudit } from '../domain/moneyPlanAudit';
import { projectMonthlyBudgetSummary, type MonthlyBudgetSummary } from '../domain/monthlyBudgetSummary';
import { MoneyCategoryReorderDrawer } from '../components/MoneyCategoryReorderDrawer';
import { EmptyState } from '../../../ui/EmptyState';
import { BottomGuide } from '../../../ui/BottomGuide';
import { Heading, HStack, VStack } from '../../../ui/primitives';
import { CelebrationGif } from '../../../ui/CelebrationGif';
import { useAccessibilityPreferences } from '../../../ui/hooks/useAccessibilityPreferences';
import {
  getMoneyOnboardingHandoffGuide,
  type MoneyOnboardingHandoffReceipt,
  type MoneyOnboardingHandoffState,
} from '../domain/moneyOnboardingHandoff';
import {
  acknowledgeMoneyOnboardingBudgetGuide,
  acknowledgeMoneyOnboardingFollowThroughGuide,
  loadMoneyOnboardingState,
} from '../runtime/moneyOnboardingStorage';
import { buildMoneyOnboardingDemoBudget } from '../domain/moneyOnboardingDemoBudget';
import { MoneyFreshnessStamp } from '../components/MoneyFreshnessStamp';
import { formatBudgetOverviewMoney, formatIncomeSpendingDifference } from '../presentation/budgetOverviewMoney';
import { ActionDock, useActionDockClearance } from '../../../ui/ActionDock';
import { InventoryControlGroup } from '../../../ui/InventoryControlGroup';
import { connectMoneyAccount } from '../runtime/connectMoneyAccount';
import { signalMoneyChoice, signalMoneyMutationOutcome } from '../runtime/moneyMutationFeedback';
import { startMoneyPlaidLink } from '../native/moneyPlaidLink';
import { requestMoneyProAccess } from '../runtime/moneyProAccess';

const MONTH_RADIUS = 12;
const INITIAL_MONTH_INDEX = MONTH_RADIUS;
const REFRESH_RECEIPT_MS = 5_000;
type BudgetHeaderAccountState = 'connect' | 'connecting' | 'checking' | 'fresh' | 'error';

export function MoneySummaryScreen({ navigation, route }: NativeStackScreenProps<MoneyStackParamList, 'MoneySummary'>) {
  const { snapshot: liveSnapshot, refresh, reconcileConnectedActivity, reorderCategories, savingCategoryOrder, userId } = useMoneyData();
  const { capture } = useAnalytics();
  const { width: windowWidth } = useWindowDimensions();
  const actionDockClearance = useActionDockClearance();
  const [measuredPagerWidth, setMeasuredPagerWidth] = useState(0);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(INITIAL_MONTH_INDEX);
  const [monthlySummaryOpen, setMonthlySummaryOpen] = useState(false);
  const [unclearReviewOpen, setUnclearReviewOpen] = useState(false);
  const [categoryPresentation, setCategoryPresentation] = useState<MoneyCategoryPresentation>('list');
  const [categoryReorderOpen, setCategoryReorderOpen] = useState(false);
  const [accountSourcesOpen, setAccountSourcesOpen] = useState(false);
  const [accountConnectionPending, setAccountConnectionPending] = useState(false);
  const [accountConnectionMessage, setAccountConnectionMessage] = useState<string | null>(null);
  const [refreshReceipt, setRefreshReceipt] = useState<'idle' | 'checking' | 'fresh' | 'error'>('idle');
  const freshHandoff = route.params?.onboardingHandoff ?? null;
  const [onboardingHandoff, setOnboardingHandoff] = useState<MoneyOnboardingHandoffState | null>(() => (
    freshHandoff ? handoffStateFromReceipt(freshHandoff) : null
  ));
  const [onboardingGuide, setOnboardingGuide] = useState<'budgets' | 'follow_through' | null>(
    freshHandoff ? 'budgets' : null,
  );
  const snapshot = useMemo(() => (
    __DEV__ && route.params?.devBudgetState === 'onboarding-sample'
      ? buildMoneyOnboardingDemoBudget()
      : liveSnapshot
  ), [liveSnapshot, route.params?.devBudgetState]);
  const autoRefreshKeyRef = useRef<string | null>(null);
  const refreshReceiptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pagerRef = useRef<FlatList<MoneyPeriodView>>(null);
  const onboardingHandoffRef = useRef(onboardingHandoff);
  const freshCompletionVisitRef = useRef(Boolean(freshHandoff));
  const exploredBudgetThisVisitRef = useRef(false);
  const budgetGuideAcknowledgedRef = useRef(Boolean(onboardingHandoff?.budgetGuideAcknowledgedAt));
  const leftSummaryAfterBudgetGuideRef = useRef(false);
  const pagerWidth = measuredPagerWidth > 24
    ? measuredPagerWidth
    : Math.max(1, windowWidth - spacing.sm * 4);
  const periods = useMemo(() => {
    if (!snapshot) return [];
    return Array.from({ length: MONTH_RADIUS * 2 + 1 }, (_, index) => (
      projectMoneyPeriodView(snapshot, index - MONTH_RADIUS)
    ));
  }, [snapshot]);
  const currentPeriod = periods[currentMonthIndex] ?? periods[INITIAL_MONTH_INDEX];
  const refreshBudget = useCallback(async () => {
    if (!liveSnapshot?.accounts.length) {
      await refresh();
      return;
    }
    if (refreshReceiptTimerRef.current) clearTimeout(refreshReceiptTimerRef.current);
    setRefreshReceipt('checking');
    try {
      await reconcileConnectedActivity({ trigger: 'manual_sync', sync: true });
      setRefreshReceipt('fresh');
      refreshReceiptTimerRef.current = setTimeout(() => {
        refreshReceiptTimerRef.current = null;
        setRefreshReceipt('idle');
      }, REFRESH_RECEIPT_MS);
    } catch (error) {
      setRefreshReceipt('error');
      throw error;
    }
  }, [liveSnapshot?.accounts.length, reconcileConnectedActivity, refresh]);

  useEffect(() => () => {
    if (refreshReceiptTimerRef.current) clearTimeout(refreshReceiptTimerRef.current);
  }, []);

  onboardingHandoffRef.current = onboardingHandoff;
  budgetGuideAcknowledgedRef.current = Boolean(onboardingHandoff?.budgetGuideAcknowledgedAt);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void loadMoneyOnboardingState(userId).then((state) => {
      if (!active || !state.handoff) return;
      const next = state.handoff;
      onboardingHandoffRef.current = next;
      budgetGuideAcknowledgedRef.current = Boolean(next.budgetGuideAcknowledgedAt);
      setOnboardingHandoff(next);
      setOnboardingGuide(getMoneyOnboardingHandoffGuide({
        exploredBudgetThisVisit: exploredBudgetThisVisitRef.current,
        handoff: next,
        isFreshCompletion: freshCompletionVisitRef.current,
      }));
    });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    const removeBlur = navigation.addListener?.('blur', () => {
      if (budgetGuideAcknowledgedRef.current) leftSummaryAfterBudgetGuideRef.current = true;
    });
    const removeFocus = navigation.addListener?.('focus', () => {
      if (leftSummaryAfterBudgetGuideRef.current) freshCompletionVisitRef.current = false;
      const next = onboardingHandoffRef.current;
      setOnboardingGuide(getMoneyOnboardingHandoffGuide({
        exploredBudgetThisVisit: exploredBudgetThisVisitRef.current,
        handoff: next,
        isFreshCompletion: freshCompletionVisitRef.current,
      }));
    });
    return () => {
      removeBlur?.();
      removeFocus?.();
    };
  }, [navigation]);

  const scrollToMonth = useCallback((nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= periods.length) return;
    pagerRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setCurrentMonthIndex(nextIndex);
    void HapticsService.trigger('canvas.selection');
  }, [periods.length]);

  const handleMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pagerWidth <= 0) return;
    const nextIndex = Math.max(0, Math.min(periods.length - 1, Math.round(event.nativeEvent.contentOffset.x / pagerWidth)));
    if (nextIndex !== currentMonthIndex) {
      setCurrentMonthIndex(nextIndex);
      void HapticsService.trigger('canvas.selection');
    }
  }, [currentMonthIndex, pagerWidth, periods.length]);

  const openBudgetSettings = useCallback(() => {
    rootNavigationRef.navigate('Settings', { screen: 'SettingsBudget' });
  }, []);

  const connectAccount = useCallback(async () => {
    if (accountConnectionPending) return;
    if (!requestMoneyProAccess('money_connect_account')) return;
    setAccountSourcesOpen(false);
    setAccountConnectionPending(true);
    setAccountConnectionMessage(null);
    signalMoneyChoice();
    const result = await connectMoneyAccount({ startLink: startMoneyPlaidLink, reconcileConnectedActivity });
    setAccountConnectionPending(false);
    if (result.status === 'cancelled') return;
    if (result.status === 'connected') {
      setAccountConnectionMessage(`${result.institutionName} connected. Budget updated.`);
      signalMoneyMutationOutcome('succeeded');
    } else {
      setAccountConnectionMessage(result.message);
      signalMoneyMutationOutcome('failed');
    }
    setAccountSourcesOpen(true);
  }, [accountConnectionPending, reconcileConnectedActivity]);

  const summaryMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Pressable accessibilityRole="button" accessibilityLabel="Budget options" style={styles.headerMoreButton}>
          <Icon name="more" size={22} color={colors.textPrimary} />
        </Pressable>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom" sideOffset={6} style={styles.summaryMenuContent}>
        <SummaryMenuItem icon="plus" label="Add category" onPress={() => navigation.navigate('MoneyCategoryCreate')} />
        <SummaryMenuItem icon="receipt" label="All transactions" onPress={() => navigation.navigate('MoneyTransactions', {})} />
        <SummaryMenuItem
          icon="landmark"
          label="Accounts & connections"
          onPress={() => {
            setAccountConnectionMessage(null);
            setAccountSourcesOpen(true);
          }}
        />
        <SummaryMenuItem
          icon="settings"
          label="Settings"
          onPress={openBudgetSettings}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const livingLimitAnswer = snapshot?.livingLimitAnswer ?? null;
  const isPristineMoney = Boolean(
    snapshot
      && snapshot.accounts.length === 0
      && snapshot.transactions.length === 0
      && !livingLimitAnswer,
  );
  const planAuditPeriodId = livingLimitAnswer?.facts.periodId ?? snapshot?.monthlyPlan?.periodId ?? null;
  const planAudit = useMemo(() => (
    snapshot && planAuditPeriodId
      ? projectMoneyPlanAudit({
          periodId: planAuditPeriodId,
          categories: snapshot.categories,
          transactions: snapshot.transactions,
        })
      : null
  ), [planAuditPeriodId, snapshot]);
  const monthlyBudgetSummary = useMemo(() => (
    planAudit && snapshot?.monthlyPlan
      ? projectMonthlyBudgetSummary({ audit: planAudit, monthlyPlan: snapshot.monthlyPlan, answer: livingLimitAnswer })
      : null
  ), [livingLimitAnswer, planAudit, snapshot?.monthlyPlan]);
  const unclearTransactions = useMemo(() => {
    if (!snapshot || !planAudit) return [];
    const unclearIds = new Set(planAudit.unclearTransactionIds);
    return snapshot.transactions.filter((transaction) => unclearIds.has(transaction.id));
  }, [planAudit, snapshot]);

  useEffect(() => {
    if (!livingLimitAnswer || currentMonthIndex !== INITIAL_MONTH_INDEX) return;
    capture(AnalyticsEvent.MoneyBudgetAnswerViewed, buildMoneyBudgetAnswerViewedProps({ answer: livingLimitAnswer, periodRelation: 'current' }));
  }, [capture, currentMonthIndex, livingLimitAnswer]);

  useEffect(() => {
    if (!snapshot || livingLimitAnswer?.state !== 'stale') return;
    const refreshKey = `${livingLimitAnswer.facts.planVersionId}:${snapshot.lastSyncedAt ?? 'never'}`;
    if (autoRefreshKeyRef.current === refreshKey) return;
    autoRefreshKeyRef.current = refreshKey;
    void refreshStaleMoneySummary({
      reconcileConnectedActivity: async () => {
        await reconcileConnectedActivity({ trigger: 'stale_summary', sync: true });
      },
    }).catch(() => {
      // Keep the last useful answer visible. Account-specific repair belongs in Accounts.
    });
  }, [livingLimitAnswer, reconcileConnectedActivity, snapshot]);

  return (
    <>
    <MoneyScreenFrame
      headerRightElement={snapshot && !isPristineMoney ? (
        livingLimitAnswer?.state === 'stale' && refreshReceipt === 'idle' && liveSnapshot?.lastSyncedAt ? (
          <MoneyFreshnessStamp
            lastSyncedAt={liveSnapshot.lastSyncedAt}
            onPress={() => {
              setAccountConnectionMessage(null);
              setAccountSourcesOpen(true);
            }}
          />
        ) : (
          <BudgetAccountHeaderAction
            state={accountConnectionPending ? 'connecting' : refreshReceipt === 'idle' ? 'connect' : refreshReceipt}
            onConnect={() => void connectAccount()}
            onOpenStatus={() => {
              setAccountConnectionMessage(null);
              setAccountSourcesOpen(true);
            }}
            onRetry={() => void refreshBudget()}
          />
        )
      ) : undefined}
      moreMenu={summaryMenu}
      onRefresh={refreshBudget}
      title="Budget"
    >
      {isPristineMoney ? (
        <EmptyState
          illustration={null}
          title="Build your budget from real life"
          instructions="Connect the accounts that matter and Kwilt will shape a useful monthly view from your income and spending."
          primaryAction={{
            label: 'Connect accounts',
            onPress: () => navigation.navigate('MoneyEntry', {
              requestedPlace: 'MoneySummary',
              source: 'empty-state',
              mode: 'setup',
            }),
          }}
        />
      ) : snapshot && currentPeriod ? (
        <View
          style={[styles.monthSwipeSurface, { paddingBottom: actionDockClearance }]}
          onLayout={(event) => {
            const width = Math.round(event.nativeEvent.layout.width);
            if (width > 24) setMeasuredPagerWidth(width);
          }}
        >
          <View style={styles.monthHeader}>
            <View style={styles.monthPicker}>
              <InventoryControlGroup testID="money-month-switcher">
                <MonthArrow
                  direction="left"
                  disabled={currentMonthIndex === 0}
                  label={`Show previous month from ${currentPeriod.periodLabel}`}
                  onPress={() => scrollToMonth(currentMonthIndex - 1)}
                />
                <MonthArrow
                  direction="right"
                  disabled={currentMonthIndex === periods.length - 1}
                  label={`Show next month from ${currentPeriod.periodLabel}`}
                  onPress={() => scrollToMonth(currentMonthIndex + 1)}
                />
              </InventoryControlGroup>
              <Text numberOfLines={1} style={styles.monthTitle}>{currentPeriod.periodLabel}</Text>
            </View>
            <View style={styles.monthActions}>
              <CategoryViewMenu
                onPresentationChange={setCategoryPresentation}
                onReorder={() => setCategoryReorderOpen(true)}
                presentation={categoryPresentation}
              />
            </View>
          </View>

          <FlatList
            testID="money-month-pager"
            ref={pagerRef}
            horizontal
            pagingEnabled
            data={periods}
            keyExtractor={(period) => `money-month-${period.monthOffset}`}
            initialScrollIndex={INITIAL_MONTH_INDEX}
            getItemLayout={(_, index) => ({ index, length: pagerWidth, offset: pagerWidth * index })}
            onMomentumScrollEnd={handleMomentumEnd}
            onScrollToIndexFailed={({ index }) => {
              requestAnimationFrame(() => pagerRef.current?.scrollToIndex({ index, animated: false }));
            }}
            renderItem={({ item }) => (
              <SummaryMonthPanel
                pageWidth={pagerWidth}
                period={item}
                freshness={formatMoneyFreshness(snapshot.lastSyncedAt)}
                answer={item.monthOffset === 0 ? livingLimitAnswer : null}
                audit={item.monthOffset === 0 ? planAudit : null}
                monthlyPlan={item.monthOffset === 0 ? snapshot.monthlyPlan ?? null : null}
                onExplain={() => {
                  if (livingLimitAnswer) capture(AnalyticsEvent.MoneyBudgetExplanationOpened, buildMoneyBudgetExplanationOpenedProps({ answer: livingLimitAnswer, surface: 'budget' }));
                }}
                onOpenMonthlySummary={() => setMonthlySummaryOpen(true)}
                onReviewIncome={openBudgetSettings}
                onReviewOverages={() => navigation.navigate('MoneyTransactions', {
                  inventoryTitle: 'Review overages',
                  overageReview: true,
                  flexibleRoomCents: livingLimitAnswer?.facts.flexibleRoomCents ?? 0,
                })}
                onReviewUnclear={() => setUnclearReviewOpen(true)}
                onOpenCategory={(categoryId) => {
                  exploredBudgetThisVisitRef.current = true;
                  navigation.navigate('MoneyCategoryDetail', {
                    categoryId,
                    monthOffset: item.monthOffset,
                  });
                }}
                categoryPresentation={categoryPresentation}
              />
            )}
            bounces={false}
            showsHorizontalScrollIndicator={false}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={3}
            style={styles.monthPager}
          />
        </View>
      ) : null}
    </MoneyScreenFrame>
    {!isPristineMoney && snapshot && currentPeriod ? (
      <ActionDock
        rightItem={{
          id: 'add-category',
          icon: 'plus',
          accessibilityLabel: 'Add category',
          testID: 'money-add-category-fab',
          onPress: () => navigation.navigate('MoneyCategoryCreate'),
        }}
      />
    ) : null}
    <BottomDrawer
      visible={accountSourcesOpen}
      onClose={() => setAccountSourcesOpen(false)}
      snapPoints={accountConnectionMessage ? ['46%'] : ['38%']}
      dynamicSizing={false}
      enableContentPanningGesture
    >
      <BottomDrawerScrollView contentContainerStyle={styles.drawerContent}>
        <BottomDrawerHeader
          title="Accounts & connections"
          variant="withClose"
          closeAccessibilityLabel="Close accounts and connections"
          onClose={() => setAccountSourcesOpen(false)}
        />
        <View style={styles.accountSourcesSummary}>
          <Text style={styles.accountSourcesCount}>
            {snapshot?.accounts.length ?? 0} connected {(snapshot?.accounts.length ?? 0) === 1 ? 'account' : 'accounts'}
          </Text>
          <Text style={styles.accountSourcesFreshness}>
            {formatMoneyFreshness(snapshot?.lastSyncedAt ?? null)}
          </Text>
        </View>
        {accountConnectionMessage ? (
          <Text accessibilityLiveRegion="polite" style={styles.accountConnectionMessage}>
            {accountConnectionMessage}
          </Text>
        ) : null}
        <View style={styles.drawerActions}>
          <Button
            fullWidth
            loading={accountConnectionPending}
            loadingLabel="Opening secure connection…"
            onPress={() => void connectAccount()}
          >
            Connect another account
          </Button>
          <Button
            accessibilityLabel="Manage accounts"
            fullWidth
            variant="secondary"
            onPress={() => {
              setAccountSourcesOpen(false);
              navigation.navigate('MoneyAccounts');
            }}
          >
            Manage accounts
          </Button>
        </View>
      </BottomDrawerScrollView>
    </BottomDrawer>
    <BottomDrawer
      visible={monthlySummaryOpen && Boolean(monthlyBudgetSummary && planAudit && snapshot?.monthlyPlan)}
      onClose={() => setMonthlySummaryOpen(false)}
      snapPoints={['72%']}
      dynamicSizing={false}
      enableContentPanningGesture
    >
      {monthlyBudgetSummary && planAudit && snapshot?.monthlyPlan ? (
        <BottomDrawerScrollView contentContainerStyle={styles.drawerContent}>
          <BottomDrawerHeader
            title={`${moneyMonthName(snapshot.monthlyPlan.periodId)} summary`}
            variant="withClose"
            closeAccessibilityLabel="Close monthly budget summary"
            onClose={() => setMonthlySummaryOpen(false)}
          />
          <MonthlySummaryFacts
            answer={livingLimitAnswer}
            audit={planAudit}
            summary={monthlyBudgetSummary}
            onOpenTransactions={(title, transactionIds) => {
              if (transactionIds.length === 0) return;
              setMonthlySummaryOpen(false);
              navigation.navigate('MoneyTransactions', {
                inventoryTitle: title,
                reviewTransactionIds: transactionIds,
              });
            }}
            onReviewPlan={() => {
              setMonthlySummaryOpen(false);
              openBudgetSettings();
            }}
          />
        </BottomDrawerScrollView>
      ) : null}
    </BottomDrawer>
    <BottomDrawer
      visible={unclearReviewOpen && unclearTransactions.length > 0}
      onClose={() => setUnclearReviewOpen(false)}
      snapPoints={['84%']}
      dynamicSizing={false}
      enableContentPanningGesture
    >
      {planAudit && unclearTransactions.length > 0 ? (
        <BottomDrawerScrollView contentContainerStyle={styles.drawerContent}>
          <BottomDrawerHeader
            title="Unclear spending"
            variant="withClose"
            closeAccessibilityLabel="Close unclear spending review"
            onClose={() => setUnclearReviewOpen(false)}
          />
          <UnclearSpendingReview
            audit={planAudit}
            transactions={unclearTransactions}
            onReviewTransaction={(transactionId) => {
              setUnclearReviewOpen(false);
              navigation.navigate('MoneyTransactionDetail', {
                transactionId,
                economicRoleReview: true,
              });
            }}
          />
        </BottomDrawerScrollView>
      ) : null}
    </BottomDrawer>
    <MoneyCategoryReorderDrawer
      categories={snapshot?.categories ?? []}
      onClose={() => setCategoryReorderOpen(false)}
      onSave={reorderCategories}
      saving={savingCategoryOrder}
      visible={categoryReorderOpen}
    />
    <MoneyOnboardingHandoffGuide
      guide={onboardingGuide}
      handoff={onboardingHandoff}
      onAcknowledgeBudgets={() => {
        if (!onboardingHandoff) return;
        const acknowledgedAt = new Date().toISOString();
        const next = { ...onboardingHandoff, budgetGuideAcknowledgedAt: acknowledgedAt };
        onboardingHandoffRef.current = next;
        budgetGuideAcknowledgedRef.current = true;
        setOnboardingHandoff(next);
        setOnboardingGuide(null);
        navigation.setParams({ onboardingHandoff: undefined });
        if (userId) void acknowledgeMoneyOnboardingBudgetGuide(userId, acknowledgedAt);
      }}
      onAcknowledgeFollowThrough={(openGoal) => {
        if (!onboardingHandoff) return;
        const acknowledgedAt = new Date().toISOString();
        const next = { ...onboardingHandoff, followThroughGuideAcknowledgedAt: acknowledgedAt };
        onboardingHandoffRef.current = next;
        setOnboardingHandoff(next);
        setOnboardingGuide(null);
        if (userId) void acknowledgeMoneyOnboardingFollowThroughGuide(userId, acknowledgedAt);
        if (openGoal && onboardingHandoff.goalId) {
          rootNavigationRef.navigate('MainTabs', {
            screen: 'GoalsTab',
            params: {
              screen: 'GoalDetail',
              params: { goalId: onboardingHandoff.goalId, entryPoint: 'goalsTab' },
            },
          });
        }
      }}
    />
    </>
  );
}

export function MoneyOnboardingHandoffGuide({
  guide,
  handoff,
  onAcknowledgeBudgets,
  onAcknowledgeFollowThrough,
}: {
  guide: 'budgets' | 'follow_through' | null;
  handoff: MoneyOnboardingHandoffState | null;
  onAcknowledgeBudgets: () => void;
  onAcknowledgeFollowThrough: (openGoal: boolean) => void;
}) {
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  if (!handoff) return null;
  return (
    <BottomGuide
      bottomAccessory={guide === 'budgets' ? (
        <Button fullWidth onPress={onAcknowledgeBudgets} size="md" variant="primary">
          Explore budgets
        </Button>
      ) : undefined}
      dynamicSizing
      onClose={guide === 'budgets'
        ? onAcknowledgeBudgets
        : () => onAcknowledgeFollowThrough(false)}
      scrim="light"
      snapPoints={guide === 'budgets' ? ['52%'] : ['40%']}
      visible={Boolean(guide)}
    >
      {guide === 'budgets' ? (
        <VStack space={spacing.lg} style={styles.onboardingWelcomeContent}>
          <Heading variant="sm">Your budgets are ready 🎉</Heading>
          {reduceMotionEnabled ? (
            <View style={styles.onboardingWelcomeMedia}>
              <Image
                accessibilityIgnoresInvertColors
                resizeMode="contain"
                source={require('../../../../assets/illustrations/capability-onboarding/money-ready-transparent.png')}
                style={styles.onboardingWelcomeIllustration}
              />
            </View>
          ) : (
            <CelebrationGif
              fallbackSource={require('../../../../assets/illustrations/capability-onboarding/money-ready-transparent.png')}
              frameStyle={styles.onboardingWelcomeGifFrame}
              kind="firstBudget"
              maxHeight={128}
              resizeMode="cover"
              showControls={false}
              size="sm"
              stylePreference="minimal"
            />
          )}
          <Text style={styles.onboardingGuideBody}>
            We built a {formatMoney(handoff.selectedPlanCents)} monthly plan from the accounts you connected. You can change any budget.
          </Text>
        </VStack>
      ) : guide === 'follow_through' && handoff.goalId ? (
        <VStack space={spacing.lg} style={styles.onboardingWelcomeContent}>
          <VStack space={spacing.sm}>
            <Heading variant="sm">Your Spend Less goal is ready</Heading>
            <Text style={styles.onboardingGuideBody}>
              {handoff.savingsCents > 0
                ? `Save about ${formatMoney(handoff.savingsCents)} a month with ${handoff.todoCount} practical first steps. Nothing has been scheduled.`
                : `${handoff.todoCount} practical first steps are ready. Nothing has been scheduled.`}
            </Text>
          </VStack>
          <VStack space={spacing.xs}>
            <Button fullWidth onPress={() => onAcknowledgeFollowThrough(true)} size="md" variant="primary">Review goal</Button>
            <Button fullWidth onPress={() => onAcknowledgeFollowThrough(false)} size="sm" variant="ghost">Later</Button>
          </VStack>
        </VStack>
      ) : null}
    </BottomGuide>
  );
}

function handoffStateFromReceipt(receipt: MoneyOnboardingHandoffReceipt): MoneyOnboardingHandoffState {
  return {
    ...receipt,
    budgetGuideAcknowledgedAt: null,
    followThroughGuideAcknowledgedAt: null,
  };
}

function SummaryMonthPanel({
  answer,
  audit,
  categoryPresentation,
  categoryTargetRef,
  freshness,
  monthlyPlan,
  onExplain,
  onOpenMonthlySummary,
  onOpenCategory,
  onReviewIncome,
  onReviewOverages,
  onReviewUnclear,
  pageWidth,
  period,
}: {
  answer: LivingLimitAnswer | null;
  audit: MoneyPlanAudit | null;
  monthlyPlan: MonthlyHouseholdPlanStatement | null;
  categoryPresentation: MoneyCategoryPresentation;
  categoryTargetRef?: RefObject<View | null>;
  freshness: string;
  onExplain: () => void;
  onOpenMonthlySummary: () => void;
  onOpenCategory: (categoryId: string) => void;
  onReviewIncome: () => void;
  onReviewOverages: () => void;
  onReviewUnclear: () => void;
  pageWidth: number;
  period: MoneyPeriodView;
}) {
  const cardWidth = Math.max(1, Math.floor((pageWidth - spacing.sm) / 2));
  const categoryView = resolveCategoryPresentation(categoryPresentation);
  const flexibleCategories = period.categories.filter((category) => category.planRole !== 'protected');
  const committedCategories = period.categories.filter((category) => category.planRole === 'protected');
  const monthlySummary = audit && monthlyPlan
    ? projectMonthlyBudgetSummary({ audit, monthlyPlan, answer })
    : null;
  return (
    <View style={[styles.monthBody, { width: pageWidth }]}>
      <View style={styles.categorySection}>
        {!answer || answer.state === 'missing_income_basis' ? <View style={styles.categoryHeader}>
          <CategoryConceptHeader
            label="Flexible spending"
            accessibilityLabel="About flexible spending"
            explanation="Spending you can adjust month to month, after bills and money set aside."
          />
        </View> : null}
        {answer ? (
          <MoneyPlanLimitAnswer
            answer={answer}
            freshness={freshness}
            onAdjustPlan={onReviewIncome}
            onExplain={onExplain}
            onReviewIncome={onReviewIncome}
            onReviewOverages={onReviewOverages}
          />
        ) : null}
        <View
          testID="money-flexible-category-collection"
          style={[
            categoryView.layout === 'meters' ? styles.categoryGrid : styles.categoryList,
            answer ? styles.flexibleCategoryCollection : null,
          ]}
        >
          {flexibleCategories.map((category, index) => (
            categoryView.layout === 'meters' ? (
              <MoneyCategoryMeterTile
                key={category.id}
                category={category}
                periodElapsedPercent={period.periodElapsedPercent}
                onPress={() => onOpenCategory(category.id)}
                style={{ width: cardWidth, flexBasis: cardWidth, flexGrow: 0, maxWidth: cardWidth }}
                targetRef={index === 0 ? categoryTargetRef : undefined}
              />
            ) : (
              <MoneyCategoryListRow
                key={category.id}
                category={category}
                onPress={() => onOpenCategory(category.id)}
                periodElapsedPercent={period.periodElapsedPercent}
                targetRef={index === 0 ? categoryTargetRef : undefined}
              />
            )
          ))}
        </View>
      </View>
      {committedCategories.length > 0 ? (
        <View style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <CategoryConceptHeader
              label="Committed spending"
              accessibilityLabel="About committed spending"
              explanation="Bills and money set aside before Kwilt calculates your flexible room."
            />
          </View>
          <View style={categoryView.layout === 'meters' ? styles.categoryGrid : styles.categoryList}>
            {committedCategories.map((category) => (
              categoryView.layout === 'meters' ? (
                <MoneyCategoryMeterTile
                  key={category.id}
                  category={category}
                  periodElapsedPercent={period.periodElapsedPercent}
                  onPress={() => onOpenCategory(category.id)}
                  style={{ width: cardWidth, flexBasis: cardWidth, flexGrow: 0, maxWidth: cardWidth }}
                />
              ) : (
                <MoneyCategoryListRow
                  key={category.id}
                  category={category}
                  onPress={() => onOpenCategory(category.id)}
                  periodElapsedPercent={period.periodElapsedPercent}
                />
              )
            ))}
          </View>
        </View>
      ) : null}
      {audit && audit.unclearTransactionIds.length > 0 ? (
        <UnclearSpendingProjection audit={audit} onPress={onReviewUnclear} />
      ) : null}
      {monthlySummary ? (
        <Pressable
          accessibilityLabel={monthlySummaryAccessibilityLabel(period.periodLabel, monthlySummary)}
          accessibilityRole="button"
          onPress={onOpenMonthlySummary}
          testID="money-month-summary"
          style={({ pressed }) => [styles.monthlyPlanSummary, pressed ? styles.monthlyPlanSummaryPressed : null]}
        >
          <View style={styles.monthlyPlanSummaryHeader}>
            <Text style={styles.monthlyPlanSummaryTitle}>{moneyPeriodMonthName(period.periodLabel)} summary</Text>
            <Icon name="chevronRight" size={17} color={colors.textSecondary} />
          </View>
          <Text style={styles.monthlyPlanSummarySectionLabel}>ACTUAL</Text>
          <View style={styles.monthlyPlanSummaryRow}>
            <Text style={styles.monthlyPlanSummaryLabel}>Income received</Text>
            <Text style={styles.monthlyPlanSummaryValue}>{formatBudgetOverviewMoney(monthlySummary.incomeReceivedCents)}</Text>
          </View>
          <View style={styles.monthlyPlanSummaryRow}>
            <Text style={styles.monthlyPlanSummaryLabel}>Total spent</Text>
            <Text style={styles.monthlyPlanSummaryValue}>{formatBudgetOverviewMoney(monthlySummary.totalSpendingCents)}</Text>
          </View>
          <View style={[styles.monthlyPlanSummaryRow, styles.monthlyPlanSummaryDifference]}>
            <Text style={styles.monthlyPlanSummaryDifferenceLabel}>Difference</Text>
            <Text style={styles.monthlyPlanSummaryDifferenceValue}>
              {formatIncomeSpendingDifference(monthlySummary.incomeReceivedCents, monthlySummary.totalSpendingCents)}
            </Text>
          </View>
          {monthlySummary.spendingIncomePercent != null ? (
            <Text style={styles.monthlyPlanSummarySupport}>
              {formatPercent(monthlySummary.spendingIncomePercent)} of income received
            </Text>
          ) : null}
          {monthlySummary.savedResourceSpendingCents > 0 ? (
            <Text style={styles.monthlyPlanSummarySupport}>
              Includes {formatBudgetOverviewMoney(monthlySummary.savedResourceSpendingCents)} paid from saved money
            </Text>
          ) : null}
          <Text style={[styles.monthlyPlanSummarySectionLabel, styles.monthlyPlanSummaryPlanLabel]}>TARGET &amp; PLAN</Text>
          {monthlySummary.planTargetCents != null ? (
            <View style={styles.monthlyPlanSummaryRow}>
              <Text style={styles.monthlyPlanSummaryLabel}>{planTargetLabel(monthlySummary)}</Text>
              <Text style={styles.monthlyPlanSummaryValue}>{formatBudgetOverviewMoney(monthlySummary.planTargetCents)}</Text>
            </View>
          ) : null}
          <View style={styles.monthlyPlanSummaryRow}>
            <Text style={styles.monthlyPlanSummaryTotalLabel}>Monthly plan</Text>
            <Text style={styles.monthlyPlanSummaryTotalValue}>{formatBudgetOverviewMoney(monthlySummary.monthlyPlanCents)}</Text>
          </View>
          <Text style={styles.monthlyPlanSummaryPlanStatus}>{planVsTargetSummary(monthlySummary)}</Text>
        </Pressable>
      ) : null}
      {!answer ? <View style={styles.totalSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            {formatBudgetOverviewMoney(period.totals.spentCents)} / {formatBudgetOverviewMoney(period.totals.plannedCents)} ({period.totals.percentUsed}%)
          </Text>
        </View>
        <Text style={styles.remainingLabel}>{formatBudgetOverviewMoney(period.totals.remainingCents)} left across planned categories</Text>
      </View> : null}
      <Text style={styles.updatedLabel}>{period.monthOffset === 0 ? `Connected accounts · ${freshness}` : 'Saved transaction history'}</Text>
    </View>
  );
}

function MonthlySummaryFacts({
  answer,
  audit,
  onOpenTransactions,
  onReviewPlan,
  summary,
}: {
  answer: LivingLimitAnswer | null;
  audit: MoneyPlanAudit;
  onOpenTransactions: (title: string, transactionIds: string[]) => void;
  onReviewPlan: () => void;
  summary: MonthlyBudgetSummary;
}) {
  const effectiveProtectedCents = answer?.facts.protectedPlanCents == null
    ? null
    : answer.facts.protectedPlanCents + answer.facts.protectedOverageCents;
  const committedSupport = answer?.facts.protectedPlanCents == null
    ? undefined
    : answer.facts.protectedOverageCents > 0
      ? `Budget ${formatMoney(answer.facts.protectedPlanCents)} · ${formatMoney(answer.facts.protectedOverageCents)} over`
      : `Budget ${formatMoney(answer.facts.protectedPlanCents)}`;
  const flexibleSupport = answer?.facts.flexibleCapacityCents == null
    ? undefined
    : answer.facts.flexibleRoomCents == null
      ? `Budget ${formatMoney(answer.facts.flexibleCapacityCents)}`
      : `Budget ${formatMoney(answer.facts.flexibleCapacityCents)} · ${formatMoney(Math.abs(answer.facts.flexibleRoomCents))} ${answer.facts.flexibleRoomCents < 0 ? 'over' : 'left'}`;
  return (
    <View style={styles.drawerFacts}>
      <StatementSection label="ACTUAL">
        <StatementRow label="Income received" value={formatMoney(summary.incomeReceivedCents)} />
        <StatementRow label="Total spent" value={formatMoney(summary.totalSpendingCents)} emphasized />
        <StatementRow
          label="Difference"
          value={formatIncomeSpendingDifference(summary.incomeReceivedCents, summary.totalSpendingCents)}
        />
        {summary.spendingIncomePercent != null ? (
          <Text style={styles.drawerSupportingFact}>{formatPercent(summary.spendingIncomePercent)} of income received</Text>
        ) : null}
      </StatementSection>

      <StatementSection label="SPENDING">
        <StatementRow label="Counted toward monthly plan" value={formatMoney(summary.planCoveredSpendingCents)} />
        {summary.savedResourceSpendingCents > 0 ? (
          <StatementRow label="Paid from saved money" value={formatMoney(summary.savedResourceSpendingCents)} />
        ) : null}
        {summary.outsidePlanSpendingCents > 0 ? (
          <StatementRow label="Outside the plan" value={formatMoney(summary.outsidePlanSpendingCents)} />
        ) : null}
      </StatementSection>

      <StatementSection label="TARGET & PLAN">
        {summary.planTargetCents != null ? (
          <StatementRow
            label={planTargetLabel(summary)}
            value={formatMoney(summary.planTargetCents)}
            support={summary.planTargetBasisCents == null
              ? undefined
              : `Based on ${formatMoney(summary.planTargetBasisCents)} in planning income`}
          />
        ) : null}
        <StatementRow label="Committed plan" value={formatMoney(summary.committedPlanCents)} />
        <StatementRow label="Flexible plan" value={formatMoney(summary.flexiblePlanCents)} />
        <StatementRow label="Monthly plan" value={formatMoney(summary.monthlyPlanCents)} emphasized />
        <StatementRow
          label={planVsTargetLabel(summary)}
          value={summary.planVsTarget ? formatMoney(summary.planVsTarget.amountCents) : 'Not available'}
        />
      </StatementSection>

      <StatementSection label="CURRENT PLAN">
        {answer ? (
          <>
            <StatementRow
              label="Bills and money set aside"
              value={effectiveProtectedCents == null ? 'Not available' : formatStatementOutflow(effectiveProtectedCents)}
              support={committedSupport}
            />
            <StatementRow
              label={audit.unclearSpendingCents > 0 ? 'Flexible and unclear spending' : 'Flexible spending from plan'}
              value={answer.facts.countedFlexibleSpendCents == null
                ? 'Not available'
                : formatStatementOutflow(answer.facts.countedFlexibleSpendCents)}
              support={flexibleSupport}
            />
          </>
        ) : null}
        <View style={styles.drawerRule} />
        <StatementRow
          label={monthPlanResultLabel(summary)}
          value={summary.planResult ? formatMoney(summary.planResult.amountCents) : 'Not available'}
          emphasized
          destructive={summary.planResult?.status === 'over'}
        />
      </StatementSection>

      {summary.spendingOutsideCurrentPlanCents > 0 ? (
        <Text style={styles.drawerEvidence}>
          {formatMoney(summary.spendingOutsideCurrentPlanCents)} of actual spending did not count toward this month’s plan.
        </Text>
      ) : null}
      {audit.nonSpendingCents > 0 ? (
        <Text style={styles.drawerEvidence}>
          {formatMoney(audit.nonSpendingCents)} in income, transfers, and other non-spending activity is outside this total.
        </Text>
      ) : null}
      <View style={styles.drawerActions}>
        {audit.flexibleTransactionIds.length > 0 ? (
          <Button
            accessibilityLabel="Review flexible transactions"
            fullWidth
            onPress={() => onOpenTransactions('Flexible spending', audit.flexibleTransactionIds)}
            size="sm"
            variant="outline"
          >
            Review flexible transactions
          </Button>
        ) : null}
        <Button accessibilityLabel="Review monthly plan" fullWidth onPress={onReviewPlan} size="sm" variant="outline">
          Review monthly plan
        </Button>
      </View>
    </View>
  );
}

function monthPlanResultLabel(summary: MonthlyBudgetSummary): string {
  if (!summary.planResult) return 'Plan result';
  if (summary.planResult.status === 'over') return 'Over plan';
  if (summary.planResult.status === 'even') return 'On plan';
  return 'Left in plan';
}

function planTargetLabel(summary: MonthlyBudgetSummary): string {
  return summary.planTargetPercent == null ? 'Plan target' : `Plan target · ${formatPercent(summary.planTargetPercent)}`;
}

function planVsTargetLabel(summary: MonthlyBudgetSummary): string {
  if (!summary.planVsTarget) return 'Plan vs target';
  if (summary.planVsTarget.status === 'above') return 'Above target';
  if (summary.planVsTarget.status === 'below') return 'Below target';
  return 'On target';
}

function planVsTargetSummary(summary: MonthlyBudgetSummary): string {
  if (!summary.planVsTarget) return 'Target comparison unavailable';
  if (summary.planVsTarget.status === 'even') return 'On target';
  return `${formatBudgetOverviewMoney(summary.planVsTarget.amountCents)} ${summary.planVsTarget.status} target`;
}

function formatPercent(value: number): string {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}%`;
}

function monthlySummaryAccessibilityLabel(periodLabel: string, summary: MonthlyBudgetSummary): string {
  const incomeSpendingDifference = formatIncomeSpendingDifference(summary.incomeReceivedCents, summary.totalSpendingCents);
  const target = summary.planTargetCents == null
    ? 'plan target unavailable'
    : `${formatMoney(summary.planTargetCents)} ${planTargetLabel(summary).toLowerCase()}`;
  const savings = summary.savedResourceSpendingCents > 0
    ? `, ${formatMoney(summary.savedResourceSpendingCents)} paid from saved money`
    : '';
  return `Review ${moneyPeriodMonthName(periodLabel)} summary, ${formatMoney(summary.incomeReceivedCents)} income received, ${formatMoney(summary.totalSpendingCents)} spent, ${incomeSpendingDifference} difference${savings}, ${target}, ${formatMoney(summary.monthlyPlanCents)} monthly plan, ${planVsTargetSummary(summary)}`;
}

function moneyPeriodMonthName(periodLabel: string): string {
  return periodLabel.trim().split(/\s+/)[0] || 'Monthly';
}

function UnclearSpendingProjection({ audit, onPress }: {
  audit: MoneyPlanAudit;
  onPress: () => void;
}) {
  const count = audit.unclearTransactionIds.length;
  const transactionLabel = count === 1 ? 'transaction' : 'transactions';
  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryTitle}>Unclear spending</Text>
      </View>
      <Pressable
        accessibilityLabel={`Review unclear spending, ${formatMoney(audit.unclearSpendingCents)} across ${count} ${transactionLabel}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.unclearProjection, pressed ? styles.monthlyPlanSummaryPressed : null]}
      >
        <View style={styles.unclearProjectionCopy}>
          <Text style={styles.unclearProjectionAmount}>{formatMoney(audit.unclearSpendingCents)}</Text>
          <Text style={styles.unclearProjectionSupport}>
            {count} {transactionLabel} {count === 1 ? 'needs' : 'need'} a place
          </Text>
        </View>
        <Icon name="chevronRight" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

function UnclearSpendingReview({ audit, onReviewTransaction, transactions }: {
  audit: MoneyPlanAudit;
  onReviewTransaction: (transactionId: string) => void;
  transactions: MoneyTransaction[];
}) {
  const count = transactions.length;
  return (
    <View style={styles.unclearReview}>
      <Text style={styles.unclearReviewSummary}>
        {count} {count === 1 ? 'transaction' : 'transactions'} · {formatMoney(audit.unclearSpendingCents)}
      </Text>
      <Text style={styles.unclearReviewIntroduction}>
        Kwilt could not place these confidently. Review only the ones you recognize; the rest can wait here.
      </Text>
      <View style={styles.unclearReviewRows}>
        {transactions.map((transaction) => (
          <Pressable
            key={transaction.id}
            accessibilityLabel={`Review ${transaction.merchantName}, ${formatMoney(transaction.amountCents)}`}
            accessibilityRole="button"
            onPress={() => onReviewTransaction(transaction.id)}
            style={({ pressed }) => [styles.unclearReviewRow, pressed ? styles.monthlyPlanSummaryPressed : null]}
          >
            <View style={styles.unclearReviewRowCopy}>
              <Text numberOfLines={1} style={styles.unclearReviewMerchant}>{transaction.merchantName}</Text>
              <Text style={styles.unclearReviewMeta}>{formatTransactionDate(transaction.date)} · Needs a place</Text>
            </View>
            <Text style={styles.unclearReviewAmount}>{formatMoney(transaction.amountCents)}</Text>
            <Icon name="chevronRight" size={17} color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function CategoryConceptHeader({ accessibilityLabel, explanation, label }: {
  accessibilityLabel: string;
  explanation: string;
  label: string;
}) {
  const [explanationOpen, setExplanationOpen] = useState(false);
  return (
    <View style={styles.categoryConceptBlock}>
      <View style={styles.categoryConceptHeader}>
        <Text style={styles.categoryTitle}>{label}</Text>
        <Pressable
          accessibilityHint={`Explains ${label.toLowerCase()}.`}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ expanded: explanationOpen }}
          hitSlop={10}
          onPress={() => setExplanationOpen((current) => !current)}
          style={({ pressed }) => [styles.categoryInfoButton, pressed ? styles.iconButtonPressed : null]}
        >
          <Icon name="info" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>
      {explanationOpen ? <Text style={styles.categoryConceptExplanation}>{explanation}</Text> : null}
    </View>
  );
}

function CategoryViewMenu({ onPresentationChange, onReorder, presentation }: {
  onPresentationChange: (value: MoneyCategoryPresentation) => void;
  onReorder: () => void;
  presentation: MoneyCategoryPresentation;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Pressable
          accessibilityLabel="View category display"
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [styles.viewTrigger, pressed ? styles.iconButtonPressed : null]}
        >
          <Text style={styles.viewTriggerText}>View</Text>
          <Icon name="chevronDown" size={14} color={colors.textSecondary} />
        </Pressable>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" sideOffset={4}>
        <DropdownMenuRadioGroup value={presentation} onValueChange={(value) => value && onPresentationChange(value as MoneyCategoryPresentation)}>
          <CategoryViewChoice label="List" value="list" />
          <CategoryViewChoice label="Meters" value="meters" />
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem accessibilityLabel="Reorder categories" onPress={onReorder}>
          <View style={menuStyles.menuItemRow}>
            <Icon name="menu" size={18} color={colors.textPrimary} />
            <Text style={menuStyles.menuItemText} {...menuItemTextProps}>Reorder categories</Text>
          </View>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CategoryViewChoice({ label, value }: { label: string; value: string }) {
  return (
    <DropdownMenuRadioItem accessibilityLabel={label} value={value}>
      <Text style={menuStyles.menuItemText} {...menuItemTextProps}>{label}</Text>
    </DropdownMenuRadioItem>
  );
}

function StatementSection({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View style={styles.statementSection}>
      <Text style={styles.statementLabel}>{label}</Text>
      <View style={styles.statementRows}>{children}</View>
    </View>
  );
}

function StatementRow({
  destructive = false,
  emphasized = false,
  label,
  support,
  value,
}: {
  destructive?: boolean;
  emphasized?: boolean;
  label: string;
  support?: string;
  value: string;
}) {
  return (
    <View style={styles.drawerStatementItem}>
      <View style={styles.drawerFactRow}>
        <Text style={[styles.drawerFactLabel, emphasized ? styles.drawerFactEmphasized : null, destructive ? styles.drawerFactDestructive : null]}>{label}</Text>
        <Text style={[styles.drawerFactValue, emphasized ? styles.drawerFactEmphasized : null, destructive ? styles.drawerFactDestructive : null]}>{value}</Text>
      </View>
      {support ? <Text style={styles.drawerSupportingFact}>{support}</Text> : null}
    </View>
  );
}

function moneyMonthName(periodId: string): string {
  const [year, month] = periodId.split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return 'Monthly';
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
}

function formatTransactionDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return date;
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatStatementOutflow(cents: number): string {
  return cents > 0 ? `−${formatMoney(cents)}` : formatMoney(0);
}

function BudgetAccountHeaderAction({
  onConnect,
  onOpenStatus,
  onRetry,
  state,
}: {
  onConnect: () => void;
  onOpenStatus: () => void;
  onRetry: () => void;
  state: BudgetHeaderAccountState;
}) {
  const presentation = {
    connect: {
      accessibilityLabel: 'Connect another account',
      icon: 'landmark' as const,
      label: 'Connect',
      onPress: onConnect,
      tone: colors.textPrimary,
    },
    connecting: {
      accessibilityLabel: 'Opening secure account connection',
      icon: 'refresh' as const,
      label: 'Opening…',
      onPress: undefined,
      tone: colors.textSecondary,
    },
    checking: {
      accessibilityLabel: 'Checking for new activity',
      icon: 'refresh' as const,
      label: 'Checking…',
      onPress: undefined,
      tone: colors.textSecondary,
    },
    fresh: {
      accessibilityLabel: 'Bank data updated just now',
      icon: 'check' as const,
      label: 'Just now',
      onPress: onOpenStatus,
      tone: colors.textSecondary,
    },
    error: {
      accessibilityLabel: 'Couldn’t refresh bank data. Try again',
      icon: 'warning' as const,
      label: 'Couldn’t refresh',
      onPress: onRetry,
      tone: colors.destructive,
    },
  }[state];
  const disabled = !presentation.onPress;

  return (
    <Pressable
      accessibilityLabel={presentation.accessibilityLabel}
      accessibilityLiveRegion={state === 'connect' ? 'none' : 'polite'}
      accessibilityRole="button"
      accessibilityState={{ busy: state === 'checking' || state === 'connecting', disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={presentation.onPress}
      style={({ pressed }) => [
        styles.headerAccountAction,
        pressed ? styles.headerAccountActionPressed : null,
      ]}
    >
      <Icon name={presentation.icon} size={14} color={presentation.tone} />
      <Text numberOfLines={1} style={[styles.headerAccountActionLabel, { color: presentation.tone }]}>
        {presentation.label}
      </Text>
    </Pressable>
  );
}

function MonthArrow({ direction, disabled, label, onPress }: {
  direction: 'left' | 'right';
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [
        styles.monthArrowButton,
        disabled ? styles.iconButtonDisabled : null,
        pressed ? styles.iconButtonPressed : null,
      ]}
    >
      <Icon name={direction === 'left' ? 'chevronLeft' : 'chevronRight'} size={15} color={disabled ? colors.textSecondary : colors.textPrimary} />
    </Pressable>
  );
}

function SummaryMenuItem({ icon, label, onPress }: {
  icon: 'plus' | 'receipt' | 'settings' | 'landmark';
  label: string;
  onPress: () => void;
}) {
  return (
    <DropdownMenuItem onPress={onPress} accessibilityLabel={label} label={label} icon={icon} />
  );
}

const styles = StyleSheet.create({
  headerMoreButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  summaryMenuContent: { minWidth: 248 },
  headerAccountAction: { minHeight: 36, maxWidth: 132, paddingHorizontal: spacing.sm, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  headerAccountActionPressed: { backgroundColor: colors.fieldFillPressed },
  headerAccountActionLabel: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, fontWeight: '500' },
  monthSwipeSurface: { gap: spacing.lg, overflow: 'hidden' },
  monthPager: { overflow: 'hidden' },
  monthHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  monthPicker: { minWidth: 0, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  monthActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  monthTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  monthArrowButton: { width: 40, height: 34, alignItems: 'center', justifyContent: 'center' },
  iconButtonPressed: { backgroundColor: colors.fieldFillPressed },
  iconButtonDisabled: { opacity: 0.35 },
  monthBody: { minHeight: 520, gap: spacing.lg },
  monthlyPlanSummary: { gap: spacing.sm, borderRadius: 18, backgroundColor: colors.fieldFill, padding: spacing.md },
  monthlyPlanSummaryPressed: { backgroundColor: colors.fieldFillPressed },
  monthlyPlanSummaryHeader: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  monthlyPlanSummaryTitle: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  monthlyPlanSummarySectionLabel: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14, fontWeight: '600', letterSpacing: 0.8 },
  monthlyPlanSummaryPlanLabel: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder, paddingTop: spacing.sm, marginTop: spacing.xs },
  monthlyPlanSummaryRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  monthlyPlanSummaryLabel: { flex: 1, color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  monthlyPlanSummaryValue: { color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, fontWeight: '500', fontVariant: ['tabular-nums'] },
  monthlyPlanSummaryDifference: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder, paddingTop: spacing.xs },
  monthlyPlanSummaryDifferenceLabel: { flex: 1, color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  monthlyPlanSummaryDifferenceValue: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, fontWeight: '500', fontVariant: ['tabular-nums'] },
  monthlyPlanSummarySupport: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  monthlyPlanSummaryTotalLabel: { flex: 1, color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  monthlyPlanSummaryTotalValue: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, fontWeight: '600', fontVariant: ['tabular-nums'] },
  monthlyPlanSummaryPlanStatus: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, textAlign: 'right' },
  categorySection: { gap: spacing.sm },
  categoryHeader: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  categoryConceptBlock: { minWidth: 0, flex: 1, gap: spacing.xs },
  categoryConceptHeader: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  categoryTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  categoryInfoButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  categoryConceptExplanation: { maxWidth: 330, color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  viewTrigger: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: spacing.xs },
  viewTriggerText: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md, columnGap: spacing.sm },
  flexibleCategoryCollection: { marginTop: spacing.sm },
  categoryList: {
    overflow: 'hidden',
    borderWidth: 0,
    borderRadius: radii.card,
    backgroundColor: colors.fieldFill,
    paddingBottom: spacing.sm,
  },
  unclearProjection: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.fieldFill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  unclearProjectionCopy: { minWidth: 0, flex: 1, gap: 2 },
  unclearProjectionAmount: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 20, lineHeight: 27, fontWeight: '600', fontVariant: ['tabular-nums'] },
  unclearProjectionSupport: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  totalSection: { gap: spacing.xs, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.cardBorder, paddingVertical: spacing.lg },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  totalLabel: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  totalValue: { color: colors.textPrimary, textAlign: 'right', fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, fontWeight: '600', fontVariant: ['tabular-nums'] },
  remainingLabel: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  updatedLabel: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  drawerContent: { gap: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing['3xl'] },
  accountSourcesSummary: { gap: 2 },
  accountSourcesCount: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  accountSourcesFreshness: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  accountConnectionMessage: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  drawerFacts: { gap: spacing.lg },
  statementSection: { gap: spacing.xs },
  statementLabel: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, fontWeight: '600', letterSpacing: 0.7 },
  statementRows: { gap: 0 },
  drawerStatementItem: { paddingVertical: spacing.xs },
  drawerFactRow: { minHeight: 32, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  drawerFactLabel: { flex: 1, color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  drawerFactValue: { flexShrink: 1, color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, textAlign: 'right', fontVariant: ['tabular-nums'] },
  drawerFactEmphasized: { color: colors.textPrimary, fontFamily: fonts.bold, fontWeight: '700' },
  drawerFactDestructive: { color: colors.destructive },
  drawerRule: { height: 1, backgroundColor: colors.cardBorder, marginVertical: spacing.xs },
  drawerSupportingFact: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  drawerEvidence: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  drawerActions: { gap: spacing.xs },
  unclearReview: { gap: spacing.md },
  unclearReviewSummary: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 20, lineHeight: 27, fontWeight: '600', fontVariant: ['tabular-nums'] },
  unclearReviewIntroduction: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  unclearReviewRows: { overflow: 'hidden', borderRadius: radii.card, backgroundColor: colors.fieldFill },
  unclearReviewRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  unclearReviewRowCopy: { minWidth: 0, flex: 1, gap: 2 },
  unclearReviewMerchant: { color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, fontWeight: '500' },
  unclearReviewMeta: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  unclearReviewAmount: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  onboardingGuideBody: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  onboardingWelcomeContent: { paddingTop: spacing.sm },
  onboardingWelcomeGifFrame: { borderRadius: radii.card, marginBottom: 0 },
  onboardingWelcomeMedia: {
    alignItems: 'center',
    backgroundColor: colors.shellAlt,
    borderRadius: radii.card,
    height: 128,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  onboardingWelcomeIllustration: { height: 124, width: '92%' },
});
