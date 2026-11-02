import { Pressable } from '@/src/ui/HapticPressable';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors, fonts, spacing, typography } from '../../../theme';
import { Icon, type IconName } from '../../../ui/Icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../ui/DropdownMenu';
import { menuItemTextProps, menuStyles } from '../../../ui/menuStyles';
import {
  MoneyInventoryControlGroup,
  MoneyInventoryControlSurface,
  MoneyInventoryListFrame,
} from '../components/MoneyInventoryListFrame';
import { MoneyFreshnessStamp } from '../components/MoneyFreshnessStamp';
import { useMoneyData } from '../data/MoneyDataContext';
import { formatMoney, type MoneyTransaction } from '../data/moneySnapshot';
import { projectMoneyTransactionsForCategory } from '../domain/moneyPeriodView';
import { projectBudgetOverageReview } from '../domain/budgetOverageReview';
import { collapseLinkedCreditCardPaymentTransfers } from '../domain/creditCardPaymentTransfers';
import { isProviderIncome } from '../domain/transactionMeaning';
import type { MoneyStackParamList } from '../navigation/types';
import { MoneyScreenFrame } from './MoneyScreenFrame';
import { EmptyState } from '../../../ui/EmptyState';
import { CanvasFlatList } from '../../../ui/layout/CanvasFlatList';

type InventoryRow =
  | { kind: 'heading'; key: string; label: string; first: boolean; overageCents?: number }
  | { kind: 'transaction'; key: string; transaction: MoneyTransaction; last: boolean };

type Filter = 'all' | 'unmatched' | 'matched' | 'outflow' | 'inflow';
type Sort = 'newest' | 'oldest' | 'amount_high' | 'merchant';
type DateScope = 'current_month' | 'last_30_days' | 'last_12_months' | 'all';

