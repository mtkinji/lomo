import * as LocalAuthentication from 'expo-local-authentication';

export type ScreenTimeRuleMutationClass =
  | 'save_active_personal'
  | 'disable_personal'
  | 'delete_personal'
  | 'save_active_family'
  | 'deactivate_family';

export type ScreenTimeRuleAuthenticationOutcome =
  | { outcome: 'authenticated' }
  | { outcome: 'cancelled' }
  | { outcome: 'unavailable' }
  | { outcome: 'failed' };

type AuthenticationResultLike = {
  success: boolean;
  error?: string;
};

type Authenticate = (
  options: Parameters<typeof LocalAuthentication.authenticateAsync>[0],
) => Promise<AuthenticationResultLike>;

const CANCEL_ERRORS = new Set(['user_cancel', 'system_cancel', 'app_cancel']);
const UNAVAILABLE_ERRORS = new Set(['not_available', 'not_enrolled', 'passcode_not_set']);

export const SCREEN_TIME_RULE_AUTHENTICATION_FAILURE_MESSAGE =
  "Kwilt couldn't confirm this change. The rule is still on.";

export function normalizeScreenTimeRuleAuthenticationResult(
  result: AuthenticationResultLike,
): ScreenTimeRuleAuthenticationOutcome {
  if (result.success) return { outcome: 'authenticated' };
  if (result.error && CANCEL_ERRORS.has(result.error)) return { outcome: 'cancelled' };
  if (result.error && UNAVAILABLE_ERRORS.has(result.error)) return { outcome: 'unavailable' };
  return { outcome: 'failed' };
}

export async function authenticateScreenTimeRuleChange(
  mutationClass: ScreenTimeRuleMutationClass,
  authenticate: Authenticate = LocalAuthentication.authenticateAsync,
): Promise<ScreenTimeRuleAuthenticationOutcome> {
  void mutationClass;
  try {
    const result = await authenticate({
      promptMessage: 'Confirm Screen Time change',
      fallbackLabel: 'Use Passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      biometricsSecurityLevel: 'strong',
    });
    return normalizeScreenTimeRuleAuthenticationResult(result);
  } catch {
    return { outcome: 'failed' };
  }
}
