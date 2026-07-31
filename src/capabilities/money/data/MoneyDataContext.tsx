import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  createMoneyRepository,
  type ConfirmedCategoryWrite,
  type ConfirmedMerchantRuleWrite,
  type ConfirmedTransactionWrite,
  type MoneyRepository,
} from './moneyRepository';
import type { TransactionMeaningReviewInput } from './moneyMutations';
import type { CategoryPlanInput } from '../domain/categoryPlanDraft';
import { initialMoneyDataState, moneyDataReducer, type MoneyDataState } from './moneyDataState';
import { syncMoneyGlanceableState } from '../runtime/moneyGlanceableState';
import { reconcileMoneyAppControls } from '../runtime/moneyAppControlRuntime';
import {
  evaluateMoneyAppControlPolicy,
  recordMoneyAppControlReview,
  type MoneyAppControlReviewOutcome,
} from '../domain/moneyAppControl';
import { loadMoneyAppControlSettings, saveMoneyAppControlSettings } from '../runtime/moneyAppControlStorage';
import {
  claimPendingMoneyReviewHandoff,
  subscribeToMoneyReviewHandoff,
} from '../runtime/moneyAppControlForegroundSync';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { getLivingPlanSettings } from './livingPlanRepository';
import {
  commitLivingPlanCategoryChange,
  previewLivingPlanOverride,
  reconcileLivingPlan,
  type LivingPlanOverridePreview,
  type ReadyLivingPlanOverridePreview,
} from '../runtime/livingPlanReconciliation';
import { initializeGovernedMoneyPlan } from '../runtime/moneyPlanLifecycle';
import { loadMoneyPlanProjection } from './moneyPlanProjection';

type MoneyDataContextValue = MoneyDataState & {
  refresh: () => Promise<void>;
  reconcileGovernedPlanFoundation: () => Promise<void>;
  reviewingTransactionId: string | null;
  assignTransactionCategory: (transactionId: string, categoryId: string) => Promise<void>;
  markTransactionNotCounted: (transactionId: string) => Promise<void>;
  splitTransaction: (input: Parameters<MoneyRepository['splitTransaction']>[0]) => Promise<void>;
  reviewTransactionMeaning: (transactionId: string, input: TransactionMeaningReviewInput) => Promise<void>;
  saveMerchantRule: (input: Parameters<MoneyRepository['saveMerchantRule']>[0]) => Promise<void>;
  savingCategory: boolean;
  createCategory: (input: CategoryPlanInput) => Promise<string>;
  renameCategory: (categoryId: string, name: string) => Promise<void>;
  updateCategoryCover: (categoryId: string, cover: Parameters<MoneyRepository['updateCategoryCover']>[1]) => Promise<void>;
  updateCategoryPlan: (
    categoryId: string,
    input: Parameters<MoneyRepository['updateCategoryPlan']>[1],
    preview?: ReadyLivingPlanOverridePreview,
  ) => Promise<void>;
  previewCategoryPlanAmount: (
    categoryId: string,
    budgetCents: number,
    funding?: Parameters<typeof previewLivingPlanOverride>[3],
  ) => Promise<LivingPlanOverridePreview | null>;
  pendingAppControlReviewCategoryId: string | null;
  reviewMoneyAppControl: (categoryId: string, outcome: MoneyAppControlReviewOutcome) => Promise<void>;
};

const MoneyDataContext = createContext<MoneyDataContextValue | null>(null);

