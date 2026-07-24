import type { MoneySnapshot } from './moneySnapshot';

export type MoneyDataState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  snapshot: MoneySnapshot | null;
  error: string | null;
  refreshing: boolean;
};

export type MoneyDataAction =
  | { type: 'load' }
  | { type: 'success'; snapshot: MoneySnapshot }
  | { type: 'failure'; message: string };

export const initialMoneyDataState: MoneyDataState = {
  status: 'idle',
  snapshot: null,
  error: null,
  refreshing: false,
};

export function moneyDataReducer(state: MoneyDataState, action: MoneyDataAction): MoneyDataState {
  switch (action.type) {
    case 'load':
      return state.snapshot
        ? { ...state, error: null, refreshing: true }
        : { status: 'loading', snapshot: null, error: null, refreshing: false };
    case 'success':
      return { status: 'ready', snapshot: action.snapshot, error: null, refreshing: false };
    case 'failure':
      return state.snapshot
        ? { status: 'ready', snapshot: state.snapshot, error: action.message, refreshing: false }
        : { status: 'error', snapshot: null, error: action.message, refreshing: false };
  }
}
