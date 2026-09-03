import {
  purgeDeletedAccountFromDevice,
  selectAccountScopedAsyncStorageKeys,
  type AccountDeletionLocalCleanupDependencies,
} from './accountDeletionLocalCleanup';

function dependencies(overrides: Partial<AccountDeletionLocalCleanupDependencies> = {}) {
  return {
    listAsyncStorageKeys: jest.fn(async () => []),
    removeAsyncStorageKeys: jest.fn(async () => undefined),
    removeSecureStoreKeys: jest.fn(async () => undefined),
    cancelAccountNotifications: jest.fn(async () => undefined),
    stopAccountBackgroundWork: jest.fn(async () => undefined),
    clearRevenueCatIdentity: jest.fn(async () => undefined),
    clearAnalyticsIdentity: jest.fn(async () => undefined),
    closeRealtimeChannels: jest.fn(async () => undefined),
    resetStores: jest.fn(),
    clearAuthSecrets: jest.fn(async () => undefined),
    ...overrides,
  } satisfies AccountDeletionLocalCleanupDependencies;
}

describe('account deletion local cleanup', () => {
  it('selects account data without deleting device-level consent and appearance choices', () => {
    expect(selectAccountScopedAsyncStorageKeys([
      'kwilt-domain-v1:user-1',
      'kwilt:shared-home:snapshot:v1:user-1',
      'kwilt-coach-summary:v1:user-1:thread-1',
      'kwilt.notifications.goalNudge.v1',
      'kwilt-entitlements-cache-v1',
      'kwilt:account-deletion:operation:v1:user-1',
      'kwilt-domain-v1:user-2',
      'kwilt-analytics-consent',
      'kwilt-install-id-v1',
      'kwilt-theme-v1',
    ], 'user-1')).toEqual([
      'kwilt-domain-v1:user-1',
      'kwilt:shared-home:snapshot:v1:user-1',
      'kwilt-coach-summary:v1:user-1:thread-1',
      'kwilt.notifications.goalNudge.v1',
      'kwilt-entitlements-cache-v1',
      'kwilt:account-deletion:operation:v1:user-1',
    ]);
  });

  it('attempts every cleanup boundary and clears auth secrets', async () => {
    const deps = dependencies({
      listAsyncStorageKeys: jest.fn(async () => ['kwilt-domain-v1:user-1']),
    });

    await expect(purgeDeletedAccountFromDevice({ userId: 'user-1', dependencies: deps }))
      .resolves.toEqual({ ok: true });

    expect(deps.removeAsyncStorageKeys).toHaveBeenCalledWith(['kwilt-domain-v1:user-1']);
    expect(deps.removeSecureStoreKeys).toHaveBeenCalledWith(['kwilt-managed-child-access-v1']);
    expect(deps.cancelAccountNotifications).toHaveBeenCalledTimes(1);
    expect(deps.stopAccountBackgroundWork).toHaveBeenCalledTimes(1);
    expect(deps.clearRevenueCatIdentity).toHaveBeenCalledTimes(1);
    expect(deps.clearAnalyticsIdentity).toHaveBeenCalledTimes(1);
    expect(deps.closeRealtimeChannels).toHaveBeenCalledTimes(1);
    expect(deps.resetStores).toHaveBeenCalledTimes(1);
    expect(deps.clearAuthSecrets).toHaveBeenCalledTimes(1);
  });

  it('attempts all boundaries but does not claim success when one fails', async () => {
    const deps = dependencies({
      clearRevenueCatIdentity: jest.fn(async () => { throw new Error('offline'); }),
    });

    await expect(purgeDeletedAccountFromDevice({ userId: 'user-1', dependencies: deps }))
      .rejects.toThrow('Account was deleted, but this device could not finish clearing local data.');

    expect(deps.clearAnalyticsIdentity).toHaveBeenCalledTimes(1);
    expect(deps.resetStores).toHaveBeenCalledTimes(1);
    expect(deps.clearAuthSecrets).toHaveBeenCalledTimes(1);
  });

  it('does not claim success when account-key inventory fails', async () => {
    const deps = dependencies({
      listAsyncStorageKeys: jest.fn(async () => { throw new Error('storage unavailable'); }),
    });

    await expect(purgeDeletedAccountFromDevice({ userId: 'user-1', dependencies: deps }))
      .rejects.toThrow('could not finish clearing local data');
    expect(deps.resetStores).toHaveBeenCalledTimes(1);
    expect(deps.clearAuthSecrets).toHaveBeenCalledTimes(1);
  });
});
