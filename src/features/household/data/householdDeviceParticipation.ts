import type { SupabaseClient } from '@supabase/supabase-js';

export type HouseholdDeviceKind = 'personal_child' | 'shared_household';
export type HouseholdDeviceStatus = 'pending' | 'ready' | 'needs_attention' | 'revoked';
export type HouseholdDevice = {
  id: string;
  householdId: string;
  kind: HouseholdDeviceKind;
  childMembershipId: string | null;
  assignedCaregiverMembershipId: string | null;
  installId: string;
  label: string;
  platform: 'ios' | 'ipados';
  status: HouseholdDeviceStatus;
  memberIds: string[];
};

export type HouseholdDeviceSetupSession = {
  id: string;
  token: string;
  manualCode: string;
  expiresAt: string;
  childMembershipId: string;
};

export function normalizeHouseholdDeviceManualCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

export function formatHouseholdDeviceManualCode(value: string): string {
  const digits = normalizeHouseholdDeviceManualCode(value);
  return digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
}

type RpcResult = { data: unknown; error: { message?: string } | null };

const isString = (value: unknown): value is string => typeof value === 'string';
const nullableString = (value: unknown): value is string | null => value === null || isString(value);

async function callRpc(
  client: SupabaseClient,
  name: string,
  parameters?: Record<string, unknown>,
): Promise<unknown> {
  const result = await (client.rpc as unknown as (
    functionName: string,
    args?: Record<string, unknown>,
  ) => Promise<RpcResult>)(name, ...(parameters === undefined ? [] : [parameters]));
  if (result.error) throw new Error(result.error.message || `Unable to run ${name}`);
  return result.data;
}

export function buildHouseholdDeviceSetupUrl(token: string): string {
  return `https://go.kwilt.app/open/household-device/${encodeURIComponent(token.trim())}`;
}

export function parseHouseholdDeviceSetupToken(url: string): string | null {
  const value = url.trim();
  const universal = /^https:\/\/go\.kwilt\.app\/open\/household-device\/([^/?#]+)(?:[/?#]|$)/i.exec(value);
  if (universal?.[1]) return decodeURIComponent(universal[1]);
  const scheme = /^kwilt:\/\/household-device\/setup(?:\?|$)/i.test(value) ? value : null;
  if (!scheme) return null;
  const match = /[?&]token=([^&#]+)/i.exec(scheme);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function parseHouseholdDeviceSetupSession(value: unknown): HouseholdDeviceSetupSession {
  if (!value || typeof value !== 'object') throw new Error('Invalid device setup session');
  const row = value as Partial<HouseholdDeviceSetupSession>;
  if (![row.id, row.token, row.manualCode, row.expiresAt, row.childMembershipId].every(isString)) {
    throw new Error('Invalid device setup session');
  }
  return row as HouseholdDeviceSetupSession;
}

export function parseHouseholdDevices(value: unknown): HouseholdDevice[] {
  if (!Array.isArray(value) || !value.every((candidate) => {
    if (!candidate || typeof candidate !== 'object') return false;
    const row = candidate as Partial<HouseholdDevice>;
    return isString(row.id)
      && isString(row.householdId)
      && (row.kind === 'personal_child' || row.kind === 'shared_household')
      && nullableString(row.childMembershipId)
      && nullableString(row.assignedCaregiverMembershipId)
      && isString(row.installId)
      && isString(row.label)
      && (row.platform === 'ios' || row.platform === 'ipados')
      && ['pending', 'ready', 'needs_attention', 'revoked'].includes(row.status ?? '')
      && Array.isArray(row.memberIds)
      && row.memberIds.every(isString);
  })) throw new Error('Invalid Household devices');
  return value as HouseholdDevice[];
}

export async function listHouseholdDevices(
  client: SupabaseClient,
  householdId: string,
): Promise<HouseholdDevice[]> {
  return parseHouseholdDevices(await callRpc(client, 'list_kwilt_household_devices', {
    p_household_id: householdId,
  }));
}

export async function createHouseholdDeviceSetupSession(
  client: SupabaseClient,
  childMembershipId: string,
): Promise<HouseholdDeviceSetupSession> {
  return parseHouseholdDeviceSetupSession(await callRpc(
    client,
    'create_kwilt_household_device_setup_session',
    { p_child_membership_id: childMembershipId },
  ));
}

export async function cancelHouseholdDeviceSetupSession(
  client: SupabaseClient,
  sessionId: string,
): Promise<void> {
  await callRpc(client, 'cancel_kwilt_household_device_setup_session', { p_session_id: sessionId });
}

export async function designateSharedHouseholdDevice(client: SupabaseClient, input: {
  householdId: string;
  installId: string;
  label: string;
  platform: 'ios' | 'ipados';
}): Promise<{ id: string; status: HouseholdDeviceStatus }> {
  const value = await callRpc(client, 'designate_kwilt_shared_household_device', {
    p_household_id: input.householdId,
    p_install_id: input.installId,
    p_label: input.label.trim(),
    p_platform: input.platform,
  });
  if (!value || typeof value !== 'object' || !isString((value as { id?: unknown }).id)
    || !['pending', 'ready', 'needs_attention', 'revoked'].includes(
      String((value as { status?: unknown }).status),
    )) throw new Error('Invalid shared device receipt');
  return value as { id: string; status: HouseholdDeviceStatus };
}

export async function setSharedHouseholdDeviceMembers(
  client: SupabaseClient,
  deviceId: string,
  memberIds: string[],
): Promise<void> {
  await callRpc(client, 'set_kwilt_shared_household_device_members', {
    p_device_id: deviceId,
    p_child_membership_ids: memberIds,
  });
}

export async function revokeHouseholdDevice(
  client: SupabaseClient,
  deviceId: string,
): Promise<void> {
  await callRpc(client, 'revoke_kwilt_household_device', { p_device_id: deviceId });
}
