import type { SupabaseClient } from '@supabase/supabase-js';

export type MoneyFamilyStatus = {
  householdId: string | null;
  householdName: string | null;
  role: 'owner' | 'caregiver' | null;
  memberCount: number;
};

export async function getMoneyFamilyStatus(client: SupabaseClient): Promise<MoneyFamilyStatus> {
  const { data, error } = await client.rpc('get_kwilt_household_snapshot');
  if (error) throw error;
  if (!data || typeof data !== 'object') {
    throw new Error('Money received an invalid Household snapshot.');
  }
  const snapshot = data as {
    household?: { id?: unknown; name?: unknown } | null;
    currentMembershipId?: unknown;
    members?: Array<{ id?: unknown; role?: unknown }>;
  };
  if (snapshot.household == null) {
    return { householdId: null, householdName: null, role: null, memberCount: 0 };
  }
  const householdId = typeof snapshot.household.id === 'string' ? snapshot.household.id : '';
  const householdName = typeof snapshot.household.name === 'string' ? snapshot.household.name : '';
  const currentMembershipId = typeof snapshot.currentMembershipId === 'string'
    ? snapshot.currentMembershipId
    : '';
  const members = Array.isArray(snapshot.members) ? snapshot.members : [];
  const currentMember = members.find((member) => member.id === currentMembershipId);
  const adultMembers = members.filter((member) => member.role === 'owner' || member.role === 'caregiver');
  if (!householdId || !householdName || !currentMember
    || (currentMember.role !== 'owner' && currentMember.role !== 'caregiver')) {
    throw new Error('Money requires an active adult Household membership.');
  }
  return {
    householdId,
    householdName,
    role: currentMember.role,
    memberCount: adultMembers.length,
  };
}

export async function acceptMoneyFamilyInvite(client: SupabaseClient, rawCode: string): Promise<MoneyFamilyStatus> {
  const code = normalizeMoneyFamilyInviteCode(rawCode);
  if (code.length < 6) throw new Error('Enter a valid Money household invite code.');
  const { error } = await client.functions.invoke('budget-family-accept-invite', { body: { code } });
  if (error) throw error;
  return getMoneyFamilyStatus(client);
}

export function normalizeMoneyFamilyInviteCode(code: string): string {
  return code.replace(/[^a-z0-9]/gi, '').toUpperCase();
}
