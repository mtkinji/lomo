import type { MoneySnapshot } from './moneySnapshot';
import {
  applyConfirmedCategoryPatch,
  applyConfirmedMerchantRulePatch,
  applyConfirmedTransactionPlanRolePatch,
  applyConfirmedTransactionPatch,
  type ConfirmedCategoryPatch,
  type ConfirmedMerchantRulePatch,
  type ConfirmedTransactionPlanRolePatch,
  type ConfirmedTransactionPatch,
} from './moneyConfirmedPatches';

export type MoneyDataState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  snapshot: MoneySnapshot | null;
  error: string | null;
  refreshing: boolean;
  stale: boolean;
  planVersionId: string | null;
  planReceiptId: string | null;
};

export type MoneyDataAction =
  | { type: 'load' }
  | { type: 'cached_snapshot'; snapshot: MoneySnapshot }
  | { type: 'success'; snapshot: MoneySnapshot }
  | { type: 'failure'; message: string }
  | { type: 'confirmed_transaction_patch'; patch: ConfirmedTransactionPatch }
  | { type: 'confirmed_transaction_plan_role_patch'; patch: ConfirmedTransactionPlanRolePatch }
  | { type: 'confirmed_merchant_rule_patch'; patch: ConfirmedMerchantRulePatch }
  | { type: 'confirmed_category_patch'; patch: ConfirmedCategoryPatch }
  | { type: 'authoritative_plan_projection'; snapshot: MoneySnapshot; versionId: string; receiptId: string | null }
  | { type: 'background_failure'; message: string };

export const initialMoneyDataState: MoneyDataState = {
  status: 'idle',
  snapshot: null,
  error: null,
  refreshing: false,
  stale: false,
  planVersionId: null,
  planReceiptId: null,
};

export function moneyDataReducer(state: MoneyDataState, action: MoneyDataAction): MoneyDataState {
  switch (action.type) {
    case 'load':
      return state.snapshot
        ? { ...state, error: null, refreshing: true }
        : { ...state, status: 'loading', snapshot: null, error: null, refreshing: false };
    case 'cached_snapshot':
      return { ...state, status: 'ready', snapshot: action.snapshot, error: null, refreshing: false, stale: true };
    case 'success':
      return { ...state, status: 'ready', snapshot: action.snapshot, error: null, refreshing: false, stale: false };
    case 'failure':
      return state.snapshot
        ? { ...state, status: 'ready', snapshot: state.snapshot, error: action.message, refreshing: false }
        : { ...state, status: 'error', snapshot: null, error: action.message, refreshing: false };
    case 'confirmed_transaction_patch':
      return state.snapshot
        ? { ...state, status: 'ready', snapshot: applyConfirmedTransactionPatch(state.snapshot, action.patch), error: null, refreshing: false, stale: true }
        : state;
    case 'confirmed_transaction_plan_role_patch':
      return state.snapshot
        ? { ...state, status: 'ready', snapshot: applyConfirmedTransactionPlanRolePatch(state.snapshot, action.patch), error: null, refreshing: false, stale: true }
        : state;
    case 'confirmed_merchant_rule_patch':
      return state.snapshot
        ? { ...state, status: 'ready', snapshot: applyConfirmedMerchantRulePatch(state.snapshot, action.patch), error: null, refreshing: false, stale: true }
        : state;
    case 'confirmed_category_patch':
      return state.snapshot
        ? { ...state, status: 'ready', snapshot: applyConfirmedCategoryPatch(state.snapshot, action.patch), error: null, refreshing: false, stale: true }
        : state;
    case 'authoritative_plan_projection':
      return {
        ...state,
        status: 'ready',
        snapshot: action.snapshot,
        error: null,
        refreshing: false,
        stale: false,
        planVersionId: action.versionId,
        planReceiptId: action.receiptId,
      };
    case 'background_failure':
      return { ...state, status: 'ready', error: action.message, refreshing: false, stale: true };
  }
}