export function MoneyDataProvider({
  children,
  repository,
}: {
  children: React.ReactNode;
  repository?: MoneyRepository;
}) {
  const [state, dispatch] = useReducer(moneyDataReducer, initialMoneyDataState);
  const [reviewingTransactionId, setReviewingTransactionId] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [pendingAppControlReviewCategoryId, setPendingAppControlReviewCategoryId] = useState<string | null>(null);
  const resolvedRepository = useMemo(() => repository ?? createMoneyRepository(), [repository]);
  const mutationVersionRef = useRef(0);

  const acceptSnapshot = useCallback((snapshot: Awaited<ReturnType<MoneyRepository['loadSnapshot']>>) => {
    dispatch({ type: 'success', snapshot });
    void syncMoneyGlanceableState(snapshot);
    void reconcileMoneyAppControls(snapshot);
  }, []);

  const refreshInBackground = useCallback((version: number) => {
    void resolvedRepository.loadSnapshot().then((snapshot) => {
      if (mutationVersionRef.current !== version) return;
      acceptSnapshot(snapshot);
    }).catch(() => {
      if (mutationVersionRef.current !== version) return;
      dispatch({ type: 'background_failure', message: 'Saved. Money will refresh when the connection is available.' });
    });
  }, [acceptSnapshot, resolvedRepository]);

  const refresh = useCallback(async () => {
    const version = ++mutationVersionRef.current;
    dispatch({ type: 'load' });
    try {
      const snapshot = await resolvedRepository.loadSnapshot();
      if (mutationVersionRef.current === version) acceptSnapshot(snapshot);
    } catch (error) {
      if (mutationVersionRef.current !== version) return;
      dispatch({
        type: 'failure',
        message: error instanceof Error ? error.message : 'Money data could not be loaded.',
      });
    }
  }, [acceptSnapshot, resolvedRepository]);

  const initialize = useCallback(async () => {
    dispatch({ type: 'load' });
    try {
      const snapshot = repository
        ? await resolvedRepository.loadSnapshot()
        : await initializeGovernedMoneyPlan(resolvedRepository, getSupabaseClient());
      acceptSnapshot(snapshot);
      if (typeof resolvedRepository.classifyUnresolvedTransactions === 'function') {
        void resolvedRepository.classifyUnresolvedTransactions().then((result) => {
          if (result.assignedCount <= 0) return;
          const version = ++mutationVersionRef.current;
          refreshInBackground(version);
        }).catch(() => {
          // Optional background classification never changes visible Money status.
        });
      }
    } catch (error) {
      dispatch({
        type: 'failure',
        message: error instanceof Error ? error.message : 'Money data could not be loaded.',
      });
    }
  }, [acceptSnapshot, refreshInBackground, repository, resolvedRepository]);

  const reconcileGovernedPlanFoundation = useCallback(async () => {
    await resolvedRepository.ensureGovernedPlanFoundation();
    const snapshot = await resolvedRepository.loadSnapshot();
    acceptSnapshot(snapshot);
  }, [acceptSnapshot, resolvedRepository]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!state.snapshot) return;
    let cancelled = false;
    const consumeHandoff = async () => {
      if (!claimPendingMoneyReviewHandoff()) return;
      const now = new Date();
      const settings = await loadMoneyAppControlSettings();
      const category = state.snapshot?.categories.find((candidate) =>
        evaluateMoneyAppControlPolicy({ settings, snapshot: state.snapshot!, category: candidate, now }).restricted);
      if (!cancelled && category) setPendingAppControlReviewCategoryId(category.sourceId);
    };
    void consumeHandoff();
    const unsubscribe = subscribeToMoneyReviewHandoff(() => { void consumeHandoff(); });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [state.snapshot]);

  const reviewBoundedTransaction = useCallback(async (
    transactionId: string,
    mutation: () => Promise<ConfirmedTransactionWrite>,
  ) => {
    setReviewingTransactionId(transactionId);
    try {
      const result = await mutation();
      const category = state.snapshot?.categories.find((candidate) => candidate.sourceId === result.categorySourceId);
      const categoryName = result.meaning === 'income'
        ? 'Income'
        : result.meaning === 'transfer'
          ? 'Internal transfer'
          : result.meaning === 'not_counted'
            ? 'Outside the plan'
            : category?.name ?? 'Needs review';
      dispatch({
        type: 'confirmed_transaction_patch',
        patch: {
          transactionId: result.transactionId,
          categoryId: category?.id ?? null,
          categoryName,
          reviewState: result.reviewState,
          moneyMeaning: result.meaning,
        },
      });
      const version = ++mutationVersionRef.current;
      refreshInBackground(version);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The transaction could not be updated.';
      dispatch({ type: 'failure', message });
      throw error;
    } finally {
      setReviewingTransactionId(null);
    }
  }, [refreshInBackground, state.snapshot]);

  const reviewBroadTransaction = useCallback(async (
    transactionId: string,
    mutation: () => ReturnType<MoneyRepository['loadSnapshot']>,
  ) => {
    setReviewingTransactionId(transactionId);
    try {
      const version = ++mutationVersionRef.current;
      const snapshot = await mutation();
      if (mutationVersionRef.current === version) acceptSnapshot(snapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The transaction could not be updated.';
      dispatch({ type: 'failure', message });
      throw error;
    } finally {
      setReviewingTransactionId(null);
    }
  }, [acceptSnapshot]);

  const reviewMerchantRule = useCallback(async (
    transactionId: string,
    mutation: () => Promise<ConfirmedMerchantRuleWrite>,
  ) => {
    setReviewingTransactionId(transactionId);
    try {
      const result = await mutation();
      const category = state.snapshot?.categories.find((candidate) => candidate.sourceId === result.categorySourceId);
      dispatch({
        type: 'confirmed_merchant_rule_patch',
        patch: {
          transactionId: result.transactionId,
          categoryId: category?.id ?? null,
        },
      });
      const version = ++mutationVersionRef.current;
      refreshInBackground(version);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The merchant rule could not be saved.';
      dispatch({ type: 'failure', message });
      throw error;
    } finally {
      setReviewingTransactionId(null);
    }
  }, [refreshInBackground, state.snapshot]);

  const assignTransactionCategory = useCallback(
    (transactionId: string, categoryId: string) => reviewBoundedTransaction(
      transactionId,
      () => resolvedRepository.assignTransactionCategory(transactionId, categoryId),
    ),
    [resolvedRepository, reviewBoundedTransaction],
  );

  const markTransactionNotCounted = useCallback(
    (transactionId: string) => reviewBoundedTransaction(
      transactionId,
      () => resolvedRepository.markTransactionNotCounted(transactionId),
    ),
    [resolvedRepository, reviewBoundedTransaction],
  );

  const splitTransaction = useCallback(
    (input: Parameters<MoneyRepository['splitTransaction']>[0]) => reviewBroadTransaction(
      input.transactionId,
      () => resolvedRepository.splitTransaction(input),
    ),
    [resolvedRepository, reviewBroadTransaction],
  );

  const reviewTransactionMeaning = useCallback(
    (transactionId: string, input: TransactionMeaningReviewInput) => reviewBoundedTransaction(
      transactionId,
      () => resolvedRepository.reviewTransactionMeaning(transactionId, input),
    ),
    [resolvedRepository, reviewBoundedTransaction],
  );

  const saveMerchantRule = useCallback(
    (input: Parameters<MoneyRepository['saveMerchantRule']>[0]) => reviewMerchantRule(
      input.transactionId,
      () => resolvedRepository.saveMerchantRule(input),
    ),
    [resolvedRepository, reviewMerchantRule],
  );

  const createCategory = useCallback(async (input: CategoryPlanInput) => {
    setSavingCategory(true);
    try {
      const result = await resolvedRepository.createCategory(input);
      acceptSnapshot(result.snapshot);
      return result.categoryId;
    } catch (error) {
      dispatch({
        type: 'failure',
        message: error instanceof Error ? error.message : 'The category could not be created.',
      });
      throw error;
    } finally {
      setSavingCategory(false);
    }
  }, [acceptSnapshot, resolvedRepository]);

  const applyCategoryMutation = useCallback(async (mutation: () => Promise<ConfirmedCategoryWrite>) => {
    setSavingCategory(true);
    try {
      const result = await mutation();
      dispatch({
        type: 'confirmed_category_patch',
        patch: {
          categorySourceId: result.categoryId,
          ...(result.changes.name != null ? { name: result.changes.name } : null),
          ...(result.changes.rolloverEnabled != null ? { rolloverEnabled: result.changes.rolloverEnabled } : null),
          ...('coverImage' in result.changes ? { coverImage: result.changes.coverImage ?? null } : null),
        },
      });
      const version = ++mutationVersionRef.current;
      refreshInBackground(version);
    } catch (error) {
      dispatch({
        type: 'failure',
        message: error instanceof Error ? error.message : 'The category could not be updated.',
      });
      throw error;
    } finally {
      setSavingCategory(false);
    }
  }, [refreshInBackground]);

  const previewCategoryPlanAmount = useCallback(async (
    categoryId: string,
    budgetCents: number,
    funding?: Parameters<typeof previewLivingPlanOverride>[3],
  ) => {
    const category = state.snapshot?.categories.find((candidate) => candidate.sourceId === categoryId || candidate.id === categoryId);
    if (!category) throw new Error('This category is no longer available.');
    const client = getSupabaseClient();
    const settings = await getLivingPlanSettings(client);
    if (!settings.promotionEnabled || !settings.target) return null;
    return previewLivingPlanOverride(client, category.id, budgetCents, funding);
  }, [state.snapshot]);

  const renameCategory = useCallback(
    (categoryId: string, name: string) => applyCategoryMutation(
      () => resolvedRepository.renameCategory(categoryId, name),
    ),
    [applyCategoryMutation, resolvedRepository],
  );

  const updateCategoryCover = useCallback(
    (categoryId: string, cover: Parameters<MoneyRepository['updateCategoryCover']>[1]) => applyCategoryMutation(
      () => resolvedRepository.updateCategoryCover(categoryId, cover),
    ),
    [applyCategoryMutation, resolvedRepository],
  );

  const updateCategoryPlan = useCallback(async (
    categoryId: string,
    input: Parameters<MoneyRepository['updateCategoryPlan']>[1],
    preview?: ReadyLivingPlanOverridePreview,
  ) => {
    const category = state.snapshot?.categories.find((candidate) => candidate.sourceId === categoryId || candidate.id === categoryId);
    const hasFundingChange = input.fundingRhythm != null
      || 'expectedNeedCents' in input
      || 'expectedNeedDueMonth' in input;
    if ((input.budgetCents != null || hasFundingChange) && category) {
      const client = getSupabaseClient();
      const settings = await getLivingPlanSettings(client);
      if (settings.promotionEnabled && settings.target) {
        setSavingCategory(true);
        try {
          const fundingRhythm = input.fundingRhythm ?? category.fundingRhythm;
          const expectedNeedCents = fundingRhythm === 'reserve'
            ? ('expectedNeedCents' in input ? input.expectedNeedCents ?? null : category.expectedNeed?.amountCents ?? null)
            : null;
          const expectedNeedDueMonth = fundingRhythm === 'reserve'
            ? ('expectedNeedDueMonth' in input ? input.expectedNeedDueMonth?.trim() || null : category.expectedNeed?.dueMonth ?? null)
            : null;
          const reviewedPreview = preview ?? await previewLivingPlanOverride(
            client,
            category.id,
            input.budgetCents ?? category.plannedCents,
            { fundingRhythm, expectedNeedCents, expectedNeedDueMonth },
          );
          if (reviewedPreview.outcome !== 'ready') {
            throw new Error('Nothing changed because the Money plan could not safely preview this category change.');
          }
          const result = await commitLivingPlanCategoryChange(client, {
            planCategoryId: category.sourceId,
            allocationCategoryId: category.id,
            amountCents: input.budgetCents ?? category.plannedCents,
            fundingRhythm,
            expectedNeedCents,
            expectedNeedDueMonth,
            preview: reviewedPreview,
          });
          if (result.outcome === 'blocked' || result.outcome === 'not_ready' || result.outcome === 'disabled') {
            throw new Error('Nothing changed because current account evidence is not ready to rebuild the plan safely.');
          }
          if (!state.snapshot) throw new Error('Money must finish loading before the plan can be updated.');
          if (!result.versionId) throw new Error('The updated Money plan did not return a confirmed version.');
          const projection = await loadMoneyPlanProjection(client, state.snapshot, result.versionId);
          if (!projection) throw new Error('The updated Money plan is unavailable.');
          ++mutationVersionRef.current;
          dispatch({
            type: 'authoritative_plan_projection',
            snapshot: projection.snapshot,
            versionId: projection.versionId,
            receiptId: projection.receipt?.id ?? null,
          });
          void syncMoneyGlanceableState(projection.snapshot);
          void reconcileMoneyAppControls(projection.snapshot);
          return;
        } finally {
          setSavingCategory(false);
        }
      }
    }
    await applyCategoryMutation(() => resolvedRepository.updateCategoryPlan(categoryId, input));
  }, [applyCategoryMutation, resolvedRepository, state.snapshot]);

  const reviewMoneyAppControl = useCallback(async (categoryId: string, outcome: MoneyAppControlReviewOutcome) => {
    if (!state.snapshot) throw new Error('Money must finish loading before this review can be recorded.');
    const current = await loadMoneyAppControlSettings();
    const next = recordMoneyAppControlReview(current, categoryId, outcome);
    await saveMoneyAppControlSettings(next);
    await reconcileMoneyAppControls(state.snapshot, next);
    setPendingAppControlReviewCategoryId(null);
  }, [state.snapshot]);

  const value = useMemo(() => ({
    ...state,
    refresh,
    reconcileGovernedPlanFoundation,
    reviewingTransactionId,
    assignTransactionCategory,
    markTransactionNotCounted,
    splitTransaction,
    reviewTransactionMeaning,
    saveMerchantRule,
    savingCategory,
    createCategory,
    renameCategory,
    updateCategoryCover,
    updateCategoryPlan,
    previewCategoryPlanAmount,
    pendingAppControlReviewCategoryId,
    reviewMoneyAppControl,
  }), [assignTransactionCategory, createCategory, markTransactionNotCounted, pendingAppControlReviewCategoryId, previewCategoryPlanAmount, reconcileGovernedPlanFoundation, refresh, renameCategory, reviewMoneyAppControl, reviewTransactionMeaning, reviewingTransactionId, saveMerchantRule, savingCategory, splitTransaction, state, updateCategoryPlan]);
  return <MoneyDataContext.Provider value={value}>{children}</MoneyDataContext.Provider>;
}

export function useMoneyData(): MoneyDataContextValue {
  const value = useContext(MoneyDataContext);
  if (!value) throw new Error('useMoneyData must be used inside MoneyDataProvider.');
  return value;
}
