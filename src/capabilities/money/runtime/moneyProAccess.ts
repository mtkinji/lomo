import { openPaywallInterstitial, type PaywallSource } from '../../../services/paywall';
import { useEntitlementsStore } from '../../../store/useEntitlementsStore';

export class MoneyProRequiredError extends Error {
  code = 'pro_required' as const;

  constructor() {
    super('Kwilt Pro is required to change connected Money and budgets.');
    this.name = 'MoneyProRequiredError';
  }
}

export function hasMoneyProAccess(): boolean {
  return useEntitlementsStore.getState().isPro;
}

export function requestMoneyProAccess(source: PaywallSource): boolean {
  if (hasMoneyProAccess()) return true;
  openPaywallInterstitial({ reason: 'pro_money_budgets', source });
  return false;
}

export function assertMoneyProAccess(): void {
  if (!hasMoneyProAccess()) throw new MoneyProRequiredError();
}
