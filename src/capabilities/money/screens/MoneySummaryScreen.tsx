import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { HapticsService } from '../../../services/HapticsService';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { colors, fonts, spacing } from '../../../theme';
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
  DropdownMenuTrigger,
} from '../../../ui/DropdownMenu';
import { menuItemTextProps, menuStyles } from '../../../ui/menuStyles';
import { formatMoney, formatMoneyFreshness } from '../data/moneySnapshot';
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

const MONTH_RADIUS = 12;
const INITIAL_MONTH_INDEX = MONTH_RADIUS;
export function MoneySummaryScreen({ navigation }: NativeStackScreenProps<MoneyStackParamList, 'MoneySummary'>) {
  const { snapshot, refresh, reconcileGovernedPlanFoundation } = useMoneyData();
  const { capture } = useAnalytics();
  const { width: windowWidth } = useWindowDimensions();
  const [measuredPagerWidth, setMeasuredPagerWidth] = useState(0);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(INITIAL_MONTH_INDEX);
  const [limitExplanationOpen, setLimitExplanationOpen] = useState(false);
  const [categoryPresentation, setCategoryPresentation] = useState<MoneyCategoryPresentation>('tiles');
  const autoRefreshKeyRef = useRef<string | null>(null);
  const pagerRef = useRef<FlatList<MoneyPeriodView>>(null);
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

  const summaryMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Pressable accessibilityRole="button" accessibilityLabel="Budget options" style={styles.headerMoreButton}>
          <Icon name="more" size={22} color={colors.textPrimary} />
        </Pressable>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom" sideOffset={6}>
        <SummaryMenuItem icon="plus" label="Add category" onPress={() => navigation.navigate('MoneyCategoryCreate')} />
        <SummaryMenuItem icon="receipt" label="Transactions" onPress={() => navigation.navigate('MoneyTransactions', {})} />
        <SummaryMenuItem
          icon="settings"
          label="Settings"
          onPress={() => rootNavigationRef.navigate('Settings', { screen: 'SettingsHome' })}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const livingLimitAnswer = snapshot?.livingLimitAnswer ?? null;
  const planAudit = useMemo(() => (
    snapshot && livingLimitAnswer
      ? projectMoneyPlanAudit({
          periodId: livingLimitAnswer.facts.periodId,
          categories: snapshot.categories,
          transactions: snapshot.transactions,
        })
      : null
  ), [livingLimitAnswer, snapshot]);

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
      reconcileGovernedPlanFoundation,
      refreshSnapshot: refresh,
    }).catch(() => {
      // Keep the last useful answer visible. Account-specific repair belongs in Accounts.
    });
  }, [livingLimitAnswer, reconcileGovernedPlanFoundation, refresh, snapshot]);

  return (
    <>
    <MoneyScreenFrame moreMenu={summaryMenu} title="Budget">
      {snapshot && currentPeriod ? (
        <View
          style={styles.monthSwipeSurface}
          onLayout={(event) => {
            const width = Math.round(event.nativeEvent.layout.width);
            if (width > 24) setMeasuredPagerWidth(width);
          }}
        >
          <View style={styles.monthHeader}>
            <View style={styles.monthPicker}>
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
              <Text numberOfLines={1} style={styles.monthTitle}>{currentPeriod.periodLabel}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add category"
              hitSlop={10}
              onPress={() => navigation.navigate('MoneyCategoryCreate')}
              style={({ pressed }) => [styles.iconButton, pressed ? styles.iconButtonPressed : null]}
            >
              <Icon name="plus" size={20} color={colors.textPrimary} />
            </Pressable>
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
                onExplain={() => {
                  if (livingLimitAnswer) capture(AnalyticsEvent.MoneyBudgetExplanationOpened, buildMoneyBudgetExplanationOpenedProps({ answer: livingLimitAnswer, surface: 'budget' }));
                  setLimitExplanationOpen(true);
                }}
                onReviewIncome={() => navigation.navigate('MoneyLivingPlan')}
                onOpenCategory={(categoryId) => navigation.navigate('MoneyCategoryDetail', { categoryId, monthOffset: item.monthOffset })}
                categoryPresentation={categoryPresentation}
                onCategoryPresentationChange={setCategoryPresentation}
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
    <BottomDrawer
      visible={Boolean(livingLimitAnswer) && limitExplanationOpen}
      onClose={() => setLimitExplanationOpen(false)}
      snapPoints={['78%']}
      dynamicSizing
      enableContentPanningGesture
    >
      {livingLimitAnswer && planAudit ? (
        <BottomDrawerScrollView contentContainerStyle={styles.drawerContent}>
          <BottomDrawerHeader
            title="Flexible spending"
            titleVariant="lg"
            variant="withClose"
            closeAccessibilityLabel="Close flexible spending calculation"
            onClose={() => setLimitExplanationOpen(false)}
          />
          <LimitFacts
            answer={livingLimitAnswer}
            audit={planAudit}
            freshness={formatMoneyFreshness(snapshot?.lastSyncedAt ?? null)}
            onChangeTarget={() => {
              setLimitExplanationOpen(false);
              navigation.navigate('MoneyLivingPlan');
            }}
            onOpenCategory={(categoryId) => {
              setLimitExplanationOpen(false);
              navigation.navigate('MoneyCategoryDetail', { categoryId, monthOffset: 0 });
            }}
            onOpenTransactions={(title, transactionIds) => {
              if (transactionIds.length === 0) return;
              setLimitExplanationOpen(false);
              navigation.navigate('MoneyTransactions', {
                inventoryTitle: title,
                reviewTransactionIds: transactionIds,
              });
            }}
          />
        </BottomDrawerScrollView>
      ) : null}
    </BottomDrawer>
    </>
  );
}

function SummaryMonthPanel({
  answer,
  categoryPresentation,
  freshness,
  onCategoryPresentationChange,
  onExplain,
  onOpenCategory,
  onReviewIncome,
  pageWidth,
  period,
}: {
  answer: LivingLimitAnswer | null;
  categoryPresentation: MoneyCategoryPresentation;
  freshness: string;
  onCategoryPresentationChange: (value: MoneyCategoryPresentation) => void;
  onExplain: () => void;
  onOpenCategory: (categoryId: string) => void;
  onReviewIncome: () => void;
  pageWidth: number;
  period: MoneyPeriodView;
}) {
  const cardWidth = Math.max(1, Math.floor((pageWidth - spacing.sm) / 2));
  const categoryView = resolveCategoryPresentation(categoryPresentation);
  return (
    <View style={[styles.monthBody, { width: pageWidth }]}>
      {answer ? (
        <MoneyPlanLimitAnswer
          answer={answer}
          freshness={freshness}
          onExplain={onExplain}
          onReviewIncome={onReviewIncome}
        />
      ) : null}
      <View style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>Categories</Text>
          <CategoryViewMenu
            onPresentationChange={onCategoryPresentationChange}
            presentation={categoryPresentation}
          />
        </View>
        <View style={categoryView.layout === 'tiles' ? styles.categoryGrid : styles.categoryList}>
          {period.categories.map((category) => (
            categoryView.layout === 'tiles' ? (
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
                valueMode={categoryView.valueMode}
              />
            )
          ))}
        </View>
      </View>
      {!answer ? <View style={styles.totalSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            {formatMoney(period.totals.spentCents)} / {formatMoney(period.totals.plannedCents)} ({period.totals.percentUsed}%)
          </Text>
        </View>
        <Text style={styles.remainingLabel}>{formatMoney(period.totals.remainingCents)} left across planned categories</Text>
      </View> : null}
      <Text style={styles.updatedLabel}>{period.monthOffset === 0 ? `Connected accounts · ${freshness}` : 'Saved transaction history'}</Text>
    </View>
  );
}

function CategoryViewMenu({ onPresentationChange, presentation }: {
  onPresentationChange: (value: MoneyCategoryPresentation) => void;
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
          <CategoryViewChoice label="Tiles" value="tiles" />
          <CategoryViewChoice label="List · Percent used" value="list_percent" />
          <CategoryViewChoice label="List · Dollars left" value="list_dollars" />
        </DropdownMenuRadioGroup>
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

function LimitFacts({
  answer,
  audit,
  freshness,
  onChangeTarget,
  onOpenCategory,
  onOpenTransactions,
}: {
  answer: LivingLimitAnswer;
  audit: MoneyPlanAudit;
  freshness: string;
  onChangeTarget: () => void;
  onOpenCategory: (categoryId: string) => void;
  onOpenTransactions: (title: string, transactionIds: string[]) => void;
}) {
  const { facts } = answer;
  const [protectedOpen, setProtectedOpen] = useState(false);
  const protectedOverageCents = facts.protectedOverageCents ?? 0;
  const effectiveProtectedCents = facts.protectedPlanCents == null
    ? null
    : facts.protectedPlanCents + protectedOverageCents;
  const roomCents = facts.flexibleRoomCents;
  const monthName = moneyMonthName(facts.periodId);
  const headline = roomCents == null
    ? 'Update unavailable'
    : `${formatMoney(Math.abs(roomCents))} ${roomCents < 0 ? 'over' : 'left'} this month`;
  return (
    <View style={styles.drawerFacts}>
      <Text
        accessibilityRole="header"
        adjustsFontSizeToFit
        minimumFontScale={0.78}
        numberOfLines={1}
        style={[styles.drawerHeadline, roomCents != null && roomCents < 0 ? styles.drawerHeadlineOver : null]}
      >
        {headline}
      </Text>

      <StatementSection label="YOUR MONTHLY BOUNDARY">
        <LimitFact
          accessibilityLabel={`Change ${facts.livingPercent}% living target`}
          label={`Living target · ${facts.livingPercent}%`}
          value={facts.livingLimitCents == null ? 'Not available' : formatMoney(facts.livingLimitCents)}
          onPress={onChangeTarget}
        />
        <LimitFact
          accessibilityLabel="Review bills and money set aside"
          expanded={protectedOpen}
          label="Bills and money set aside"
          value={effectiveProtectedCents == null ? 'Not available' : formatStatementOutflow(effectiveProtectedCents)}
          onPress={audit.protectedCategories.length > 0 ? () => setProtectedOpen((open) => !open) : undefined}
        />
        {facts.protectedPlanCents != null ? (
          <Text style={styles.drawerSupportingFact}>
            {protectedOverageCents > 0
              ? `${formatMoney(facts.protectedPlanCents)} planned · ${formatMoney(protectedOverageCents)} higher this month`
              : `${formatMoney(facts.protectedPlanCents)} kept aside`}
          </Text>
        ) : null}
        {protectedOpen ? (
          <View style={styles.protectedCategoryList}>
            {audit.protectedCategories.map((category) => (
              <LimitFact
                key={category.categoryId}
                accessibilityLabel={`Open ${category.name}`}
                label={category.name}
                value={formatMoney(category.plannedCents)}
                onPress={() => onOpenCategory(category.categoryId)}
                secondary
              />
            ))}
          </View>
        ) : null}
        <View style={styles.drawerRule} />
        <LimitFact label="Flexible room" value={facts.flexibleCapacityCents == null ? 'Not available' : formatMoney(facts.flexibleCapacityCents)} emphasized />
      </StatementSection>

      <StatementSection label="THIS MONTH">
        <LimitFact
          accessibilityLabel="Review flexible spending transactions"
          label="Flexible spending"
          value={facts.countedFlexibleSpendCents == null ? 'Not available' : formatStatementOutflow(facts.countedFlexibleSpendCents)}
          onPress={audit.flexibleTransactionIds.length > 0
            ? () => onOpenTransactions('Flexible spending', audit.flexibleTransactionIds)
            : undefined}
        />
        <View style={styles.drawerRule} />
        <LimitFact
          label="Left"
          value={roomCents == null ? 'Not available' : roomCents < 0 ? `${formatMoney(Math.abs(roomCents))} over` : formatMoney(roomCents)}
          emphasized
        />
      </StatementSection>

      <LimitFact
        accessibilityLabel={`Review other ${monthName} activity`}
        label={audit.isComplete ? `All ${monthName} activity is accounted for` : `${monthName} activity could not be reconciled`}
        value={audit.notCountedTransactionIds.length > 0 ? 'See details' : 'Complete'}
        onPress={audit.notCountedTransactionIds.length > 0
          ? () => onOpenTransactions(`Other ${monthName} activity`, audit.notCountedTransactionIds)
          : undefined}
        secondary
      />
      <Text style={styles.drawerBasis}>
        {facts.resourceBasisCents == null ? 'Income basis unavailable' : `${basisLabel(facts.resourceBasisKind)}: ${formatMoney(facts.resourceBasisCents)}`} · {freshness}
      </Text>
    </View>
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

function LimitFact({
  accessibilityLabel,
  emphasized = false,
  expanded,
  label,
  onPress,
  secondary = false,
  value,
}: {
  accessibilityLabel?: string;
  emphasized?: boolean;
  expanded?: boolean;
  label: string;
  onPress?: () => void;
  secondary?: boolean;
  value: string;
}) {
  const content = (
    <>
      <Text style={[styles.drawerFactLabel, emphasized ? styles.drawerFactEmphasized : null]}>{label}</Text>
      <Text style={[styles.drawerFactValue, emphasized ? styles.drawerFactEmphasized : null]}>{value}</Text>
      {onPress ? <Icon name={expanded ? 'chevronUp' : 'chevronRight'} size={16} color={colors.textSecondary} /> : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="button"
        accessibilityState={expanded == null ? undefined : { expanded }}
        onPress={onPress}
        style={({ pressed }) => [styles.drawerFactRow, secondary ? styles.drawerFactSecondary : null, pressed ? styles.drawerFactPressed : null]}
      >
        {content}
      </Pressable>
    );
  }
  return (
    <View style={[styles.drawerFactRow, secondary ? styles.drawerFactSecondary : null]}>{content}</View>
  );
}

function basisLabel(kind: LivingLimitAnswer['facts']['resourceBasisKind']): string {
  if (kind === 'user_set') return 'You set this';
  if (kind === 'detected_income') return 'Detected income';
  if (kind === 'prior_supported_basis') return 'Last supported income';
  return 'Not confirmed';
}

function moneyMonthName(periodId: string): string {
  const [year, month] = periodId.split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return 'Monthly';
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
}

function formatStatementOutflow(cents: number): string {
  return cents > 0 ? `−${formatMoney(cents)}` : formatMoney(0);
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
        styles.iconButton,
        styles.monthArrowButton,
        disabled ? styles.iconButtonDisabled : null,
        pressed ? styles.iconButtonPressed : null,
      ]}
    >
      <Icon name={direction === 'left' ? 'chevronLeft' : 'chevronRight'} size={22} color={disabled ? colors.textSecondary : colors.textPrimary} />
    </Pressable>
  );
}

function SummaryMenuItem({ icon, label, onPress }: {
  icon: 'plus' | 'receipt' | 'settings';
  label: string;
  onPress: () => void;
}) {
  return (
    <DropdownMenuItem onPress={onPress} accessibilityLabel={label}>
      <View style={menuStyles.menuItemRow}>
        <Icon name={icon} size={18} color={colors.textPrimary} />
        <Text style={menuStyles.menuItemText} {...menuItemTextProps}>{label}</Text>
      </View>
    </DropdownMenuItem>
  );
}

const styles = StyleSheet.create({
  headerMoreButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  monthSwipeSurface: { gap: spacing.lg, overflow: 'hidden' },
  monthPager: { overflow: 'hidden' },
  monthHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  monthPicker: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  monthTitle: { flexShrink: 1, marginLeft: spacing.xs, color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  monthArrowButton: { width: 32, height: 32 },
  iconButtonPressed: { backgroundColor: colors.fieldFillPressed },
  iconButtonDisabled: { opacity: 0.35 },
  monthBody: { minHeight: 520, gap: spacing.lg },
  categorySection: { gap: spacing.sm },
  categoryHeader: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  categoryTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  viewTrigger: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: spacing.xs },
  viewTriggerText: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md, columnGap: spacing.sm },
  categoryList: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  totalSection: { gap: spacing.xs, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.cardBorder, paddingVertical: spacing.lg },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  totalLabel: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  totalValue: { color: colors.textPrimary, textAlign: 'right', fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, fontWeight: '600', fontVariant: ['tabular-nums'] },
  remainingLabel: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  updatedLabel: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  drawerContent: { gap: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing['3xl'] },
  drawerFacts: { gap: spacing.lg },
  drawerHeadline: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6 },
  drawerHeadlineOver: { color: colors.destructive },
  statementSection: { gap: spacing.xs },
  statementLabel: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, fontWeight: '600', letterSpacing: 0.7 },
  statementRows: { gap: spacing.xs },
  drawerFactRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, borderRadius: 8 },
  drawerFactSecondary: { paddingLeft: spacing.md },
  drawerFactPressed: { backgroundColor: colors.fieldFillPressed },
  drawerFactLabel: { flex: 1, color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  drawerFactValue: { flexShrink: 1, color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, textAlign: 'right', fontVariant: ['tabular-nums'] },
  drawerFactEmphasized: { color: colors.textPrimary, fontFamily: fonts.bold, fontWeight: '700' },
  drawerRule: { height: 1, backgroundColor: colors.cardBorder, marginTop: spacing.xs },
  drawerSupportingFact: { marginTop: -spacing.xs, paddingLeft: spacing.sm, color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  drawerBasis: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  protectedCategoryList: { gap: spacing.xs },
});
