import { Pressable } from '@/src/ui/HapticPressable';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { KwiltLoader } from '../../../ui/KwiltLoader';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { colors, fonts, spacing, typography } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { BottomGuide } from '../../../ui/BottomGuide';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { Input } from '../../../ui/Input';
import { AppShell } from '../../../ui/layout/AppShell';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { SettingsChoiceRow } from '../../../ui/SettingsSurface';
import { MoneyTransactionSplitDrawer } from '../components/MoneyTransactionSplitDrawer';
import { useMoneyData } from '../data/MoneyDataContext';
import { formatMoney, type MoneyCategory, type MoneyTransaction } from '../data/moneySnapshot';
import { getPartialMerchantRulePatternError, normalizePartialMerchant } from '../data/moneyMutations';
import { parseCategoryName, parseMonthlyAmount } from '../domain/categoryPlanDraft';
import { getPersistedMerchantRuleOfferCategoryId, getPostCategorySelectionOutcome } from '../domain/merchantRuleOffer';
import { getSimilarMerchantTransactions } from '../domain/moneyDetailView';
import { getPaymentSourcePresentation, type InstitutionPalette } from '../domain/paymentSourcePresentation';
import { getTransactionMeaningOptions, type TransactionMeaningOption } from '../domain/transactionMeaningOptions';
import { getEffectiveMoneyMeaning, isProviderIncome, isTransactionExplicitlyReviewed } from '../domain/transactionMeaning';
import { getTransactionPlanTreatment } from '../domain/transactionPlanTreatment';
import { canEditTransactionPlanCoverage, projectTransactionCoverageImpact, usesOnlySavedMoney } from '../domain/transactionPlanCoverage';
import type { TransactionSplitMode } from '../domain/transactionTruthTelemetry';
import type { MoneyStackParamList } from '../navigation/types';
import {
  captureTransactionSplitOutcome,
  captureTransactionSplitStarted,
} from '../runtime/transactionTruthAnalytics';
import { captureMoneyMutation, type MoneyMutationOperation } from '../runtime/moneyMutationTelemetry';
import { signalMoneyChoice, signalMoneyMutationOutcome } from '../runtime/moneyMutationFeedback';

type RuleMatchMode = 'exact' | 'partial';

