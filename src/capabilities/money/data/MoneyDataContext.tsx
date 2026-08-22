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
  recordMoneyAppControlReview,
  type MoneyAppControlReviewOutcome,
} from '../domain/moneyAppControl';
import { loadMoneyAppControlSettings, saveMoneyAppControlSettings } from '../runtime/moneyAppControlStorage';
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
import {
  moneySnapshotCache as defaultMoneySnapshotCache,
  type MoneySnapshotCache,
} from '../runtime/moneySnapshotCache';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import {
  reconcileConnectedMoneyActivity,
  type ConnectedMoneyActivityTrigger,
} from '../runtime/reconcileConnectedMoneyActivity';
import { captureMoneyClassification } from '../runtime/moneyClassificationTelemetry';
import type { MoneyPlaidSyncResult } from './moneyPlaidApi';
import { getMoneyTransactionsAvailability } from '../domain/moneyOnboarding';
import { useMoneyNavigationAvailabilityStore } from '../runtime/useMoneyNavigationAvailabilityStore';

type MoneyDataContextValue = MoneyDataState & {
  userId: string | null;
  refresh: () => Promise<void>;
  reconcileGovernedPlanFoundation: () => Promise<void>;
  reconcileConnectedActivity: (input: {
    trigger: ConnectedMoneyActivityTrigger;
    sync: boolean;
  }) => Promise<MoneyPlaidSyncResult | null>;
  reviewingTransactionId: string | null;
  assignTransactionCategory: (transactionId: string, categoryId: string) => Promise<void>;
  markTransactionNotCounted: (transactionId: string) => Promise<void>;
  splitTransaction: (input: Parameters<MoneyRepository['splitTransaction']>[0]) => Promise<void>;
  reviewTransactionMeaning: (transactionId: string, input: TransactionMeaningReviewInput) => Promise<void>;
  setTransactionPlanRoleOverride: (transactionId: string, planRoleOverride: 'protected' | 'flexible' | null) => Promise<void>;
  setTransactionPlanCoverage: (transactionId: string, savedResourceCents: number) => Promise<void>;
  saveMerchantRule: (input: Parameters<MoneyRepository['saveMerchantRule']>[0]) => Promise<void>;
  savingCategory: boolean;
  savingCategoryOrder: boolean;
  createCategory: (input: CategoryPlanInput) => Promise<string>;
  reorderCategories: (categoryIds: string[]) => Promise<void>;
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
  reviewMoneyAppControl: (categoryId: string, outcome: MoneyAppControlReviewOutcome) => Promise<void>;
};

const MoneyDataContext = createContext<MoneyDataContextValue | null>(null);

