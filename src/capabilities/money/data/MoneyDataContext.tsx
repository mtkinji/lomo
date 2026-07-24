import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { createMoneyRepository, type MoneyRepository } from './moneyRepository';
import { initialMoneyDataState, moneyDataReducer, type MoneyDataState } from './moneyDataState';

type MoneyDataContextValue = MoneyDataState & {
  refresh: () => Promise<void>;
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

  const value = useMemo(() => ({ ...state, refresh }), [refresh, state]);
  return <MoneyDataContext.Provider value={value}>{children}</MoneyDataContext.Provider>;
}

export function useMoneyData(): MoneyDataContextValue {
  const value = useContext(MoneyDataContext);
  if (!value) throw new Error('useMoneyData must be used inside MoneyDataProvider.');
  return value;
}
