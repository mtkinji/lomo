import { openPaywallInterstitial } from '../../../services/paywall';
import { useEntitlementsStore } from '../../../store/useEntitlementsStore';

export function requestFamilyScreenTimeProAccess(): boolean {
  if (useEntitlementsStore.getState().isPro) return true;
  openPaywallInterstitial({ reason: 'pro_family_screen_time', source: 'screen_time_family' });
  return false;
}