export function MoneyDataProvider({
  children,
  repository,
  snapshotCache = defaultMoneySnapshotCache,
  userId = null,
}: {
  children: React.ReactNode;
  repository?: MoneyRepository;
  snapshotCache?: MoneySnapshotCache;
  userId?: string | null;
}) {
  const [state, dispatch] = useReducer(moneyDataReducer, initialMoneyDataState);
  const [reviewingTransactionId, setReviewingTransactionId] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingCategoryOrder, setSavingCategoryOrder] = useState(false);
  const { capture } = useAnalytics();
  const resolvedRepository = useMemo(() => repository ?? createMoneyRepository(), [repository]);
  const mutationVersionRef = useRef(0);
  const initializationVersionRef = useRef(0);
  const normalizedUserId = userId?.trim() || null;

  const acceptSnapshot = useCallback((snapshot: Awaited<ReturnType<MoneyRepository['loadSnapshot']>>) => {
    dispatch({ type: 'success', snapshot });
    if (normalizedUserId) {
      useMoneyNavigationAvailabilityStore.getState().recordTransactionsAvailability(
        normalizedUserId,
        getMoneyTransactionsAvailability({
          accountCount: snapshot.accounts.length,
          transactionCount: snapshot.transactions.length,
        }),
      );
      void snapshotCache.save(normalizedUserId, snapshot).catch(() => {
        // Device caching is best-effort; the authoritative snapshot remains visible.
      });
    }
    void syncMoneyGlanceableState(snapshot);
    void reconcileMoneyAppControls(snapshot);
  }, [normalizedUserId, snapshotCache]);

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
    const initializationVersion = ++initializationVersionRef.current;
    dispatch({ type: 'load' });
    if (normalizedUserId) {
      const cachedSnapshot = await snapshotCache.load(normalizedUserId).catch(() => null);
      if (initializationVersionRef.current !== initializationVersion) return;
      if (cachedSnapshot) dispatch({ type: 'cached_snapshot', snapshot: cachedSnapshot });
    }
    try {
      if (repository) {
        const snapshot = await resolvedRepository.loadSnapshot();
        if (initializationVersionRef.current !== initializationVersion) return;
        acceptSnapshot(snapshot);
      } else {
        await initializeGovernedMoneyPlan(
          resolvedRepository,
          getSupabaseClient(),
          reconcileLivingPlan,
          (snapshot) => {
            if (initializationVersionRef.current === initializationVersion) acceptSnapshot(snapshot);
          },
        );
      }
      if (initializationVersionRef.current !== initializationVersion) return;
      if (typeof resolvedRepository.classifyUnresolvedTransactions === 'function') {
        void resolvedRepository.classifyUnresolvedTransactions().then((result) => {
          if (result.policyVersion) {
            captureMoneyClassification(capture, { trigger: 'initialization', outcome: 'succeeded', receipt: result });
          }
          if (result.assignedCount <= 0) return;
          const version = ++mutationVersionRef.current;
          refreshInBackground(version);
        }).catch(() => {
          captureMoneyClassification(capture, { trigger: 'initialization', outcome: 'failed' });
        });
      }
    } catch (error) {
      if (initializationVersionRef.current !== initializationVersion) return;
      dispatch({
        type: 'failure',
        message: error instanceof Error ? error.message : 'Money data could not be loaded.',
      });
    }
  }, [acceptSnapshot, capture, normalizedUserId, refreshInBackground, repository, resolvedRepository, snapshotCache]);

  const reconcileGovernedPlanFoundation = useCallback(async () => {
    await resolvedRepository.ensureGovernedPlanFoundation();
    const snapshot = await resolvedRepository.loadSnapshot();
    acceptSnapshot(snapshot);
  }, [acceptSnapshot, resolvedRepository]);

  const reconcileConnectedActivity = useCallback(async (input: {
    trigger: ConnectedMoneyActivityTrigger;
    sync: boolean;
  }) => {
    const version = ++mutationVersionRef.current;
    dispatch({ type: 'load' });
    try {
      const result = await reconcileConnectedMoneyActivity({
        client: getSupabaseClient(),
        repository: resolvedRepository,
        trigger: input.trigger,
        sync: input.sync,
      });
      if (mutationVersionRef.current !== version) return result.syncResult;
      acceptSnapshot(result.snapshot);
      captureMoneyClassification(capture, {
        trigger: input.trigger,
        outcome: result.classification.outcome,
        ...(result.classification.outcome === 'succeeded' ? { receipt: result.classification.receipt } : {}),
      });
      return result.syncResult;
    } catch (error) {
      if (mutationVersionRef.current === version) {
        dispatch({
          type: 'failure',
          message: error instanceof Error ? error.message : 'Money data could not be refreshed.',
        });
      }
      throw error;
    }
  }, [acceptSnapshot, capture, resolvedRepository]);

  useEffect(() => {
    void initialize();
    return () => {
      initializationVersionRef.current += 1;
    };
  }, [initialize]);

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

  const setTransactionPlanRoleOverride = useCallback(async (
    transactionId: string,
    planRoleOverride: 'protected' | 'flexible' | null,
  ) => {
    setReviewingTransactionId(transactionId);
    try {
      const result = await resolvedRepository.setTransactionPlanRoleOverride(transactionId, planRoleOverride);
      dispatch({
        type: 'confirmed_transaction_plan_role_patch',
        patch: { transactionId: result.transactionId, planRoleOverride: result.planRoleOverride },
      });
      const version = ++mutationVersionRef.current;
      refreshInBackground(version);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The transaction plan treatment could not be updated.';
      dispatch({ type: 'failure', message });
      throw error;
    } finally {
      setReviewingTransactionId(null);
    }
  }, [refreshInBackground, resolvedRepository]);

  const setTransactionPlanCoverage = useCallback(
    (transactionId: string, savedResourceCents: number) => reviewBroadTransaction(
      transactionId,
      () => resolvedRepository.setTransactionPlanCoverage(transactionId, savedResourceCents),
    ),
    [resolvedRepository, reviewBroadTransaction],
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

  const reorderCategories = useCallback(async (categoryIds: string[]) => {
    setSavingCategoryOrder(true);
    try {
      const result = await resolvedRepository.reorderCategories(categoryIds);
      dispatch({ type: 'confirmed_category_order', categorySourceIds: result.categoryIds });
      const version = ++mutationVersionRef.current;
      refreshInBackground(version);
    } catch (error) {
      dispatch({
        type: 'failure',
        message: error instanceof Error ? error.message : 'The category order could not be saved.',
      });
      throw error;
    } finally {
      setSavingCategoryOrder(false);
    }
  }, [refreshInBackground, resolvedRepository]);

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
  }, [state.snapshot]);

  const value = useMemo(() => ({
    ...state,
    userId: normalizedUserId,
    refresh,
    reconcileGovernedPlanFoundation,
    reconcileConnectedActivity,
    reviewingTransactionId,
    assignTransactionCategory,
    markTransactionNotCounted,
    splitTransaction,
    reviewTransactionMeaning,
      setTransactionPlanRoleOverride,
      setTransactionPlanCoverage,
    saveMerchantRule,
    savingCategory,
    savingCategoryOrder,
    createCategory,
    reorderCategories,
    renameCategory,
    updateCategoryCover,
    updateCategoryPlan,
    previewCategoryPlanAmount,
    reviewMoneyAppControl,
  }), [assignTransactionCategory, createCategory, markTransactionNotCounted, normalizedUserId, previewCategoryPlanAmount, reconcileConnectedActivity, reconcileGovernedPlanFoundation, refresh, renameCategory, reorderCategories, reviewMoneyAppControl, reviewTransactionMeaning, reviewingTransactionId, saveMerchantRule, savingCategory, savingCategoryOrder, setTransactionPlanCoverage, setTransactionPlanRoleOverride, splitTransaction, state, updateCategoryCover, updateCategoryPlan]);
  return <MoneyDataContext.Provider value={value}>{children}</MoneyDataContext.Provider>;
}

export function useMoneyData(): MoneyDataContextValue {
  const value = useContext(MoneyDataContext);
  if (!value) throw new Error('useMoneyData must be used inside MoneyDataProvider.');
  return value;
}