export function MoneyTransactionDetailScreen({ navigation, route }: NativeStackScreenProps<MoneyStackParamList, 'MoneyTransactionDetail'>) {
  const { capture } = useAnalytics();
  const {
    assignTransactionCategory,
    createCategory,
    markTransactionNotCounted,
    reviewTransactionMeaning,
    setTransactionPlanRoleOverride,
    setTransactionPlanCoverage,
    setTransactionNote,
    reviewingTransactionId,
    refresh,
    saveMerchantRule,
    splitTransaction,
    savingCategory,
    snapshot,
    status,
  } = useMoneyData();
  const transaction = snapshot?.transactions.find((candidate) => candidate.id === route.params.transactionId);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(Boolean(route.params.economicRoleReview));
  const [countsAsOpen, setCountsAsOpen] = useState(false);
  const [coverageOpen, setCoverageOpen] = useState(Boolean(route.params.coverageReview));
  const [coverageMode, setCoverageMode] = useState<'month' | 'saved' | 'split'>('month');
  const [savedAmount, setSavedAmount] = useState('0');
  const [coverageReceipt, setCoverageReceipt] = useState<string | null>(null);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryAmount, setNewCategoryAmount] = useState('100.00');
  const [pendingRuleCategory, setPendingRuleCategory] = useState<MoneyCategory | null>(null);
  const [dismissedRuleCategoryId, setDismissedRuleCategoryId] = useState<string | null>(null);
  const [ruleDrawerOpen, setRuleDrawerOpen] = useState(false);
  const [splitEditorOpen, setSplitEditorOpen] = useState(false);
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const splitSessionRef = useRef<{ mode: TransactionSplitMode; startedAtMs: number } | null>(null);
  const [ruleMode, setRuleMode] = useState<RuleMatchMode>('exact');
  const [partialRuleMatch, setPartialRuleMatch] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [pendingChoice, setPendingChoice] = useState<string | null>(null);
  const saving = Boolean(transaction && reviewingTransactionId === transaction.id);
  const noteChanged = Boolean(transaction && noteDraft.trim() !== (transaction.userNote ?? ''));
  const categories = snapshot?.categories ?? [];
  const currentCategory = transaction?.categoryId
    ? categories.find((category) => category.id === transaction.categoryId || category.sourceId === transaction.categoryId)
    : undefined;
  const persistedRuleOfferCategoryId = transaction ? getPersistedMerchantRuleOfferCategoryId({
    direction: transaction.direction,
    categoryId: transaction.categoryId,
    matchSource: transaction.matchSource,
    existingRuleCategoryId: transaction.merchantRuleCategoryId,
  }) : null;
  const persistedRuleOfferCategory = persistedRuleOfferCategoryId && persistedRuleOfferCategoryId !== dismissedRuleCategoryId
    ? categories.find((category) => category.id === persistedRuleOfferCategoryId || category.sourceId === persistedRuleOfferCategoryId) ?? null
    : null;
  const ruleOfferCategory = pendingRuleCategory ?? persistedRuleOfferCategory;
  const partialRuleError = ruleMode === 'partial' && transaction
    ? getPartialMerchantRulePatternError(transaction.merchantName, partialRuleMatch)
    : null;
  const filteredCategories = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase();
    return query ? categories.filter((category) => category.name.toLowerCase().includes(query)) : categories;
  }, [categories, categoryQuery]);
  const flexibleCategories = filteredCategories.filter((category) => category.planRole !== 'protected');
  const committedCategories = filteredCategories.filter((category) => category.planRole === 'protected');
  const similarRows = useMemo(() => {
    if (!transaction || partialRuleError) return [];
    return getSimilarMerchantTransactions(snapshot?.transactions ?? [], transaction, ruleMode, partialRuleMatch);
  }, [partialRuleError, partialRuleMatch, ruleMode, snapshot?.transactions, transaction]);

  useEffect(() => {
    setPartialRuleMatch(normalizePartialMerchant(transaction?.merchantName ?? ''));
  }, [transaction?.id, transaction?.merchantName]);

  useEffect(() => {
    if (!route.params.coverageReview || !transaction) return;
    const current = transaction.savedResourceCents ?? 0;
    setCoverageMode(current === 0 ? 'month' : current === transaction.amountCents ? 'saved' : 'split');
    setSavedAmount((current / 100).toFixed(2));
  }, [route.params.coverageReview, transaction]);

  const runReview = async (mutation: () => Promise<void>, operation?: MoneyMutationOperation) => {
    const startedAtMs = Date.now();
    setReviewError(null);
    try {
      await mutation();
      if (operation) {
        captureMoneyMutation(capture, { operation, outcome: 'succeeded', durationMs: Date.now() - startedAtMs });
        signalMoneyMutationOutcome('succeeded');
      }
      return true;
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'This transaction could not be updated.');
      if (operation) {
        captureMoneyMutation(capture, { operation, outcome: 'failed', durationMs: Date.now() - startedAtMs });
        signalMoneyMutationOutcome('failed');
      }
      return false;
    }
  };

  const selectCategory = async (category: MoneyCategory) => {
    if (!transaction) return;
    const choice = `category:${category.sourceId}`;
    const outcome = getPostCategorySelectionOutcome({
      direction: transaction.direction,
      economicRoleReview: Boolean(route.params.economicRoleReview),
      existingRuleCategoryId: transaction.merchantRuleCategoryId,
      selectedCategoryId: category.id,
    });
    signalMoneyChoice();
    setPendingChoice(choice);
    if (outcome === 'offer_rule') {
      setPendingRuleCategory(category);
      setRuleDrawerOpen(false);
      setCategoryPickerOpen(false);
      setCategoryQuery('');
    }
    const changed = await runReview(() => transaction.direction === 'inflow'
      ? reviewTransactionMeaning(transaction.id, { meaning: 'category_credit', categoryId: category.sourceId })
      : assignTransactionCategory(transaction.id, category.sourceId), 'transaction_category');
    setPendingChoice(null);
    if (!changed) {
      if (outcome === 'offer_rule') {
        setPendingRuleCategory(null);
        setCategoryPickerOpen(true);
      }
      return;
    }
    setCategoryPickerOpen(false);
    setCategoryQuery('');
    setDismissedRuleCategoryId(null);
    if (outcome === 'offer_rule') {
      return;
    }
    if (outcome === 'return_to_summary') {
      await refresh();
      navigation.popTo('MoneySummary');
    }
  };

  const selectMeaning = async (meaning: 'income' | 'transfer' | 'not_counted') => {
    if (!transaction) return;
    const choice = `meaning:${meaning}`;
    setPendingRuleCategory(null);
    setRuleDrawerOpen(false);
    signalMoneyChoice();
    setPendingChoice(choice);
    const changed = await runReview(() => transaction.direction === 'outflow' && meaning === 'not_counted'
      ? markTransactionNotCounted(transaction.id)
      : reviewTransactionMeaning(transaction.id, { meaning }), 'transaction_meaning');
    setPendingChoice(null);
    if (changed) {
      setCountsAsOpen(false);
      setCategoryPickerOpen(false);
      setCategoryQuery('');
      if (route.params.economicRoleReview) {
        await refresh();
        navigation.popTo('MoneySummary');
      }
    }
  };

  const selectPlanRole = async (planRole: 'protected' | 'flexible') => {
    if (!transaction || !currentCategory) return;
    const override = planRole === currentCategory.planRole ? null : planRole;
    signalMoneyChoice();
    const changed = await runReview(
      () => setTransactionPlanRoleOverride(transaction.id, override),
      'transaction_plan_role',
    );
    if (changed) setCountsAsOpen(false);
  };

  const openCoverage = () => {
    if (!transaction) return;
    const current = transaction.savedResourceCents ?? 0;
    setCoverageMode(current === 0 ? 'month' : current === transaction.amountCents ? 'saved' : 'split');
    setSavedAmount((current / 100).toFixed(2));
    setCoverageOpen(true);
  };

  const nextSavedResourceCents = !transaction ? 0 : coverageMode === 'month'
    ? 0
    : coverageMode === 'saved'
      ? transaction.amountCents
      : Math.max(0, Math.min(transaction.amountCents, Math.round(Number(savedAmount || 0) * 100)));
  const coverageImpact = transaction && snapshot?.livingLimitAnswer?.facts.flexibleRoomCents != null
    ? projectTransactionCoverageImpact({
        flexibleRoomCents: snapshot.livingLimitAnswer.facts.flexibleRoomCents,
        currentSavedResourceCents: transaction.savedResourceCents ?? 0,
        nextSavedResourceCents,
        transactionAmountCents: transaction.amountCents,
      })
    : null;

  const saveCoverage = async () => {
    if (!transaction) return;
    const changed = await runReview(
      () => setTransactionPlanCoverage(transaction.id, nextSavedResourceCents),
      'transaction_plan_role',
    );
    if (!changed) return;
    setCoverageOpen(false);
    setCoverageReceipt(nextSavedResourceCents === 0
      ? `This purchase is covered by the ${snapshot?.periodLabel.split(' ')[0] ?? 'month'} plan.`
      : `${formatMoney(nextSavedResourceCents)} stays in ${currentCategory?.name ?? transaction.categoryName} and is covered by saved money.`);
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
    if (!transaction || !ruleOfferCategory) return;
    const saved = await runReview(() => saveMerchantRule({
      transactionId: transaction.id,
      merchantName: transaction.merchantName,
      categoryId: ruleOfferCategory.sourceId,
      categoryName: ruleOfferCategory.name,
      matchMode: ruleMode,
      merchantPattern: ruleMode === 'partial' ? partialRuleMatch : undefined,
    }));
    if (saved) {
      setPendingRuleCategory(null);
      setRuleDrawerOpen(false);
      if (route.params.economicRoleReview) {
        await refresh();
        navigation.popTo('MoneySummary');
      }
    }
  };

  const dismissRuleOffer = async () => {
    setDismissedRuleCategoryId(ruleOfferCategory?.id ?? null);
    setPendingRuleCategory(null);
    setRuleDrawerOpen(false);
    if (route.params.economicRoleReview) {
      await refresh();
      navigation.popTo('MoneySummary');
    }
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

  const openNoteEditor = () => {
    if (!transaction) return;
    setNoteDraft(transaction.userNote ?? '');
    setReviewError(null);
    setNoteEditorOpen(true);
  };

  const saveNote = async () => {
    if (!transaction) return;
    const changed = await runReview(() => setTransactionNote(transaction.id, noteDraft));
    if (changed) setNoteEditorOpen(false);
  };

  const closeNoteEditor = () => {
    if (!saving) setNoteEditorOpen(false);
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
          <Text style={styles.emptyTitle}>{status === 'loading' ? 'Loading transaction…' : 'This transaction is unavailable'}</Text>
          <Text style={styles.emptyCopy}>{status === 'loading' ? 'Loading the latest Money details.' : 'It may have changed since the last successful Money sync.'}</Text>
        </View>
      </AppShell>
    );
  }

  const relationLabel = getCategoryRelationLabel(transaction, currentCategory);
  const planTreatment = getTransactionPlanTreatment(transaction, categories);
  const effectiveMeaning = getEffectiveMoneyMeaning(transaction);

  return (
    <>
      <AppShell>
        <PageHeader title={transaction.merchantName} onPressBack={() => navigation.goBack()} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={styles.heroMetaRow}>
              <Text style={styles.heroMeta}>{formatTransactionDate(transaction.date)}</Text>
              {isTransactionExplicitlyReviewed(transaction) ? <Text style={styles.reviewedPill}>Reviewed</Text> : null}
            </View>
            <Text style={[styles.amount, transaction.direction === 'inflow' ? styles.inflowAmount : null]}>
              {transaction.direction === 'inflow' ? '+' : '-'}{formatMoney(transaction.amountCents, transaction.currencyCode)}
            </Text>
          </View>

          <PaymentSourceCard transaction={transaction} />

          <View style={styles.noteSection}>
            <Text style={styles.sectionLabel}>Note</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={transaction.userNote ? `Edit transaction note: ${transaction.userNote}` : 'Add a note to this transaction'}
              disabled={saving}
              onPress={openNoteEditor}
              style={({ pressed }) => [styles.categoryField, pressed ? styles.pressed : null]}
            >
              <View style={styles.categoryFieldCopy}>
                <Text numberOfLines={3} style={[styles.noteValue, !transaction.userNote ? styles.categoryPlaceholder : null]}>
                  {transaction.userNote ?? 'Add a note'}
                </Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

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
                <Text numberOfLines={1} style={[styles.categoryFieldText, !relationLabel ? styles.categoryPlaceholder : null]}>{relationLabel ?? 'Choose category'}</Text>
              </View>
              <Icon name="chevronDown" size={18} color={colors.textSecondary} />
            </Pressable>
            {transaction.direction === 'outflow' && currentCategory && !transaction.allocations?.length && !usesOnlySavedMoney(transaction) ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Counts as ${planTreatment.label}. Change how this transaction counts.`}
                disabled={saving}
                onPress={() => setCountsAsOpen(true)}
                style={({ pressed }) => [styles.countsAsRow, pressed ? styles.pressed : null]}
              >
                <View style={styles.countsAsCopy}>
                  <Text style={styles.countsAsLabel}>COUNTS AS</Text>
                  <Text style={styles.countsAsValue}>{planTreatment.label}</Text>
                  <Text style={styles.countsAsDetail}>{planTreatment.kind === 'flexible'
                    ? `${formatMoney(transaction.amountCents, transaction.currencyCode)} reduces your flexible money left.`
                    : `${formatMoney(transaction.amountCents, transaction.currencyCode)} counts with committed spending.`}</Text>
                </View>
                <Icon name="chevronRight" size={18} color={colors.textSecondary} />
              </Pressable>
            ) : transaction.direction === 'outflow' && planTreatment.kind === 'outside' ? (
              <Text style={styles.classificationDetail}>Not included in your monthly plan.</Text>
            ) : transaction.direction === 'outflow' && planTreatment.kind === 'transfer' ? (
              <Text style={styles.classificationDetail}>Money moved between your own accounts—not spending.</Text>
            ) : transaction.allocations?.length ? (
              <Text style={styles.classificationDetail}>{planTreatment.label}</Text>
            ) : null}
            {canEditTransactionPlanCoverage(transaction) && !transaction.allocations?.length ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`How this is covered, ${(transaction.savedResourceCents ?? 0) > 0 ? 'saved money' : `${snapshot?.periodLabel.split(' ')[0] ?? 'month'} plan`}`}
                disabled={saving}
                onPress={openCoverage}
                style={({ pressed }) => [styles.countsAsRow, pressed ? styles.pressed : null]}
              >
                <View style={styles.countsAsCopy}>
                  <Text style={styles.countsAsLabel}>HOW THIS IS COVERED</Text>
                  <Text style={styles.countsAsValue}>{(transaction.savedResourceCents ?? 0) === 0
                    ? `${snapshot?.periodLabel.split(' ')[0] ?? 'Month'} plan`
                    : (transaction.savedResourceCents ?? 0) === transaction.amountCents
                      ? 'Saved money'
                      : `${formatMoney(transaction.savedResourceCents ?? 0)} saved money`}</Text>
                  <Text style={styles.countsAsDetail}>{usesOnlySavedMoney(transaction)
                    ? `Does not use the ${snapshot?.periodLabel.split(' ')[0] ?? 'month'} plan. The purchase stays in ${currentCategory?.name ?? transaction.categoryName}.`
                    : 'Changes this month’s plan, not the purchase or its category.'}</Text>
                </View>
                <Icon name="chevronRight" size={15} color={colors.textSecondary} />
              </Pressable>
            ) : null}
            {coverageReceipt ? (
              <View style={styles.ruleReceipt}>
                <Icon name="checkCircle" size={16} color={colors.pine700} />
                <Text style={styles.ruleReceiptText}>{coverageReceipt}</Text>
              </View>
            ) : null}
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

      <BottomGuide
        contentExtendsIntoBottomSafeArea
        contentStyle={styles.ruleGuideContent}
        dynamicSizing
        onClose={saving ? undefined : () => void dismissRuleOffer()}
        scrim="light"
        snapPoints={['42%']}
        visible={Boolean(ruleOfferCategory) && !ruleDrawerOpen && !categoryPickerOpen && !countsAsOpen && !splitEditorOpen && !noteEditorOpen}
      >
        <View style={styles.ruleGuideCopy}>
          <Text style={styles.ruleGuideTitle}>Use {ruleOfferCategory?.name} next time?</Text>
          <Text style={styles.ruleGuideDetail}>
            See which future {transaction.merchantName} transactions would match.
          </Text>
        </View>
        <View style={styles.ruleGuideActions}>
          <Button disabled={saving} variant="ghost" onPress={() => void dismissRuleOffer()}>Not now</Button>
          <Button loading={saving} loadingLabel="Saving category…" onPress={() => setRuleDrawerOpen(true)}>Review rule</Button>
        </View>
      </BottomGuide>

      <BottomDrawer
        visible={noteEditorOpen}
        onClose={closeNoteEditor}
        dismissable={!saving}
        snapPoints={['54%']}
        keyboardBehavior="resize"
        footer={{
          primaryAction: {
            label: !noteDraft.trim() && transaction.userNote ? 'Remove note' : 'Save note',
            loading: saving,
            loadingLabel: 'Saving note…',
            disabled: saving || !noteChanged,
            onPress: () => void saveNote(),
          },
        }}
      >
        <BottomDrawerScrollView contentContainerStyle={styles.drawerContent} keyboardShouldPersistTaps="handled">
          <BottomDrawerHeader
            closeAccessibilityLabel="Close transaction note"
            onClose={closeNoteEditor}
            title="Transaction note"
            variant="withClose"
          />
          <Input
            accessibilityLabel="Transaction note"
            editable={!saving}
            label="Note"
            maxLength={500}
            multiline
            multilineMaxHeight={180}
            multilineMinHeight={112}
            placeholder="Family pictures"
            value={noteDraft}
            onChangeText={setNoteDraft}
          />
          <Text style={styles.drawerCopy}>Everyone in this Money household can see this note. It does not change the bank description, category, or plan.</Text>
          {reviewError ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{reviewError}</Text> : null}
        </BottomDrawerScrollView>
      </BottomDrawer>

      <BottomDrawer
        visible={coverageOpen}
        onClose={() => setCoverageOpen(false)}
        snapPoints={['78%']}
        enableContentPanningGesture
        bottomAccessory={(
          <View style={styles.ruleActions}>
            {reviewError ? <Text style={styles.errorText}>{reviewError}</Text> : null}
            <Button fullWidth disabled={saving} onPress={() => void saveCoverage()}>{saving ? 'Saving…' : coverageMode === 'month' ? 'Use month plan' : 'Use this coverage'}</Button>
          </View>
        )}
        bottomAccessoryShowTopBorder
      >
        <BottomDrawerScrollView contentContainerStyle={styles.drawerContent} keyboardShouldPersistTaps="handled">
          <BottomDrawerHeader
            closeAccessibilityLabel="Close plan coverage options"
            onClose={() => setCoverageOpen(false)}
            title="How this is covered"
            variant="withClose"
          />
          <Text style={styles.drawerCopy}>This changes how the purchase affects {snapshot?.periodLabel.split(' ')[0] ?? 'this month'}. It stays in {currentCategory?.name ?? transaction.categoryName}.</Text>
          <View style={styles.coverageChoices}>
            <SettingsChoiceRow title={`${snapshot?.periodLabel.split(' ')[0] ?? 'Month'} plan`} description="Count the full purchase against this month." selected={coverageMode === 'month'} onPress={() => setCoverageMode('month')} disabled={saving} />
            <SettingsChoiceRow title="Saved money" description="Keep the purchase, but do not use this month’s flexible allocation." selected={coverageMode === 'saved'} onPress={() => setCoverageMode('saved')} disabled={saving} />
            <SettingsChoiceRow title="Split between both" description="Choose how much is covered by saved money." selected={coverageMode === 'split'} onPress={() => setCoverageMode('split')} disabled={saving} />
          </View>
          {coverageMode === 'split' ? (
            <Input accessibilityLabel="Amount covered by saved money" keyboardType="decimal-pad" label="Saved money amount" value={savedAmount} onChangeText={setSavedAmount} />
          ) : null}
          <View style={styles.coveragePreview}>
            <View style={styles.receiptRow}><Text style={styles.receiptLabel}>This purchase</Text><Text style={styles.receiptValue}>{formatMoney(transaction.amountCents)}</Text></View>
            <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Covered by saved money</Text><Text style={styles.receiptValue}>{formatMoney(nextSavedResourceCents)}</Text></View>
            {coverageImpact ? (
              <View style={styles.coverageResult}>
                <Text style={styles.coverageResultLabel}>Flexible spending</Text>
                <Text style={styles.coverageResultValue}>{formatPlanResult(coverageImpact.currentFlexibleRoomCents)} → {formatPlanResult(coverageImpact.nextFlexibleRoomCents)}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.drawerCopy}>Kwilt is not estimating your remaining savings.</Text>
        </BottomDrawerScrollView>
      </BottomDrawer>

      <BottomDrawer visible={countsAsOpen} onClose={() => setCountsAsOpen(false)} snapPoints={['46%']} enableContentPanningGesture>
        <BottomDrawerScrollView contentContainerStyle={styles.drawerContent}>
          <BottomDrawerHeader
            closeAccessibilityLabel="Close counts as options"
            onClose={() => setCountsAsOpen(false)}
            title="How should this count?"
            variant="withClose"
          />
          <Text style={styles.drawerCopy}>{currentCategory?.name ?? 'This category'} normally counts as {currentCategory?.planRole === 'protected' ? 'committed' : 'flexible'} spending. A change here applies only to this transaction.</Text>
          <PlanRoleChoice
            detail="Reduces your flexible money left this month."
            disabled={saving}
            label="Flexible spending"
            onPress={() => void selectPlanRole('flexible')}
            selected={planTreatment.kind === 'flexible'}
          />
          <PlanRoleChoice
            detail="Counts with bills and money already set aside."
            disabled={saving}
            label="Committed spending"
            onPress={() => void selectPlanRole('protected')}
            selected={planTreatment.kind === 'protected'}
          />
          {reviewError ? <Text style={styles.errorText}>{reviewError}</Text> : null}
        </BottomDrawerScrollView>
      </BottomDrawer>

      <BottomDrawer visible={categoryPickerOpen} onClose={() => { setCategoryPickerOpen(false); setCreatingCategory(false); }} snapPoints={['78%']} enableContentPanningGesture>
        <BottomDrawerScrollView contentContainerStyle={styles.drawerContent} keyboardShouldPersistTaps="handled">
          <BottomDrawerHeader
            closeAccessibilityLabel="Close category picker"
            onClose={() => setCategoryPickerOpen(false)}
            title="Choose a category"
            variant="withClose"
          />
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
            {flexibleCategories.length > 0 ? (
              <View style={styles.pickerSection}>
                <Text style={styles.secondarySectionLabel}>FLEXIBLE SPENDING</Text>
                {flexibleCategories.map((category) => (
                  <CategoryPickerRow
                    key={category.sourceId}
                    category={category}
                    disabled={pendingChoice !== null}
                    onPress={() => void selectCategory(category)}
                    pending={pendingChoice === `category:${category.sourceId}`}
                    selected={categoryMatchesTransaction(category, transaction)}
                  />
                ))}
              </View>
            ) : null}
            {committedCategories.length > 0 ? (
              <View style={styles.pickerSection}>
                <Text style={styles.secondarySectionLabel}>COMMITTED SPENDING</Text>
                {committedCategories.map((category) => (
                  <CategoryPickerRow
                    key={category.sourceId}
                    category={category}
                    disabled={pendingChoice !== null}
                    onPress={() => void selectCategory(category)}
                    pending={pendingChoice === `category:${category.sourceId}`}
                    selected={categoryMatchesTransaction(category, transaction)}
                  />
                ))}
              </View>
            ) : null}
            {filteredCategories.length === 0 ? (
              <Text accessibilityLiveRegion="polite" style={styles.emptySearchText}>
                {`No categories match “${categoryQuery.trim()}”`}
              </Text>
            ) : null}
          </View>

          <View style={styles.meaningSection}>
            <Text style={styles.secondarySectionLabel}>OTHER</Text>
            {getTransactionMeaningOptions(transaction.direction).map((option) => (
              <CategoryCommand
                key={option.meaning}
                detail={option.detail}
                icon={getMeaningIcon(option.meaning)}
                label={option.label}
                selected={effectiveMeaning === option.meaning}
                disabled={pendingChoice !== null}
                pending={pendingChoice === `meaning:${option.meaning}`}
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

      <BottomDrawer
        visible={Boolean(ruleOfferCategory) && ruleDrawerOpen}
        onClose={() => setRuleDrawerOpen(false)}
        snapPoints={['88%']}
        enableContentPanningGesture
        bottomAccessory={ruleOfferCategory ? (
          <View style={styles.ruleActions}>
            {reviewError ? <Text style={styles.errorText}>{reviewError}</Text> : null}
            <Button disabled={saving || Boolean(partialRuleError)} fullWidth onPress={() => void applyRule()}>{saving ? 'Saving…' : 'Create rule'}</Button>
            <Button fullWidth variant="ghost" onPress={() => void dismissRuleOffer()}>Not now</Button>
          </View>
        ) : undefined}
        bottomAccessoryShowTopBorder
      >
        <BottomDrawerScrollView contentContainerStyle={styles.drawerContent}>
          <BottomDrawerHeader
            closeAccessibilityLabel="Close merchant rule"
            onClose={() => setRuleDrawerOpen(false)}
            title={`Rule for ${ruleOfferCategory?.name ?? 'category'}`}
            variant="withClose"
          />
          <Text style={styles.drawerCopy}>Apply this category across your full transaction history and to future {transaction.merchantName} charges.</Text>
          <View style={styles.ruleModeRow}>
            <RuleModeButton active={ruleMode === 'exact'} label="Exact match" onPress={() => setRuleMode('exact')} />
            <RuleModeButton active={ruleMode === 'partial'} label="Partial match" onPress={() => setRuleMode('partial')} />
          </View>
          {ruleMode === 'partial' ? (
            <Input
              autoCapitalize="none"
              autoCorrect={false}
              errorText={partialRuleError ?? undefined}
              helperText="Future merchant names containing these words will match."
              label="Merchant contains"
              onChangeText={setPartialRuleMatch}
              returnKeyType="done"
              value={partialRuleMatch}
            />
          ) : (
            <View style={styles.matchPreview}>
              <Text style={styles.matchPreviewLabel}>WILL MATCH</Text>
              <Text style={styles.matchPreviewValue}>{transaction.merchantName}</Text>
            </View>
          )}
          {!partialRuleError ? (
            <View style={styles.similarSection}>
              <Text style={styles.similarTitle}>Matching transaction examples</Text>
              {similarRows.slice(0, 6).map((row) => (
                <View key={row.id} style={styles.similarRow}>
                  <View style={styles.similarCopy}><Text numberOfLines={1} style={styles.similarMerchant}>{row.merchantName}</Text><Text style={styles.similarMeta}>{formatTransactionDate(row.date)} · {row.categoryName}</Text></View>
                  <Text style={styles.similarAmount}>{formatMoney(row.amountCents, row.currencyCode)}</Text>
                </View>
              ))}
            </View>
          ) : null}
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
  const presentation = getPaymentSourcePresentation(transaction);
  const cardName = transaction.accountName.replace(/\b(visa|mastercard|amex|american express|card)\b/gi, '').replace(/\s+/g, ' ').trim() || transaction.accountName;
  return (
    <View style={styles.sourceCard}>
      <View style={styles.sourceDescriptionField}>
        <Text style={styles.sectionLabel}>Description</Text>
        <View style={styles.sourceDescriptionBlock}>
          <Text selectable numberOfLines={2} style={styles.sourceDescription}>{transaction.originalDescription ?? transaction.merchantName}</Text>
        </View>
      </View>
      {presentation.kind === 'deposit' ? (
        <View style={[styles.depositReceipt, { borderColor: presentation.palette.primary, backgroundColor: presentation.palette.soft }]}>
          <View style={styles.depositHeader}><View style={styles.depositIcon}><Icon name="landmark" size={16} color={presentation.palette.primary} /></View><Text style={styles.depositTitle}>Deposit received</Text></View>
          <ReceiptRow label="From" value={transaction.merchantName} />
          <ReceiptRow label="To" value={transaction.institutionName || transaction.accountName} />
          <ReceiptRow label="Rail" value={presentation.railLabel} />
        </View>
      ) : presentation.kind === 'credit_card' || presentation.kind === 'debit_card' ? (
        <CardPaymentSource cardName={cardName} palette={presentation.palette} transaction={transaction} />
      ) : presentation.kind === 'bank_account' ? (
        <BankPaymentSource palette={presentation.palette} railLabel={presentation.railLabel} transaction={transaction} />
      ) : (
        <GenericAccountSource palette={presentation.palette} transaction={transaction} />
      )}
    </View>
  );
}

function CardPaymentSource({ cardName, palette, transaction }: { cardName: string; palette: InstitutionPalette; transaction: MoneyTransaction }) {
  return (
    <View style={[styles.paymentCard, { backgroundColor: palette.primary }]}>
      <View style={styles.cardTopRow}><View style={[styles.cardChip, { backgroundColor: palette.soft }]} /><Icon name="creditCard" size={16} color={palette.foreground} /></View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.cardName, { color: palette.foreground }]}>{cardName}</Text>
      <View style={styles.cardBottomRow}><Text numberOfLines={1} style={[styles.cardInstitution, { color: palette.foreground }]}>{transaction.institutionName}</Text><Text style={[styles.cardMask, { color: palette.foreground }]}>•••• {transaction.accountMask ?? '----'}</Text></View>
    </View>
  );
}

function BankPaymentSource({ palette, railLabel, transaction }: { palette: InstitutionPalette; railLabel: string; transaction: MoneyTransaction }) {
  return (
    <View style={[styles.bankReceipt, { borderColor: palette.primary, backgroundColor: palette.soft }]}>
      <View style={[styles.bankIcon, { backgroundColor: palette.primary }]}><Icon name="landmark" size={18} color={palette.foreground} /></View>
      <View style={styles.bankReceiptCopy}>
        <Text numberOfLines={1} style={styles.bankAccountName}>{transaction.accountName}</Text>
        <Text numberOfLines={1} style={styles.bankInstitution}>{transaction.institutionName}{transaction.accountMask ? ` · •••• ${transaction.accountMask}` : ''}</Text>
        <Text style={[styles.bankRail, { color: palette.primary }]}>{railLabel}</Text>
      </View>
    </View>
  );
}

function GenericAccountSource({ palette, transaction }: { palette: InstitutionPalette; transaction: MoneyTransaction }) {
  return (
    <View style={[styles.bankReceipt, { borderColor: colors.cardBorder, backgroundColor: colors.gray50 }]}>
      <View style={[styles.bankIcon, { backgroundColor: palette.primary }]}><Icon name="receipt" size={18} color={palette.foreground} /></View>
      <View style={styles.bankReceiptCopy}>
        <Text numberOfLines={1} style={styles.bankAccountName}>{transaction.accountName}</Text>
        <Text numberOfLines={1} style={styles.bankInstitution}>{transaction.institutionName}{transaction.accountMask ? ` · •••• ${transaction.accountMask}` : ''}</Text>
        <Text style={styles.genericAccountLabel}>Account activity</Text>
      </View>
    </View>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.receiptRow}><Text style={styles.receiptLabel}>{label}</Text><Text numberOfLines={1} style={styles.receiptValue}>{value}</Text></View>;
}

function CategoryCommand({ detail, disabled, icon, label, onPress, pending, selected }: { detail: string; disabled: boolean; icon: 'arrowDown' | 'refresh' | 'close'; label: string; onPress: () => void; pending: boolean; selected: boolean }) {
  return <Pressable accessibilityRole="radio" accessibilityHint={detail} accessibilityState={{ checked: selected, disabled, busy: pending }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.commandRow, selected ? styles.commandSelected : null, pressed ? styles.pressed : null]}><Icon name={icon} size={18} color={selected ? colors.pine700 : colors.textSecondary} /><View style={styles.commandCopy}><Text style={styles.commandTitle}>{label}</Text><Text style={styles.commandDetail}>{detail}</Text></View>{pending ? <KwiltLoader color={colors.pine700} /> : selected ? <Icon name="check" size={18} color={colors.pine700} /> : null}</Pressable>;
}

function CategoryPickerRow({ category, disabled, onPress, pending, selected }: { category: MoneyCategory; disabled: boolean; onPress: () => void; pending: boolean; selected: boolean }) {
  return (
    <Pressable
      accessibilityLabel={`Choose ${category.name}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled, busy: pending }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.categoryRow, selected ? styles.categoryRowSelected : null, pressed ? styles.pressed : null]}
    >
      <View style={styles.categoryRowCopy}>
        <Text style={styles.categoryRowTitle}>{category.name}</Text>
        <Text style={styles.categoryRowMeta}>{formatMoney(category.remainingCents)} left</Text>
      </View>
      {pending ? <KwiltLoader color={colors.pine700} /> : selected ? <Icon name="check" size={18} color={colors.pine700} /> : null}
    </Pressable>
  );
}

