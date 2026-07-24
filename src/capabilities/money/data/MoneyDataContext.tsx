import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { createMoneyRepository, type MoneyRepository } from './moneyRepository';
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

type MoneyDataContextValue = MoneyDataState & {
  refresh: () => Promise<void>;
  reviewingTransactionId: string | null;
  assignTransactionCategory: (transactionId: string, categoryId: string) => Promise<void>;
  markTransactionNotCounted: (transactionId: string) => Promise<void>;
  reviewTransactionMeaning: (transactionId: string, input: TransactionMeaningReviewInput) => Promise<void>;
  saveMerchantRule: (input: Parameters<MoneyRepository['saveMerchantRule']>[0]) => Promise<void>;
  savingCategory: boolean;
  createCategory: (input: CategoryPlanInput) => Promise<string>;
  renameCategory: (categoryId: string, name: string) => Promise<void>;
  updateCategoryPlan: (categoryId: string, input: Parameters<MoneyRepository['updateCategoryPlan']>[1]) => Promise<void>;
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

  const acceptSnapshot = useCallback((snapshot: Awaited<ReturnType<MoneyRepository['loadSnapshot']>>) => {
    dispatch({ type: 'success', snapshot });
    void syncMoneyGlanceableState(snapshot);
    void reconcileMoneyAppControls(snapshot);
  }, []);

  const refresh = useCallback(async () => {
    dispatch({ type: 'load' });
    try {
      const snapshot = await resolvedRepository.loadSnapshot();
      acceptSnapshot(snapshot);
    } catch (error) {
      dispatch({
        type: 'failure',
        message: error instanceof Error ? error.message : 'Money data could not be loaded.',
      });
    }
  }, [acceptSnapshot, resolvedRepository]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  const reviewTransaction = useCallback(async (
    transactionId: string,
    mutation: () => ReturnType<MoneyRepository['loadSnapshot']>,
  ) => {
    setReviewingTransactionId(transactionId);
    try {
      const snapshot = await mutation();
      acceptSnapshot(snapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The transaction could not be updated.';
      dispatch({ type: 'failure', message });
      throw error;
    } finally {
      setReviewingTransactionId(null);
    }
  }, [acceptSnapshot]);

  const assignTransactionCategory = useCallback(
    (transactionId: string, categoryId: string) => reviewTransaction(
      transactionId,
      () => resolvedRepository.assignTransactionCategory(transactionId, categoryId),
    ),
    [resolvedRepository, reviewTransaction],
  );

  const markTransactionNotCounted = useCallback(
    (transactionId: string) => reviewTransaction(
      transactionId,
      () => resolvedRepository.markTransactionNotCounted(transactionId),
    ),
    [resolvedRepository, reviewTransaction],
  );

  const reviewTransactionMeaning = useCallback(
    (transactionId: string, input: TransactionMeaningReviewInput) => reviewTransaction(
      transactionId,
      () => resolvedRepository.reviewTransactionMeaning(transactionId, input),
    ),
    [resolvedRepository, reviewTransaction],
  );

  const saveMerchantRule = useCallback(
    (input: Parameters<MoneyRepository['saveMerchantRule']>[0]) => reviewTransaction(
      input.transactionId,
      () => resolvedRepository.saveMerchantRule(input),
    ),
    [resolvedRepository, reviewTransaction],
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

  const applyCategoryMutation = useCallback(async (mutation: () => ReturnType<MoneyRepository['loadSnapshot']>) => {
    setSavingCategory(true);
    try {
      const snapshot = await mutation();
      acceptSnapshot(snapshot);
    } catch (error) {
      dispatch({
        type: 'failure',
        message: error instanceof Error ? error.message : 'The category could not be updated.',
      });
      throw error;
    } finally {
      setSavingCategory(false);
    }
  }, [acceptSnapshot]);

  const renameCategory = useCallback(
    (categoryId: string, name: string) => applyCategoryMutation(
      () => resolvedRepository.renameCategory(categoryId, name),
    ),
    [applyCategoryMutation, resolvedRepository],
  );

  const updateCategoryPlan = useCallback(
    (categoryId: string, input: Parameters<MoneyRepository['updateCategoryPlan']>[1]) => applyCategoryMutation(
      () => resolvedRepository.updateCategoryPlan(categoryId, input),
    ),
    [applyCategoryMutation, resolvedRepository],
  );

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
    reviewingTransactionId,
    assignTransactionCategory,
    markTransactionNotCounted,
    reviewTransactionMeaning,
    saveMerchantRule,
    savingCategory,
    createCategory,
    renameCategory,
    updateCategoryPlan,
    pendingAppControlReviewCategoryId,
    reviewMoneyAppControl,
  }), [assignTransactionCategory, createCategory, markTransactionNotCounted, pendingAppControlReviewCategoryId, refresh, renameCategory, reviewMoneyAppControl, reviewTransactionMeaning, reviewingTransactionId, saveMerchantRule, savingCategory, state, updateCategoryPlan]);
  return <MoneyDataContext.Provider value={value}>{children}</MoneyDataContext.Provider>;
}

export function useMoneyData(): MoneyDataContextValue {
  const value = useContext(MoneyDataContext);
  if (!value) throw new Error('useMoneyData must be used inside MoneyDataProvider.');
  return value;
}
