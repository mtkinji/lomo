import { openPaywallInterstitial } from '../../../services/paywall';
import { useEntitlementsStore } from '../../../store/useEntitlementsStore';

export function openFamilyScreenTimeProPaywall(): void {
  openPaywallInterstitial({ reason: 'pro_family_screen_time', source: 'screen_time_family' });
}

export function requestFamilyScreenTimeProAccess(): boolean {
  if (useEntitlementsStore.getState().isPro) return true;
  openFamilyScreenTimeProPaywall();
  return false;
}
