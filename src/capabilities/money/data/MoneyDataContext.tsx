import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { createMoneyRepository, type MoneyRepository } from './moneyRepository';
import type { TransactionMeaningReviewInput } from './moneyMutations';
import type { CategoryPlanInput } from '../domain/categoryPlanDraft';
import { initialMoneyDataState, moneyDataReducer, type MoneyDataState } from './moneyDataState';

type MoneyDataContextValue = MoneyDataState & {
  refresh: () => Promise<void>;
  reviewingTransactionId: string | null;
  assignTransactionCategory: (transactionId: string, categoryId: string) => Promise<void>;
  markTransactionNotCounted: (transactionId: string) => Promise<void>;
  reviewTransactionMeaning: (transactionId: string, input: TransactionMeaningReviewInput) => Promise<void>;
  saveMerchantRule: (input: Parameters<MoneyRepository['saveMerchantRule']>[0]) => Promise<void>;
  savingCategory: boolean;
  createCategory: (input: CategoryPlanInput) => Promise<string>;
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
  const resolvedRepository = useMemo(() => repository ?? createMoneyRepository(), [repository]);

  const refresh = useCallback(async () => {
    dispatch({ type: 'load' });
    try {
      const snapshot = await resolvedRepository.loadSnapshot();
      dispatch({ type: 'success', snapshot });
    } catch (error) {
      dispatch({
        type: 'failure',
        message: error instanceof Error ? error.message : 'Money data could not be loaded.',
      });
    }
  }, [resolvedRepository]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const reviewTransaction = useCallback(async (
    transactionId: string,
    mutation: () => ReturnType<MoneyRepository['loadSnapshot']>,
  ) => {
    setReviewingTransactionId(transactionId);
    try {
      const snapshot = await mutation();
      dispatch({ type: 'success', snapshot });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The transaction could not be updated.';
      dispatch({ type: 'failure', message });
      throw error;
    } finally {
      setReviewingTransactionId(null);
    }
  }, []);

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
      dispatch({ type: 'success', snapshot: result.snapshot });
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
  }, [resolvedRepository]);

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
  }), [assignTransactionCategory, createCategory, markTransactionNotCounted, refresh, reviewTransactionMeaning, reviewingTransactionId, saveMerchantRule, savingCategory, state]);
  return <MoneyDataContext.Provider value={value}>{children}</MoneyDataContext.Provider>;
}

export function useMoneyData(): MoneyDataContextValue {
  const value = useContext(MoneyDataContext);
  if (!value) throw new Error('useMoneyData must be used inside MoneyDataProvider.');
  return value;
}