const FILTER_OPTIONS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All transactions' },
  { value: 'unmatched', label: 'Needs review' },
  { value: 'matched', label: 'Matched' },
  { value: 'outflow', label: 'Spending' },
  { value: 'inflow', label: 'Income' },
];
const SORT_OPTIONS: Array<{ value: Sort; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'amount_high', label: 'Amount high to low' },
  { value: 'merchant', label: 'Merchant A-Z' },
];
const DATE_OPTIONS: Array<{ value: DateScope; label: string }> = [
  { value: 'current_month', label: 'This month' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_12_months', label: 'Last 12 months' },
  { value: 'all', label: 'All history' },
];

export function MoneyTransactionsScreen({ navigation, route }: NativeStackScreenProps<MoneyStackParamList, 'MoneyTransactions'>) {
  const { width, fontScale } = useWindowDimensions();
  const expandedRows = width / fontScale < 280;
  const { snapshot, reconcileConnectedActivity } = useMoneyData();
  const [dateScope, setDateScope] = useState<DateScope>('current_month');
  const [filter, setFilter] = useState<Filter>(route.params?.reviewState === 'needs_review' ? 'unmatched' : 'all');
  const [sort, setSort] = useState<Sort>('newest');
  const [syncing, setSyncing] = useState(false);
  const accountId = route.params?.accountId;
  const categoryId = route.params?.categoryId;
  const monthStart = route.params?.monthStart;
  const monthEnd = route.params?.monthEnd;
  const monthLabel = route.params?.monthLabel;
  const inventoryTitle = route.params?.inventoryTitle;
  const reviewTransactionIds = route.params?.reviewTransactionIds;
  const overageReview = route.params?.overageReview === true;
  const reviewTransactionIdSet = useMemo(() => new Set(reviewTransactionIds ?? []), [reviewTransactionIds]);
  const allTransactions = snapshot?.transactions ?? [];
  const selectedCategory = categoryId
    ? snapshot?.categories.find((category) => category.id === categoryId || category.sourceId === categoryId)
    : undefined;
  const scopedInventory = useMemo(() => {
    const accountTransactions = allTransactions.filter((transaction) => (
      (!accountId || transaction.accountId === accountId)
      && (!reviewTransactionIds || reviewTransactionIdSet.has(transaction.id))
    ));
    return selectedCategory
      ? projectMoneyTransactionsForCategory(accountTransactions, selectedCategory)
      : categoryId ? [] : accountTransactions;
  }, [accountId, allTransactions, categoryId, reviewTransactionIdSet, reviewTransactionIds, selectedCategory]);
  const dateTransactions = useMemo(() => scopedInventory.filter((transaction) => (
    monthStart && monthEnd
      ? transaction.date >= monthStart && transaction.date <= monthEnd
      : matchesDateScope(transaction.date, dateScope)
  )), [dateScope, monthEnd, monthStart, scopedInventory]);
  const transactions = useMemo(() => sortTransactions(dateTransactions.filter((transaction) => matchesFilter(transaction, filter)), sort), [dateTransactions, filter, sort]);
  const inventoryTransactions = useMemo(() => collapseLinkedCreditCardPaymentTransfers(transactions), [transactions]);
  const groups = useMemo(() => groupByDate(inventoryTransactions), [inventoryTransactions]);
  const accountLabel = accountId ? snapshot?.accounts.find((account) => account.id === accountId)?.name : null;
  const categoryLabel = selectedCategory?.name ?? null;
  const title = inventoryTitle ?? (reviewTransactionIds
    ? 'Review purchases'
    : [categoryLabel ?? accountLabel, monthLabel].filter(Boolean).join(' · ') || 'Transactions');
  const isScopedInventory = Boolean(accountId || categoryId || reviewTransactionIds);
  const overageProjection = useMemo(() => overageReview && snapshot ? projectBudgetOverageReview({
    periodId: snapshot.livingLimitAnswer?.facts.periodId ?? new Date().toISOString().slice(0, 7),
    flexibleRoomCents: route.params?.flexibleRoomCents ?? snapshot.livingLimitAnswer?.facts.flexibleRoomCents ?? 0,
    categories: snapshot.categories,
    transactions: snapshot.transactions,
  }) : null, [overageReview, route.params?.flexibleRoomCents, snapshot]);

  const listRows = useMemo<InventoryRow[]>(() => overageProjection
    ? overageProjection.groups.flatMap((group, index): InventoryRow[] => [
      { kind: 'heading', key: `overage-${group.categoryId}`, label: group.categoryName, first: index === 0, overageCents: group.overageCents },
      ...group.transactions.map((transaction, rowIndex): InventoryRow => ({ kind: 'transaction', key: `${group.categoryId}:${transaction.id}`, transaction, last: rowIndex === group.transactions.length - 1 })),
    ])
    : groups.flatMap((group, index): InventoryRow[] => [
      { kind: 'heading', key: `date-${group.label}`, label: group.label, first: index === 0 },
      ...group.rows.map((transaction, rowIndex): InventoryRow => ({ kind: 'transaction', key: `transaction-${transaction.id}`, transaction, last: rowIndex === group.rows.length - 1 })),
    ]), [groups, overageProjection]);

  const selectDateScope = (next: DateScope) => {
    setDateScope(next);
    if (monthStart || monthEnd || monthLabel) {
      navigation.setParams({ monthStart: undefined, monthEnd: undefined, monthLabel: undefined });
    }
  };

  const checkActivity = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await reconcileConnectedActivity({ trigger: 'manual_sync', sync: true });
    } catch {
      // MoneyScreenFrame keeps the last successful data visible and owns the warning.
    } finally {
      setSyncing(false);
    }
  };

  const returnFromTransactions = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.replace('MoneySummary');
  };

  return (
    <MoneyScreenFrame
      headerRightElement={!expandedRows && snapshot?.lastSyncedAt
        ? <MoneyFreshnessStamp lastSyncedAt={snapshot.lastSyncedAt} />
        : undefined}
      onRefresh={checkActivity}
      title={title}
      onPressBack={returnFromTransactions}
    >
      {({ warning, ...scrollProps }) => (
        <CanvasFlatList
          {...scrollProps}
          data={listRows}
          keyExtractor={(row) => row.key}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={7}
          contentContainerStyle={[styles.listContent, overageProjection ? styles.overageListContent : null]}
          ListHeaderComponent={(
            <View>
              {warning ? <View style={styles.warningSlot}>{warning}</View> : null}
              {expandedRows && snapshot?.lastSyncedAt ? <View style={styles.warningSlot}><MoneyFreshnessStamp lastSyncedAt={snapshot.lastSyncedAt} /></View> : null}
              {overageProjection ? (
                <View style={styles.overageReview}>
                  <Text style={styles.overageIntro}>Budgets over their {snapshot?.periodLabel.split(' ')[0]} amounts</Text>
                  {overageProjection.offsetCents > 0 ? <Text style={styles.overageOffset}>Other flexible budgets are {formatMoney(overageProjection.offsetCents)} under their amounts.</Text> : null}
                </View>
              ) : (
                      <MoneyInventoryListFrame
                        controls={(
                          <MoneyInventoryControlGroup>
                            <IconMenu iconName="calendar" active={Boolean(monthStart) || dateScope !== 'current_month'} count={Boolean(monthStart) || dateScope !== 'current_month' ? 1 : 0} accessibilityLabel="Date scope">
                              {DATE_OPTIONS.map((option) => <TransactionMenuItem key={option.value} active={!monthStart && dateScope === option.value} label={option.label} onPress={() => selectDateScope(option.value)} />)}
                            </IconMenu>
                            <IconMenu iconName="funnel" active={filter !== 'all'} count={filter !== 'all' ? 1 : 0} accessibilityLabel="Filter transactions">
                              {FILTER_OPTIONS.map((option) => <TransactionMenuItem key={option.value} active={filter === option.value} label={option.label} onPress={() => setFilter(option.value)} />)}
                              {filter !== 'all' ? <><DropdownMenuSeparator /><TransactionMenuItem active={false} iconName="close" label="Clear filter" onPress={() => setFilter('all')} /></> : null}
                            </IconMenu>
                            <IconMenu iconName="sort" active={sort !== 'newest'} count={sort !== 'newest' ? 1 : 0} accessibilityLabel="Sort transactions">
                              {SORT_OPTIONS.map((option, index) => (
                                <View key={option.value}>{index === 2 ? <DropdownMenuSeparator /> : null}<TransactionMenuItem active={sort === option.value} label={option.label} onPress={() => setSort(option.value)} /></View>
                              ))}
                            </IconMenu>
                          </MoneyInventoryControlGroup>
                        )}
                        count={{
                          visible: inventoryTransactions.length,
                          total: collapseLinkedCreditCardPaymentTransfers(scopedInventory).length,
                        }}
                        action={(
                          <Pressable accessibilityRole="button" accessibilityLabel="Check for new activity" disabled={syncing} hitSlop={10} onPress={() => void checkActivity()} style={({ pressed }) => [styles.iconButton, syncing ? styles.iconButtonDisabled : null, pressed ? styles.iconButtonPressed : null]}>
                            <Icon name="refresh" size={18} color={colors.textPrimary} />
                          </Pressable>
                        )}
                        variant="list"
                      >
                        {null}
                      </MoneyInventoryListFrame>
              )}
            </View>
          )}
          renderItem={({ item }) => item.kind === 'heading' ? (
            item.overageCents != null ? (
              <View style={[styles.overageHeader, expandedRows ? styles.expandedOverageHeader : null, !item.first ? styles.nextOverageGroup : null]}>
                <Text style={styles.overageCategory}>{item.label}</Text>
                <Text style={styles.overageAmount}>{formatMoney(item.overageCents)} over</Text>
              </View>
            ) : <Text style={[styles.dateGroupHeader, !item.first ? styles.nextDateGroup : null]}>{item.label}</Text>
          ) : (
            <View style={!item.last ? (overageProjection ? styles.overageRowGap : styles.rowGap) : undefined}>
              <TransactionInventoryRow
                expanded={expandedRows}
                transaction={item.transaction}
                showCategoryMeta={!overageProjection}
                onPress={() => navigation.navigate('MoneyTransactionDetail', overageProjection
                  ? { transactionId: item.transaction.id, coverageReview: true }
                  : { transactionId: item.transaction.id, economicRoleReview: Boolean(reviewTransactionIds) })}
              />
            </View>
          )}
          ListEmptyComponent={overageProjection ? null : scopedInventory.length === 0 && !isScopedInventory ? (
            <EmptyState illustration={null} title="Transactions start with an account"
              instructions="Connect an account, then Kwilt will sync its activity here."
              primaryAction={{ label: 'Connect an account', onPress: () => navigation.navigate('MoneyAccounts') }} />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No transactions in this view</Text>
              <Text style={styles.emptyCopy}>Adjust the date scope or filter to review the rest of the inventory.</Text>
            </View>
          )}
        />
      )}
    </MoneyScreenFrame>
  );
}

