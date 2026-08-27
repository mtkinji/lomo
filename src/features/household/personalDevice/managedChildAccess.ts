import * as SecureStore from 'expo-secure-store';
import { getSupabasePublishableKey, getSupabaseUrl } from '../../../utils/getEnv';
import { getInstallId } from '../../../services/installId';

const ACCESS_KEY = 'kwilt-managed-child-access-v1';

export type ManagedChildAccess = {
  deviceId: string;
  childMembershipId: string;
  childDisplayName: string;
  householdName: string;
  caregiverDisplayName: string;
  capabilityIds: string[];
  credential: string;
  verification: 'current' | 'unavailable';
};

export type ManagedChildSetupPreview = Omit<ManagedChildAccess, 'deviceId' | 'credential' | 'verification'> & {
  sessionId: string;
  expiresAt: string;
};

function edgeUrl(): { url: string; key: string } {
  const base = getSupabaseUrl()?.trim().replace(/\/+$/, '');
  const key = getSupabasePublishableKey()?.trim();
  if (!base || !key) throw new Error('Device setup is unavailable');
  return { url: `${base}/functions/v1/household-device-access`, key };
}

async function request(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const endpoint = edgeUrl();
  const response = await fetch(endpoint.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: endpoint.key },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !payload) throw new Error('This setup code is invalid or expired');
  return payload;
}

async function statusRequest(body: Record<string, unknown>): Promise<{
  status: number;
  payload: Record<string, unknown> | null;
}> {
  const endpoint = edgeUrl();
  const response = await fetch(endpoint.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: endpoint.key },
    body: JSON.stringify(body),
  });
  return {
    status: response.status,
    payload: await response.json().catch(() => null) as Record<string, unknown> | null,
  };
}

const string = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid device setup response');
  return value;
};
const strings = (value: unknown): string[] => Array.isArray(value) && value.every((item) => typeof item === 'string')
  ? value : [];

async function saveManagedChildAccess(access: ManagedChildAccess): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, JSON.stringify(access), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function resolveManagedChildAccess(cached: ManagedChildAccess): Promise<ManagedChildAccess | null> {
  try {
    const result = await statusRequest({
      action: 'status', deviceId: cached.deviceId, installId: await getInstallId(),
      credential: cached.credential,
    });
    if (result.status === 401 || result.status === 404) {
      await clearManagedChildAccess();
      return null;
    }
    if (result.status !== 200 || !result.payload?.access || typeof result.payload.access !== 'object') {
      return { ...cached, capabilityIds: [], verification: 'unavailable' };
    }
    const current = result.payload.access as Record<string, unknown>;
    const restored: ManagedChildAccess = {
      deviceId: string(current.deviceId),
      childMembershipId: string(current.childMembershipId),
      childDisplayName: string(current.childDisplayName),
      householdName: string(current.householdName),
      caregiverDisplayName: string(current.caregiverDisplayName),
      capabilityIds: strings(current.capabilityIds),
      credential: cached.credential,
      verification: 'current',
    };
    await saveManagedChildAccess(restored);
    return restored;
  } catch {
    return { ...cached, capabilityIds: [], verification: 'unavailable' };
  }
}

export async function previewManagedChildSetup(input: {
  transport: 'link' | 'manual_code';
  secret: string;
}): Promise<ManagedChildSetupPreview> {
  const installId = input.transport === 'manual_code' ? await getInstallId() : undefined;
  const response = await request({ action: 'preview', ...input, ...(installId ? { installId } : {}) });
  const setup = response.setup as Record<string, unknown> | undefined;
  if (!setup) throw new Error('Invalid device setup response');
  return {
    sessionId: string(setup.sessionId),
    childMembershipId: string(setup.childMembershipId),
    childDisplayName: string(setup.childDisplayName),
    householdName: string(setup.householdName),
    caregiverDisplayName: string(setup.caregiverDisplayName),
    capabilityIds: strings(setup.capabilityIds),
    expiresAt: string(setup.expiresAt),
  };
}

export async function claimManagedChildSetup(input: {
  transport: 'link' | 'manual_code';
  secret: string;
  preview: ManagedChildSetupPreview;
}): Promise<ManagedChildAccess> {
  const installId = await getInstallId();
  const response = await request({
    action: 'claim', transport: input.transport, secret: input.secret, installId,
    ...(input.transport === 'manual_code' ? { previewSessionId: input.preview.sessionId } : {}),
    label: `${input.preview.childDisplayName}'s iPhone`, platform: 'ios',
  });
  const device = response.device as Record<string, unknown> | undefined;
  const access: ManagedChildAccess = {
    deviceId: string(device?.deviceId),
    childMembershipId: string(device?.childMembershipId),
    childDisplayName: input.preview.childDisplayName,
    householdName: input.preview.householdName,
    caregiverDisplayName: input.preview.caregiverDisplayName,
    capabilityIds: input.preview.capabilityIds,
    credential: string(response.credential),
    verification: 'unavailable',
  };
  await saveManagedChildAccess(access);
  const resolved = await resolveManagedChildAccess(access);
  if (!resolved) throw new Error('This device access is no longer available');
  return resolved;
}

export async function loadManagedChildAccess(): Promise<ManagedChildAccess | null> {
  const raw = await SecureStore.getItemAsync(ACCESS_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    return {
      deviceId: string(value.deviceId), childMembershipId: string(value.childMembershipId),
      childDisplayName: string(value.childDisplayName), householdName: string(value.householdName),
      caregiverDisplayName: string(value.caregiverDisplayName), credential: string(value.credential),
      capabilityIds: strings(value.capabilityIds),
      verification: 'unavailable',
    };
  } catch {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    return null;
  }
}

export async function clearManagedChildAccess(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
}

export async function restoreManagedChildAccess(): Promise<ManagedChildAccess | null> {
  const cached = await loadManagedChildAccess();
  if (!cached) return null;
  return resolveManagedChildAccess(cached);
}