function PlanRoleChoice({ detail, disabled, label, onPress, selected }: { detail: string; disabled: boolean; label: string; onPress: () => void; selected: boolean }) {
  return (
    <Pressable
      accessibilityHint={detail}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.planRoleChoice, selected ? styles.planRoleChoiceSelected : null, pressed ? styles.pressed : null]}
    >
      <View style={styles.commandCopy}>
        <Text style={styles.commandTitle}>{label}</Text>
        <Text style={styles.commandDetail}>{detail}</Text>
      </View>
      {selected ? <Icon name="check" size={18} color={colors.pine700} /> : null}
    </Pressable>
  );
}

function getMeaningIcon(meaning: TransactionMeaningOption['meaning']): 'arrowDown' | 'refresh' | 'close' {
  if (meaning === 'income') return 'arrowDown';
  if (meaning === 'transfer') return 'refresh';
  return 'close';
}

function categoryMatchesTransaction(category: MoneyCategory, transaction: MoneyTransaction): boolean {
  return transaction.categoryId === category.id || transaction.categoryId === category.sourceId;
}

function RuleModeButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={onPress} style={[styles.ruleModeButton, active ? styles.ruleModeActive : null]}><Text style={[styles.ruleModeText, active ? styles.ruleModeTextActive : null]}>{label}</Text></Pressable>;
}