function IconMenu({ accessibilityLabel, active, children, count, iconName }: { accessibilityLabel: string; active: boolean; children: ReactNode; count: number; iconName: IconName }) {
  return <DropdownMenu><DropdownMenuTrigger accessibilityLabel={accessibilityLabel}><View pointerEvents="none"><MoneyInventoryControlSurface iconName={iconName} active={active} count={count} /></View></DropdownMenuTrigger><DropdownMenuContent side="bottom" sideOffset={6} align="start">{children}</DropdownMenuContent></DropdownMenu>;
}

function TransactionMenuItem({ active, iconName, label, onPress }: { active: boolean; iconName?: IconName; label: string; onPress: () => void }) {
  return <DropdownMenuItem onPress={onPress} accessibilityLabel={label}><View style={menuStyles.menuItemRow}><Icon name={iconName ?? (active ? 'check' : 'dot')} size={18} color={active ? colors.pine700 : colors.textSecondary} /><Text style={menuStyles.menuItemText} {...menuItemTextProps}>{label}</Text></View></DropdownMenuItem>;
}

function TransactionInventoryRow({ expanded, onPress, showCategoryMeta = true, transaction }: { expanded: boolean; onPress: () => void; showCategoryMeta?: boolean; transaction: MoneyTransaction }) {
  const transferPair = transaction.transferPair;
  const state = transferPair
    ? 'Transfer'
    : isProviderIncome(transaction)
      ? ''
      : transaction.reviewState === 'needs_review' ? 'Needs review' : transaction.reviewState === 'not_counted' ? 'Not budgeted' : '';
  const stateStyle = transaction.reviewState === 'needs_review' ? styles.reviewChip : styles.neutralChip;
  const amountCents = transferPair ? transaction.amountCents : transaction.direction === 'inflow' ? transaction.amountCents : -transaction.amountCents;
  const assignment = transaction.categoryName ?? (state || 'Uncategorized');
  const amountLabel = `${amountCents > 0 && !transferPair ? '+' : ''}${formatMoney(amountCents, transaction.currencyCode)}`;
  const title = transferPair ? 'Credit card payment' : transaction.merchantName;
  const detail = transferPair
    ? `${transferPair.sourceAccountName} → ${transferPair.destinationAccountName}`
    : showCategoryMeta && transaction.categoryName && transaction.categoryName !== state ? transaction.categoryName : null;
  const accessibilityLabel = transferPair
    ? `Open credit card payment, ${transferPair.sourceAccountName} to ${transferPair.destinationAccountName}, ${amountLabel}`
    : `Open ${transaction.merchantName} transaction, ${assignment}, ${amountLabel}`;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [styles.transactionRow, expanded ? styles.expandedRow : null, pressed ? styles.transactionRowPressed : null]}>
      <View style={[styles.merchantBlock, expanded ? styles.expandedMerchant : null]}>
        <Text numberOfLines={expanded ? undefined : 1} style={styles.merchant}>{title}</Text>
        {detail ? <Text numberOfLines={expanded ? undefined : 1} style={styles.assignmentMeta}>{detail}</Text> : null}
      </View>
      <View style={[styles.transactionTrailing, expanded ? styles.expandedTrailing : null]}>
      {state ? <Text numberOfLines={expanded ? undefined : 1} style={[styles.assignmentChip, expanded ? styles.expandedChip : null, stateStyle]}>{state}</Text> : null}
      <Text style={[styles.amount, transaction.direction === 'inflow' && !transferPair ? styles.inflowAmount : null]}>{amountLabel}</Text>
      </View>
    </Pressable>
  );
}

