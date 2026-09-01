import { posthogClient } from '../../../services/analytics/posthogClient';

const ADVANCED_SCREEN_TIME_PAYWALL_FLAG = 'kwilt-paywall-advanced-screen-time';

/**
 * Fail paid by default, but allow an emergency App Review rollback without a
 * new binary. This affects only advanced personal rules; family coordination
 * remains independently gated.
 */
export function isAdvancedScreenTimePaywallEnabled(): boolean {
  const value = (posthogClient as unknown as { getFeatureFlag?: (key: string) => unknown } | undefined)
    ?.getFeatureFlag?.(ADVANCED_SCREEN_TIME_PAYWALL_FLAG);
  return value !== false && value !== 'false' && value !== 'free';
}