function getCategoryRelationLabel(transaction: MoneyTransaction, category?: MoneyCategory): string | null {
  if (transaction.allocations?.length) return 'Split across categories';
  if (category) return category.name;
  if (transaction.moneyMeaning === 'income') return 'Income';
  if (transaction.moneyMeaning === 'transfer') return 'Internal transfer';
  if (transaction.moneyMeaning === 'not_counted') return 'Outside the plan';
  if (isProviderIncome(transaction)) return 'Income';
  return null;
}

function formatTransactionDate(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : dateIso;
}

function formatPlanResult(roomCents: number): string {
  return roomCents < 0 ? `${formatMoney(Math.abs(roomCents))} over` : `${formatMoney(roomCents)} left`;
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingHorizontal: spacing.lg, paddingBottom: 80 },
  hero: { gap: spacing.xs, paddingTop: spacing.md },
  heroMetaRow: { minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroMeta: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  reviewedPill: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, backgroundColor: colors.pine50, color: colors.pine700, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  amount: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 48, lineHeight: 53, fontWeight: '700', letterSpacing: -1.6, fontVariant: ['tabular-nums'] },
  inflowAmount: { color: colors.pine700 },
  sourceCard: { gap: spacing.md },
  sourceDescriptionField: { gap: spacing.md },
  sourceDescriptionBlock: { minHeight: 52, justifyContent: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, backgroundColor: colors.card },
  sourceDescription: { color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, fontWeight: '500' },
  noteSection: { gap: spacing.md },
  noteValue: { color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  paymentCard: { minHeight: 184, justifyContent: 'space-between', borderRadius: 18, padding: spacing.lg, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardChip: { width: 36, height: 27, borderRadius: 6 },
  cardName: { color: colors.canvas, fontFamily: fonts.semibold, fontSize: 24, lineHeight: 30, fontWeight: '600' },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  cardInstitution: { flex: 1, color: colors.canvas, opacity: 0.82, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17 },
  cardMask: { color: colors.canvas, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, letterSpacing: 1.1 },
  bankReceipt: { minHeight: 112, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderRadius: 14 },
  bankIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  bankReceiptCopy: { flex: 1, minWidth: 0, gap: 2 },
  bankAccountName: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, fontWeight: '600' },
  bankInstitution: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  bankRail: { marginTop: spacing.sm, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  genericAccountLabel: { marginTop: spacing.sm, color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  depositReceipt: { gap: spacing.sm, padding: spacing.lg, borderWidth: 1, borderColor: colors.pine200, borderRadius: 14, backgroundColor: colors.pine50 },
  depositHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  depositIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.canvas },
  depositTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  receiptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg },
  receiptLabel: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  receiptValue: { flex: 1, color: colors.textPrimary, textAlign: 'right', fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, fontWeight: '500' },
  section: { gap: spacing.md, paddingBottom: spacing.xl },
  sectionLabel: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.7 },
  categoryField: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.card },
  categoryFieldCopy: { minWidth: 0, flex: 1, justifyContent: 'center' },
  categoryFieldText: { minWidth: 0, color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  categoryPlaceholder: { color: colors.textSecondary },
  countsAsRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: spacing.md },
  countsAsCopy: { minWidth: 0, flex: 1, gap: 2 },
  countsAsLabel: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14, fontWeight: '600', letterSpacing: 0.7 },
  countsAsValue: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  countsAsDetail: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  classificationDetail: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  ruleReceipt: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 10, backgroundColor: colors.pine50 },
  ruleReceiptText: { flex: 1, color: colors.pine700, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, fontWeight: '500' },
  ruleGuideContent: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
  ruleGuideCopy: { gap: spacing.xs },
  ruleGuideTitle: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 20, lineHeight: 25, fontWeight: '700' },
  ruleGuideDetail: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  ruleGuideActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm, paddingTop: spacing.lg },
  splitReceipt: { gap: spacing.sm, padding: spacing.lg, borderWidth: 1, borderColor: colors.pine200, borderRadius: 12, backgroundColor: colors.pine50 },
  splitReceiptTitle: { color: colors.pine700, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  splitReceiptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg },
  splitReceiptLabel: { flex: 1, color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  splitReceiptAmount: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
  drawerContent: { gap: spacing.lg, paddingHorizontal: spacing.xl, paddingBottom: 64 },
  drawerCopy: { ...typography.bodySm, color: colors.textSecondary },
  coverageChoices: { overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, backgroundColor: colors.card },
  coveragePreview: { gap: spacing.sm, padding: spacing.lg, borderRadius: 12, backgroundColor: colors.fieldFill },
  coverageResult: { gap: 2, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  coverageResultLabel: { ...typography.bodyXs, color: colors.textSecondary },
  coverageResultValue: { ...typography.body, fontFamily: fonts.semibold, color: colors.textPrimary },
  meaningSection: { gap: spacing.xs },
  pickerSection: { gap: 2 },
  secondarySectionLabel: { marginTop: spacing.xs, color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14, fontWeight: '600', letterSpacing: 0.7 },
  commandRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, paddingVertical: spacing.sm },
  commandSelected: { backgroundColor: colors.pine50 },
  commandCopy: { flex: 1, minWidth: 0 },
  commandTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  commandDetail: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  planRoleChoice: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, backgroundColor: colors.card },
  planRoleChoiceSelected: { borderColor: colors.pine300, backgroundColor: colors.pine50 },
  categoryList: { gap: 2 },
  categoryRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, paddingVertical: spacing.sm },
  categoryRowSelected: { backgroundColor: colors.pine50 },
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
  ruleActions: { gap: spacing.sm },
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