function matchesFilter(transaction: MoneyTransaction, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'unmatched') return transaction.reviewState === 'needs_review';
  if (filter === 'matched') return transaction.reviewState === 'assigned' || transaction.moneyMeaning === 'transfer';
  if (transaction.moneyMeaning === 'transfer') return false;
  return transaction.direction === filter;
}

function matchesDateScope(date: string, scope: DateScope): boolean {
  if (scope === 'all') return true;
  const today = new Date();
  const current = new Date(`${date}T12:00:00`);
  if (!Number.isFinite(current.getTime())) return false;
  if (scope === 'current_month') return current.getFullYear() === today.getFullYear() && current.getMonth() === today.getMonth();
  const start = new Date(today);
  if (scope === 'last_30_days') start.setDate(start.getDate() - 29);
  else start.setMonth(start.getMonth() - 11, 1);
  return current >= start && current <= today;
}

function sortTransactions(rows: MoneyTransaction[], sort: Sort): MoneyTransaction[] {
  return [...rows].sort((left, right) => {
    if (sort === 'oldest') return left.date.localeCompare(right.date);
    if (sort === 'amount_high') return right.amountCents - left.amountCents;
    if (sort === 'merchant') return left.merchantName.localeCompare(right.merchantName);
    return right.date.localeCompare(left.date);
  });
}

