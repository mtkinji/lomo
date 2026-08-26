import * as SecureStore from 'expo-secure-store';
import {
  claimManagedChildSetup,
  loadManagedChildAccess,
  previewManagedChildSetup,
  restoreManagedChildAccess,
} from './managedChildAccess';

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when-unlocked-this-device-only',
  setItemAsync: jest.fn(), getItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));
jest.mock('../../../utils/getEnv', () => ({
  getSupabaseUrl: () => 'https://auth.kwilt.test',
  getSupabasePublishableKey: () => 'publishable-key',
}));
jest.mock('../../../services/installId', () => ({ getInstallId: async () => 'install-123' }));

const preview = {
  sessionId: 'session-1', childMembershipId: 'child-1', childDisplayName: 'Charlie',
  householdName: 'Watanabe Household', caregiverDisplayName: 'Andrew',
  capabilityIds: ['todos'], expiresAt: '2026-08-26T23:00:00Z',
};

describe('managed child access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ setup: preview }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ device: { deviceId: 'device-1', childMembershipId: 'child-1' }, credential: 'credential-1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ access: { ...preview, deviceId: 'device-1' } }),
      }) as jest.Mock;
  });

  it('previews and claims guardian-managed access without a child auth token', async () => {
    const resolved = await previewManagedChildSetup({ transport: 'link', secret: 'a'.repeat(64) });
    const access = await claimManagedChildSetup({ transport: 'link', secret: 'a'.repeat(64), preview: resolved });
    expect(access.childDisplayName).toBe('Charlie');
    expect(fetch).toHaveBeenLastCalledWith('https://auth.kwilt.test/functions/v1/household-device-access', expect.objectContaining({
      headers: { 'Content-Type': 'application/json', apikey: 'publishable-key' },
    }));
    expect(JSON.parse(String((fetch as jest.Mock).mock.calls[1][1].body))).not.toHaveProperty('childJwt');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'kwilt-managed-child-access-v1', expect.stringContaining('credential-1'),
      { keychainAccessible: 'when-unlocked-this-device-only' },
    );
  });

  it('does not resurrect preview grants when claim-time status is already revoked', async () => {
    (global.fetch as jest.Mock).mockReset()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ setup: preview }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          device: { deviceId: 'device-1', childMembershipId: 'child-1' }, credential: 'd'.repeat(64),
        }),
      })
      .mockResolvedValueOnce({
        ok: false, status: 401, json: async () => ({ error: { code: 'managed_child_access_revoked' } }),
      });
    const resolved = await previewManagedChildSetup({ transport: 'link', secret: 'a'.repeat(64) });

    await expect(claimManagedChildSetup({
      transport: 'link', secret: 'a'.repeat(64), preview: resolved,
    })).rejects.toThrow('no longer available');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('kwilt-managed-child-access-v1');
  });

  it('loads a valid device-bound access receipt from secure storage', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({
      deviceId: 'device-1', childMembershipId: 'child-1', childDisplayName: 'Charlie',
      householdName: 'Watanabe Household', caregiverDisplayName: 'Andrew',
      capabilityIds: [], credential: 'credential-1',
    }));
    expect((await loadManagedChildAccess())?.deviceId).toBe('device-1');
  });

  it('revalidates restored access and replaces stale capability grants', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({
      deviceId: 'device-1', childMembershipId: 'child-1', childDisplayName: 'Charlie',
      householdName: 'Watanabe Household', caregiverDisplayName: 'Andrew',
      capabilityIds: ['todos'], credential: 'a'.repeat(64),
    }));
    (global.fetch as jest.Mock).mockReset().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access: {
        deviceId: 'device-1', childMembershipId: 'child-1', childDisplayName: 'Charlie',
        householdName: 'Watanabe Household', caregiverDisplayName: 'Andrew',
        capabilityIds: ['screen-time'],
      } }),
    });

    await expect(restoreManagedChildAccess()).resolves.toMatchObject({
      deviceId: 'device-1', capabilityIds: ['screen-time'], credential: 'a'.repeat(64),
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://auth.kwilt.test/functions/v1/household-device-access',
      expect.objectContaining({
        body: JSON.stringify({
          action: 'status', deviceId: 'device-1', installId: 'install-123', credential: 'a'.repeat(64),
        }),
      }),
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'kwilt-managed-child-access-v1', expect.stringContaining('screen-time'),
      { keychainAccessible: 'when-unlocked-this-device-only' },
    );
  });

  it('clears restored access when the server reports that it was revoked', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({
      deviceId: 'device-1', childMembershipId: 'child-1', childDisplayName: 'Charlie',
      householdName: 'Watanabe Household', caregiverDisplayName: 'Andrew',
      capabilityIds: ['todos'], credential: 'b'.repeat(64),
    }));
    (global.fetch as jest.Mock).mockReset().mockResolvedValue({
      ok: false, status: 401, json: async () => ({ error: { code: 'managed_child_access_revoked' } }),
    });

    await expect(restoreManagedChildAccess()).resolves.toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('kwilt-managed-child-access-v1');
  });

  it('keeps the credential but fails capabilities closed when status cannot be verified', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({
      deviceId: 'device-1', childMembershipId: 'child-1', childDisplayName: 'Charlie',
      householdName: 'Watanabe Household', caregiverDisplayName: 'Andrew',
      capabilityIds: ['todos'], credential: 'c'.repeat(64),
    }));
    (global.fetch as jest.Mock).mockReset().mockRejectedValue(new Error('offline'));

    await expect(restoreManagedChildAccess()).resolves.toMatchObject({
      deviceId: 'device-1', capabilityIds: [], verification: 'unavailable',
    });
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});
