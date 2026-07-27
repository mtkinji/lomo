import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { colors, fonts, spacing, typography } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { Input } from '../../../ui/Input';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { MoneyTransactionSplitDrawer } from '../components/MoneyTransactionSplitDrawer';
import { useMoneyData } from '../data/MoneyDataContext';
import { formatMoney, type MoneyCategory, type MoneyTransaction } from '../data/moneySnapshot';
import { parseCategoryName, parseMonthlyAmount } from '../domain/categoryPlanDraft';
import { getSimilarMerchantTransactions } from '../domain/moneyDetailView';
import { getTransactionMeaningOptions, type TransactionMeaningOption } from '../domain/transactionMeaningOptions';
import type { TransactionSplitMode } from '../domain/transactionTruthTelemetry';
import type { MoneyStackParamList } from '../navigation/types';
import {
  captureTransactionSplitOutcome,
  captureTransactionSplitStarted,
} from '../runtime/transactionTruthAnalytics';

type RuleMatchMode = 'exact' | 'partial';

export function MoneyTransactionDetailScreen({ navigation, route }: NativeStackScreenProps<MoneyStackParamList, 'MoneyTransactionDetail'>) {
  const { capture } = useAnalytics();
  const {
    assignTransactionCategory,
    createCategory,
    markTransactionNotCounted,
    reviewTransactionMeaning,
    reviewingTransactionId,
    saveMerchantRule,
    splitTransaction,
    savingCategory,
    snapshot,
  } = useMoneyData();
  const transaction = snapshot?.transactions.find((candidate) => candidate.id === route.params.transactionId);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryAmount, setNewCategoryAmount] = useState('100.00');
  const [pendingRuleCategory, setPendingRuleCategory] = useState<MoneyCategory | null>(null);
  const [splitEditorOpen, setSplitEditorOpen] = useState(false);
  const splitSessionRef = useRef<{ mode: TransactionSplitMode; startedAtMs: number } | null>(null);
  const [ruleMode, setRuleMode] = useState<RuleMatchMode>('exact');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const saving = Boolean(transaction && reviewingTransactionId === transaction.id);
  const categories = snapshot?.categories ?? [];
  const currentCategory = transaction?.categoryId
    ? categories.find((category) => category.id === transaction.categoryId)
    : undefined;
  const filteredCategories = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase();
    return query ? categories.filter((category) => category.name.toLowerCase().includes(query)) : categories;
  }, [categories, categoryQuery]);
  const similarRows = useMemo(() => transaction
    ? getSimilarMerchantTransactions(snapshot?.transactions ?? [], transaction, ruleMode)
    : [], [ruleMode, snapshot?.transactions, transaction]);

  const runReview = async (mutation: () => Promise<void>) => {
    setReviewError(null);
    try {
      await mutation();
      return true;
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'This transaction could not be updated.');
      return false;
    }
  };

  const selectCategory = async (category: MoneyCategory) => {
    if (!transaction) return;
    const changed = await runReview(() => transaction.direction === 'inflow'
      ? reviewTransactionMeaning(transaction.id, { meaning: 'category_credit', categoryId: category.sourceId })
      : assignTransactionCategory(transaction.id, category.sourceId));
    if (!changed) return;
    setCategoryPickerOpen(false);
    setCategoryQuery('');
    if (transaction.direction === 'outflow' && transaction.merchantRuleCategoryId !== category.id) {
      setPendingRuleCategory(category);
    }
  };

  const selectMeaning = async (meaning: 'income' | 'transfer' | 'not_counted') => {
    if (!transaction) return;
    const changed = await runReview(() => transaction.direction === 'outflow' && meaning === 'not_counted'
      ? markTransactionNotCounted(transaction.id)
      : reviewTransactionMeaning(transaction.id, { meaning }));
    if (changed) {
      setCategoryPickerOpen(false);
      setCategoryQuery('');
    }
  };

  const createAndSelectCategory = async () => {
    if (!transaction) return;
    setReviewError(null);
    try {
      const categoryId = await createCategory({
        name: parseCategoryName(newCategoryName || categoryQuery),
        budgetCents: parseMonthlyAmount(newCategoryAmount),
      });
      if (transaction.direction === 'inflow') {
        await reviewTransactionMeaning(transaction.id, { meaning: 'category_credit', categoryId });
      } else {
        await assignTransactionCategory(transaction.id, categoryId);
      }
      setCreatingCategory(false);
      setCategoryPickerOpen(false);
      setCategoryQuery('');
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'The category could not be created.');
    }
  };

  const applyRule = async () => {
    if (!transaction || !pendingRuleCategory) return;
    const saved = await runReview(() => saveMerchantRule({
      transactionId: transaction.id,
      merchantName: transaction.merchantName,
      categoryId: pendingRuleCategory.sourceId,
      categoryName: pendingRuleCategory.name,
      matchMode: ruleMode,
      similarTransactionIds: similarRows.map((row) => row.id),
    }));
    if (saved) setPendingRuleCategory(null);
  };

  const saveSplit = async (allocations: Parameters<typeof splitTransaction>[0]['allocations']) => {
    if (!transaction) return;
    const changed = await runReview(() => splitTransaction({
      transactionId: transaction.id,
      transactionAmountCents: transaction.amountCents,
      direction: transaction.direction,
      pending: transaction.pending,
      allocations,
    }));
    const session = splitSessionRef.current;
    if (session) {
      captureTransactionSplitOutcome(capture, changed ? 'saved' : 'save_failed', {
        mode: session.mode,
        allocationCount: allocations.length,
        durationMs: Date.now() - session.startedAtMs,
      });
    }
    if (changed) {
      splitSessionRef.current = null;
      setSplitEditorOpen(false);
    }
  };

  const openSplitEditor = () => {
    if (!transaction) return;
    const mode: TransactionSplitMode = transaction.allocations?.length ? 'replace' : 'create';
    splitSessionRef.current = { mode, startedAtMs: Date.now() };
    captureTransactionSplitStarted(capture, {
      mode,
      existingAllocationCount: transaction.allocations?.length ?? 0,
    });
    setSplitEditorOpen(true);
  };

  const closeSplitEditor = (allocationCount: number) => {
    const session = splitSessionRef.current;
    if (session) {
      captureTransactionSplitOutcome(capture, 'abandoned', {
        mode: session.mode,
        allocationCount,
        durationMs: Date.now() - session.startedAtMs,
      });
    }
    splitSessionRef.current = null;
    setSplitEditorOpen(false);
  };

  if (!transaction) {
    return (
      <AppShell>
        <PageHeader title="Transaction" onPressBack={() => navigation.goBack()} />
        <View style={styles.unavailable}>
          <Text style={styles.emptyTitle}>This transaction is unavailable</Text>
          <Text style={styles.emptyCopy}>It may have changed since the last successful Money sync.</Text>
        </View>
      </AppShell>
    );
  }

  const relationLabel = getCategoryRelationLabel(transaction, currentCategory);

  return (
    <>
      <AppShell>
        <PageHeader title={transaction.merchantName} onPressBack={() => navigation.goBack()} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={styles.heroMetaRow}>
              <Text style={styles.heroMeta}>{formatTransactionDate(transaction.date)}</Text>
              {transaction.reviewState !== 'needs_review' ? <Text style={styles.reviewedPill}>Reviewed</Text> : null}
            </View>
            <Text style={[styles.amount, transaction.direction === 'inflow' ? styles.inflowAmount : null]}>
              {transaction.direction === 'inflow' ? '+' : '-'}{formatMoney(transaction.amountCents, transaction.currencyCode)}
            </Text>
            {transaction.pending ? <Text style={styles.pendingText}>Pending</Text> : null}
          </View>

          <PaymentSourceCard transaction={transaction} />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Category</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={relationLabel ? `Change category from ${relationLabel}` : 'Choose category'}
              disabled={saving}
              onPress={() => setCategoryPickerOpen(true)}
              style={({ pressed }) => [styles.categoryField, pressed ? styles.pressed : null]}
            >
              <View style={styles.categoryFieldCopy}>
                <View style={[styles.categoryDot, { backgroundColor: currentCategory?.accentColor ?? colors.gray300 }]} />
                <Text numberOfLines={1} style={[styles.categoryFieldText, !relationLabel ? styles.categoryPlaceholder : null]}>{relationLabel ?? 'Choose category'}</Text>
              </View>
              <Icon name="chevronsUpDown" size={18} color={colors.textSecondary} />
            </Pressable>
            {transaction.merchantRuleCategoryId && currentCategory?.id === transaction.merchantRuleCategoryId ? (
              <View style={styles.ruleReceipt}>
                <Icon name="checkCircle" size={16} color={colors.pine700} />
                <Text style={styles.ruleReceiptText}>Future {transaction.merchantName} matches go to {currentCategory.name}</Text>
              </View>
            ) : null}
            {transaction.allocations?.length ? (
              <View style={styles.splitReceipt}>
                <Text style={styles.splitReceiptTitle}>Split across categories</Text>
                {transaction.allocations.map((allocation) => (
                  <View key={allocation.sourceCategoryId} style={styles.splitReceiptRow}>
                    <Text style={styles.splitReceiptLabel}>{allocation.categoryName}</Text>
                    <Text style={styles.splitReceiptAmount}>{formatMoney(allocation.amountCents, transaction.currencyCode)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {transaction.direction === 'outflow' && !transaction.pending ? (
              <Button fullWidth variant="outline" disabled={saving} onPress={openSplitEditor}>
                {transaction.allocations?.length ? 'Edit split' : 'Split transaction'}
              </Button>
            ) : null}
            {reviewError ? <Text style={styles.errorText}>{reviewError}</Text> : null}
          </View>
        </ScrollView>
      </AppShell>

      <BottomDrawer visible={categoryPickerOpen} onClose={() => { setCategoryPickerOpen(false); setCreatingCategory(false); }} snapPoints={['78%']} enableContentPanningGesture>
        <BottomDrawerScrollView contentContainerStyle={styles.drawerContent} keyboardShouldPersistTaps="handled">
          <View style={styles.drawerHeader}>
            <View>
              <Text style={styles.drawerEyebrow}>CATEGORY</Text>
              <Text style={styles.drawerTitle}>Where does this belong?</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close category picker" onPress={() => setCategoryPickerOpen(false)} style={styles.closeButton}>
              <Icon name="close" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>
          <Input
            accessibilityLabel="Search categories"
            autoCapitalize="none"
            elevation="flat"
            leadingIcon="search"
            placeholder="Search categories"
            returnKeyType="search"
            size="sm"
            variant="filled"
            value={categoryQuery}
            onChangeText={setCategoryQuery}
          />

          <View style={styles.categoryList}>
            {filteredCategories.map((category) => (
              <Pressable key={category.sourceId} accessibilityRole="button" accessibilityLabel={`Choose ${category.name}`} disabled={saving} onPress={() => void selectCategory(category)} style={({ pressed }) => [styles.categoryRow, pressed ? styles.pressed : null]}>
                <View style={styles.categoryRowCopy}>
                  <Text style={styles.categoryRowTitle}>{category.name}</Text>
                  <Text style={styles.categoryRowMeta}>{formatMoney(category.remainingCents)} left</Text>
                </View>
                {transaction.categoryId === category.id ? <Icon name="check" size={18} color={colors.pine700} /> : <Icon name="chevronRight" size={18} color={colors.gray400} />}
              </Pressable>
            ))}
            {filteredCategories.length === 0 ? (
              <Text accessibilityLiveRegion="polite" style={styles.emptySearchText}>No categories match “{categoryQuery.trim()}”</Text>
            ) : null}
          </View>

          <View style={styles.meaningSection}>
            <Text style={styles.secondarySectionLabel}>OTHER MONEY MOVEMENT</Text>
            {getTransactionMeaningOptions(transaction.direction).map((option) => (
              <CategoryCommand
                key={option.meaning}
                detail={option.detail}
                icon={getMeaningIcon(option.meaning)}
                label={option.label}
                selected={transaction.moneyMeaning === option.meaning || (option.meaning === 'not_counted' && transaction.reviewState === 'not_counted')}
                onPress={() => void selectMeaning(option.meaning)}
              />
            ))}
          </View>

          {creatingCategory ? (
            <View style={styles.createPanel}>
              <Text style={styles.createTitle}>New category</Text>
              <Input label="Name" value={newCategoryName} onChangeText={setNewCategoryName} />
              <Input label="Monthly amount" value={newCategoryAmount} onChangeText={setNewCategoryAmount} keyboardType="decimal-pad" />
              <Button disabled={savingCategory || saving} fullWidth onPress={() => void createAndSelectCategory()}>{savingCategory ? 'Creating…' : 'Create and choose'}</Button>
              <Button fullWidth variant="ghost" onPress={() => setCreatingCategory(false)}>Cancel</Button>
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => { setNewCategoryName(categoryQuery); setCreatingCategory(true); }} style={styles.createCommand}>
              <Icon name="plus" size={18} color={colors.pine700} />
              <Text style={styles.createCommandText}>{categoryQuery.trim() ? `Create “${categoryQuery.trim()}”` : 'Create category'}</Text>
            </Pressable>
          )}
          {reviewError ? <Text style={styles.errorText}>{reviewError}</Text> : null}
        </BottomDrawerScrollView>
      </BottomDrawer>

      <BottomDrawer visible={Boolean(pendingRuleCategory)} onClose={() => setPendingRuleCategory(null)} snapPoints={['88%']} enableContentPanningGesture>
        <BottomDrawerScrollView contentContainerStyle={styles.drawerContent}>
          <View style={styles.drawerHeader}>
            <View>
              <Text style={styles.drawerEyebrow}>FUTURE MATCHES</Text>
              <Text style={styles.drawerTitle}>Rule for {pendingRuleCategory?.name}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close merchant rule" onPress={() => setPendingRuleCategory(null)} style={styles.closeButton}>
              <Icon name="close" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>
          <Text style={styles.drawerCopy}>Match future {transaction.merchantName} charges and update the visible matching transactions below.</Text>
          <View style={styles.ruleModeRow}>
            <RuleModeButton active={ruleMode === 'exact'} label="Exact match" onPress={() => setRuleMode('exact')} />
            <RuleModeButton active={ruleMode === 'partial'} label="Partial match" onPress={() => setRuleMode('partial')} />
          </View>
          <View style={styles.matchPreview}>
            <Text style={styles.matchPreviewLabel}>WILL MATCH</Text>
            <Text style={styles.matchPreviewValue}>{ruleMode === 'exact' ? transaction.merchantName : getPartialRuleLabel(transaction.merchantName)}</Text>
          </View>
          <View style={styles.similarSection}>
            <Text style={styles.similarTitle}>{similarRows.length} existing {similarRows.length === 1 ? 'transaction' : 'transactions'} will change</Text>
            {similarRows.slice(0, 6).map((row) => (
              <View key={row.id} style={styles.similarRow}>
                <View style={styles.similarCopy}><Text numberOfLines={1} style={styles.similarMerchant}>{row.merchantName}</Text><Text style={styles.similarMeta}>{formatTransactionDate(row.date)} · {row.categoryName}</Text></View>
                <Text style={styles.similarAmount}>{formatMoney(row.amountCents, row.currencyCode)}</Text>
              </View>
            ))}
          </View>
          {reviewError ? <Text style={styles.errorText}>{reviewError}</Text> : null}
          <Button disabled={saving} fullWidth onPress={() => void applyRule()}>{saving ? 'Saving…' : 'Create rule'}</Button>
          <Button fullWidth variant="ghost" onPress={() => setPendingRuleCategory(null)}>Not now</Button>
        </BottomDrawerScrollView>
      </BottomDrawer>

      <MoneyTransactionSplitDrawer
        categories={categories}
        onClose={closeSplitEditor}
        onSave={saveSplit}
        saving={saving}
        transaction={transaction}
        visible={splitEditorOpen}
      />
    </>
  );
}

function PaymentSourceCard({ transaction }: { transaction: MoneyTransaction }) {
  const isDeposit = transaction.direction === 'inflow';
  const cardName = transaction.accountName.replace(/\b(visa|mastercard|amex|american express|card)\b/gi, '').replace(/\s+/g, ' ').trim() || transaction.accountName;
  const palette = getPaymentSourcePalette(transaction.accountId ?? transaction.accountName);
  return (
    <View style={styles.sourceCard}>
      <View style={styles.sourceDescriptionBlock}>
        <Text style={styles.sourceDescriptionLabel}>Description</Text>
        <Text selectable numberOfLines={2} style={styles.sourceDescription}>{transaction.originalDescription ?? transaction.merchantName}</Text>
      </View>
      {isDeposit ? (
        <View style={styles.depositReceipt}>
          <View style={styles.depositHeader}><View style={styles.depositIcon}><Icon name="landmark" size={16} color={colors.pine700} /></View><Text style={styles.depositTitle}>Deposit received</Text></View>
          <ReceiptRow label="From" value={transaction.merchantName} />
          <ReceiptRow label="To" value={transaction.institutionName || transaction.accountName} />
          <ReceiptRow label="Rail" value={getTransferRailLabel(transaction)} />
        </View>
      ) : (
        <View style={[styles.paymentCard, { backgroundColor: palette.background }]}>
          <View style={styles.cardTopRow}><View style={[styles.cardChip, { backgroundColor: palette.chip }]} /><Icon name={getPaymentSourceKind(transaction) === 'Bank account' ? 'landmark' : 'creditCard'} size={16} color={colors.canvas} /></View>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.cardName}>{cardName}</Text>
          <View style={styles.cardBottomRow}><Text numberOfLines={1} style={styles.cardInstitution}>{transaction.institutionName}</Text><Text style={styles.cardMask}>•••• {transaction.accountMask ?? '----'}</Text></View>
        </View>
      )}
    </View>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.receiptRow}><Text style={styles.receiptLabel}>{label}</Text><Text numberOfLines={1} style={styles.receiptValue}>{value}</Text></View>;
}

function CategoryCommand({ detail, icon, label, onPress, selected }: { detail: string; icon: 'arrowDown' | 'refresh' | 'close'; label: string; onPress: () => void; selected: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityHint={detail} accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.commandRow, selected ? styles.commandSelected : null, pressed ? styles.pressed : null]}><View style={styles.commandIcon}><Icon name={icon} size={18} color={selected ? colors.pine700 : colors.textSecondary} /></View><View style={styles.commandCopy}><Text style={styles.commandTitle}>{label}</Text><Text style={styles.commandDetail}>{detail}</Text></View>{selected ? <Icon name="check" size={18} color={colors.pine700} /> : null}</Pressable>;
}

function getMeaningIcon(meaning: TransactionMeaningOption['meaning']): 'arrowDown' | 'refresh' | 'close' {
  if (meaning === 'income') return 'arrowDown';
  if (meaning === 'transfer') return 'refresh';
  return 'close';
}

function RuleModeButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={onPress} style={[styles.ruleModeButton, active ? styles.ruleModeActive : null]}><Text style={[styles.ruleModeText, active ? styles.ruleModeTextActive : null]}>{label}</Text></Pressable>;
}

function getCategoryRelationLabel(transaction: MoneyTransaction, category?: MoneyCategory): string | null {
  if (transaction.allocations?.length) return 'Split across categories';
  if (category) return category.name;
  if (transaction.moneyMeaning === 'income') return 'Income';
  if (transaction.moneyMeaning === 'transfer') return 'Internal transfer';
  if (transaction.reviewState === 'not_counted' || transaction.moneyMeaning === 'not_counted') return 'Outside the plan';
  return null;
}

function getPaymentSourceKind(transaction: MoneyTransaction): string {
  const type = `${transaction.accountType ?? ''} ${transaction.accountSubtype ?? ''} ${transaction.accountName}`.toLowerCase();
  if (type.includes('credit')) return 'Credit card';
  if (type.includes('depository') || type.includes('checking') || type.includes('savings')) return 'Bank account';
  return 'Card';
}

function getTransferRailLabel(transaction: MoneyTransaction): string {
  const description = `${transaction.merchantName} ${transaction.originalDescription}`.toLowerCase();
  if (description.includes('real time payment') || description.includes(' rtp ')) return 'Real-time payment';
  if (description.includes('ach')) return 'ACH transfer';
  if (description.includes('wire')) return 'Wire transfer';
  return 'Bank transfer';
}

function getPaymentSourcePalette(seed: string): { background: string; chip: string } {
  const palettes = [
    { background: '#243B53', chip: '#D7E3EA' }, { background: '#365B4A', chip: '#DCE8D8' },
    { background: '#5A3E6B', chip: '#E7D9F2' }, { background: '#6B4A35', chip: '#F0D8C4' },
  ];
  const hash = seed.split('').reduce((value, character) => ((value << 5) - value + character.charCodeAt(0)) | 0, 0);
  return palettes[Math.abs(hash) % palettes.length] ?? palettes[0];
}

function getPartialRuleLabel(value: string): string {
  return value.toLowerCase().replace(/'s\b/g, '').replace(/#[0-9]+/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter((token) => token && !/^[0-9]+$/.test(token)).slice(0, 2).join(' ');
}

function formatTransactionDate(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : dateIso;
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingHorizontal: spacing.lg, paddingBottom: 80 },
  hero: { gap: spacing.xs, paddingTop: spacing.md },
  heroMetaRow: { minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroMeta: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  reviewedPill: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, backgroundColor: colors.pine50, color: colors.pine700, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  amount: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 48, lineHeight: 53, fontWeight: '700', letterSpacing: -1.6, fontVariant: ['tabular-nums'] },
  inflowAmount: { color: colors.pine700 },
  pendingText: { color: colors.turmeric700, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  sourceCard: { gap: spacing.md },
  sourceDescriptionBlock: { gap: 4, padding: spacing.lg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, backgroundColor: colors.card },
  sourceDescriptionLabel: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.7 },
  sourceDescription: { color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, fontWeight: '500' },
  paymentCard: { minHeight: 184, justifyContent: 'space-between', borderRadius: 18, padding: spacing.lg, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardChip: { width: 36, height: 27, borderRadius: 6 },
  cardName: { color: colors.canvas, fontFamily: fonts.semibold, fontSize: 24, lineHeight: 30, fontWeight: '600' },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  cardInstitution: { flex: 1, color: colors.canvas, opacity: 0.82, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17 },
  cardMask: { color: colors.canvas, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, letterSpacing: 1.1 },
  depositReceipt: { gap: spacing.sm, padding: spacing.lg, borderWidth: 1, borderColor: colors.pine200, borderRadius: 14, backgroundColor: colors.pine50 },
  depositHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  depositIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.canvas },
  depositTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  receiptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg },
  receiptLabel: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  receiptValue: { flex: 1, color: colors.textPrimary, textAlign: 'right', fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, fontWeight: '500' },
  section: { gap: spacing.md, paddingBottom: spacing.xl },
  sectionLabel: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.7 },
  categoryField: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, paddingHorizontal: spacing.lg, backgroundColor: colors.card },
  categoryFieldCopy: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  categoryDot: { width: 10, height: 10, borderRadius: 999 },
  categoryFieldText: { minWidth: 0, flex: 1, color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  categoryPlaceholder: { color: colors.textSecondary },
  ruleReceipt: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 10, backgroundColor: colors.pine50 },
  ruleReceiptText: { flex: 1, color: colors.pine700, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, fontWeight: '500' },
  splitReceipt: { gap: spacing.sm, padding: spacing.lg, borderWidth: 1, borderColor: colors.pine200, borderRadius: 12, backgroundColor: colors.pine50 },
  splitReceiptTitle: { color: colors.pine700, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  splitReceiptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg },
  splitReceiptLabel: { flex: 1, color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  splitReceiptAmount: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
  drawerContent: { gap: spacing.lg, paddingHorizontal: spacing.xl, paddingBottom: 64 },
  drawerHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  drawerEyebrow: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, fontWeight: '600', letterSpacing: 0.7 },
  drawerTitle: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 24, lineHeight: 29, fontWeight: '700' },
  drawerCopy: { ...typography.bodySm, color: colors.textSecondary },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: colors.gray100 },
  meaningSection: { gap: spacing.xs },
  secondarySectionLabel: { marginTop: spacing.xs, color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14, fontWeight: '600', letterSpacing: 0.7 },
  commandRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, backgroundColor: colors.card },
  commandSelected: { borderColor: colors.pine300, backgroundColor: colors.pine50 },
  commandIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.gray50 },
  commandCopy: { flex: 1, minWidth: 0 },
  commandTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  commandDetail: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  categoryList: { gap: 2 },
  categoryRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, paddingVertical: spacing.sm },
  categoryRowCopy: { flex: 1, minWidth: 0 },
  categoryRowTitle: { color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  categoryRowMeta: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  emptySearchText: { paddingVertical: spacing.md, color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  createCommand: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: spacing.md },
  createCommandText: { color: colors.pine700, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  createPanel: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, backgroundColor: colors.gray50 },
  createTitle: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 18, lineHeight: 23, fontWeight: '700' },
  ruleModeRow: { flexDirection: 'row', gap: spacing.sm },
  ruleModeButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, backgroundColor: colors.card },
  ruleModeActive: { borderColor: colors.pine700, backgroundColor: colors.pine50 },
  ruleModeText: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  ruleModeTextActive: { color: colors.pine700 },
  matchPreview: { gap: spacing.xs, padding: spacing.lg, borderRadius: 12, backgroundColor: colors.gray50 },
  matchPreviewLabel: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14, fontWeight: '600', letterSpacing: 0.7 },
  matchPreviewValue: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, fontWeight: '600' },
  similarSection: { gap: spacing.sm },
  similarTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  similarRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  similarCopy: { flex: 1, minWidth: 0 },
  similarMerchant: { color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  similarMeta: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 11, lineHeight: 15 },
  similarAmount: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
  errorText: { color: colors.destructive, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.72 },
  unavailable: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, fontWeight: '600' },
  emptyCopy: { ...typography.bodySm, color: colors.textSecondary, textAlign: 'center' },
});