function groupByDate(rows: MoneyTransaction[]) {
  const groups = new Map<string, MoneyTransaction[]>();
  const labels = new Map<string, string>();
  rows.forEach((row) => {
    let label = labels.get(row.date);
    if (label == null) { label = formatDateGroup(row.date); labels.set(row.date, label); }
    const group = groups.get(label);
    if (group) group.push(row);
    else groups.set(label, [row]);
  });
  return [...groups.entries()].map(([label, groupedRows]) => ({ label, rows: groupedRows }));
}

function formatDateGroup(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : date;
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing['3xl'] },
  overageListContent: { paddingHorizontal: spacing.sm + spacing.md },
  warningSlot: { marginBottom: spacing.md },
  overageReview: { gap: spacing.lg, paddingBottom: spacing.lg },
  overageIntro: { ...typography.bodySm, color: colors.textSecondary },
  overageOffset: { ...typography.bodyXs, color: colors.textSecondary },
  nextOverageGroup: { marginTop: spacing.lg },
  overageRowGap: { marginBottom: spacing.xs },
  overageHeader: { marginBottom: spacing.xs, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  expandedOverageHeader: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.xs },
  overageCategory: { ...typography.body, fontFamily: fonts.semibold, color: colors.textPrimary },
  overageAmount: { ...typography.bodySm, fontFamily: fonts.semibold, color: colors.destructive },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  iconButtonPressed: { backgroundColor: colors.fieldFillPressed },
  iconButtonDisabled: { opacity: 0.35 },
  nextDateGroup: { marginTop: spacing.sm },
  rowGap: { marginBottom: 2 },
  dateGroupHeader: { ...typography.bodyXs, fontFamily: fonts.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  transactionRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  expandedRow: { flexDirection: 'column', alignItems: 'stretch' },
  expandedMerchant: { flex: 0 },
  transactionTrailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  expandedTrailing: { flexWrap: 'wrap', justifyContent: 'space-between' },
  expandedChip: { maxWidth: '100%' },
  transactionRowPressed: { backgroundColor: colors.gray50 },
  merchantBlock: { flex: 1, minWidth: 0 },
  merchant: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 21, fontWeight: '500', color: colors.textPrimary },
  assignmentMeta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  assignmentChip: { maxWidth: 104, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden', fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 },
  reviewChip: { backgroundColor: colors.madder50, color: colors.madder600 },
  neutralChip: { backgroundColor: colors.fieldFill, color: colors.textSecondary },
  amount: { minWidth: 72, textAlign: 'right', fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, fontWeight: '600', fontVariant: ['tabular-nums'], color: colors.textPrimary },
  inflowAmount: { color: colors.pine700 },
  emptyState: { gap: spacing.xs, padding: spacing.lg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, backgroundColor: colors.card },
  emptyTitle: { ...typography.bodySm, fontFamily: fonts.bold, color: colors.textPrimary },
  emptyCopy: { ...typography.bodyXs, color: colors.textSecondary },
});
