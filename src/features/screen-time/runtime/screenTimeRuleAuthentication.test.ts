import {
  authenticateScreenTimeRuleChange,
  normalizeScreenTimeRuleAuthenticationResult,
} from './screenTimeRuleAuthentication';

describe('screenTimeRuleAuthentication', () => {
  it('normalizes success, cancellation, unavailable credentials, and failure', () => {
    expect(normalizeScreenTimeRuleAuthenticationResult({ success: true }))
      .toEqual({ outcome: 'authenticated' });
    expect(normalizeScreenTimeRuleAuthenticationResult({ success: false, error: 'user_cancel' }))
      .toEqual({ outcome: 'cancelled' });
    expect(normalizeScreenTimeRuleAuthenticationResult({ success: false, error: 'not_enrolled' }))
      .toEqual({ outcome: 'unavailable' });
    expect(normalizeScreenTimeRuleAuthenticationResult({ success: false, error: 'authentication_failed' }))
      .toEqual({ outcome: 'failed' });
  });

  it('uses fresh platform authentication with device-credential fallback', async () => {
    const authenticate = jest.fn(async () => ({ success: true as const }));

    await expect(authenticateScreenTimeRuleChange('disable_personal', authenticate))
      .resolves.toEqual({ outcome: 'authenticated' });
    expect(authenticate).toHaveBeenCalledWith({
      promptMessage: 'Confirm Screen Time change',
      fallbackLabel: 'Use Passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      biometricsSecurityLevel: 'strong',
    });
  });

  it('treats a platform exception as failure', async () => {
    await expect(authenticateScreenTimeRuleChange(
      'delete_personal',
      jest.fn(async () => { throw new Error('native unavailable'); }),
    )).resolves.toEqual({ outcome: 'failed' });
  });
});
